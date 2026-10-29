import type { LeadershipSummary } from "../../types/leadership";
export const perspectives = {
  presiden: {
    label: "Presiden",
    subtitle: "Koordinasi lintas instansi",
    description:
      "Pantau ringkasan permohonan, progres misi, dan hambatan koordinasi bersama.",
    metrics: [
      "requests",
      "activeMissions",
      "completedMissions",
      "patientsReported",
    ],
  },
  kasau: {
    label: "Kasau",
    subtitle: "Operasi udara",
    description:
      "Pantau tahapan misi, tinjauan penerbangan, serta kesiapan sumber daya simulasi.",
    metrics: [
      "activeMissions",
      "completedMissions",
      "cancelledMissions",
      "missions",
    ],
  },
  kemenhan: {
    label: "Kemenhan",
    subtitle: "Kesiapan dukungan",
    description:
      "Pantau kesiapan dukungan, status misi, dan kebutuhan konfirmasi antarpelaksana.",
    metrics: [
      "missions",
      "activeMissions",
      "cancelledMissions",
      "completedMissions",
    ],
  },
  kemenkes: {
    label: "Kemenkes",
    subtitle: "Koordinasi pelayanan kesehatan",
    description:
      "Pantau beban permohonan, penilaian medis, fasilitas, dan pencatatan serah terima.",
    metrics: [
      "requests",
      "patientsReported",
      "completedMissions",
      "activeMissions",
    ],
  },
} as const;
export type Perspective = keyof typeof perspectives;
export const metricLabels: Record<string, string> = {
  requests: "Permohonan tercatat",
  patientsReported: "Pasien pada permohonan",
  missions: "Misi dalam kohor",
  activeMissions: "Misi aktif",
  completedMissions: "Misi selesai",
  cancelledMissions: "Misi dibatalkan",
};
export function attentionItems(s: LeadershipSummary, includeZero = false) {
  return [
    {
      code: "operator",
      label: "Permohonan menunggu respons",
      count: s.pending.operator,
      owner: "Operator",
      detail: "Perlu pemeriksaan dan penerimaan permohonan oleh operator.",
    },
    {
      code: "medical",
      label: "Penilaian medis belum tuntas",
      count: s.pending.medical,
      owner: "Koordinator medis",
      detail: "Belum ada rekomendasi medis terkini yang dicatat.",
    },
    {
      code: "flight",
      label: "Tinjauan penerbangan belum tuntas",
      count: s.pending.flight,
      owner: "Koordinator penerbangan",
      detail:
        "Menunggu keputusan petugas; rekomendasi medis bukan izin terbang.",
    },
    {
      code: "delayed",
      label: "Penerbangan ditunda",
      count: s.pending.flightDelayed,
      owner: "Koordinator penerbangan",
      detail:
        "Keputusan penundaan tercatat. Alasan rinci ditinjau petugas melalui modul operasional.",
    },
    {
      code: "denied",
      label: "Penerbangan tidak disetujui",
      count: s.pending.flightDenied,
      owner: "Koordinator penerbangan",
      detail: "Keputusan tidak disetujui dicatat oleh petugas berwenang.",
    },
    {
      code: "handover",
      label: "Serah terima belum dicatat",
      count: s.pending.handover,
      owner: "Tim & rumah sakit penerima",
      detail:
        "Misi aktif belum memiliki rekam serah terima. Ini bukan indikator keterlambatan.",
    },
    {
      code: "override",
      label: "Selesai tanpa rekam serah terima",
      count: s.pending.completedWithoutHandover,
      owner: "Operator & administrator",
      detail: "Tinjau kelengkapan dokumentasi override penyelesaian.",
    },
    {
      code: "resource",
      label: "Kesiapan perlu konfirmasi",
      count: s.resources.unconfirmed + s.resources.unknown,
      owner: "Koordinator sumber daya",
      detail:
        "Snapshot seluruh sumber daya; konfirmasi kesiapan melalui petugas.",
    },
    {
      code: "quality",
      label: "Temuan kualitas data",
      count: Object.values(s.quality).reduce((a, b) => a + b, 0),
      owner: "Administrator",
      detail:
        "Tinjau waktu, status yang tidak dikenal, dan relasi data. Satu record dapat memiliki beberapa temuan.",
    },
  ].filter((item) => includeZero || item.count > 0);
}
export function leadershipReport(s: LeadershipSummary, focus: Perspective) {
  const common = {
    simulation: "PROTOTIPE SIMULASI — DATA SINTETIS",
    periode:
      s.period === "all"
        ? "Seluruh data"
        : s.period + " hari kalender UTC (kohor dibuat)",
    fokus: perspectives[focus].label,
    diperbarui: s.generatedAt,
  };
  const row = (
    kategori: string,
    indikator: string,
    nilai: number,
    satuan = "record",
  ) => ({ kategori, indikator, nilai, satuan, ...common });
  return [
    ...Object.entries(s.totals).map(([key, value]) =>
      row(
        "Kohor",
        metricLabels[key] ?? "Misi aktif di luar periode",
        value,
        key === "patientsReported" ? "pasien yang dimohonkan" : "record",
      ),
    ),
    ...attentionItems(s, true).map((item) =>
      row(
        "Perhatian",
        item.label,
        item.count,
        "indikator/record sesuai kategori",
      ),
    ),
    ...Object.entries(s.resources).map(([key, value]) =>
      row(
        "Sumber daya (snapshot seluruh data)",
        (
          {
            total: "Total",
            ready: "Siap simulasi",
            unconfirmed: "Perlu konfirmasi",
            unavailable: "Tidak siap simulasi",
            unknown: "Belum dikenali",
          } as Record<string, string>
        )[key],
        value,
      ),
    ),
    row(
      "Fasilitas (snapshot seluruh data)",
      "Direktori fasilitas sintetis",
      s.facilities.total,
    ),
    row(
      "Fasilitas (snapshot seluruh data)",
      "Perlu konfirmasi",
      s.facilities.needsConfirmation,
    ),
    ...Object.entries(s.quality).map(([key, value]) =>
      row(
        "Kualitas data (snapshot seluruh data)",
        (
          {
            invalidTimestamps: "Waktu tidak valid",
            unknownStatuses: "Status belum dikenali",
            orphanMissions: "Relasi misi tidak ditemukan",
            orphanHandovers: "Relasi serah terima tidak ditemukan",
          } as Record<string, string>
        )[key],
        value,
        "temuan",
      ),
    ),
    ...s.requestsByStatus.map((item) =>
      row("Status permohonan", item.label, item.count),
    ),
    ...s.missionsByStatus.map((item) =>
      row("Status misi", item.label, item.count),
    ),
    ...s.trend.flatMap((day) => [
      row("Tren UTC " + day.date, "Permohonan dibuat", day.requests),
      row("Tren UTC " + day.date, "Misi selesai", day.completed),
      row("Tren UTC " + day.date, "Misi dibatalkan", day.cancelled),
    ]),
    ...s.stageDurations
      .filter((d) => d.samples > 0)
      .flatMap((d) => [
        row(
          "Durasi tercatat",
          d.stage,
          Math.round(d.meanSeconds),
          "detik (rerata)",
        ),
        row("Sampel durasi", d.stage, d.samples, "transisi"),
      ]),
  ];
}
