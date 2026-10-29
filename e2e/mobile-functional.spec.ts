import { test, expect, type Page } from "@playwright/test";
test("queued mobile catalogue forms cannot be submitted twice and outbox resumes them", async ({
  page,
  context,
}) => {
  await login(page);
  await module(page, "Kesiapan sumber daya");
  const editor = detail(page, "Kelola sumber daya sintetis (Administrator)");
  await editor.locator("summary").click();
  await editor.getByLabel("Nama sintetis").fill("Tim Offline Tunggal");
  await context.setOffline(true);
  await editor
    .getByRole("button", { name: "Tambahkan record sintetis" })
    .click();
  await expect(
    editor.getByRole("button", { name: "Tambahkan record sintetis" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("link", { name: "1 operasi tertunda" }),
  ).toBeVisible();
  await context.setOffline(false);
  await page.getByRole("link", { name: "1 operasi tertunda" }).click();
  await page
    .getByRole("button", { name: "Kirim ulang operasi tertunda" })
    .click();
  await expect(
    page.getByText("Tidak ada operasi tertunda.", { exact: true }),
  ).toBeVisible();
  await module(page, "Kesiapan sumber daya");
  await expect(
    page.locator(".mobile-record").filter({ hasText: "Tim Offline Tunggal" }),
  ).toHaveCount(1);
});
const detail = (page: Page, title: string) =>
  page.locator("details").filter({
    has: page.locator("summary", {
      hasText: new RegExp(
        "^" + title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$",
      ),
    }),
  });
const nav = (page: Page) =>
  page.getByRole("navigation", { name: "Navigasi bawah" });
async function login(page: Page, role = "Administrator") {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/tile.openstreetmap.org/**", (r) => r.abort());
  await page.goto("/mobile/login");
  await page.getByRole("combobox", { name: "Peran demo" }).selectOption(role);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/mobile$/);
}
async function module(page: Page, name: string) {
  await nav(page).getByRole("link", { name: "Akun", exact: true }).click();
  await page.getByRole("link", { name, exact: true }).click();
}
async function fillRequest(page: Page, facility: string) {
  await page
    .getByLabel("Nama pemohon sintetis")
    .fill("Pemohon Mobile Sintetis");
  await page.getByLabel("Fasilitas asal").fill(facility);
  await page.getByLabel("Deskripsi lokasi").fill("Lokasi latihan mobile");
  await page
    .getByLabel("Ringkasan kebutuhan")
    .fill("Kebutuhan simulasi dari perangkat mobile");
}
test("mobile completes a newly submitted request through team changes, reviews, checklist, notes, handover and reports", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/tile.openstreetmap.org/**", (r) => r.abort());
  await page.goto("/mobile/permohonan");
  await fillRequest(page, "RS Mobile Alur Lengkap");
  await page.getByRole("button", { name: "Simpan draft", exact: true }).click();
  await page.getByLabel("Ringkasan kebutuhan").fill("");
  await page.getByRole("button", { name: "Muat draft", exact: true }).click();
  await expect(page.getByLabel("Ringkasan kebutuhan")).toHaveValue(
    "Kebutuhan simulasi dari perangkat mobile",
  );
  await page.getByRole("button", { name: "Kirim permohonan simulasi" }).click();
  await expect(
    page.getByRole("button", { name: "Kirim permohonan simulasi" }),
  ).toBeDisabled();
  const receipt = page
    .getByRole("link", { name: "Buka melalui akun petugas" })
    .first();
  await expect(receipt).toBeVisible();
  const url = new URL((await receipt.getAttribute("href"))!, "http://local");
  const requestId = url.searchParams.get("request")!;
  await receipt.click();
  await expect(page).toHaveURL(/\/mobile\/login$/);
  await page
    .getByRole("combobox", { name: "Peran demo" })
    .selectOption("Administrator");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Pilih permohonan" }),
  ).toHaveValue(requestId);
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Pilih permohonan" }),
  ).toHaveValue(requestId);
  for (const status of [
    "Diterima Operator",
    "Diverifikasi",
    "Dalam Koordinasi",
  ])
    await page
      .getByRole("button", { name: "Permohonan → " + status, exact: true })
      .click();
  await page.getByLabel("Tim simulasi").fill("Tim Awal Mobile");
  await page.getByRole("button", { name: "Buat misi & tetapkan tim" }).click();
  const team = detail(page, "Ubah tim sebelum keberangkatan");
  await team.locator("summary").click();
  await team.getByLabel("Nama tim pengganti").fill("Tim Pengganti Mobile");
  await team.getByLabel("Alasan perubahan tim").fill("Pergantian latihan");
  await team.getByRole("button", { name: "Simpan penugasan tim" }).click();
  await expect(
    page.getByText("Tim: Tim Pengganti Mobile", { exact: true }),
  ).toBeVisible();
  await module(page, "Penilaian & catatan");
  await expect(
    page.getByRole("combobox", { name: "Pilih permohonan" }),
  ).toHaveValue(requestId);
  const med = detail(page, "Penilaian medis");
  await med.locator("summary").click();
  await med.getByLabel("Catatan sintetis").fill("Rekomendasi simulasi");
  await med
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("Rekomendasi Dicatat");
  await med.getByRole("button", { name: "Catat penilaian medis" }).click();
  const flight = detail(page, "Tinjauan penerbangan");
  await flight.locator("summary").click();
  await flight
    .getByLabel("Catatan sintetis")
    .fill("Keputusan petugas simulasi");
  await flight
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("Disetujui");
  await flight
    .getByRole("button", { name: "Catat tinjauan penerbangan" })
    .click();
  const checklist = detail(page, "Checklist");
  await checklist.locator("summary").click();
  for (const checkbox of await checklist.getByRole("checkbox").all())
    await checkbox.check();
  await checklist.getByRole("button", { name: "Catat checklist" }).click();
  await expect(
    checklist.getByText(/Versi server yang ditinjau: revision 1/),
  ).toBeVisible();
  await page.reload();
  await checklist.locator("summary").click();
  for (const checkbox of await checklist.getByRole("checkbox").all())
    await expect(checkbox).toBeChecked();
  const note = detail(page, "Catatan pasien sintetis");
  await note.locator("summary").click();
  await note
    .getByLabel("Catatan sintetis")
    .fill("Catatan sintetis dari mobile");
  await note
    .getByRole("button", { name: "Catat catatan pasien sintetis" })
    .click();
  await expect(note.getByLabel("Catatan sintetis")).toHaveValue("");
  await nav(page).getByRole("link", { name: "Misi", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Pilih permohonan" }),
  ).toHaveValue(requestId);
  for (const status of [
    "Tim Ditugaskan",
    "Berangkat",
    "Tiba di Lokasi",
    "Pasien Dijemput",
    "Menuju Fasilitas Penerima",
    "Serah Terima",
  ])
    await page
      .getByRole("button", { name: "Misi → " + status, exact: true })
      .click();
  await module(page, "Penilaian & catatan");
  const handover = detail(page, "Serah terima");
  await handover.locator("summary").click();
  await handover
    .getByLabel("Catatan sintetis")
    .fill("Serah terima diterima petugas contoh");
  await handover.getByRole("button", { name: "Catat serah terima" }).click();
  await nav(page).getByRole("link", { name: "Misi", exact: true }).click();
  await page
    .getByRole("button", { name: "Misi → Selesai", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Misi · Selesai" }),
  ).toBeVisible();
  await module(page, "Laporan");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Ekspor CSV" }).click();
  const csv = await download;
  const stream = await csv.createReadStream();
  const parts: Buffer[] = [];
  for await (const part of stream!) parts.push(part);
  const text = Buffer.concat(parts).toString();
  expect(text).toContain("RS Mobile Alur Lengkap");
  expect(text).toContain("coordination");
  expect(text).toContain("Serah terima diterima petugas contoh");
  const pdf = page.waitForEvent("download");
  await page.getByRole("button", { name: "Ekspor PDF" }).click();
  expect((await pdf).suggestedFilename()).toContain("SIMULASI.pdf");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("mobile offline submissions survive reload, retry without duplicates and issue local receipts", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/tile.openstreetmap.org/**", (r) => r.abort());
  await page.goto("/mobile/permohonan");
  await fillRequest(page, "RS Offline Mobile");
  await context.setOffline(true);
  await page.getByRole("button", { name: "Kirim permohonan simulasi" }).click();
  await expect(
    page.getByText("Menunggu jaringan — tersimpan di outbox lokal.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "1 operasi tertunda" }),
  ).toBeVisible();
  await context.setOffline(false);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Pengiriman tertunda saya" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Kirim ulang outbox saya" }).click();
  await expect(
    page.getByRole("heading", { name: "Bukti pencatatan saya" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Kirim ulang outbox saya" }).click();
  await expect(
    page.getByText("Tidak ada operasi yang menunggu pengiriman.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Buka melalui akun petugas" }).click();
  await page
    .getByRole("combobox", { name: "Peran demo" })
    .selectOption("Administrator");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.getByLabel("Cari data", { exact: true }).fill("RS Offline Mobile");
  const list = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Daftar permohonan",
      exact: true,
    }),
  });
  await expect(list.locator(".mobile-record")).toHaveCount(1);
  await list.getByRole("button", { name: /Buka permohonan/ }).click();
  await expect(
    page.getByRole("combobox", { name: "Pilih permohonan" }),
  ).not.toHaveValue("");
});
test("mobile facility and resource management updates the map directory and readiness", async ({
  page,
}) => {
  await login(page);
  await nav(page).getByRole("link", { name: "Peta", exact: true }).click();
  const manager = detail(page, "Kelola fasilitas sintetis (Administrator)");
  await manager.locator("summary").click();
  await manager.getByLabel("Nama sintetis").fill("Fasilitas Mobile Baru");
  await manager
    .getByLabel("Deskripsi lokasi fasilitas")
    .fill("Alamat sintetis latihan");
  await manager.getByLabel("Lintang fasilitas").fill("-6.24");
  await manager.getByLabel("Bujur fasilitas").fill("106.86");
  await manager
    .getByRole("button", { name: "Tambahkan record sintetis" })
    .click();
  await expect(
    page.locator(".mobile-record").filter({ hasText: "Fasilitas Mobile Baru" }),
  ).toHaveCount(1);
  await manager.getByLabel("Nama sintetis").fill("Fasilitas Mobile Diubah");
  await manager
    .getByRole("button", { name: "Simpan perubahan direktori" })
    .click();
  await page
    .getByLabel("Cari data", { exact: true })
    .fill("Fasilitas Mobile Diubah");
  await expect(
    page
      .locator(".mobile-record")
      .filter({ hasText: "Fasilitas Mobile Diubah" }),
  ).toHaveCount(1);
  await module(page, "Kesiapan sumber daya");
  await expect(page.getByLabel("Cari data", { exact: true })).toHaveValue("");
  const resources = detail(page, "Kelola sumber daya sintetis (Administrator)");
  await resources.locator("summary").click();
  await resources.getByLabel("Nama sintetis").fill("Tim Sumber Daya Mobile");
  await resources
    .getByRole("combobox", { name: "Kategori sumber daya" })
    .selectOption("Personel");
  await resources
    .getByRole("button", { name: "Tambahkan record sintetis" })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Kesiapan Tim Sumber Daya Mobile" }),
  ).toBeVisible();
  const ready = page.locator("form").filter({
    has: page.getByRole("combobox", {
      name: "Kesiapan Tim Sumber Daya Mobile",
    }),
  });
  await ready.getByRole("combobox").selectOption("Siap simulasi");
  await ready.getByRole("button", { name: "Catat kesiapan" }).click();
  await expect(
    page
      .locator(".mobile-record")
      .filter({ hasText: "Tim Sumber Daya Mobile" }),
  ).toContainText("Siap simulasi");
  await page.reload();
  await expect(
    page
      .locator(".mobile-record")
      .filter({ hasText: "Tim Sumber Daya Mobile" }),
  ).toContainText("Siap simulasi");
});
test("mobile preferences persist per user, role controls remain restricted and unknown modules have an error page", async ({
  page,
}) => {
  await login(page, "Operator");
  await module(page, "Pengaturan");
  await page
    .getByRole("combobox", { name: "Interval polling" })
    .selectOption("60000");
  await expect(
    page.getByText(
      "Pengaturan tersimpan untuk pengguna ini pada perangkat dan mode yang sama.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Interval polling" }),
  ).toHaveValue("60000");
  await module(page, "Penilaian & catatan");
  await expect(
    page.locator("summary").filter({ hasText: "Penilaian medis" }),
  ).toHaveCount(0);
  await nav(page).getByRole("link", { name: "Peta", exact: true }).click();
  await expect(
    page.locator("summary").filter({ hasText: "Kelola fasilitas sintetis" }),
  ).toHaveCount(0);
  await nav(page).getByRole("link", { name: "Akun", exact: true }).click();
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await page.getByRole("link", { name: "Login petugas" }).click();
  await page
    .getByRole("combobox", { name: "Peran demo" })
    .selectOption("Dokter/perawat");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await module(page, "Pengaturan");
  await expect(
    page.getByRole("combobox", { name: "Interval polling" }),
  ).toHaveValue("30000");
  await page.goto("/mobile/operasi/tidak-ada");
  await expect(
    page.getByRole("heading", { name: "Halaman tidak ditemukan" }),
  ).toBeVisible();
  await expect(nav(page)).toBeVisible();
  await page.goto(
    "/mobile/operasi/permohonan?request=00000000-0000-0000-0000-000000000000",
  );
  await expect(page.getByRole("alert")).toContainText(
    "Permohonan yang dipilih tidak ditemukan",
  );
  await expect(page.getByRole("button", { name: /Permohonan →/ })).toHaveCount(
    0,
  );
});
