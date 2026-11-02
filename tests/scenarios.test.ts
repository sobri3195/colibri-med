import "fake-indexeddb/auto";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  buildScenario,
  scenarioDefinitions,
  scenarioId,
} from "../src/lib/scenarios";
import { canAction } from "../src/lib/permissions";
import { execute, seed, demoCall } from "../src/services/demo";
import {
  getLocal,
  putLocal,
  queue,
  dequeue,
  outbox,
} from "../src/services/storage";
import { loadScenario, resetScenario } from "../src/services/demoScenarios";
import { buildLeadershipSummary } from "../src/lib/leadership";
import { summaryCounts, checklistItems } from "../src/lib/domain";
import type { Actor, RecordData, Operation } from "../src/types";
const operator: Actor = {
  id: "demo:Operator",
  name: "Simulasi",
  role: "Operator",
};
const viewer: Actor = {
  id: "demo:Viewer pimpinan",
  name: "Simulasi",
  role: "Viewer pimpinan",
};
const now = Date.parse("2026-11-03T10:00:00Z");
beforeEach(async () => {
  await putLocal("demo", "state", seed());
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
describe("prepared connected scenario histories", () => {
  for (const key of Object.keys(
    scenarioDefinitions,
  ) as (keyof typeof scenarioDefinitions)[])
    it(`${key} has stable IDs, valid relationships, ordered timestamps and honest summaries`, () => {
      const state = buildScenario(key, now);
      const second = buildScenario(key, now);
      expect(state.tables).toEqual(second.tables);
      expect(state.tables.Requests[0].id).toBe(scenarioId(key, 5));
      const rows = Object.values(state.tables).flat();
      expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
      for (const row of rows) {
        expect(row.demoScenario).toBe(key);
        expect(Date.parse(row.createdAt)).toBeLessThanOrEqual(
          Date.parse(row.updatedAt),
        );
        expect(Date.parse(row.updatedAt)).toBeLessThanOrEqual(now);
      }
      const logs = [...state.tables.ActivityLogs].reverse();
      for (let i = 1; i < logs.length; i++)
        expect(Date.parse(logs[i].createdAt)).toBeGreaterThan(
          Date.parse(logs[i - 1].createdAt),
        );
      const totals = buildLeadershipSummary(state.tables, {}, now).totals;
      expect(totals.requests).toBe(1);
      expect(totals.patientsReported).toBe(2);
      expect(summaryCounts(state.tables)["Misi aktif"]).toBe(
        key === "koordinasi" ? 1 : 0,
      );
      if (key === "baru") expect(state.tables.Missions).toHaveLength(0);
      else {
        const mission = state.tables.Missions[0];
        expect(mission.requestId).toBe(state.tables.Requests[0].id);
        expect(mission.resourceIds).toEqual([state.tables.Resources[0].id]);
        expect(mission.aircraftId).toBe(state.tables.Aircraft[0].id);
        expect(state.tables.Aircraft[0].missionId).toBe(mission.id);
        expect(state.tables.MedicalReviews[0].status).toBe(
          "Rekomendasi Dicatat",
        );
        expect(state.tables.FlightReviews[0].status).toBe("Disetujui");
        expect(
          checklistItems.every(
            (i) => (state.tables.Checklists[0].items as any)[i.id],
          ),
        ).toBe(true);
        expect(mission.status).toBe(
          key === "selesai" ? "Selesai" : "Tim Ditugaskan",
        );
        if (key === "selesai") {
          expect(totals.completedMissions).toBe(1);
          expect(state.tables.HandoverRecords[0]).toMatchObject({
            missionId: mission.id,
            requestId: mission.requestId,
          });
          expect(mission.reason).toBeUndefined();
        }
      }
    });
  it("rejects skipped stages, clinical substitution, unavailable resources, and Viewer writes", () => {
    const state = buildScenario("koordinasi", now);
    const mission = state.tables.Missions[0];
    const op = (status: string) => ({
      id: mission.id,
      baseRevision: mission.revision,
      operationId: crypto.randomUUID(),
      status,
    });
    expect(() =>
      execute(state, operator, "missions.transition", op("Selesai")),
    ).toThrow(/Transisi/);
    state.tables.FlightReviews[0].status = "Ditunda";
    expect(() =>
      execute(state, operator, "missions.transition", op("Berangkat")),
    ).toThrow(/Persetujuan penerbangan/);
    state.tables.FlightReviews[0].status = "Disetujui";
    state.tables.Resources[0].status = "Tidak siap simulasi";
    expect(() =>
      execute(state, operator, "missions.transition", op("Berangkat")),
    ).toThrow(/Sumber daya/);
    const before = JSON.stringify(state);
    for (const action of [
      "requests.create",
      "requests.transition",
      "missions.assign",
      "missions.transition",
      "medicalReviews.save",
      "flightReviews.save",
      "resources.update",
    ]) {
      expect(canAction(viewer, action)).toBe(false);
      expect(() => execute(state, viewer, action, {})).toThrow(/FORBIDDEN/);
    }
    expect(JSON.stringify(state)).toBe(before);
  });
});
it("loads atomically and repeatedly without replacing edits or unrelated data", async () => {
  const before = await getLocal("demo", "state");
  await putLocal("drafts", "protected-draft", { text: "User draft" });
  const [a, b] = await Promise.all([
    loadScenario(operator, "baru"),
    loadScenario(operator, "baru"),
  ]);
  expect(a).toEqual(b);
  let state = await getLocal("demo", "state");
  expect(state.tables.Requests).toHaveLength(before.tables.Requests.length + 1);
  const r = state.tables.Requests.find((r: RecordData) => r.id === a.requestId);
  await demoCall(operator, "requests.update", {
    id: r.id,
    baseRevision: r.revision,
    operationId: crypto.randomUUID(),
    data: { ...r, summary: "Isian pengguna tetap disimpan" },
  });
  await loadScenario(operator, "baru");
  state = await getLocal("demo", "state");
  expect(
    state.tables.Requests.find((r: RecordData) => r.id === a.requestId).summary,
  ).toBe("Isian pengguna tetap disimpan");
  await resetScenario(operator, "baru");
  state = await getLocal("demo", "state");
  expect(state.tables).toEqual(before.tables);
  expect(await getLocal("drafts", "protected-draft")).toEqual({
    text: "User draft",
  });
});
it("blocks reset with pending work and keeps the same operation in the queue", async () => {
  const manifest = await loadScenario(operator, "baru");
  const op: Operation = {
    operationId: crypto.randomUUID(),
    entityId: manifest.requestId,
    baseRevision: 1,
    createdAt: new Date().toISOString(),
    status: "Konflik perubahan",
    retryCount: 1,
    action: "requests.transition",
    payload: { id: manifest.requestId },
  };
  await queue("demo:demo:Operator", op);
  await expect(resetScenario(operator, "baru")).rejects.toThrow(/antrean/);
  expect(await outbox("demo:demo:Operator")).toContainEqual(
    expect.objectContaining({
      operationId: op.operationId,
      status: "Konflik perubahan",
    }),
  );
  await dequeue("demo:demo:Operator", op.operationId);
  await resetScenario(operator, "baru");
});
it("keeps user records that reference a scenario and refuses a destructive reset", async () => {
  const manifest = await loadScenario(operator, "baru");
  const state = await getLocal("demo", "state");
  state.tables.Resources.push({
    ...state.tables.Resources[0],
    id: crypto.randomUUID(),
    requestId: manifest.requestId,
  });
  await putLocal("demo", "state", state);
  await expect(resetScenario(operator, "baru")).rejects.toThrow(/data lain/);
});
it("rolls back a failed browser write instead of reporting a loaded scenario", async () => {
  const before = await getLocal("demo", "state");
  const spy = vi
    .spyOn(IDBObjectStore.prototype, "put")
    .mockImplementation(() => {
      throw new DOMException("Full", "QuotaExceededError");
    });
  await expect(loadScenario(operator, "baru")).rejects.toThrow(
    /STORAGE.*ruang/,
  );
  spy.mockRestore();
  expect(await getLocal("demo", "state")).toEqual(before);
});
it("never loads or resets in connected mode and never offers Viewer mutation", async () => {
  await expect(loadScenario(viewer, "baru")).rejects.toThrow(/FORBIDDEN/);
  vi.stubEnv("VITE_APP_MODE", "connected");
  vi.resetModules();
  const service = await import("../src/services/demoScenarios");
  await expect(service.loadScenario(operator, "baru")).rejects.toThrow(
    /FORBIDDEN/,
  );
  await expect(service.resetScenario(operator, "baru")).rejects.toThrow(
    /FORBIDDEN/,
  );
});
