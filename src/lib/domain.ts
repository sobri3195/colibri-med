import { z } from "zod";
export const requestSchema = z.object({
  name: z.string().trim().min(3).max(100),
  contact: z.string().max(100),
  facility: z.string().min(3).max(150),
  summary: z.string().min(5).max(2000),
  patients: z
    .union([z.number(), z.string().trim().min(1)])
    .transform(Number)
    .pipe(z.number().int().min(1).max(100)),
  location: z.string().min(3).max(300),
  access: z.string().max(500),
  lat: z.union([
    z.literal(""),
    z
      .union([z.number(), z.string().trim().min(1)])
      .transform(Number)
      .pipe(z.number().min(-90).max(90)),
  ]),
  lng: z.union([
    z.literal(""),
    z
      .union([z.number(), z.string().trim().min(1)])
      .transform(Number)
      .pipe(z.number().min(-180).max(180)),
  ]),
});
export const requestStages = [
  "Tercatat di Server",
  "Diterima Operator",
  "Diverifikasi",
  "Dalam Koordinasi",
  "Ditutup",
];
export const missionStages = [
  "Persiapan",
  "Tim Ditugaskan",
  "Berangkat",
  "Tiba di Lokasi",
  "Pasien Dijemput",
  "Menuju Fasilitas Penerima",
  "Serah Terima",
  "Selesai",
];
export const safeCell = (value: unknown) =>
  /^[\s]*[=+@-]/.test(String(value))
    ? "'" + String(value)
    : String(value ?? "");
export function csv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  return [keys, ...rows.map((r) => keys.map((k) => r[k]))]
    .map((row) =>
      row.map((v) => '"' + safeCell(v).replaceAll('"', '""') + '"').join(","),
    )
    .join("\r\n");
}
export function haversine(a: [number, number], b: [number, number]) {
  const rad = (n: number) => (n * Math.PI) / 180;
  const h =
    Math.sin(rad(b[0] - a[0]) / 2) ** 2 +
    Math.cos(rad(a[0])) *
      Math.cos(rad(b[0])) *
      Math.sin(rad(b[1] - a[1]) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
export const date = (v: unknown) =>
  new Date(String(v)).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) +
  " WIB";
