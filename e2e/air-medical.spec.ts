import { test, expect } from "@playwright/test";

for (const width of [320, 360, 390, 430, 768, 1366]) {
  test(`Air Medical hero separates illustration and working content at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/mobile/login");
    await page.getByRole("radio", { name: /^Administrator/ }).check();
    await page.getByRole("button", { name: /^Masuk sebagai/ }).click();
    const hero = page.locator(".mobile-welcome");
    const title = await hero
      .getByRole("heading", { name: "Koordinasi medis udara" })
      .boundingBox();
    const art = await hero.locator("svg.login-flight").boundingBox();
    expect(title).not.toBeNull();
    expect(art).not.toBeNull();
    // Text and aircraft must occupy separate space, including at 200% text size in the existing suite.
    expect(
      title!.x + title!.width <= art!.x ||
        title!.y + title!.height <= art!.y ||
        art!.x + art!.width <= title!.x ||
        art!.y + art!.height <= title!.y,
    ).toBe(true);
    await expect(page.locator(".overview-counts strong").first()).toHaveText(
      "1",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const nav = page.getByRole("navigation", { name: "Navigasi bawah" });
    await expect(
      nav.getByRole("link", { name: "Beranda", exact: true }),
    ).toHaveAttribute("aria-current", "page");
  });
}

test("desktop role cards preserve the Viewer destination and readable attention text", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/login");
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await page.getByRole("radio", { name: /^Viewer pimpinan/ }).check();
  await page.getByRole("button", { name: /^Masuk sebagai/ }).click();
  await expect(page).toHaveURL(/\/pimpinan$/);
  await expect(page.locator(".leadership-metrics .card")).toHaveCount(4);
  const contrast = await page
    .locator(".leadership-hero-foot > span")
    .evaluate((el) => {
      const color = (v: string) =>
        (v.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
      const luminance = (rgb: number[]) =>
        rgb
          .map((v) => {
            const c = v / 255;
            return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          })
          .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
      const foreground = luminance(color(getComputedStyle(el).color));
      const background = luminance(
        color(
          getComputedStyle(el.closest(".leadership-hero")!).backgroundColor,
        ),
      );
      return (
        (Math.max(foreground, background) + 0.05) /
        (Math.min(foreground, background) + 0.05)
      );
    });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
});
