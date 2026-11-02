import { test, expect, type Page } from "@playwright/test";
const screens = [
  ["/mobile", "Ruang kerja koordinasi", "Beranda"],
  ["/mobile/permohonan", "Mulai koordinasi", "Permohonan"],
  ["/mobile/operasi/permohonan", "Permohonan", "Permohonan"],
  ["/mobile/misi", "Papan misi", "Misi"],
  ["/mobile/peta", "Fasilitas & peta", "Peta"],
  ["/mobile/akun", "Akun", "Akun"],
];
async function login(page: Page) {
  await page.route("**/tile.openstreetmap.org/**", (r) => r.abort());
  await page.goto("/mobile/login");
  await page.getByRole("radio", { name: /^Administrator/ }).check();
  await page.getByRole("button", { name: /^Masuk sebagai/ }).click();
}
for (const [width, height] of [
  [320, 568],
  [360, 800],
  [390, 844],
  [430, 932],
  [768, 1024],
  [1366, 768],
]) {
  test(`all mobile workflow surfaces fit ${width}×${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await login(page);
    for (const [path, title, active] of screens) {
      await page.goto(path);
      await expect(
        page.getByRole("heading", { name: new RegExp("^" + title) }).first(),
      ).toBeVisible();
      const refresh = page.getByRole("button", {
        name: "Refresh",
        exact: true,
      });
      if (await refresh.count()) await expect(refresh).toBeEnabled();
      await expect(
        page
          .getByRole("navigation", { name: "Navigasi bawah" })
          .getByRole("link", { name: active, exact: true }),
      ).toHaveAttribute("aria-current", "page");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.evaluate(() =>
        window.scrollTo(0, document.documentElement.scrollHeight),
      );
      const footer = await page
        .getByText("Data sintetis • Bukan layanan darurat resmi", {
          exact: true,
        })
        .boundingBox();
      const nav = await page
        .getByRole("navigation", { name: "Navigasi bawah" })
        .boundingBox();
      if (width >= 1100)
        expect(footer!.x).toBeGreaterThanOrEqual(nav!.x + nav!.width);
      else expect(footer!.y + footer!.height).toBeLessThan(nav!.y);
    }
  });
}
test("request validation stays beside the field and retains the draft", async ({
  page,
}) => {
  await login(page);
  await page.goto("/mobile/permohonan");
  await page.getByLabel("Nama pemohon sintetis", { exact: true }).fill("Ab");
  await page
    .getByLabel("Fasilitas asal", { exact: true })
    .fill("Klinik Contoh");
  await page
    .getByLabel("Deskripsi lokasi", { exact: true })
    .fill("Lokasi Contoh");
  await page
    .getByLabel("Ringkasan kebutuhan", { exact: true })
    .fill("Kebutuhan medis sintetis");
  await page
    .getByRole("button", { name: "Kirim permohonan simulasi", exact: true })
    .click();
  await expect(page.locator("#request-error-name")).toHaveText(
    "Isi nama sintetis minimal 3 karakter.",
  );
  await expect(
    page.getByLabel("Nama pemohon sintetis", { exact: true }),
  ).toBeFocused();
  await expect(
    page.getByLabel("Ringkasan kebutuhan", { exact: true }),
  ).toHaveValue("Kebutuhan medis sintetis");
  await page
    .getByLabel("Nama pemohon sintetis", { exact: true })
    .fill("Pemohon Contoh");
  await expect(page.locator("#request-error-name")).toHaveCount(0);
});
test("overview uses stored counts and the mission timeline shows recorded events", async ({
  page,
}) => {
  await login(page);
  await expect(
    page
      .locator(".overview-counts article")
      .filter({ hasText: "Misi aktif" })
      .locator("strong"),
  ).toHaveText("0");
  await expect(
    page.getByText("Belum ada misi tercatat", { exact: true }),
  ).toBeVisible();
  await page.goto("/mobile/operasi/permohonan");
  await page
    .getByRole("button", { name: /^Lihat detail/ })
    .first()
    .click();
  for (const status of [
    "Diterima Operator",
    "Diverifikasi",
    "Dalam Koordinasi",
  ])
    await page
      .getByRole("button", { name: "Permohonan → " + status, exact: true })
      .click();
  await page
    .getByLabel("Tim simulasi", { exact: true })
    .fill("Tim Uji Antarmuka");
  await page
    .getByRole("button", { name: "Buat misi & tetapkan tim", exact: true })
    .click();
  await page.locator(".mission-history summary").click();
  await expect(page.locator(".mission-history li")).toHaveCount(1);
  await expect(page.locator(".mission-history li")).toContainText("Persiapan");
  await page.goto("/mobile");
  await expect(
    page
      .locator(".overview-counts article")
      .filter({ hasText: "Misi aktif" })
      .locator("strong"),
  ).toHaveText("1");
  await page.getByRole("link").filter({ hasText: "Tim Uji Antarmuka" }).click();
  await expect(page).toHaveURL(/\/mobile\/misi\?request=/);
});
