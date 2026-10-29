import { test, expect } from "@playwright/test";
test("mobile bottom navigation stays fixed, marks the active page and fits small screens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/tile.openstreetmap.org/**", (r) => r.abort());
  await page.goto("/mobile/");
  const nav = page.getByRole("navigation", { name: "Navigasi bawah" });
  await expect(nav.getByRole("link")).toHaveCount(5);
  await expect(
    nav.getByRole("link", { name: "Beranda", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.screenshot({
    path: "/tmp/colibri-mobile-home.png",
    fullPage: true,
  });
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const before = (await nav.boundingBox())!;
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const after = (await nav.boundingBox())!;
    expect(after.y).toBeCloseTo(before.y, 0);
    expect(after.y + after.height).toBeCloseTo(844, 0);
  }
  await nav.getByRole("link", { name: "Permohonan", exact: true }).click();
  await expect(page).toHaveURL(/\/mobile\/permohonan$/);
  await expect(
    page.getByRole("heading", { name: "Mulai koordinasi" }),
  ).toBeVisible();
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
  await expect(
    nav.getByRole("link", { name: "Permohonan", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const notice = page.getByText("Data sintetis • Bukan layanan darurat resmi", {
    exact: true,
  });
  expect(
    (await notice.boundingBox())!.y + (await notice.boundingBox())!.height,
  ).toBeLessThan((await nav.boundingBox())!.y);
  await nav.getByRole("link", { name: "Beranda", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});
test("mobile protected destinations return after login and account exposes all modules", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/tile.openstreetmap.org/**", (r) => r.abort());
  await page.goto("/mobile");
  const nav = page.getByRole("navigation", { name: "Navigasi bawah" });
  await nav.getByRole("link", { name: "Misi", exact: true }).click();
  await expect(page).toHaveURL(/\/mobile\/login$/);
  await expect(
    page.getByRole("heading", { name: "Login petugas" }),
  ).toBeVisible();
  await page.getByLabel("Peran demo").selectOption("Administrator");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/mobile\/misi$/);
  await expect(
    page.getByRole("heading", { name: "Papan misi", exact: true }),
  ).toBeVisible();
  await expect(
    nav.getByRole("link", { name: "Misi", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("complementary")).toHaveCount(0);
  await nav.getByRole("link", { name: "Akun", exact: true }).click();
  await page
    .getByRole("link", { name: "Kelola permohonan", exact: true })
    .click();
  await expect(page).toHaveURL(/\/mobile\/operasi\/permohonan$/);
  await expect(
    page.getByRole("heading", { name: "Ruang kerja permohonan" }),
  ).toBeVisible();
  await expect(
    nav.getByRole("link", { name: "Permohonan", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "Peta", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Daftar lokasi sintetis" }),
  ).toBeVisible();
  await expect(
    nav.getByRole("link", { name: "Peta", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "Akun", exact: true }).click();
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await expect(page).toHaveURL(/\/mobile\/akun$/);
  await expect(
    page.getByRole("link", { name: "Login petugas", exact: false }),
  ).toBeVisible();
  await nav.getByRole("link", { name: "Misi", exact: true }).click();
  await expect(page).toHaveURL(/\/mobile\/login$/);
});
test("mobile session expiry keeps the mobile shell and login route", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/mobile/login");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/mobile$/);
  await page.clock.fastForward(3600001);
  await expect(page).toHaveURL(/\/mobile\/login$/);
  await expect(page.getByRole("alert")).toContainText("Sesi kedaluwarsa");
  await expect(
    page.getByRole("navigation", { name: "Navigasi bawah" }),
  ).toBeVisible();
});
