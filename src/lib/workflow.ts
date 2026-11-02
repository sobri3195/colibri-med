import type { RecordData } from "../types";
import { missionStages, requestStages } from "./domain";
export function transitionProblem(
  tables: Record<string, RecordData[]>,
  group: string,
  row: RecordData,
  target: string,
  reason: unknown = "",
): string {
  const stages = group === "missions" ? missionStages : requestStages;
  if (["Selesai", "Dibatalkan", "Ditutup"].includes(row.status))
    return "Proses telah ditutup.";
  if (target === "Dibatalkan")
    return group !== "missions"
      ? "Status tidak valid."
      : String(reason ?? "").trim()
        ? ""
        : "Alasan pembatalan diperlukan.";
  if (
    !stages.includes(target) ||
    stages.indexOf(target) !== stages.indexOf(row.status) + 1
  )
    return "Transisi tidak valid. Lanjutkan satu tahap sesuai urutan.";
  if (group === "missions") {
    if (!tables.Requests.some((r) => r.id === row.requestId))
      return "Permohonan terkait tidak ditemukan. Tinjau relasi misi.";
    if (target === "Tim Ditugaskan" && !row.team) return "Tim diperlukan.";
    if (target === "Berangkat") {
      if (
        (tables.FlightReviews ?? [])
          .filter((r) => r.requestId === row.requestId)
          .at(-1)?.status !== "Disetujui"
      )
        return "Persetujuan penerbangan diperlukan. Koordinator penerbangan harus mencatat tinjauan Disetujui; penilaian medis tidak menggantikannya.";
      if (
        Array.isArray(row.resourceIds) &&
        row.resourceIds.some(
          (id) =>
            !(tables.Resources ?? []).some(
              (r) => r.id === id && r.status === "Siap simulasi",
            ),
        )
      )
        return "Sumber daya yang ditugaskan belum Siap simulasi. Operator perlu meninjau kesiapan.";
    }
    if (
      target === "Selesai" &&
      !(tables.HandoverRecords ?? []).some(
        (r) => r.missionId === row.id && r.requestId === row.requestId,
      ) &&
      !String(reason ?? "").trim()
    )
      return "Serah terima atau alasan override diperlukan. Dokter/perawat atau Rumah sakit penerima perlu mencatat serah terima terkait.";
  }
  return "";
}
