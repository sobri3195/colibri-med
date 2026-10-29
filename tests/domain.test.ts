import "fake-indexeddb/auto";
import { describe, it, expect, vi } from "vitest";
import { execute, seed } from "../src/services/demo";
import {
  csv,
  haversine,
  requestSchema,
  missionStages,
} from "../src/lib/domain";
import {
  queue,
  outbox,
  getLocal,
  putLocal,
  dequeue,
} from "../src/services/storage";
import type { Actor, Role } from "../src/types";
const actor = (role: Role): Actor => ({
  id: "actor:" + role,
  name: "Simulasi",
  role,
});
const op = (p: Record<string, unknown> = {}) => ({
  operationId: crypto.randomUUID(),
  ...p,
});
const valid = {
  name: "Pemohon Sintetis",
  contact: "test@invalid.example",
  facility: "Klinik Contoh",
  summary: "Kebutuhan sintetis",
  patients: 1,
  location: "Lokasi contoh",
  access: "Perlu ditinjau",
  lat: -6,
  lng: 106,
};
function coordinate() {
  const s = seed();
  const r = s.tables.Requests[0];
  for (const status of [
    "Diterima Operator",
    "Diverifikasi",
    "Dalam Koordinasi",
  ])
    execute(
      s,
      actor("Operator"),
      "requests.transition",
      op({ id: r.id, baseRevision: r.revision, status }),
    );
  const m: any = execute(
    s,
    actor("Operator"),
    "missions.assign",
    op({ requestId: r.id, team: "Tim Contoh" }),
  );
  return { s, r, m: s.tables.Missions.find((x) => x.id === m.id)! };
}
describe("workflow and permissions", () => {
  it("accepts public synthetic requests but never exposes lists publicly", () => {
    const s = seed();
    expect(
      execute(s, null, "requests.create", op({ data: valid })),
    ).toMatchObject({ status: "Tercatat di Server" });
    expect(() => execute(s, null, "requests.list", {})).toThrow("UNAUTHORIZED");
  });
  it("rejects dangerous extra fields, invalid coordinates, and patient counts", () => {
    expect(requestSchema.safeParse({ ...valid, lat: 91 }).success).toBe(false);
    expect(requestSchema.safeParse({ ...valid, patients: -1 }).success).toBe(
      false,
    );
    expect(
      requestSchema.parse({ ...valid, status: "Selesai" }),
    ).not.toHaveProperty("status");
  });
  it("replays a completed operation without creating duplicates", () => {
    const s = seed();
    const p = op({ data: valid });
    const a = execute(s, null, "requests.create", p);
    expect(execute(s, null, "requests.create", p)).toEqual(a);
    expect(s.tables.Requests).toHaveLength(2);
  });
  it("protects another actor operation result", () => {
    const s = seed();
    const p = op({ data: valid });
    execute(s, actor("Operator"), "requests.create", p);
    expect(() =>
      execute(s, actor("Administrator"), "requests.create", p),
    ).toThrow("FORBIDDEN");
  });
  it("rejects a stale browser revision", () => {
    const s = seed();
    const r = s.tables.Requests[0];
    execute(
      s,
      actor("Operator"),
      "requests.transition",
      op({ id: r.id, baseRevision: 1, status: "Diterima Operator" }),
    );
    expect(() =>
      execute(
        s,
        actor("Operator"),
        "requests.transition",
        op({ id: r.id, baseRevision: 1, status: "Diverifikasi" }),
      ),
    ).toThrow("CONFLICT");
  });
  it("denies role escalation and skips in request transitions", () => {
    const s = seed();
    const r = s.tables.Requests[0];
    expect(() =>
      execute(
        s,
        actor("Viewer pimpinan"),
        "requests.transition",
        op({ id: r.id, baseRevision: r.revision, status: "Diterima Operator" }),
      ),
    ).toThrow("FORBIDDEN");
    expect(() =>
      execute(
        s,
        actor("Operator"),
        "requests.transition",
        op({ id: r.id, baseRevision: r.revision, status: "Dalam Koordinasi" }),
      ),
    ).toThrow("WORKFLOW");
  });
  it("medical recommendation cannot approve flight or authorize departure", () => {
    const { s, r, m } = coordinate();
    execute(
      s,
      actor("Koordinator medis"),
      "medicalReviews.save",
      op({
        data: {
          requestId: r.id,
          text: "Rekomendasi sintetis",
          status: "Rekomendasi Dicatat",
        },
      }),
    );
    execute(
      s,
      actor("Operator"),
      "missions.transition",
      op({ id: m.id, baseRevision: m.revision, status: "Tim Ditugaskan" }),
    );
    expect(() =>
      execute(
        s,
        actor("Operator"),
        "missions.transition",
        op({ id: m.id, baseRevision: m.revision, status: "Berangkat" }),
      ),
    ).toThrow("Persetujuan");
    expect(() =>
      execute(
        s,
        actor("Koordinator medis"),
        "flightReviews.save",
        op({ data: { requestId: r.id, text: "x", status: "Disetujui" } }),
      ),
    ).toThrow("FORBIDDEN");
  });
  it("requires reasons for delayed and rejected flights", () => {
    const { s, r } = coordinate();
    for (const status of ["Ditunda", "Tidak Disetujui"])
      expect(() =>
        execute(
          s,
          actor("Koordinator penerbangan"),
          "flightReviews.save",
          op({ data: { requestId: r.id, text: "Contoh", status } }),
        ),
      ).toThrow("Alasan");
  });
  it("latest flight review supersedes previous approval", () => {
    const { s, r, m } = coordinate();
    for (const [status, reason] of [
      ["Disetujui", ""],
      ["Ditunda", "Perlu tinjauan"],
    ])
      execute(
        s,
        actor("Koordinator penerbangan"),
        "flightReviews.save",
        op({
          ...(s.tables.FlightReviews.at(-1)
            ? {
                id: s.tables.FlightReviews.at(-1)!.id,
                baseRevision: s.tables.FlightReviews.at(-1)!.revision,
              }
            : {}),
          data: { requestId: r.id, text: "Tinjauan sintetis", status, reason },
        }),
      );
    execute(
      s,
      actor("Operator"),
      "missions.transition",
      op({ id: m.id, baseRevision: m.revision, status: "Tim Ditugaskan" }),
    );
    expect(() =>
      execute(
        s,
        actor("Operator"),
        "missions.transition",
        op({ id: m.id, baseRevision: m.revision, status: "Berangkat" }),
      ),
    ).toThrow("Persetujuan");
  });
  it("runs request to handover and report with assigned team and synthetic notes", () => {
    const { s, r, m } = coordinate();
    execute(
      s,
      actor("Koordinator penerbangan"),
      "flightReviews.save",
      op({
        data: {
          requestId: r.id,
          text: "Keputusan petugas sintetis",
          status: "Disetujui",
        },
      }),
    );
    for (const status of missionStages.slice(1, -1))
      execute(
        s,
        actor("Operator"),
        "missions.transition",
        op({ id: m.id, baseRevision: m.revision, status }),
      );
    execute(
      s,
      actor("Dokter/perawat"),
      "patientNotes.create",
      op({
        data: { requestId: r.id, missionId: m.id, text: "Catatan sintetis" },
      }),
    );
    expect(() =>
      execute(
        s,
        actor("Operator"),
        "missions.transition",
        op({ id: m.id, baseRevision: m.revision, status: "Selesai" }),
      ),
    ).toThrow("Serah terima");
    execute(
      s,
      actor("Rumah sakit penerima"),
      "handovers.save",
      op({
        data: {
          requestId: r.id,
          missionId: m.id,
          text: "Serah terima simulasi dicatat",
        },
      }),
    );
    execute(
      s,
      actor("Operator"),
      "missions.transition",
      op({ id: m.id, baseRevision: m.revision, status: "Selesai" }),
    );
    expect(m.status).toBe("Selesai");
    expect(s.tables.MissionAssignments).toHaveLength(1);
    expect(
      execute(s, actor("Viewer pimpinan"), "reports.summary", {}),
    ).not.toHaveProperty("PatientNotes");
    expect(
      execute(s, actor("Dokter/perawat"), "reports.summary", {}),
    ).toHaveProperty("PatientNotes");
  });
  it("rejects notes linked to nonexistent missions", () => {
    const { s, r } = coordinate();
    expect(() =>
      execute(
        s,
        actor("Dokter/perawat"),
        "patientNotes.create",
        op({ data: { requestId: r.id, missionId: "missing", text: "Contoh" } }),
      ),
    ).toThrow("Misi");
  });
});
describe("local data and exports", () => {
  it("filters and paginates on the server adapter", () => {
    const s = seed();
    for (let i = 0; i < 5; i++)
      execute(
        s,
        null,
        "requests.create",
        op({ data: { ...valid, name: "Sample " + i } }),
      );
    const result: any = execute(s, actor("Operator"), "requests.list", {
      search: "Sample",
      offset: 1,
      limit: 2,
    });
    expect(result.total).toBe(5);
    expect(result.items.map((r: any) => r.name)).toEqual([
      "Sample 1",
      "Sample 2",
    ]);
  });
  it("requires cancellation reasons and records manual overrides", () => {
    const { s, m } = coordinate();
    expect(() =>
      execute(
        s,
        actor("Operator"),
        "missions.transition",
        op({ id: m.id, baseRevision: m.revision, status: "Dibatalkan" }),
      ),
    ).toThrow("Alasan");
    execute(
      s,
      actor("Operator"),
      "missions.transition",
      op({
        id: m.id,
        baseRevision: m.revision,
        status: "Dibatalkan",
        reason: "Simulasi dibatalkan petugas",
      }),
    );
    expect(s.tables.ActivityLogs[0]).toMatchObject({
      reason: "Simulasi dibatalkan petugas",
      status: "Dibatalkan",
    });
  });
  it("isolates outbox and drafts by owner", async () => {
    const operation: any = {
      ...op(),
      entityId: "x",
      baseRevision: 0,
      createdAt: new Date().toISOString(),
      status: "Menunggu jaringan",
      retryCount: 0,
      action: "requests.create",
      payload: {},
    };
    await queue("alice", operation);
    expect(await outbox("bob")).toHaveLength(0);
    expect(await outbox("alice")).toHaveLength(1);
    await putLocal("drafts", "alice:note", "secret synthetic");
    expect(await getLocal("drafts", "bob:note")).toBeUndefined();
    await dequeue("alice", operation.operationId);
    expect(await outbox("alice")).toHaveLength(0);
  });
  it("escapes spreadsheet formula and CSV quotes", () => {
    expect(
      csv([{ a: ' =HYPERLINK("bad")', b: "+cmd", c: "@evil", d: "-2" }]),
    ).toContain("' =HYPERLINK");
    expect(csv([{ a: 'a"b' }])).toContain('a""b');
  });
  it("calculates local straight-line distance", () => {
    expect(haversine([0, 0], [0, 0])).toBe(0);
    expect(haversine([0, 0], [0, 1])).toBeCloseTo(111.195, 2);
  });
});
