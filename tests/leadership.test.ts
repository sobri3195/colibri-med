import { describe, expect, it } from "vitest";
import { buildLeadershipSummary } from "../src/lib/leadership";
import {
  leadershipReport,
  perspectives,
  attentionItems,
} from "../src/features/leadership/presentation";
import { execute, seed } from "../src/services/demo";
import type { RecordData, Actor } from "../src/types";
const now = Date.parse("2026-10-29T12:00:00Z");
const row = (data: Partial<RecordData>): RecordData => ({
  id: crypto.randomUUID(),
  createdAt: "2026-10-29T08:00:00Z",
  updatedAt: "2026-10-29T09:00:00Z",
  createdBy: "private-actor",
  updatedBy: "private-actor",
  revision: 1,
  status: "Tercatat di Server",
  ...data,
});
const viewer: Actor = {
  id: "viewer",
  name: "Viewer contoh",
  role: "Viewer pimpinan",
};
function fixture(): {
  request: RecordData;
  mission: RecordData;
  tables: Record<string, RecordData[]>;
} {
  const request = row({
    name: "PRIVATE-NAME",
    contact: "PRIVATE-CONTACT",
    summary: "PRIVATE-CLINICAL",
    patients: 2,
    status: "Dalam Koordinasi",
  });
  const mission = row({
    requestId: request.id,
    status: "Tim Ditugaskan",
    team: "PRIVATE-TEAM",
  });
  return {
    request,
    mission,
    tables: {
      Requests: [request],
      Missions: [mission],
      MedicalReviews: [
        row({
          requestId: request.id,
          status: "Rekomendasi Dicatat",
          text: "PRIVATE-REVIEW",
        }),
      ],
      FlightReviews: [
        row({ requestId: request.id, status: "Disetujui" }),
        row({
          requestId: request.id,
          status: "Ditunda",
          reason: "PRIVATE-REASON",
        }),
      ],
      HandoverRecords: [],
      PatientNotes: [row({ missionId: mission.id, text: "PRIVATE-NOTE" })],
      Resources: [
        row({ name: "PRIVATE-RESOURCE", status: "Siap simulasi" }),
        row({ status: "Perlu konfirmasi" }),
        row({ status: "Tidak siap simulasi" }),
      ],
      Facilities: [
        row({
          name: "PRIVATE-FACILITY",
          lat: -6.2,
          lng: 106.8,
          status: "Perlu konfirmasi",
        }),
      ],
      ActivityLogs: [
        row({
          entityId: mission.id,
          action: "missions.transition",
          previousStatus: "Persiapan",
          status: "Tim Ditugaskan",
          durationSeconds: 120,
        }),
      ],
    },
  };
}
describe("leadership aggregate projection", () => {
  it("uses current reviews and separates completed, cancelled, pending and readiness counts", () => {
    const { tables, request } = fixture();
    tables.Missions.push(
      row({ requestId: request.id, status: "Selesai" }),
      row({ requestId: request.id, status: "Dibatalkan" }),
    );
    const s = buildLeadershipSummary(tables, {}, now);
    expect(s.totals).toMatchObject({
      requests: 1,
      patientsReported: 2,
      missions: 3,
      activeMissions: 1,
      completedMissions: 1,
      cancelledMissions: 1,
    });
    expect(s.pending).toMatchObject({
      medical: 0,
      flight: 1,
      flightDelayed: 1,
      handover: 1,
      completedWithoutHandover: 1,
    });
    expect(s.resources).toMatchObject({
      total: 3,
      ready: 1,
      unconfirmed: 1,
      unavailable: 1,
    });
    expect(s.stageDurations.find((d) => d.stage === "Persiapan")).toMatchObject(
      { samples: 1, meanSeconds: 120 },
    );
  });
  it("returns no identities, coordinates, notes, raw reasons or record IDs in the response or report", () => {
    const { tables, request, mission } = fixture();
    const serialized = JSON.stringify(tables);
    const summary = buildLeadershipSummary(tables, {}, now);
    const text = JSON.stringify([
      summary,
      leadershipReport(summary, "presiden"),
    ]);
    expect(text).not.toContain("PRIVATE-");
    expect(text).not.toContain(request.id);
    expect(text).not.toContain(mission.id);
    expect(text).not.toContain("private-actor");
    expect(text).not.toContain("106.8");
    expect(JSON.stringify(tables)).toBe(serialized);
  });
  it("filters created cohorts on UTC calendar boundaries and keeps readiness as a global snapshot", () => {
    const { tables, request } = fixture();
    tables.Requests.push(
      row({ createdAt: "2026-10-23T00:00:00Z", patients: 1 }),
      row({ createdAt: "2026-10-22T23:59:59Z", patients: 1 }),
    );
    tables.Missions.push(
      row({
        requestId: request.id,
        createdAt: "2026-10-01T00:00:00Z",
        status: "Berangkat",
      }),
    );
    const summary = buildLeadershipSummary(tables, { period: "7" }, now);
    expect(summary.cohortStartAt).toBe("2026-10-23T00:00:00.000Z");
    expect(summary.totals.requests).toBe(2);
    expect(summary.totals.activeOutsidePeriod).toBe(1);
    expect(summary.resources.total).toBe(3);
    expect(summary.trend).toHaveLength(7);
    expect(summary.trend[0]).toMatchObject({ date: "2026-10-23", requests: 1 });
  });
  it("handles empty datasets without invented rates, duration samples or readiness", () => {
    const s = buildLeadershipSummary({}, {}, now);
    expect(s.totals.requests).toBe(0);
    expect(s.resources.ready).toBe(0);
    expect(s.lastDataUpdatedAt).toBeNull();
    expect(s.stageDurations.every((d) => d.samples === 0)).toBe(true);
    expect(attentionItems(s)).toHaveLength(0);
  });
  it("sanitizes unknown statuses and timestamps, and reports orphan relations without identifiers", () => {
    const { tables } = fixture();
    tables.Missions.push(
      row({
        requestId: "missing-private-id",
        status: "PRIVATE-UNKNOWN",
        createdAt: "invalid",
        updatedAt: "2099-01-01T00:00:00Z",
      }),
    );
    tables.HandoverRecords.push(row({ missionId: "missing-private-mission" }));
    const s = buildLeadershipSummary(tables, {}, now);
    expect(s.totals.activeMissions).toBe(1);
    expect(s.quality).toMatchObject({
      unknownStatuses: 1,
      invalidTimestamps: 1,
      orphanMissions: 1,
      orphanHandovers: 1,
    });
    expect(JSON.stringify(s)).not.toContain("PRIVATE-UNKNOWN");
    expect(s.lastDataUpdatedAt).toBe("2026-10-29T09:00:00.000Z");
  });
  it("rejects unsupported period values instead of silently broadening the query", () => {
    for (const period of ["1", "365", 7, null, {}, []])
      expect(() => buildLeadershipSummary({}, { period }, now)).toThrow(
        "VALIDATION",
      );
  });
  it("uses the same aggregates for all four perspectives and retains simulation scope in report metadata", () => {
    const s = buildLeadershipSummary(fixture().tables, {}, now);
    for (const focus of Object.keys(
      perspectives,
    ) as (keyof typeof perspectives)[]) {
      const rows = leadershipReport(s, focus);
      expect(rows[0].fokus).toBe(perspectives[focus].label);
      expect(
        rows.find((r) => r.indikator === "Permohonan tercatat")?.nilai,
      ).toBe(1);
      expect(rows.some((r) => r.kategori.startsWith("Sumber daya"))).toBe(true);
    }
  });
});
describe("leadership permissions", () => {
  it("requires a session and the viewer/admin role for the aggregate action", () => {
    const state = seed();
    expect(() => execute(state, null, "leadership.summary", {})).toThrow(
      "UNAUTHORIZED",
    );
    expect(() =>
      execute(state, { ...viewer, role: "Operator" }, "leadership.summary", {}),
    ).toThrow("FORBIDDEN");
    expect(execute(state, viewer, "leadership.summary", {})).toHaveProperty(
      "totals",
    );
    expect(
      execute(
        state,
        { ...viewer, role: "Administrator" },
        "leadership.summary",
        {},
      ),
    ).toHaveProperty("totals");
  });
  it("denies viewer access to raw operational endpoints and all mutations", () => {
    for (const action of [
      "reports.summary",
      "requests.list",
      "requests.get",
      "missions.list",
      "patientNotes.list",
      "facilities.list",
      "requests.create",
      "missions.transition",
    ])
      expect(() => execute(seed(), viewer, action, {})).toThrow("FORBIDDEN");
    expect(execute(seed(), viewer, "auth.me", {})).toEqual(viewer);
  });
});
