import type { RecordData } from "../types";
import type {
  CountGroup,
  LeadershipPeriod,
  LeadershipSummary,
} from "../types/leadership";
import { missionStages, requestStages } from "./domain";
export function buildLeadershipSummary(
  tables: Record<string, RecordData[]>,
  payload: Record<string, unknown> = {},
  now = Date.now(),
): LeadershipSummary {
  const period = payload.period === undefined ? "all" : payload.period;
  if (
    !["all", "7", "30"].includes(String(period)) ||
    typeof period !== "string"
  )
    throw Error("VALIDATION: Periode pengawasan tidak valid");
  const utcMidnight = Date.parse(
    new Date(now).toISOString().slice(0, 10) + "T00:00:00Z",
  );
  const cutoff =
    period === "all" ? null : utcMidnight - (Number(period) - 1) * 86400000;
  const cohort = (rows: RecordData[]) =>
    rows.filter(
      (r) =>
        cutoff === null ||
        (Date.parse(r.createdAt) >= cutoff && Date.parse(r.createdAt) <= now),
    );
  const allRequests = tables.Requests ?? [],
    allMissions = tables.Missions ?? [],
    handovers = tables.HandoverRecords ?? [];
  const requests = cohort(allRequests),
    missions = cohort(allMissions);
  const open = requests.filter((r) => r.status !== "Ditutup");
  const active = (rows: RecordData[]) =>
    rows.filter((m) => missionStages.slice(0, -1).includes(m.status));
  const requestIds = new Set(allRequests.map((r) => r.id));
  const missionIds = new Set(allMissions.map((r) => r.id));
  const latest = (table: string, id: string) =>
    (tables[table] ?? []).filter((r) => r.requestId === id).at(-1)?.status;
  const flight = open.map((r) => latest("FlightReviews", r.id));
  const distribution = (rows: RecordData[], known: string[]): CountGroup[] => {
    const groups = known.map((label) => ({
      label,
      count: rows.filter((r) => r.status === label).length,
    }));
    const unknown = rows.filter((r) => !known.includes(r.status)).length;
    return unknown
      ? [...groups, { label: "Status belum dikenali", count: unknown }]
      : groups;
  };
  const resources = tables.Resources ?? [],
    facilities = tables.Facilities ?? [];
  const knownResources = [
    "Siap simulasi",
    "Perlu konfirmasi",
    "Tidak siap simulasi",
  ];
  const relevant = [
    ...allRequests,
    ...allMissions,
    ...(tables.MedicalReviews ?? []),
    ...(tables.FlightReviews ?? []),
    ...handovers,
    ...resources,
    ...facilities,
  ];
  const validTime = (value: string) =>
    Number.isFinite(Date.parse(value)) && Date.parse(value) <= now;
  const latestUpdated = relevant
    .map((r) => r.updatedAt)
    .filter(validTime)
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];
  const updated = latestUpdated
    ? new Date(Date.parse(latestUpdated)).toISOString()
    : null;
  const days = period === "7" ? 7 : 30;
  const today = new Date(now).toISOString().slice(0, 10);
  const midnight = Date.parse(today + "T00:00:00Z");
  const trend = Array.from({ length: days }, (_, i) => {
    const date = new Date(midnight - (days - 1 - i) * 86400000)
      .toISOString()
      .slice(0, 10);
    return {
      date,
      requests: requests.filter((r) => r.createdAt.slice(0, 10) === date)
        .length,
      completed: missions.filter(
        (m) => m.status === "Selesai" && m.updatedAt.slice(0, 10) === date,
      ).length,
      cancelled: missions.filter(
        (m) => m.status === "Dibatalkan" && m.updatedAt.slice(0, 10) === date,
      ).length,
    };
  });
  const cohortIds = new Set(missions.map((m) => m.id));
  const stageDurations = missionStages.map((stage) => {
    const samples = (tables.ActivityLogs ?? [])
      .filter(
        (log) =>
          log.action === "missions.transition" &&
          cohortIds.has(String(log.entityId)) &&
          log.previousStatus === stage &&
          typeof log.durationSeconds === "number" &&
          Number.isFinite(log.durationSeconds) &&
          log.durationSeconds >= 0,
      )
      .map((log) => Number(log.durationSeconds));
    return {
      stage,
      samples: samples.length,
      meanSeconds: samples.length
        ? samples.reduce((a, b) => a + b, 0) / samples.length
        : 0,
    };
  });
  return {
    generatedAt: new Date(now).toISOString(),
    lastDataUpdatedAt: updated,
    period: period as LeadershipPeriod,
    cohortStartAt: cutoff === null ? null : new Date(cutoff).toISOString(),
    totals: {
      requests: requests.length,
      patientsReported: requests.reduce(
        (n, r) =>
          n +
          (typeof r.patients === "number" &&
          Number.isInteger(r.patients) &&
          r.patients > 0
            ? r.patients
            : 0),
        0,
      ),
      missions: missions.length,
      activeMissions: active(missions).length,
      completedMissions: missions.filter((m) => m.status === "Selesai").length,
      cancelledMissions: missions.filter((m) => m.status === "Dibatalkan")
        .length,
      activeOutsidePeriod: active(allMissions).length - active(missions).length,
    },
    pending: {
      operator: open.filter((r) => r.status === "Tercatat di Server").length,
      medical: open.filter(
        (r) => latest("MedicalReviews", r.id) !== "Rekomendasi Dicatat",
      ).length,
      flight: flight.filter(
        (status) => !["Disetujui", "Tidak Disetujui"].includes(status ?? ""),
      ).length,
      handover: active(missions).filter(
        (m) => !handovers.some((h) => h.missionId === m.id),
      ).length,
      flightDelayed: flight.filter((s) => s === "Ditunda").length,
      flightDenied: flight.filter((s) => s === "Tidak Disetujui").length,
      completedWithoutHandover: missions.filter(
        (m) =>
          m.status === "Selesai" &&
          !handovers.some((h) => h.missionId === m.id),
      ).length,
    },
    resources: {
      total: resources.length,
      ready: resources.filter((r) => r.status === "Siap simulasi").length,
      unconfirmed: resources.filter((r) => r.status === "Perlu konfirmasi")
        .length,
      unavailable: resources.filter((r) => r.status === "Tidak siap simulasi")
        .length,
      unknown: resources.filter((r) => !knownResources.includes(r.status))
        .length,
    },
    facilities: {
      total: facilities.length,
      needsConfirmation: facilities.filter(
        (f) => f.status === "Perlu konfirmasi",
      ).length,
    },
    requestsByStatus: distribution(requests, requestStages),
    missionsByStatus: distribution(missions, [...missionStages, "Dibatalkan"]),
    trend,
    stageDurations,
    quality: {
      invalidTimestamps: relevant.filter(
        (r) => !validTime(r.createdAt) || !validTime(r.updatedAt),
      ).length,
      unknownStatuses:
        allRequests.filter((r) => !requestStages.includes(r.status)).length +
        allMissions.filter(
          (m) => ![...missionStages, "Dibatalkan"].includes(m.status),
        ).length,
      orphanMissions: allMissions.filter(
        (m) => !requestIds.has(String(m.requestId)),
      ).length,
      orphanHandovers: handovers.filter(
        (h) => !missionIds.has(String(h.missionId)),
      ).length,
    },
  };
}
