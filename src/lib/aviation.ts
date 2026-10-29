import { z } from "zod";
import type { RecordData } from "../types";
import type {
  AviationSnapshot,
  AircraftView,
  AircraftReportView,
} from "../types/aviation";
export const aircraftStatuses = [
  "Latihan di pangkalan",
  "Latihan bergerak",
  "Latihan di lokasi",
  "Latihan selesai",
  "Perlu konfirmasi",
] as const;
export const reportCategories = [
  "Posisi",
  "Koordinasi",
  "Kendala",
  "Laporan akhir",
] as const;
const optionalCoordinate = (min: number, max: number) =>
  z.union([
    z.literal(""),
    z
      .union([z.number(), z.string().trim().min(1)])
      .transform(Number)
      .pipe(z.number().min(min).max(max)),
  ]);
export const aircraftReportSchema = z
  .object({
    aircraftId: z.uuid(),
    missionId: z.union([z.literal(""), z.uuid()]).default(""),
    category: z.enum(reportCategories),
    text: z.string().trim().min(3).max(1000),
    aircraftStatus: z.enum(aircraftStatuses),
    lat: optionalCoordinate(-90, 90).default(""),
    lng: optionalCoordinate(-180, 180).default(""),
  })
  .refine((p) => (p.lat === "") === (p.lng === ""), {
    message: "Koordinat harus berpasangan",
  });
type Factory = (data: Record<string, unknown>) => RecordData;
export function seedAircraft(record: Factory) {
  const paths: [number, number][][] = [
    [
      [-6.24, 106.87],
      [-6.235, 106.88],
      [-6.23, 106.895],
      [-6.22, 106.905],
    ],
    [
      [-6.28, 106.9],
      [-6.27, 106.89],
      [-6.26, 106.875],
      [-6.25, 106.86],
    ],
  ];
  const aircraft = paths.map((path, index) =>
    record({
      name: "Helikopter Simulasi " + String(index + 1).padStart(2, "0"),
      demoCode: "SIM-HELI-" + String(index + 1).padStart(2, "0"),
      lat: path[0][0],
      lng: path[0][1],
      status: "Latihan di pangkalan",
      trainingPath: path,
      missionId: "",
      positionReportedAt: new Date().toISOString(),
      isSynthetic: true,
    }),
  );
  const reports = aircraft.map((a) =>
    record({
      aircraftId: a.id,
      missionId: "",
      category: "Koordinasi",
      text: "Briefing awak sintetis dicatat untuk latihan koordinasi. Bukan laporan penerbangan nyata.",
      lat: a.lat,
      lng: a.lng,
      aircraftStatus: a.status,
      reportedAt: a.updatedAt,
      aircraftRevision: a.revision,
      isSynthetic: true,
      status: "Dicatat",
      positionSupplied: true,
    }),
  );
  return { aircraft, reports };
}
const coordinate = (lat: unknown, lng: unknown) =>
  typeof lat === "number" &&
  typeof lng === "number" &&
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  Math.abs(lat) <= 90 &&
  Math.abs(lng) <= 180;
const iso = (value: unknown) =>
  Number.isFinite(Date.parse(String(value)))
    ? new Date(String(value)).toISOString()
    : "";
export function aviationSnapshot(
  tables: Record<string, RecordData[]>,
): AviationSnapshot {
  const aircraft: AircraftView[] = (tables.Aircraft ?? [])
    .filter((a) => a.isSynthetic === true && coordinate(a.lat, a.lng))
    .map<AircraftView>((a) => ({
      id: a.id,
      name: String(a.name).slice(0, 150),
      demoCode: String(a.demoCode ?? "SIMULASI").slice(0, 50),
      lat: Number(a.lat),
      lng: Number(a.lng),
      status: aircraftStatuses.includes(
        a.status as (typeof aircraftStatuses)[number],
      )
        ? a.status
        : "Perlu konfirmasi",
      revision: a.revision,
      updatedAt: iso(a.updatedAt),
      positionReportedAt: iso(a.positionReportedAt ?? a.createdAt),
      missionId: String(a.missionId ?? ""),
      trainingPath: Array.isArray(a.trainingPath)
        ? (a.trainingPath
            .filter((p) => Array.isArray(p) && coordinate(p[0], p[1]))
            .slice(0, 50) as [number, number][])
        : [],
      isSynthetic: true,
    }));
  const ids = new Set(aircraft.map((a) => a.id));
  const reports: AircraftReportView[] = (tables.AircraftReports ?? [])
    .filter(
      (r) =>
        r.isSynthetic === true &&
        ids.has(String(r.aircraftId)) &&
        coordinate(r.lat, r.lng),
    )
    .map<AircraftReportView>((r) => ({
      id: r.id,
      aircraftId: String(r.aircraftId),
      missionId: String(r.missionId ?? ""),
      category: reportCategories.includes(
        r.category as (typeof reportCategories)[number],
      )
        ? String(r.category)
        : "Koordinasi",
      text: String(r.text ?? "").slice(0, 1000),
      lat: Number(r.lat),
      lng: Number(r.lng),
      aircraftStatus: aircraftStatuses.includes(
        r.aircraftStatus as (typeof aircraftStatuses)[number],
      )
        ? String(r.aircraftStatus)
        : "Perlu konfirmasi",
      reportedAt: iso(r.reportedAt),
      aircraftRevision: Number(r.aircraftRevision ?? 1),
      positionSupplied: r.positionSupplied === true,
      isSynthetic: true,
    }))
    .sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
  return {
    aircraft,
    reports,
    missions: (tables.Missions ?? []).map((m) => ({
      id: m.id,
      status: m.status,
    })),
    generatedAt: new Date().toISOString(),
  };
}
export function playbackPosition(
  aircraft: AircraftView,
  tick: number,
): [number, number] {
  const path = aircraft.trainingPath;
  if (path.length < 2) return [aircraft.lat, aircraft.lng];
  const position = Math.max(0, tick) % ((path.length - 1) * 20);
  const index = Math.floor(position / 20),
    fraction = (position % 20) / 20;
  return [
    path[index][0] + (path[index + 1][0] - path[index][0]) * fraction,
    path[index][1] + (path[index + 1][1] - path[index][1]) * fraction,
  ];
}
