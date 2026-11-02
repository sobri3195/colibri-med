import type { RecordData } from "../types";
import { date } from "./domain";
import { displayStatus, tableLabel, recordSourceLabel } from "./presentation";
/** Reports intentionally export the whole role-authorized snapshot, never a hidden list filter. */
export function operationalReportRows(
  tables: Record<string, RecordData[]>,
  demo: boolean,
  role: string,
) {
  return Object.entries(tables).flatMap(([table, records]) =>
    records.map((r) => ({
      Peran: role,
      Cakupan: "Seluruh data yang diizinkan peran",
      Simulasi: "PROTOTIPE SIMULASI — DATA SINTETIS",
      Modul: tableLabel(table),
      Referensi: r.id,
      "Status proses": displayStatus(r.status, demo),
      "Penyimpanan sumber": recordSourceLabel(demo),
      "Pembaruan (WIB)": date(r.updatedAt),
      "Rincian JSON (waktu ISO UTC)": JSON.stringify(r),
    })),
  );
}
