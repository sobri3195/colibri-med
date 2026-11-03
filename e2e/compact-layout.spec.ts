import { test, expect } from "@playwright/test";
for (const [width, height] of [
  [320, 568],
  [390, 844],
  [430, 932],
  [768, 1024],
  [1366, 768],
  [1440, 900],
]) {
  test(`compact work surfaces at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.route("**/tile.openstreetmap.org/**", (r) => r.abort());
    await page.goto("/mobile/login");
    await page.getByRole("radio", { name: /^Administrator/ }).check();
    await page.getByRole("button", { name: /^Masuk sebagai/ }).click();
    await page.goto(
      width >= 1100 ? "/internal/permohonan" : "/mobile/operasi/permohonan",
    );
    await expect(page.locator(".mobile-record")).toHaveCount(1);
    await expect(page.locator("#request-workspace")).toHaveCount(0);
    const list = await page.locator(".request-list-panel").boundingBox();
    if (width >= 1100) expect(list!.y).toBeLessThanOrEqual(340);
    await page
      .getByRole("button", { name: /^Lihat detail/ })
      .first()
      .click();
    await expect(page.locator("#request-workspace")).toBeVisible();
    await page
      .getByRole("button", { name: "Tutup detail", exact: true })
      .click();
    await expect(page.locator("#request-workspace")).toHaveCount(0);
    await page.goto("/mobile/operasi/helikopter");
    await expect(page.locator(".aircraft-map-icon")).toHaveCount(2);
    const before = await page.locator(".aircraft-map").boundingBox();
    if (width >= 1100) expect(before!.y).toBeLessThanOrEqual(340);
    await page
      .getByRole("button", { name: "Perbarui data helikopter" })
      .click();
    await expect(
      page.getByRole("button", { name: "Perbarui data helikopter" }),
    ).toBeEnabled();
    const after = await page.locator(".aircraft-map").boundingBox();
    expect(Math.abs(after!.y - before!.y)).toBeLessThanOrEqual(1);
    await page.goto(width >= 1100 ? "/internal/fasilitas" : "/mobile/peta");
    await expect(page.locator(".location-map-icon").first()).toBeVisible();
    const map = await page.locator(".facility-map-area .map").boundingBox();
    if (width >= 1100) expect(map!.y).toBeLessThanOrEqual(340);
    await page.locator(".location-map-icon").first().click();
    if (width < 1100)
      await page.locator(".facility-side-panel > summary").click();
    await expect(page.locator(".facility-selection h3")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.goto("/mobile/permohonan");
    for (const input of await page.locator(".request-page input").all())
      expect(
        await input.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
      ).toBeGreaterThanOrEqual(16);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
