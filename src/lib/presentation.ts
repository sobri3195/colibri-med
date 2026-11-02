/** Product labels only: never rewrite stored enums or API keys. */
const tables: Record<string, string> = {
  Requests: "Permohonan",
  Missions: "Misi",
  MedicalReviews: "Penilaian medis",
  FlightReviews: "Tinjauan penerbangan",
  PatientNotes: "Catatan pasien",
  Checklists: "Daftar periksa",
  HandoverRecords: "Catatan serah terima",
  MissionAssignments: "Penugasan misi",
  Resources: "Sumber daya",
  Facilities: "Fasilitas",
  ActivityLogs: "Riwayat aktivitas",
  Aircraft: "Helikopter",
  AircraftReports: "Laporan awak",
};
export const tableLabel = (key: string) => tables[key] ?? key;
export function displayStatus(status: string, demo: boolean) {
  if (status === "Tercatat di Server")
    return demo ? "Tersimpan di perangkat" : "Tercatat di server";
  if (status === "Menunggu jaringan") return "Menunggu sinkronisasi";
  return status;
}
export function actionLabel(action: string) {
  const [group, verb] = action.split(".");
  const names: Record<string, string> = {
    requests: "Permohonan",
    missions: "Misi",
    medicalReviews: "Penilaian medis",
    flightReviews: "Tinjauan penerbangan",
    patientNotes: "Catatan pasien",
    checklists: "Daftar periksa",
    handovers: "Serah terima",
    resources: "Sumber daya",
    facilities: "Fasilitas",
    aircraftReports: "Laporan awak",
  };
  const verbs: Record<string, string> = {
    create: "Pencatatan",
    save: "Penyimpanan",
    update: "Pembaruan",
    transition: "Perubahan tahap",
    assign: "Penugasan",
    reassign: "Perubahan tim",
  };
  return names[group]
    ? `${names[group]} · ${verbs[verb] ?? "Aktivitas"}`
    : "Aktivitas koordinasi";
}

export function listDate(value: string) {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime())
    ? new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Jakarta",
      }).format(parsed) + " WIB"
    : "Waktu belum tersedia";
}
