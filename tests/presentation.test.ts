import { describe, it, expect } from "vitest";
import {
  displayStatus,
  tableLabel,
  actionLabel,
  listDate,
  recordSourceLabel,
} from "../src/lib/presentation";
describe("product labels preserve provenance", () => {
  it("never calls a demo record server-confirmed", () => {
    expect(displayStatus("Tercatat di Server", true)).toBe("Permohonan baru");
    expect(displayStatus("Tercatat di Server", false)).toBe("Permohonan baru");
    expect(displayStatus("Menunggu jaringan", false)).toBe(
      "Menunggu sinkronisasi",
    );
    expect(recordSourceLabel(true)).toBe("Tersimpan di perangkat");
    expect(recordSourceLabel(false)).toBe("Tersinkron ke server");
    expect(displayStatus("Konflik perubahan", true)).toBe(
      "Perlu tinjauan konflik",
    );
  });
  it("uses WIB for compact dates and handles absent dates honestly", () => {
    expect(listDate("2026-11-01T18:00:00.000Z")).toContain("2 Nov");
    expect(listDate("2026-11-01T18:00:00.000Z")).toContain("01.00");
    expect(listDate("invalid")).toBe("Waktu belum tersedia");
  });
  it("translates table and activity labels without altering keys", () => {
    expect(tableLabel("MedicalReviews")).toBe("Penilaian medis");
    expect(tableLabel("HandoverRecords")).toBe("Catatan serah terima");
    expect(actionLabel("missions.assign")).toBe("Misi · Penugasan");
  });
});
