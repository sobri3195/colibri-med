import { describe, it, expect } from "vitest";
import {
  displayStatus,
  tableLabel,
  actionLabel,
  listDate,
} from "../src/lib/presentation";
describe("product labels preserve provenance", () => {
  it("never calls a demo record server-confirmed", () => {
    expect(displayStatus("Tercatat di Server", true)).toBe(
      "Tersimpan di perangkat",
    );
    expect(displayStatus("Tercatat di Server", false)).toBe(
      "Tercatat di server",
    );
    expect(displayStatus("Menunggu jaringan", false)).toBe(
      "Menunggu sinkronisasi",
    );
    expect(displayStatus("Konflik perubahan", true)).toBe("Konflik perubahan");
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
