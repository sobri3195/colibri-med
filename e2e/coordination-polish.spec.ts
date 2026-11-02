import { test, expect, type Page } from "@playwright/test";
async function login(page: Page) {
  await page.route("**/tile.openstreetmap.org/**", (r) => r.abort());
  await page.goto("/mobile/login");
  await page.getByRole("radio", { name: /^Administrator/ }).check();
  await page.getByRole("button", { name: /^Masuk sebagai/ }).click();
}
test("filtered selection remains explicit, can be reset, and detail can be closed", async ({
  page,
}) => {
  await login(page);
  await page.goto("/mobile/operasi/permohonan");
  await expect(page.locator("#request-workspace")).toHaveCount(0);
  await page
    .getByRole("button", { name: /^Lihat detail/ })
    .first()
    .click();
  await expect(page.locator(".mobile-record[data-selected=true]")).toHaveCount(
    1,
  );
  await expect(page.locator(".selected-request")).toContainText(
    "Klinik Simulasi Utara",
  );
  const selectedURL = page.url();
  await page
    .getByLabel("Cari data", { exact: true })
    .fill("Tidak ada fasilitas seperti ini");
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Item terpilih berada di luar hasil filter" }),
  ).toBeVisible();
  expect(page.url()).toBe(selectedURL);
  const status = page.getByRole("combobox", {
    name: "Filter status",
    exact: true,
  });
  await expect(status.locator('option[value=""]')).toHaveText("Semua status");
  await expect(
    status.locator("option").filter({ hasText: "Permohonan baru" }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Reset filter", exact: true }).click();
  await expect(page.getByLabel("Cari data", { exact: true })).toHaveValue("");
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Item terpilih berada di luar hasil filter" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Tutup detail", exact: true }).click();
  await expect(page.locator("#request-workspace")).toHaveCount(0);
  await expect(page.locator(".mobile-record[data-selected=true]")).toHaveCount(
    0,
  );
});
test("mission view selection and actual column counts", async ({ page }) => {
  await login(page);
  await page.goto("/mobile/misi");
  await expect(
    page.getByText("Belum ada misi tercatat", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Kelola permohonan", exact: true })
    .click();
  await page
    .getByRole("button", { name: /^Lihat detail/ })
    .first()
    .click();
  for (const next of ["Diterima Operator", "Diverifikasi", "Dalam Koordinasi"])
    await page
      .getByRole("button", { name: "Permohonan → " + next, exact: true })
      .click();
  await page.getByLabel("Tim simulasi", { exact: true }).fill("Tim Uji Polish");
  await page
    .getByRole("button", { name: "Buat misi & tetapkan tim", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Misi · Persiapan", exact: true }),
  ).toBeVisible();
  await page.goto("/mobile/misi");
  await page
    .getByRole("button", { name: "Tampilan kanban", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Tampilan kanban", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.locator(".kanban h3").filter({ hasText: /^Persiapan/ }),
  ).toHaveText("Persiapan 1");
  await page
    .getByRole("button", { name: "Tampilan tabel", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Tampilan tabel", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
const modules = [
  "/mobile/operasi/penilaian",
  "/mobile/operasi/sumber-daya",
  "/mobile/peta",
  "/mobile/operasi/helikopter",
  "/mobile/operasi/helikopter?panel=laporan",
  "/mobile/operasi/outbox",
  "/mobile/operasi/pengaturan",
  "/mobile/operasi/laporan",
  "/pimpinan",
  "/pimpinan/operasi",
  "/pimpinan/kesiapan",
  "/pimpinan/perhatian",
  "/pimpinan/laporan",
];
for (const [width, height] of [
  [320, 568],
  [360, 800],
  [390, 844],
  [430, 932],
  [768, 1024],
  [1366, 768],
]) {
  test(`all specialist and leadership surfaces fit ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await login(page);
    for (const path of modules) {
      await page.goto(path);
      await expect(page.locator("main h1").first()).toBeVisible();
      const refresh = page.getByRole("button", {
        name: /^Refresh$|Perbarui pengawasan|Perbarui data helikopter/,
      });
      if (await refresh.count()) await expect(refresh.first()).toBeEnabled();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        path,
      ).toBe(true);
      const nav = page.getByRole("navigation", {
        name: path.startsWith("/pimpinan")
          ? "Navigasi pengawasan"
          : "Navigasi bawah",
      });
      await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
      await page.evaluate(() =>
        window.scrollTo(0, document.documentElement.scrollHeight),
      );
      const footer = await page.locator(".mobile-disclaimer").boundingBox();
      const box = await nav.boundingBox();
      if (width >= 1100)
        expect(footer!.x).toBeGreaterThanOrEqual(box!.x + box!.width);
      else expect(footer!.y + footer!.height).toBeLessThanOrEqual(box!.y);
    }
  });
}
test("leadership attention drill stays within aggregate access and helicopter detail can close", async ({
  page,
}) => {
  await login(page);
  await page.goto("/pimpinan");
  await expect(
    page.getByRole("button", { name: "Keluar dari pengawasan" }),
  ).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.locator(".leadership-metrics > article")).toHaveCount(4);
  await page
    .locator(".attention-link")
    .filter({ hasText: "Penilaian medis belum tuntas" })
    .click();
  await expect(page).toHaveURL(/\/pimpinan\/perhatian.*#indikator-medical$/);
  await expect(page.locator("#indikator-medical")).toBeVisible();
  await page
    .locator("#indikator-medical")
    .getByRole("link", { name: /Lihat distribusi/ })
    .click();
  await expect(page).toHaveURL(/\/pimpinan\/operasi/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/mobile/operasi/helikopter");
  const panel = page.locator(".aircraft-detail-panel");
  await expect(panel).not.toHaveAttribute("open", "");
  await panel.locator("summary").first().click();
  await expect(panel).toHaveAttribute("open", "");
  await panel.locator("summary").first().click();
  await expect(panel).not.toHaveAttribute("open", "");
  await expect(page.locator(".air-selected-summary")).toContainText(
    "Laporan terakhir:",
  );
});

test("enlarged text and keyboard retain specialist and leadership navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await login(page);
  for (const path of [
    "/mobile/operasi/sumber-daya",
    "/mobile/operasi/helikopter",
    "/pimpinan",
  ]) {
    await page.goto(path);
    const refresh = page.getByRole("button", {
      name: /^Refresh$|Perbarui pengawasan|Perbarui data helikopter/,
    });
    await expect(refresh.first()).toBeEnabled();
    await page.evaluate(() => {
      const sizes = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".mobile-shell h1,.mobile-shell h2,.mobile-shell h3,.mobile-shell p,.mobile-shell label,.mobile-shell strong,.mobile-shell button,.mobile-shell a,.mobile-shell select,.mobile-shell small,.mobile-shell .badge",
        ),
      ).map((el) => [el, parseFloat(getComputedStyle(el).fontSize)] as const);
      for (const [el, size] of sizes) el.style.fontSize = `${size * 2}px`;
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      path,
    ).toBe(true);
    const nav = page.getByRole("navigation", {
      name: path.startsWith("/pimpinan")
        ? "Navigasi pengawasan"
        : "Navigasi bawah",
    });
    const link = nav.getByRole("link").last();
    await link.focus();
    await expect(link).toBeFocused();
    expect(await link.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe(
      "solid",
    );
    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );
    const footer = await page.locator(".mobile-disclaimer").boundingBox();
    const box = await nav.boundingBox();
    expect(footer!.y + footer!.height).toBeLessThanOrEqual(box!.y);
  }
});
