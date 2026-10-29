import "fake-indexeddb/auto";
import { afterEach, describe, it, expect, vi } from "vitest";
import { execute, seed } from "../src/services/demo";
import { checklistItems } from "../src/lib/domain";
import { mobileDestination, requestSearch } from "../src/lib/mobile";
import {
  readDemoSession,
  saveDemoSession,
  clearDemoSession,
} from "../src/services/session";
import { saveReceipt, receipts } from "../src/services/storage";
import type { Actor, Operation } from "../src/types";
const admin: Actor = {
  id: "demo:Administrator",
  name: "Petugas Simulasi",
  role: "Administrator",
};
const operator: Actor = { id: "operator", name: "Operator", role: "Operator" };
const op = <T extends Record<string, unknown> = Record<string, unknown>>(
  p: T = {} as T,
) => ({
  operationId: crypto.randomUUID(),
  ...p,
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe("directory and checklist services", () => {
  it("creates, updates and replays facility records with revision and administrator permissions", () => {
    const s = seed();
    const payload = op({
      data: {
        name: "Fasilitas Contoh",
        location: "Lokasi contoh",
        lat: "-6.2",
        lng: "106.8",
        status: "Perlu konfirmasi",
      },
    });
    const r: any = execute(s, admin, "facilities.create", payload);
    expect(execute(s, admin, "facilities.create", payload)).toEqual(r);
    expect(s.tables.Facilities).toHaveLength(3);
    expect(() =>
      execute(s, operator, "facilities.create", op(payload)),
    ).toThrow("FORBIDDEN");
    execute(
      s,
      admin,
      "facilities.update",
      op({
        id: r.id,
        baseRevision: 1,
        data: {
          ...payload.data,
          name: "Fasilitas Baru",
          status: "Tersedia simulasi",
        },
      }),
    );
    expect(() =>
      execute(
        s,
        admin,
        "facilities.update",
        op({ id: r.id, baseRevision: 1, data: payload.data }),
      ),
    ).toThrow("CONFLICT");
    expect(s.tables.Facilities.at(-1)?.name).toBe("Fasilitas Baru");
  });
  it("validates coordinates and rejects directory creation by non-admins", () => {
    const s = seed();
    expect(() =>
      execute(
        s,
        admin,
        "facilities.create",
        op({
          data: {
            name: "Contoh",
            location: "Contoh",
            lat: 91,
            lng: 1,
            status: "Perlu konfirmasi",
          },
        }),
      ),
    ).toThrow("VALIDATION");
    expect(() =>
      execute(
        s,
        operator,
        "resources.create",
        op({
          data: {
            name: "Tim",
            category: "Personel",
            status: "Perlu konfirmasi",
          },
        }),
      ),
    ).toThrow("FORBIDDEN");
  });
  it("creates resources and only permits operator readiness updates", () => {
    const s = seed();
    const r: any = execute(
      s,
      admin,
      "resources.create",
      op({
        data: {
          name: "Tim Sintetis",
          category: "Personel",
          status: "Perlu konfirmasi",
        },
      }),
    );
    execute(
      s,
      operator,
      "resources.update",
      op({
        id: r.id,
        baseRevision: 1,
        data: { name: "Tidak boleh mengganti", status: "Siap simulasi" },
      }),
    );
    expect(s.tables.Resources.at(-1)).toMatchObject({
      name: "Tim Sintetis",
      status: "Siap simulasi",
      revision: 2,
    });
  });
  it("persists boolean checklist items with linked mission and rejects forged item types", () => {
    const s = seed();
    const requestId = s.tables.Requests[0].id;
    s.tables.Requests[0].status = "Dalam Koordinasi";
    const mission: any = execute(
      s,
      admin,
      "missions.assign",
      op({ requestId, team: "Tim Simulasi" }),
    );
    const items = Object.fromEntries(
      checklistItems.map((item) => [item.id, true]),
    );
    const payload = {
      data: {
        requestId,
        missionId: mission.id,
        text: "Koordinasi diperiksa",
        items,
      },
    };
    const checklist: any = execute(s, admin, "checklists.save", op(payload));
    expect(checklist.items).toEqual(items);
    expect(() =>
      execute(
        s,
        admin,
        "checklists.save",
        op({ data: { ...payload.data, items: { ...items, request: "yes" } } }),
      ),
    ).toThrow("VALIDATION");
    expect(() =>
      execute(
        s,
        admin,
        "checklists.save",
        op({ data: { ...payload.data, missionId: "missing" } }),
      ),
    ).toThrow("VALIDATION");
    expect(s.tables.Checklists).toHaveLength(1);
  });
  it("reassigns teams before departure with reasons and retires the previous assignment", () => {
    const s = seed();
    const requestId = s.tables.Requests[0].id;
    s.tables.Requests[0].status = "Dalam Koordinasi";
    const m: any = execute(
      s,
      admin,
      "missions.assign",
      op({ requestId, team: "Tim Awal" }),
    );
    expect(() =>
      execute(
        s,
        operator,
        "missions.reassign",
        op({ id: m.id, baseRevision: 1, team: "Tim Baru", reason: "" }),
      ),
    ).toThrow("VALIDATION");
    execute(
      s,
      operator,
      "missions.reassign",
      op({
        id: m.id,
        baseRevision: 1,
        team: "Tim Baru",
        reason: "Pergantian simulasi",
      }),
    );
    expect(s.tables.Missions[0].team).toBe("Tim Baru");
    expect(s.tables.MissionAssignments.map((r) => r.status)).toEqual([
      "Diganti",
      "Ditugaskan",
    ]);
    s.tables.Missions[0].status = "Berangkat";
    expect(() =>
      execute(
        s,
        operator,
        "missions.reassign",
        op({ id: m.id, baseRevision: 2, team: "Tim Ketiga", reason: "contoh" }),
      ),
    ).toThrow("WORKFLOW");
  });
});
describe("local mobile state", () => {
  it("keeps the demo session expiry unchanged after reload and removes it at logout", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-29T00:00:00Z"));
    const store = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    });
    const session = saveDemoSession(admin);
    vi.advanceTimersByTime(1000);
    expect(readDemoSession()?.expiresAt).toBe(session.expiresAt);
    clearDemoSession();
    expect(readDemoSession()).toBeNull();
    saveDemoSession(admin);
    vi.advanceTimersByTime(3600001);
    expect(readDemoSession()).toBeNull();
  });
  it("preserves only valid mobile destinations and request context", () => {
    const id = crypto.randomUUID();
    expect(mobileDestination("/mobile/misi?request=" + id)).toBe(
      "/mobile/misi?request=" + id,
    );
    expect(mobileDestination("https://external.example/mobile")).toBe(
      "/mobile",
    );
    expect(mobileDestination("/mobile/operasi/unknown")).toBe("/mobile");
    expect(requestSearch("?request=bad&token=secret")).toBe("");
    expect(requestSearch("?request=" + id + "&token=secret")).toBe(
      "?request=" + id,
    );
  });
  it("stores minimal request receipts, isolates owners and ignores non-request operations", async () => {
    const owner = crypto.randomUUID();
    const operation = {
      ...op(),
      action: "requests.create",
      createdAt: new Date().toISOString(),
      status: "Mengirim",
      entityId: crypto.randomUUID(),
      baseRevision: 0,
      retryCount: 0,
      payload: { data: { name: "PRIVATE-NAME" } },
    } as Operation;
    await saveReceipt(owner, operation, {
      id: operation.entityId,
      status: "Tercatat di Server",
      name: "PRIVATE-NAME",
    });
    await saveReceipt(
      owner,
      {
        ...operation,
        operationId: crypto.randomUUID(),
        action: "missions.assign",
      },
      { id: crypto.randomUUID() },
    );
    expect(await receipts(owner)).toHaveLength(1);
    expect(await receipts("other:" + owner)).toHaveLength(0);
    expect(JSON.stringify(await receipts(owner))).not.toContain("PRIVATE-NAME");
  });
});
