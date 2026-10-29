import { test, expect, type Page } from "@playwright/test";
async function login(page: Page) {
  await page.route("**/tile.openstreetmap.org/**", (r) => r.abort());
  await page.goto("/login");
  await page.getByLabel("Peran demo").selectOption("Administrator");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Ringkasan koordinasi" }),
  ).toBeVisible();
  await page
    .getByRole("complementary")
    .getByRole("link", { name: "Permohonan", exact: true })
    .click();
}
const form = (page: Page, title: string) =>
  page.locator("details").filter({
    has: page.locator("summary", { hasText: new RegExp("^" + title + "$") }),
  });
test("drafts are isolated by form and survive navigation without replacing other drafts", async ({
  page,
}) => {
  await login(page);
  const med = form(page, "Penilaian medis");
  await med.locator("summary").click();
  await med.getByLabel("Catatan sintetis").fill("Draft medis terpisah");
  await med.getByRole("button", { name: "Simpan draft lokal" }).click();
  const flight = form(page, "Tinjauan penerbangan");
  await flight.locator("summary").click();
  await expect(flight.getByLabel("Catatan sintetis")).toHaveValue("");
  await flight
    .getByLabel("Catatan sintetis")
    .fill("Draft penerbangan terpisah");
  await flight.getByRole("button", { name: "Simpan draft lokal" }).click();
  await expect(med.getByLabel("Catatan sintetis")).toHaveValue(
    "Draft medis terpisah",
  );
  await page.getByRole("link", { name: "Sumber daya", exact: true }).click();
  await page
    .getByRole("complementary")
    .getByRole("link", { name: "Permohonan", exact: true })
    .click();
  await med.locator("summary").click();
  await med.getByRole("button", { name: "Muat draft", exact: true }).click();
  await expect(med.getByLabel("Catatan sintetis")).toHaveValue(
    "Draft medis terpisah",
  );
  await flight.locator("summary").click();
  await flight.getByRole("button", { name: "Muat draft", exact: true }).click();
  await expect(flight.getByLabel("Catatan sintetis")).toHaveValue(
    "Draft penerbangan terpisah",
  );
});
test("two browser tabs preserve a stale review draft and allow archiving its conflict", async ({
  page,
  context,
}) => {
  await login(page);
  const med = form(page, "Penilaian medis");
  await med.locator("summary").click();
  await med.getByLabel("Catatan sintetis").fill("Penilaian awal");
  await med
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("Sedang Dinilai");
  await med.getByRole("button", { name: "Catat penilaian medis" }).click();
  await expect(
    page.getByText("Perubahan dicatat.", { exact: true }),
  ).toBeVisible();
  const second = await context.newPage();
  await login(second);
  const other = form(second, "Penilaian medis");
  await other.locator("summary").click();
  await expect(other.getByLabel("Catatan sintetis")).toHaveValue(
    "Penilaian awal",
  );
  await other.getByLabel("Catatan sintetis").fill("Draft browser kedua");
  await med.getByLabel("Catatan sintetis").fill("Rekomendasi browser pertama");
  await med
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("Rekomendasi Dicatat");
  await med.getByRole("button", { name: "Catat penilaian medis" }).click();
  await expect(
    med.getByRole("button", { name: "Catat penilaian medis" }),
  ).toBeEnabled();
  await other.getByRole("button", { name: "Catat penilaian medis" }).click();
  await expect(
    second.getByRole("status").filter({ hasText: "CONFLICT" }),
  ).toBeVisible();
  await expect(other.getByLabel("Catatan sintetis")).toHaveValue(
    "Draft browser kedua",
  );
  await second.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(
    other.getByRole("button", { name: "Muat penilaian terbaru" }),
  ).toBeVisible();
  await other.getByRole("button", { name: "Muat penilaian terbaru" }).click();
  await expect(other.getByLabel("Catatan sintetis")).toHaveValue(
    "Rekomendasi browser pertama",
  );
  await second.getByRole("link", { name: "Outbox & notifikasi" }).click();
  const conflict = second.locator("details").filter({
    has: second.locator("summary", { hasText: "Konflik perubahan" }),
  });
  await conflict.locator("summary").click();
  await conflict
    .getByRole("button", { name: "Arsipkan operasi setelah ditinjau" })
    .click();
  await expect(
    second.getByText("Tidak ada operasi tertunda.", { exact: true }),
  ).toBeVisible();
  await expect(
    second.locator("summary").filter({ hasText: "Arsip operasi ditinjau (1)" }),
  ).toBeVisible();
});
test("cancelling a mission requires a reason and removes it from active counts", async ({
  page,
}) => {
  await login(page);
  for (const status of [
    "Diterima Operator",
    "Diverifikasi",
    "Dalam Koordinasi",
  ])
    await page
      .getByRole("button", { name: "Permohonan → " + status, exact: true })
      .click();
  await page.getByLabel("Tim simulasi").fill("Tim latihan pembatalan");
  await page.getByRole("button", { name: "Buat misi & tetapkan tim" }).click();
  await page.getByText("Pembatalan misi simulasi", { exact: true }).click();
  await page.getByRole("button", { name: "Batalkan misi simulasi" }).click();
  await expect(
    page.getByRole("heading", { name: "Misi · Persiapan" }),
  ).toBeVisible();
  await page
    .getByLabel("Alasan pembatalan", { exact: true })
    .fill("Latihan dibatalkan oleh petugas sintetis");
  await page.getByRole("button", { name: "Batalkan misi simulasi" }).click();
  await expect(
    page.getByRole("heading", { name: "Misi · Dibatalkan" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Misi → Tim Ditugaskan" }),
  ).toHaveCount(0);
  await page
    .getByRole("complementary")
    .getByRole("link", { name: "Ringkasan", exact: true })
    .click();
  await expect(
    page.locator(".stat").filter({ hasText: "Misi aktif" }).locator("strong"),
  ).toHaveText("0");
  await expect(
    page
      .locator(".stat")
      .filter({ hasText: "Konfirmasi rumah sakit" })
      .locator("strong"),
  ).toHaveText("0");
});
test("tables paginate and a filtered list resets to its first page", async ({
  page,
}) => {
  await login(page);
  await page.evaluate(async () => {
    const { demoCall } = await import("/src/services/demo.ts");
    const actor = {
      id: "demo:Administrator",
      name: "Simulasi",
      role: "Administrator",
    };
    for (let i = 0; i < 12; i++)
      await demoCall(actor, "requests.create", {
        operationId: crypto.randomUUID(),
        data: {
          name: "Pemohon " + i,
          contact: "contoh",
          facility: "Fasilitas " + i,
          summary: "Kebutuhan sintetis",
          patients: 1,
          location: "Contoh",
          access: "",
          lat: "",
          lng: "",
        },
      });
  });
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  const table = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Daftar permohonan",
      exact: true,
    }),
  });
  await expect(table.getByText("1–10 dari 13", { exact: true })).toBeVisible();
  await table.getByRole("button", { name: "Berikutnya" }).click();
  await expect(table.getByText("11–13 dari 13", { exact: true })).toBeVisible();
  await page.getByLabel("Cari data", { exact: true }).fill("Pemohon 11");
  await expect(table.getByText("1–1 dari 1", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
