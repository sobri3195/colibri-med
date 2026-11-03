import { test, expect } from "@playwright/test";
for (const [width, height] of [
  [320, 568],
  [390, 844],
  [430, 932],
  [768, 1024],
  [1366, 768],
]) {
  test(`map selection, sheet and controls remain accessible at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.route("**/tile.openstreetmap.org/**", (r) => r.abort());
    await page.goto("/mobile/login");
    await page.getByRole("radio", { name: /^Administrator/ }).check();
    await page.getByRole("button", { name: /^Masuk sebagai/ }).click();
    await page.goto("/mobile/operasi/helikopter");
    const map = page.locator(".aircraft-map");
    await expect(map.locator(".aircraft-map-icon")).toHaveCount(2);
    const panel = page.locator(".aircraft-detail-panel");
    if (width < 1100) await expect(panel).not.toHaveAttribute("open", "");
    await page
      .getByRole("button", { name: "Semua objek", exact: true })
      .click();
    const other = map.locator(".aircraft-map-icon:not(.is-selected)");
    await other.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Pilih helikopter sintetis")).toHaveValue(
      /.+/,
    );
    await expect(map.locator(".is-selected")).toHaveCount(1);
    if (width < 1100) await panel.locator(":scope > summary").click();
    await expect(panel.locator(".selected-air-detail")).toBeVisible();
    const selectedCode = await panel
      .locator(".selected-air-detail .eyebrow")
      .textContent();
    await expect(page.locator(".air-selected-summary")).toContainText(
      selectedCode!.split(" · ")[0],
    );
    await expect(panel.locator(".aircraft-card.selected")).toHaveCount(1);
    await page
      .getByRole("button", { name: "Fokus pilihan", exact: true })
      .click();
    await expect(
      map.getByText("OpenStreetMap", { exact: false }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if ([390, 1366].includes(width))
      await page.screenshot({
        path: `docs/map-review/map-${width}-expanded.png`,
        fullPage: true,
      });
    await panel.locator(":scope > summary").click();
    await expect(panel.locator(".selected-air-detail")).toBeHidden();
    if ([390, 1366].includes(width))
      await page.screenshot({
        path: `docs/map-review/map-${width}-compact.png`,
        fullPage: true,
      });
    await page
      .getByLabel("Cari laporan", { exact: true })
      .fill("tidak-ada-hasil-xyz");
    await expect(
      page.getByRole("button", { name: "Tampilkan semua laporan" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Tampilkan semua laporan" }).click();
    await expect(page.getByLabel("Cari laporan", { exact: true })).toHaveValue(
      "",
    );
    await page.locator(".air-object-filters > summary").click();
    await page
      .getByLabel("Cari helikopter", { exact: true })
      .fill("tidak-ada-helikopter");
    await expect(map.locator(".aircraft-map-icon")).toHaveCount(0);
    await expect(page.locator(".air-filter-result")).toContainText(
      "0 helikopter sesuai filter",
    );
    await page
      .locator(".air-filter-result")
      .getByRole("button", { name: "Reset filter helikopter" })
      .click();
    await expect(map.locator(".aircraft-map-icon")).toHaveCount(2);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(
      page.getByRole("button", { name: "Mulai simulasi pergerakan" }),
    ).toBeDisabled();
  });
}
