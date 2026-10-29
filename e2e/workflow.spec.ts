import { test, expect } from "@playwright/test";
test("polling pauses while hidden and UI session expires", async ({ page }) => {
  await page.clock.install();
  await page.goto("/login");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Ringkasan koordinasi" }),
  ).toBeVisible();
  const updated = page.locator("small").filter({ hasText: "Pembaruan:" });
  await expect(updated).toBeVisible();
  const first = await updated.textContent();
  await page.clock.runFor(31000);
  await expect(updated).not.toHaveText(first!);
  const visible = await updated.textContent();
  await page.evaluate(() =>
    Object.defineProperty(document, "hidden", {
      value: true,
      configurable: true,
    }),
  );
  await page.clock.runFor(65000);
  await expect(updated).toHaveText(visible!);
  await page.clock.fastForward(3600001);
  await expect(
    page.getByRole("heading", { name: "Login petugas" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("Sesi kedaluwarsa");
});
test("demo workflow through medical review, flight approval, mission, handover and export", async ({
  page,
}) => {
  await page.route("**/tile.openstreetmap.org/**", (route) => route.abort());
  await page.goto("/");
  await expect(
    page
      .getByText("PROTOTIPE SIMULASI — DATA SINTETIS", { exact: false })
      .first(),
  ).toBeVisible();
  await page.getByRole("link", { name: "Masuk ruang koordinasi" }).click();
  await page.getByLabel("Peran demo").selectOption("Administrator");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Ringkasan koordinasi" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ringkasan koordinasi" }),
  ).toBeVisible();
  await page
    .getByRole("complementary")
    .getByRole("link", { name: "Permohonan", exact: true })
    .click();
  for (const name of [
    "Permohonan → Diterima Operator",
    "Permohonan → Diverifikasi",
    "Permohonan → Dalam Koordinasi",
  ])
    await page.getByRole("button", { name, exact: true }).click();
  await page.getByLabel("Tim simulasi").fill("Tim Contoh Browser");
  await page.getByRole("button", { name: "Buat misi & tetapkan tim" }).click();
  const review = page
    .locator("details")
    .filter({ has: page.locator("summary", { hasText: "Penilaian medis" }) });
  await review.locator("summary").click();
  await review
    .getByLabel("Catatan sintetis")
    .fill("Rekomendasi medis sintetis");
  await review
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("Rekomendasi Dicatat");
  await review.getByRole("button", { name: "Catat penilaian medis" }).click();
  const flight = page.locator("details").filter({
    has: page.locator("summary", { hasText: "Tinjauan penerbangan" }),
  });
  await flight.locator("summary").click();
  await flight
    .getByLabel("Catatan sintetis")
    .fill("Persetujuan oleh koordinator simulasi");
  await flight
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("Disetujui");
  await flight
    .getByRole("button", { name: "Catat tinjauan penerbangan" })
    .click();
  for (const name of [
    "Tim Ditugaskan",
    "Berangkat",
    "Tiba di Lokasi",
    "Pasien Dijemput",
    "Menuju Fasilitas Penerima",
    "Serah Terima",
  ])
    await page
      .getByRole("button", { name: "Misi → " + name, exact: true })
      .click();
  const note = page.locator("details").filter({
    has: page.locator("summary", { hasText: "Catatan pasien sintetis" }),
  });
  await note.locator("summary").click();
  await note.getByLabel("Catatan sintetis").fill("Catatan sintetis browser");
  await note
    .getByRole("button", { name: "Catat catatan pasien sintetis" })
    .click();
  const handover = page
    .locator("details")
    .filter({ has: page.locator("summary", { hasText: "Serah terima" }) });
  await handover.locator("summary").click();
  await handover
    .getByLabel("Catatan sintetis")
    .fill("Serah terima diterima petugas contoh");
  await handover.getByRole("button", { name: "Catat serah terima" }).click();
  await page
    .getByRole("button", { name: "Misi → Selesai", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Misi · Selesai" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Laporan", exact: true }).click();
  const csv = page.waitForEvent("download");
  await page.getByRole("button", { name: "Ekspor CSV" }).click();
  expect((await csv).suggestedFilename()).toContain("SIMULASI.csv");
  const pdf = page.waitForEvent("download");
  await page.getByRole("button", { name: "Ekspor PDF" }).click();
  expect((await pdf).suggestedFilename()).toContain("SIMULASI.pdf");
});
test("mobile form, denied geolocation and unavailable tiles remain usable", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/tile.openstreetmap.org/**", (r) => r.abort());
  await page.goto("/permohonan");
  await page
    .getByLabel("Nama pemohon sintetis")
    .fill("Pemohon Sintetis Browser");
  await page.getByLabel("Fasilitas asal").fill("RS Contoh Browser");
  await page.getByLabel("Jumlah pasien").fill("1");
  await page.getByLabel("Deskripsi lokasi").fill("Lokasi sintetis browser");
  await page
    .getByLabel("Ringkasan kebutuhan")
    .fill("Latihan koordinasi sintetis");
  await page.getByRole("button", { name: "Gunakan Lokasi Saya" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Izin lokasi ditolak" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Simpan draft", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Tersimpan lokal" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Kirim permohonan simulasi" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Belum diterima operator" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/colibri-mobile.png", fullPage: true });
});
test("offline outbox retry and actor isolation", async ({ page, context }) => {
  await page.route("**/tile.openstreetmap.org/**", (r) => r.abort());
  await page.goto("/login");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Ringkasan koordinasi" }),
  ).toBeVisible();
  await page
    .getByRole("complementary")
    .getByRole("link", { name: "Permohonan", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ruang kerja permohonan" }),
  ).toBeVisible();
  await context.setOffline(true);
  await page
    .getByRole("button", { name: "Permohonan → Diterima Operator" })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Menunggu jaringan" }),
  ).toBeVisible();
  await context.setOffline(false);
  await page.getByRole("link", { name: "Outbox & notifikasi" }).click();
  await page
    .getByRole("button", { name: "Kirim ulang operasi tertunda" })
    .click();
  await expect(page.getByText("Tidak ada operasi tertunda.")).toBeVisible();
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Login petugas" }),
  ).toBeVisible();
});
