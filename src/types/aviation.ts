export interface AircraftView {
  id: string;
  name: string;
  demoCode: string;
  lat: number;
  lng: number;
  status: string;
  revision: number;
  updatedAt: string;
  positionReportedAt: string;
  missionId: string;
  trainingPath: [number, number][];
  isSynthetic: true;
}
export interface AircraftReportView {
  id: string;
  aircraftId: string;
  missionId: string;
  category: string;
  text: string;
  lat: number;
  lng: number;
  aircraftStatus: string;
  reportedAt: string;
  aircraftRevision: number;
  positionSupplied: boolean;
  isSynthetic: true;
}
export interface AviationSnapshot {
  aircraft: AircraftView[];
  reports: AircraftReportView[];
  missions: { id: string; status: string }[];
  generatedAt: string;
}
