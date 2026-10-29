import type { Actor, RecordData, Role } from "../types";
import { getLocal, putLocal } from "./storage";
import {
  missionStages,
  requestStages,
  requestSchema,
  facilitySchema,
  resourceSchema,
  checklistItems,
} from "../lib/domain";
import { operationFingerprint } from "../lib/operations";
import { buildLeadershipSummary } from "../lib/leadership";
type State = {
  tables: Record<string, RecordData[]>;
  processed: Record<
    string,
    { owner: string; result: unknown; fingerprint: string }
  >;
};
const record = (data: Record<string, unknown>): RecordData => ({
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: "seed",
  updatedBy: "seed",
  revision: 1,
  status: "Tersedia",
  ...data,
});
export function seed(): State {
  return {
    processed: {},
    tables: {
      Requests: [
        record({
          name: "Pemohon Contoh A",
          contact: "kontak-contoh",
          facility: "Klinik Simulasi Utara",
          summary: "Simulasi kebutuhan evakuasi antar fasilitas",
          patients: 1,
          location: "Lokasi latihan A",
          access: "Akses perlu ditinjau petugas",
          lat: -6.28,
          lng: 106.9,
          status: "Tercatat di Server",
        }),
      ],
      Missions: [],
      MedicalReviews: [],
      FlightReviews: [],
      PatientNotes: [],
      Checklists: [],
      HandoverRecords: [],
      MissionAssignments: [],
      Resources: [
        record({ name: "Tim Simulasi Alpha", status: "Perlu konfirmasi" }),
      ],
      Facilities: [
        record({
          name: "RS Simulasi Pusat",
          lat: -6.2,
          lng: 106.82,
          status: "Perlu konfirmasi",
        }),
        record({ name: "Klinik Simulasi Utara", lat: -6.28, lng: 106.9 }),
      ],
      ActivityLogs: [],
    },
  };
}
const grants: Record<string, Role[]> = {
  requests: ["Operator"],
  resources: ["Operator"],
  missions: ["Operator"],
  medicalReviews: ["Koordinator medis"],
  flightReviews: ["Koordinator penerbangan"],
  patientNotes: ["Dokter/perawat"],
  checklists: ["Dokter/perawat", "Koordinator penerbangan"],
  handovers: ["Rumah sakit penerima", "Dokter/perawat"],
};
const tables: Record<string, string> = {
  requests: "Requests",
  missions: "Missions",
  medicalReviews: "MedicalReviews",
  flightReviews: "FlightReviews",
  patientNotes: "PatientNotes",
  checklists: "Checklists",
  facilities: "Facilities",
  resources: "Resources",
  handovers: "HandoverRecords",
  activity: "ActivityLogs",
};
function parseRequest(data: unknown) {
  const parsed = requestSchema.safeParse(data);
  if (!parsed.success)
    throw Error(
      "VALIDATION: Data permohonan tidak valid; periksa field dan pasangan koordinat",
    );
  return parsed.data;
}
export function execute(
  s: State,
  actor: Actor | null,
  action: string,
  p: any,
): unknown {
  if (action === "auth.me") return actor;
  const [group, verb] = action.split(".");
  const table = tables[group];
  if (!actor && action !== "requests.create")
    throw Error("UNAUTHORIZED: Login diperlukan");
  if (action === "leadership.summary") {
    if (!["Viewer pimpinan", "Administrator"].includes(actor!.role))
      throw Error(
        "FORBIDDEN: Akses pengawasan memerlukan peran Viewer pimpinan atau Administrator",
      );
    return buildLeadershipSummary(s.tables, p);
  }
  if (actor?.role === "Viewer pimpinan")
    throw Error(
      "FORBIDDEN: Gunakan ringkasan pengawasan pimpinan; data operasional rinci dibatasi",
    );
  if (verb === "list" || verb === "get") {
    if (!table) throw Error("ACTION: Action tidak tersedia");
    let rows = s.tables[table];
    if (
      group === "patientNotes" &&
      actor &&
      !["Dokter/perawat", "Koordinator medis", "Administrator"].includes(
        actor.role,
      )
    )
      throw Error("FORBIDDEN: Catatan dibatasi");
    if (verb === "get") return rows.find((r) => r.id === p.id) ?? null;
    rows = rows.filter(
      (r) =>
        (!p.status || r.status === p.status) &&
        (!p.requestId || r.requestId === p.requestId) &&
        (!p.missionId || r.missionId === p.missionId) &&
        (!p.search ||
          JSON.stringify(r)
            .toLowerCase()
            .includes(String(p.search).toLowerCase())),
    );
    return {
      items: rows.slice(
        p.offset ?? 0,
        (p.offset ?? 0) + Math.min(p.limit ?? 50, 100),
      ),
      total: rows.length,
    };
  }
  if (action === "reports.summary")
    return Object.fromEntries(
      Object.entries(s.tables).filter(
        ([key]) =>
          key !== "PatientNotes" ||
          ["Dokter/perawat", "Koordinator medis", "Administrator"].includes(
            actor!.role,
          ),
      ),
    );
  if (
    actor?.role !== "Administrator" &&
    !(grants[group] ?? []).includes(actor?.role as Role) &&
    !(action === "requests.create")
  )
    throw Error("FORBIDDEN: Peran tidak berwenang");
  if (
    !table ||
    !["create", "update", "transition", "assign", "save", "reassign"].includes(
      verb,
    )
  )
    throw Error("ACTION: Action tidak tersedia");
  if (typeof p.operationId !== "string" || !p.operationId)
    throw Error("VALIDATION: operationId diperlukan");
  const owner = actor?.id ?? "public";
  if (
    ["facilities.create", "facilities.update", "resources.create"].includes(
      action,
    ) &&
    actor?.role !== "Administrator"
  )
    throw Error("FORBIDDEN: Pengelolaan direktori memerlukan Administrator");
  const fingerprint = operationFingerprint(action, p);
  const previous = s.processed[p.operationId];
  if (previous) {
    if (previous.owner !== owner)
      throw Error("FORBIDDEN: Operasi milik pengguna lain");
    if (previous.fingerprint !== fingerprint)
      throw Error(
        "OPERATION_REUSE: operationId telah digunakan untuk permintaan berbeda",
      );
    return previous.result;
  }
  if (
    typeof p.operationId !== "string" ||
    !/^[a-f0-9-]{36}$/.test(p.operationId) ||
    (p.id && !/^[a-f0-9-]{36}$/.test(p.id))
  )
    throw Error("VALIDATION: ID tidak valid");
  let row = s.tables[table].find((r) => r.id === p.id);
  const priorRevision = row?.revision;
  const previousStatus = row?.status ?? "";
  const previousUpdatedAt =
    typeof row?.stageChangedAt === "string"
      ? row.stageChangedAt
      : row?.updatedAt;
  if (group.includes("Reviews")) {
    const existing = s.tables[table]
      .filter((r) => r.requestId === p.data?.requestId)
      .at(-1);
    if (existing && row?.id !== existing.id)
      throw Error(
        "CONFLICT: Penilaian sudah ada; muat data terbaru sebelum memperbarui",
      );
    if (row && row.requestId !== p.data?.requestId)
      throw Error("VALIDATION: Relasi penilaian tidak dapat diubah");
  }
  if (row && p.baseRevision !== row.revision)
    throw Error("CONFLICT: Revision berubah; muat ulang dan tinjau");
  if (action === "requests.create") {
    if (row) throw Error("CONFLICT: ID sudah digunakan");
    const data = parseRequest(p.data);
    row = record({
      ...data,
      id: p.id ?? crypto.randomUUID(),
      status: "Tercatat di Server",
      createdBy: owner,
    });
    s.tables.Requests.push(row);
  } else if (action === "missions.assign") {
    if (row) throw Error("CONFLICT: ID misi sudah digunakan");
    if (typeof p.team !== "string" || !p.team.trim() || p.team.length > 150)
      throw Error("VALIDATION: Nama tim diperlukan");
    if (
      !s.tables.Requests.some(
        (r) => r.id === p.requestId && r.status === "Dalam Koordinasi",
      )
    )
      throw Error("WORKFLOW: Permohonan harus dalam koordinasi");
    if (s.tables.Missions.some((r) => r.requestId === p.requestId))
      throw Error("WORKFLOW: Misi sudah dibuat");
    row = record({
      id: p.id ?? crypto.randomUUID(),
      requestId: p.requestId,
      status: "Persiapan",
      team: p.team,
      createdBy: owner,
    });
    s.tables.Missions.push(row);
    s.tables.MissionAssignments.push(
      record({
        missionId: row.id,
        team: p.team,
        createdBy: owner,
        status: "Ditugaskan",
      }),
    );
  } else if (action === "missions.reassign") {
    if (!row) throw Error("NOT_FOUND: Misi tidak ditemukan");
    if (!["Persiapan", "Tim Ditugaskan"].includes(row.status))
      throw Error("WORKFLOW: Perubahan tim hanya sebelum keberangkatan");
    if (
      typeof p.team !== "string" ||
      !p.team.trim() ||
      p.team.length > 150 ||
      typeof p.reason !== "string" ||
      !p.reason.trim() ||
      p.reason.length > 500
    )
      throw Error("VALIDATION: Nama tim dan alasan perubahan wajib diisi");
    row.stageChangedAt = previousUpdatedAt;
    row.team = p.team.trim();
    row.reason = p.reason.trim();
    for (const assignment of s.tables.MissionAssignments.filter(
      (a) => a.missionId === row!.id && a.status === "Ditugaskan",
    )) {
      assignment.status = "Diganti";
      assignment.updatedAt = new Date().toISOString();
      assignment.updatedBy = owner;
      assignment.revision++;
    }
    s.tables.MissionAssignments.push(
      record({
        missionId: row.id,
        team: row.team,
        reason: row.reason,
        createdBy: owner,
        status: "Ditugaskan",
      }),
    );
  } else if (action === "requests.update") {
    if (!row) throw Error("NOT_FOUND: Record tidak ditemukan");
    Object.assign(row, parseRequest(p.data));
  } else if (
    ["facilities.create", "facilities.update", "resources.create"].includes(
      action,
    )
  ) {
    if (verb === "create" && row)
      throw Error("CONFLICT: ID direktori sudah digunakan");
    if (verb === "update" && !row)
      throw Error("NOT_FOUND: Record direktori tidak ditemukan");
    const parsed = (
      group === "facilities" ? facilitySchema : resourceSchema
    ).safeParse(p.data);
    if (!parsed.success)
      throw Error(
        "VALIDATION: Data direktori tidak valid; periksa nama, lokasi, koordinat dan status",
      );
    if (row) Object.assign(row, parsed.data);
    else {
      row = record({
        ...parsed.data,
        id: p.id ?? crypto.randomUUID(),
        createdBy: owner,
      });
      s.tables[table].push(row);
    }
  } else if (action === "resources.update") {
    if (
      !row ||
      typeof p.data?.status !== "string" ||
      !["Perlu konfirmasi", "Siap simulasi", "Tidak siap simulasi"].includes(
        p.data.status,
      )
    )
      throw Error("VALIDATION: Status kesiapan tidak valid");
    if (actor?.role === "Administrator" && p.data.name !== undefined) {
      const parsed = resourceSchema.safeParse(p.data);
      if (!parsed.success)
        throw Error("VALIDATION: Data sumber daya tidak valid");
      Object.assign(row, parsed.data);
    }
    row.status = p.data.status;
  } else if (verb === "transition") {
    if (
      p.reason !== undefined &&
      (typeof p.reason !== "string" || p.reason.length > 500)
    )
      throw Error("VALIDATION: Alasan tidak valid");
    if (!row) throw Error("NOT_FOUND: Record tidak ditemukan");
    const stages = group === "missions" ? missionStages : requestStages;
    if (p.status === "Dibatalkan" && group !== "missions")
      throw Error("WORKFLOW: Status tidak valid");
    if (p.status === "Dibatalkan" && !String(p.reason ?? "").trim())
      throw Error("WORKFLOW: Alasan pembatalan diperlukan");
    if (row.status === "Selesai" || row.status === "Dibatalkan")
      throw Error("WORKFLOW: Misi telah ditutup");
    if (
      p.status !== "Dibatalkan" &&
      stages.indexOf(String(p.status)) !== stages.indexOf(row.status) + 1
    )
      throw Error("WORKFLOW: Transisi tidak valid");
    if (
      p.status === "Berangkat" &&
      s.tables.FlightReviews.filter((r) => r.requestId === row!.requestId).at(
        -1,
      )?.status !== "Disetujui"
    )
      throw Error("WORKFLOW: Persetujuan penerbangan diperlukan");
    if (p.status === "Tim Ditugaskan" && !row.team)
      throw Error("WORKFLOW: Tim diperlukan");
    if (
      p.status === "Selesai" &&
      !s.tables.HandoverRecords.some((r) => r.missionId === row!.id) &&
      !String(p.reason ?? "").trim()
    )
      throw Error("WORKFLOW: Serah terima atau alasan override diperlukan");
    row.status = p.status;
    if (group === "missions") row.stageChangedAt = new Date().toISOString();
    if (p.reason) row.reason = p.reason;
  } else if (["save", "create"].includes(verb)) {
    if (
      group === "flightReviews" &&
      ![
        "Belum Ditinjau",
        "Dalam Peninjauan",
        "Disetujui",
        "Ditunda",
        "Tidak Disetujui",
      ].includes(p.data?.status)
    )
      throw Error("VALIDATION: Status penerbangan tidak valid");
    if (
      group === "medicalReviews" &&
      !["Belum Dinilai", "Sedang Dinilai", "Rekomendasi Dicatat"].includes(
        p.data?.status,
      )
    )
      throw Error("VALIDATION: Status medis tidak valid");
    if (
      ["Ditunda", "Tidak Disetujui"].includes(p.data?.status) &&
      !String(p.data?.reason ?? "").trim()
    )
      throw Error("VALIDATION: Alasan diperlukan");
    if (
      typeof p.data?.text !== "string" ||
      !p.data.text.trim() ||
      p.data.text.length > 2000
    )
      throw Error(
        "VALIDATION: Catatan teks diperlukan, maksimal 2000 karakter",
      );
    if (
      p.data.reason !== undefined &&
      (typeof p.data.reason !== "string" || p.data.reason.length > 500)
    )
      throw Error("VALIDATION: Alasan tidak valid");
    if (
      !group.includes("Reviews") &&
      p.data.status !== undefined &&
      p.data.status !== "Dicatat"
    )
      throw Error("VALIDATION: Status catatan tidak valid");
    if (!s.tables.Requests.some((r) => r.id === p.data?.requestId))
      throw Error("VALIDATION: Permohonan tidak ditemukan");
    if (
      ["handovers", "patientNotes", "checklists"].includes(group) &&
      !s.tables.Missions.some(
        (r) => r.id === p.data?.missionId && r.requestId === p.data.requestId,
      )
    )
      throw Error("VALIDATION: Misi tidak sesuai");
    const data = {
      text: String(p.data.text).slice(0, 2000),
      requestId: p.data.requestId,
      missionId: p.data.missionId ?? "",
      status: p.data.status ?? "Dicatat",
      reason: p.data.reason ?? "",
      ...(group === "checklists" && p.data.items !== undefined
        ? {
            items: (() => {
              if (
                !p.data.items ||
                typeof p.data.items !== "object" ||
                Array.isArray(p.data.items) ||
                Object.keys(p.data.items).some(
                  (key) => !checklistItems.some((item) => item.id === key),
                ) ||
                checklistItems.some(
                  (item) => typeof p.data.items[item.id] !== "boolean",
                )
              )
                throw Error("VALIDATION: Butir checklist tidak valid");
              return Object.fromEntries(
                checklistItems.map((item) => [item.id, p.data.items[item.id]]),
              );
            })(),
          }
        : {}),
    };
    if (row) Object.assign(row, data);
    else {
      row = record({
        ...data,
        id: p.id ?? crypto.randomUUID(),
        createdBy: owner,
      });
      s.tables[table].push(row);
    }
  } else throw Error("ACTION: Action tidak tersedia");
  row!.updatedAt = new Date().toISOString();
  row!.updatedBy = owner;
  row!.revision = (priorRevision ?? 0) + 1;
  s.tables.ActivityLogs.unshift(
    record({
      action,
      entityId: row!.id,
      createdBy: owner,
      status: row!.status,
      previousStatus,
      durationSeconds: previousUpdatedAt
        ? Math.max(0, (Date.now() - Date.parse(previousUpdatedAt)) / 1000)
        : 0,
      reason: String(p.reason ?? row!.reason ?? ""),
    }),
  );
  const result = structuredClone(row);
  s.processed[p.operationId] = {
    owner,
    result,
    fingerprint,
  };
  return result;
}
export async function demoCall(actor: Actor | null, action: string, p: any) {
  const run = async () => {
    const s: State = (await getLocal("demo", "state")) ?? seed();
    const result = execute(s, actor, action, p);
    await putLocal("demo", "state", s);
    return result;
  };
  return navigator.locks ? navigator.locks.request("colibri-demo", run) : run();
}
