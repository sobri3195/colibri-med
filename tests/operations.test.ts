import { expect, it } from "vitest";
import { execute, seed } from "../src/services/demo";
import { operationFingerprint } from "../src/lib/operations";
import { summaryCounts } from "../src/lib/domain";
it("dashboard counts use the current review and exclude closed requests and cancelled missions", () => {
  const s = seed();
  const id = s.tables.Requests[0].id;
  s.tables.FlightReviews = [
    { requestId: id, status: "Disetujui" },
    { requestId: id, status: "Ditunda" },
  ] as any;
  s.tables.Missions = [
    { id: "cancelled", requestId: id, status: "Dibatalkan" },
  ] as any;
  expect(summaryCounts(s.tables)).toMatchObject({
    "Misi aktif": 0,
    "Konfirmasi rumah sakit": 0,
    "Tinjauan penerbangan tertunda": 1,
  });
  s.tables.Requests[0].status = "Ditutup";
  expect(summaryCounts(s.tables)).toMatchObject({
    "Penilaian medis tertunda": 0,
    "Tinjauan penerbangan tertunda": 0,
  });
});
const actor = {
  id: "operator-test",
  name: "Simulasi",
  role: "Operator" as const,
};
const valid = {
  name: "Pemohon Sintetis",
  contact: "contoh",
  facility: "Klinik Contoh",
  summary: "Permohonan sintetis",
  patients: 1,
  location: "Contoh",
  access: "",
  lat: "",
  lng: "",
};
it("operation replay is bound to the action and exact payload with stable object key order", () => {
  const s = seed();
  const p = { operationId: crypto.randomUUID(), data: valid };
  const result = execute(s, actor, "requests.create", p);
  expect(
    execute(s, actor, "requests.create", {
      data: { ...valid },
      operationId: p.operationId,
    }),
  ).toEqual(result);
  expect(() =>
    execute(s, actor, "requests.create", {
      ...p,
      data: { ...valid, patients: 2 },
    }),
  ).toThrow("OPERATION_REUSE");
  expect(() => execute(s, actor, "requests.update", p)).toThrow(
    "OPERATION_REUSE",
  );
  expect(s.tables.Requests).toHaveLength(2);
});
it("canonical hashes are stable across key order, JSON serialization and bounded depth", () => {
  expect(operationFingerprint("a", { b: 1, a: 2, unused: undefined })).toBe(
    operationFingerprint("a", { a: 2, b: 1 }),
  );
  let nested: unknown = "value";
  for (let i = 0; i < 30; i++) nested = { next: nested };
  expect(() => operationFingerprint("a", nested)).toThrow("VALIDATION");
});
it("simultaneous medical reviews must use the current record and revision", () => {
  const s = seed();
  const requestId = s.tables.Requests[0].id;
  const medical = {
    id: "med",
    name: "Medis",
    role: "Koordinator medis" as const,
  };
  const first: any = execute(s, medical, "medicalReviews.save", {
    operationId: crypto.randomUUID(),
    data: { requestId, text: "Penilaian pertama", status: "Sedang Dinilai" },
  });
  expect(() =>
    execute(s, medical, "medicalReviews.save", {
      operationId: crypto.randomUUID(),
      data: {
        requestId,
        text: "Penilaian bersamaan",
        status: "Rekomendasi Dicatat",
      },
    }),
  ).toThrow("CONFLICT");
  execute(s, medical, "medicalReviews.save", {
    id: first.id,
    baseRevision: first.revision,
    operationId: crypto.randomUUID(),
    data: {
      requestId,
      text: "Rekomendasi petugas",
      status: "Rekomendasi Dicatat",
    },
  });
  expect(() =>
    execute(s, medical, "medicalReviews.save", {
      id: first.id,
      baseRevision: first.revision,
      operationId: crypto.randomUUID(),
      data: { requestId, text: "Draft lama", status: "Sedang Dinilai" },
    }),
  ).toThrow("CONFLICT");
  expect(s.tables.MedicalReviews).toHaveLength(1);
  expect(s.tables.MedicalReviews[0].revision).toBe(2);
});
it("invalid request shapes fail with a safe validation code and paired coordinates", () => {
  const s = seed();
  expect(() =>
    execute(s, null, "requests.create", {
      operationId: crypto.randomUUID(),
      data: { ...valid, patients: true },
    }),
  ).toThrow("VALIDATION");
  expect(() =>
    execute(s, null, "requests.create", {
      operationId: crypto.randomUUID(),
      data: { ...valid, lat: 0, lng: "" },
    }),
  ).toThrow("VALIDATION");
  expect(s.tables.Requests).toHaveLength(1);
});
