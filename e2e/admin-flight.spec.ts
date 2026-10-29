import { test, expect, type Page } from "@playwright/test";
async function demoAdmin(page: Page) {
  await page.route("**/tile.openstreetmap.org/**", (r) => r.abort());
  await page.goto("/index.html");
  await page.getByRole("button", { name: "Masuk admin demo" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("combobox", { name: "Pilih helikopter sintetis" }),
  ).toBeVisible();
}
test("index demo admin opens monitoring and local playback never changes stored aircraft positions", async ({
  page,
}) => {
  await page.clock.install();
  await demoAdmin(page);
  const position = page.getByTestId("position-SIM-HELI-01");
  await expect(position).toContainText("Posisi laporan: -6.24000, 106.87000");
  await page.getByRole("button", { name: "Mulai simulasi pergerakan" }).click();
  const first = await position.textContent();
  await page.clock.runFor(5000);
  await expect(position).not.toHaveText(first!);
  await page.getByRole("button", { name: "Jeda simulasi" }).click();
  const paused = await position.textContent();
  await page.clock.runFor(4000);
  await expect(position).toHaveText(paused!);
  await page.getByRole("button", { name: "Reset ke posisi laporan" }).click();
  await expect(position).toContainText("Posisi laporan: -6.24000, 106.87000");
  await expect(
    page.getByText(
      "Briefing awak sintetis dicatat untuk latihan koordinasi. Bukan laporan penerbangan nyata.",
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Tile peta tidak tersedia. Daftar koordinat, kontrol simulasi, dan laporan tetap dapat digunakan.",
    ),
  ).toBeVisible();
  await page.screenshot({
    path: "/tmp/colibri-admin-flight.png",
    fullPage: true,
  });
});
test("admin records and reads crew reports, retains reported coordinates after reload and exports filtered CSV", async ({
  page,
}) => {
  await demoAdmin(page);
  const selector = page.getByRole("combobox", {
    name: "Pilih helikopter sintetis",
  });
  const second = await selector
    .locator("option")
    .filter({ hasText: "SIM-HELI-02" })
    .getAttribute("value");
  await selector.selectOption(second!);
  await page
    .getByRole("combobox", { name: "Jenis laporan", exact: true })
    .selectOption("Posisi");
  await page
    .getByRole("combobox", { name: "Status helikopter sintetis" })
    .selectOption("Latihan bergerak");
  await page
    .getByLabel("Catatan operasional awak")
    .fill("Awak simulasi melaporkan titik latihan Bravo");
  await page.getByLabel("Lintang laporan (opsional)").fill("-6.225");
  await page.getByLabel("Bujur laporan (opsional)").fill("106.895");
  await page.getByRole("button", { name: "Kirim laporan awak" }).click();
  await expect(
    page.getByText("Laporan awak tercatat di demo lokal.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("position-SIM-HELI-02")).toContainText(
    "-6.22500, 106.89500",
  );
  await page.reload();
  await expect(selector).toHaveValue(second!);
  await expect(page.getByTestId("position-SIM-HELI-02")).toContainText(
    "-6.22500, 106.89500",
  );
  await page
    .getByRole("navigation", { name: "Modul helikopter" })
    .getByRole("link", { name: "Laporan awak", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Filter jenis laporan" })
    .selectOption("Posisi");
  await page.getByLabel("Cari laporan", { exact: true }).fill("Bravo");
  await expect(page.locator(".air-report")).toHaveCount(1);
  const wait = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Unduh laporan helikopter CSV" })
    .click();
  const download = await wait;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString();
  expect(text).toContain("DATA SINTETIS");
  expect(text).toContain("SIM-HELI-02");
  expect(text).toContain("Bravo");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("operator cannot use the admin dashboard but can monitor via mobile without report write controls", async ({
  page,
}) => {
  await page.route("**/tile.openstreetmap.org/**", (r) => r.abort());
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page
    .getByRole("combobox", { name: "Peran demo" })
    .selectOption("Operator");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Dashboard khusus Administrator" }),
  ).toBeVisible();
  await page.goto("/mobile/operasi/helikopter");
  await expect(
    page.getByRole("heading", { name: "Pemantauan helikopter", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Kirim laporan awak" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Akun ini memantau data.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Navigasi bawah" }),
  ).toBeVisible();
});
test("crew report offline operations retry once and become visible to the admin", async ({
  page,
  context,
}) => {
  await demoAdmin(page);
  await page
    .getByLabel("Catatan operasional awak")
    .fill("Laporan awak offline unik");
  await context.setOffline(true);
  await page.getByRole("button", { name: "Kirim laporan awak" }).click();
  await expect(
    page.getByRole("button", { name: "Kirim laporan awak" }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      "Menunggu jaringan/pengiriman di Outbox. Jangan membuat laporan duplikat.",
      { exact: true },
    ),
  ).toBeVisible();
  await context.setOffline(false);
  await page.getByRole("link", { name: "Buka Outbox laporan" }).click();
  await page
    .getByRole("button", { name: "Kirim ulang operasi tertunda" })
    .click();
  await expect(
    page.getByText("Tidak ada operasi tertunda.", { exact: true }),
  ).toBeVisible();
  await page.goto("/admin/laporan");
  await expect(
    page
      .locator(".air-report")
      .filter({ hasText: "Laporan awak offline unik" }),
  ).toHaveCount(1);
});
