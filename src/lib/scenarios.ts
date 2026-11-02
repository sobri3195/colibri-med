import { execute, type State } from "../services/demo";
import { checklistItems, missionStages } from "./domain";
import type { Actor, RecordData, Role } from "../types";
export const scenarioDefinitions = {
  baru: {
    title: "Permohonan baru",
    description: "Belum ditinjau. Mulai dari pemeriksaan operator.",
  },
  koordinasi: {
    title: "Koordinasi berlangsung",
    description:
      "Riwayat penilaian, tim, helikopter dan daftar periksa sudah disiapkan.",
  },
  selesai: {
    title: "Misi selesai",
    description:
      "Riwayat lengkap sampai serah terima dan penyelesaian, tanpa override.",
  },
} as const;
export type ScenarioKey = keyof typeof scenarioDefinitions;
export const isScenarioKey = (key: string): key is ScenarioKey =>
  Object.hasOwn(scenarioDefinitions, key);
export function scenarioId(key: ScenarioKey, index: number) {
  const prefix = (
    0xd3000000 +
    (["baru", "koordinasi", "selesai"].indexOf(key) + 1) * 0x10000 +
    index
  ).toString(16);
  return `${prefix}-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
}
export const scenarioRows = (s: State, key: ScenarioKey) =>
  Object.values(s.tables)
    .flat()
    .filter((r) => r.demoScenario === key);
/** Prepared history is built with the same domain validators; it never invokes a remote API. */
export function buildScenario(key: ScenarioKey, now = Date.now()): State {
  const tables = Object.fromEntries(
    [
      "Requests",
      "Missions",
      "MedicalReviews",
      "FlightReviews",
      "PatientNotes",
      "Checklists",
      "HandoverRecords",
      "MissionAssignments",
      "Resources",
      "Facilities",
      "ActivityLogs",
      "Aircraft",
      "AircraftReports",
    ].map((t) => [t, [] as RecordData[]]),
  );
  const s: State = { tables, processed: {} };
  let step = 0;
  const base = now - 90 * 60000;
  const apply = (role: Role, action: string, p: Record<string, unknown>) =>
    execute(
      s,
      { id: `scenario:${role}`, name: "Peran latihan sintetis", role } as Actor,
      action,
      { ...p, operationId: scenarioId(key, 1000 + step++) },
      base + step * 60000,
    ) as RecordData;
  const label = scenarioDefinitions[key].title;
  const origin = apply("Administrator", "facilities.create", {
    id: scenarioId(key, 1),
    data: {
      name: `Klinik Latihan ${label}`,
      location: "Area latihan sintetis asal",
      lat: -6.28,
      lng: 106.9,
      status: "Tersedia simulasi",
    },
  });
  const receiver = apply("Administrator", "facilities.create", {
    id: scenarioId(key, 2),
    data: {
      name: `RS Latihan ${label}`,
      location: "Area latihan sintetis penerima",
      lat: -6.2,
      lng: 106.82,
      status: "Tersedia simulasi",
    },
  });
  const resource = apply("Administrator", "resources.create", {
    id: scenarioId(key, 3),
    data: {
      name: `Tim Latihan ${label}`,
      category: "Personel",
      status: key === "baru" ? "Perlu konfirmasi" : "Siap simulasi",
    },
  });
  const aircraft: RecordData = {
    id: scenarioId(key, 4),
    name: `Helikopter Latihan ${label}`,
    demoCode: `SK-${key.toUpperCase()}`,
    lat: -6.28,
    lng: 106.9,
    status: "Latihan di pangkalan",
    revision: 1,
    createdAt: new Date(base).toISOString(),
    updatedAt: new Date(base).toISOString(),
    createdBy: "scenario",
    updatedBy: "scenario",
    positionReportedAt: new Date(base).toISOString(),
    missionId: "",
    trainingPath: [],
    isSynthetic: true,
  };
  tables.Aircraft.push(aircraft);
  const request = apply("Operator", "requests.create", {
    id: scenarioId(key, 5),
    data: {
      name: "Pemohon latihan sintetis",
      contact: "latihan@invalid.example",
      facility: origin.name,
      patients: 2,
      summary:
        "Latihan pemindahan dua pasien sintetis antar fasilitas; bukan kebutuhan medis nyata.",
      location: "Area latihan asal",
      access: "Akses latihan perlu pemeriksaan petugas",
      lat: -6.28,
      lng: 106.9,
    },
  });
  Object.assign(request, {
    originFacilityId: origin.id,
    receivingFacilityId: receiver.id,
  });
  Object.assign(tables.Requests[0], {
    originFacilityId: origin.id,
    receivingFacilityId: receiver.id,
  });
  if (key !== "baru") {
    for (const status of [
      "Diterima Operator",
      "Diverifikasi",
      "Dalam Koordinasi",
    ]) {
      const r = tables.Requests[0];
      apply("Operator", "requests.transition", {
        id: r.id,
        baseRevision: r.revision,
        status,
      });
    }
    apply("Koordinator medis", "medicalReviews.save", {
      id: scenarioId(key, 6),
      data: {
        requestId: request.id,
        text: "Riwayat latihan: kebutuhan medis sintetis sudah ditinjau oleh peran medis.",
        status: "Rekomendasi Dicatat",
      },
    });
    apply("Koordinator penerbangan", "flightReviews.save", {
      id: scenarioId(key, 7),
      data: {
        requestId: request.id,
        text: "Riwayat latihan: tinjauan penerbangan dicatat terpisah dari penilaian medis.",
        status: "Disetujui",
      },
    });
    const mission = apply("Operator", "missions.assign", {
      id: scenarioId(key, 8),
      requestId: request.id,
      team: resource.name,
      resourceIds: [resource.id],
      aircraftId: aircraft.id,
      receivingFacilityId: receiver.id,
    });
    apply("Koordinator penerbangan", "checklists.save", {
      id: scenarioId(key, 9),
      data: {
        requestId: request.id,
        missionId: mission.id,
        text: "Riwayat daftar periksa latihan lengkap.",
        status: "Dicatat",
        items: Object.fromEntries(checklistItems.map((i) => [i.id, true])),
      },
    });
    apply("Dokter/perawat", "patientNotes.create", {
      id: scenarioId(key, 10),
      data: {
        requestId: request.id,
        missionId: mission.id,
        text: "Catatan perkembangan latihan: kondisi sintetis ditinjau dan koordinasi dicatat.",
        status: "Dicatat",
      },
    });
    apply("Koordinator penerbangan", "aircraftReports.create", {
      id: scenarioId(key, 11),
      baseRevision: aircraft.revision,
      data: {
        aircraftId: aircraft.id,
        missionId: mission.id,
        category: "Koordinasi",
        aircraftStatus: "Latihan di pangkalan",
        text: "Riwayat awak latihan: penugasan helikopter sintetis dicatat.",
        lat: "",
        lng: "",
      },
    });
    const transition = (status: string) => {
      const m = tables.Missions[0];
      apply("Operator", "missions.transition", {
        id: m.id,
        baseRevision: m.revision,
        status,
      });
    };
    transition("Tim Ditugaskan");
    if (key === "selesai") {
      for (const status of missionStages.slice(2, -1)) transition(status);
      apply("Rumah sakit penerima", "handovers.save", {
        id: scenarioId(key, 12),
        data: {
          requestId: request.id,
          missionId: mission.id,
          text: "Riwayat serah terima latihan: dua pasien sintetis diterima fasilitas penerima.",
          status: "Dicatat",
        },
      });
      transition("Selesai");
      const r = tables.Requests[0];
      apply("Operator", "requests.transition", {
        id: r.id,
        baseRevision: r.revision,
        status: "Ditutup",
      });
    }
  }
  for (const [table, rows] of Object.entries(tables))
    for (const [index, row] of rows.entries()) {
      row.demoScenario = key;
      if (table === "ActivityLogs") row.id = scenarioId(key, 8000 + index);
      if (table === "MissionAssignments")
        row.id = scenarioId(key, 9000 + index);
    }
  return s;
}
