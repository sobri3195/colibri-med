export type Role =
  | "Operator"
  | "Koordinator medis"
  | "Koordinator penerbangan"
  | "Dokter/perawat"
  | "Rumah sakit penerima"
  | "Administrator"
  | "Viewer pimpinan";
export const roles: Role[] = [
  "Operator",
  "Koordinator medis",
  "Koordinator penerbangan",
  "Dokter/perawat",
  "Rumah sakit penerima",
  "Administrator",
  "Viewer pimpinan",
];
export interface Actor {
  id: string;
  name: string;
  role: Role;
}
export interface RecordData {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  revision: number;
  status: string;
  [key: string]: unknown;
}
export interface Operation {
  operationId: string;
  entityId: string;
  baseRevision: number;
  createdAt: string;
  status: string;
  retryCount: number;
  action: string;
  payload: Record<string, unknown>;
}
export interface Result {
  ok: boolean;
  data?: any;
  error?: { code: string; message: string };
  requestId: string;
  serverTime: string;
}
