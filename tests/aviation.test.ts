import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { seed, execute, demoCall } from "../src/services/demo";
import {
  aircraftReportSchema,
  aviationSnapshot,
  playbackPosition,
} from "../src/lib/aviation";
import { getLocal, putLocal } from "../src/services/storage";
import type { Actor } from "../src/types";
const admin: Actor = {
  id: "demo:Administrator",
  name: "Administrator Demo",
  role: "Administrator",
};
const operation = (p: Record<string, unknown> = {}) => ({
  operationId: crypto.randomUUID(),
  ...p,
});
const data = (id: string) => ({
  aircraftId: id,
  missionId: "",
  category: "Posisi",
  text: "Laporan operasional sintetis",
  aircraftStatus: "Latihan bergerak",
  lat: -6.23,
  lng: 106.89,
});
afterEach(() => {
  vi.unstubAllGlobals();
});
describe("synthetic flight reports", () => {
  it("seeds two synthetic aircraft with linked sample reports and valid trajectories", () => {
    const s = seed();
    expect(s.tables.Aircraft).toHaveLength(2);
    expect(s.tables.AircraftReports).toHaveLength(2);
    expect(
      s.tables.AircraftReports.every((r) =>
        s.tables.Aircraft.some((a) => a.id === r.aircraftId),
      ),
    ).toBe(true);
    expect(s.tables.Aircraft.every((a) => a.isSynthetic === true)).toBe(true);
  });
  it("validates coordinates, categories and paired positions without accepting status overrides", () => {
    const id = crypto.randomUUID();
    expect(
      aircraftReportSchema.safeParse({ ...data(id), lat: 91 }).success,
    ).toBe(false);
    expect(
      aircraftReportSchema.safeParse({ ...data(id), lat: "", lng: 106 })
        .success,
    ).toBe(false);
    expect(
      aircraftReportSchema.safeParse({
        ...data(id),
        category: "Approve flight",
      }).success,
    ).toBe(false);
    expect(
      aircraftReportSchema.parse({
        ...data(id),
        isSynthetic: false,
        createdBy: "forged",
      }),
    ).not.toHaveProperty("createdBy");
  });
  it("requires a session and preserves role restrictions for read/write", () => {
    const s = seed(),
      a = s.tables.Aircraft[0];
    expect(() => execute(s, null, "aircraft.snapshot", {})).toThrow(
      "UNAUTHORIZED",
    );
    expect(() =>
      execute(
        s,
        { ...admin, role: "Viewer pimpinan" },
        "aircraft.snapshot",
        {},
      ),
    ).toThrow("FORBIDDEN");
    expect(
      execute(s, { ...admin, role: "Operator" }, "aircraft.snapshot", {}),
    ).toHaveProperty("aircraft");
    expect(() =>
      execute(
        s,
        { ...admin, role: "Operator" },
        "aircraftReports.create",
        operation({ baseRevision: a.revision, data: data(a.id) }),
      ),
    ).toThrow("FORBIDDEN");
  });
  it("updates the reported position with concurrency and idempotency without changing missions or flight approval", () => {
    const s = seed();
    const a = s.tables.Aircraft[0];
    const before = JSON.stringify([s.tables.Missions, s.tables.FlightReviews]);
    const p = operation({ baseRevision: a.revision, data: data(a.id) });
    const report: any = execute(s, admin, "aircraftReports.create", p);
    expect(a).toMatchObject({
      lat: -6.23,
      lng: 106.89,
      status: "Latihan bergerak",
      revision: 2,
    });
    expect(report).toMatchObject({
      aircraftId: a.id,
      aircraftRevision: 2,
      positionSupplied: true,
      isSynthetic: true,
    });
    expect(execute(s, admin, "aircraftReports.create", p)).toEqual(report);
    expect(s.tables.AircraftReports).toHaveLength(3);
    expect(() =>
      execute(
        s,
        admin,
        "aircraftReports.create",
        operation({ baseRevision: 1, data: data(a.id) }),
      ),
    ).toThrow("CONFLICT");
    expect(JSON.stringify([s.tables.Missions, s.tables.FlightReviews])).toBe(
      before,
    );
  });
  it("retains the age of a position when a report supplies no new coordinates", () => {
    const s = seed(),
      a = s.tables.Aircraft[0];
    a.positionReportedAt = "2026-01-01T00:00:00Z";
    const p = { ...data(a.id), category: "Koordinasi", lat: "", lng: "" };
    const r: any = execute(
      s,
      admin,
      "aircraftReports.create",
      operation({ baseRevision: 1, data: p }),
    );
    expect(a.positionReportedAt).toBe("2026-01-01T00:00:00Z");
    expect(r.positionSupplied).toBe(false);
    expect(r.lat).toBe(-6.24);
  });
  it("rejects nonexistent mission links and non-synthetic aircraft", () => {
    const s = seed(),
      a = s.tables.Aircraft[0];
    expect(() =>
      execute(
        s,
        admin,
        "aircraftReports.create",
        operation({
          baseRevision: 1,
          data: { ...data(a.id), missionId: crypto.randomUUID() },
        }),
      ),
    ).toThrow("VALIDATION");
    a.isSynthetic = false;
    expect(() =>
      execute(
        s,
        admin,
        "aircraftReports.create",
        operation({ baseRevision: 1, data: data(a.id) }),
      ),
    ).toThrow("NOT_FOUND");
    expect(aviationSnapshot(s.tables).aircraft).toHaveLength(1);
  });
  it("playback interpolates locally without changing stored position or producing an ETA", () => {
    const s = seed();
    const a = aviationSnapshot(s.tables).aircraft[0];
    const before = JSON.stringify(a);
    const position = playbackPosition(a, 10);
    expect(playbackPosition(a, 0)).toEqual(a.trainingPath[0]);
    expect(position[0]).toBeCloseTo(
      (a.trainingPath[0][0] + a.trainingPath[1][0]) / 2,
    );
    expect(position[1]).toBeCloseTo(
      (a.trainingPath[0][1] + a.trainingPath[1][1]) / 2,
    );
    expect(JSON.stringify(a)).toBe(before);
    expect(aviationSnapshot(s.tables)).not.toHaveProperty("eta");
  });
  it("adds missing aircraft tables to an existing demo without losing requests or seeding twice", async () => {
    vi.stubGlobal("navigator", {});
    const s = seed();
    const requestId = s.tables.Requests[0].id;
    delete s.tables.Aircraft;
    delete s.tables.AircraftReports;
    await putLocal("demo", "state", s);
    await demoCall(admin, "aircraft.snapshot", {});
    const stored = await getLocal("demo", "state");
    expect(stored.tables.Requests[0].id).toBe(requestId);
    const ids = stored.tables.Aircraft.map((a: any) => a.id);
    await demoCall(admin, "aircraft.snapshot", {});
    expect(
      (await getLocal("demo", "state")).tables.Aircraft.map((a: any) => a.id),
    ).toEqual(ids);
  });
});
