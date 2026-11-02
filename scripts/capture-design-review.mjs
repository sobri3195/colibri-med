// Screenshot documentation only; blocks map tiles to capture the honest offline fallback.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
const baseURL = process.env.DESIGN_BASE_URL ?? "http://127.0.0.1:5173";
const output =
  process.env.DESIGN_OUTPUT_DIR ?? "docs/design-review/screenshots";
await mkdir(output, { recursive: true });
(async () => {
  const phase = process.argv[2] || "after";
  if (!["before", "after"].includes(phase))
    throw new Error("Use before or after as the capture phase.");
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  for (const [device, width, height] of [
    ["mobile", 390, 844],
    ["desktop", 1366, 900],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.route("**/tile.openstreetmap.org/**", (r) => r.abort());
    const capture = async (name, path) => {
      await page.goto(baseURL + path);
      await page.waitForTimeout(900);
      await page.screenshot({
        path: join(output, `${phase}-${name}-${device}.png`),
        fullPage: true,
      });
    };
    await capture("login", "/mobile/login");
    await page
      .getByRole("radio", { name: "Administrator", exact: false })
      .check();
    await page.getByRole("button", { name: /^Masuk sebagai/ }).click();
    await page.goto(baseURL + "/mobile/skenario");
    for (const title of [
      "Permohonan baru",
      "Koordinasi berlangsung",
      "Misi selesai",
    ]) {
      await page
        .getByRole("button", { name: "Muat skenario " + title, exact: true })
        .click();
      await page
        .getByRole("link", { name: "Buka permohonan " + title, exact: true })
        .waitFor();
    }
    await capture("home", "/mobile");
    await capture(
      "requests",
      device === "desktop"
        ? "/internal/permohonan"
        : "/mobile/operasi/permohonan",
    );
    await capture("form", "/mobile/permohonan");
    await capture(
      "map",
      device === "desktop" ? "/admin" : "/mobile/operasi/helikopter",
    );
    await capture("leadership", "/pimpinan");
    await context.close();
  }
  await browser.close();
  console.log("Screenshots captured: " + phase);
})();
