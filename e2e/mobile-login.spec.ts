import { test, expect } from "@playwright/test";
import { roles } from "../src/types";

for (const [width, height] of [
  [320, 568],
  [360, 800],
  [390, 844],
  [430, 932],
  [768, 1024],
  [1366, 768],
]) {
  test(`login fits ${width}×${height} and its last action clears navigation`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/mobile/login");
    await expect(page.getByRole("radio")).toHaveCount(7);
    for (const role of roles) {
      await page.getByRole("radio", { name: new RegExp("^" + role) }).check();
      await expect(
        page.getByRole("button", {
          name: `Masuk sebagai ${role}`,
          exact: true,
        }),
      ).toBeVisible();
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const footer = page.getByText(
      "Data sintetis • Bukan layanan darurat resmi",
    );
    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );
    const footerBox = await footer.boundingBox();
    const nav = page.getByRole("navigation", { name: "Navigasi bawah" });
    if (width >= 1100) {
      await expect(nav).toBeHidden();
      const intro = await page.locator(".login-intro").boundingBox();
      const panel = await page.locator(".login-panel").boundingBox();
      expect(panel!.x).toBeGreaterThanOrEqual(intro!.x + intro!.width);
      expect(footerBox!.x).toBeGreaterThanOrEqual(0);
    } else {
      const navBox = await nav.boundingBox();
      expect(footerBox!.y + footerBox!.height).toBeLessThanOrEqual(navBox!.y);
      await expect(
        nav.getByRole("link", { name: "Akun", exact: true }),
      ).toHaveAttribute("aria-current", "page");
    }
  });
}

for (const role of roles) {
  test(`demo login retains the internal value for ${role}`, async ({
    page,
  }) => {
    await page.goto("/mobile/login");
    await page.getByRole("radio", { name: new RegExp("^" + role) }).check();
    await page
      .getByRole("button", { name: `Masuk sebagai ${role}`, exact: true })
      .click();
    await expect(page).toHaveURL(/\/mobile$/);
    expect(
      await page.evaluate(
        () => JSON.parse(sessionStorage.getItem("colibri-demo-session")!).actor,
      ),
    ).toEqual({ id: "demo:" + role, name: "Petugas Simulasi", role });
    await page.reload();
    await page
      .getByRole("navigation", { name: "Navigasi bawah" })
      .getByRole("link", { name: "Akun", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Petugas Simulasi" }),
    ).toBeVisible();
  });
}

test("radio keyboard controls, device status, enlarged text, and reduced motion", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/mobile/login");
  const first = page.getByRole("radio", { name: /^Operator/ });
  await first.focus();
  await expect(first).toBeFocused();
  expect(
    await first
      .locator("..")
      .evaluate((el) => getComputedStyle(el).outlineStyle),
  ).toBe("solid");
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("radio", { name: /^Koordinator medis/ }),
  ).toBeChecked();
  await context.setOffline(true);
  await expect(page.getByRole("status")).toHaveText("Perangkat offline");
  await context.setOffline(false);
  await expect(page.getByRole("status")).toHaveText("Perangkat online");
  await page.addStyleTag({
    content:
      ".demo-login-app { font-size: 200%; } .demo-login-app .demo-login *, .demo-login-shell .bottom-link, .demo-login-shell .mobile-disclaimer { font-size: inherit !important; }",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const button = page.getByRole("button", {
    name: "Masuk sebagai Koordinator medis",
    exact: true,
  });
  await button.scrollIntoViewIfNeeded();
  expect(
    await button.evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe("0s");
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/mobile$/);
});
