import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const phase = process.argv[2] ?? "after";
const out = "docs/compact-review";
const baseURL = process.env.DESIGN_BASE_URL ?? "http://127.0.0.1:5174";
if (!["before", "after"].includes(phase))
  throw new Error("Use before or after");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const results = [];
for (const [width, height] of [
  [390, 844],
  [1366, 768],
]) {
  const c = await browser.newContext({
    viewport: { width, height },
    reducedMotion: "reduce",
  });
  const p = await c.newPage();
  await p.clock.setFixedTime(new Date("2026-11-03T12:00:00Z"));
  await p.route("**/tile.openstreetmap.org/**", (r) => r.abort());
  const capture = async (name, path) => {
    await p.goto(baseURL + path);
    await p.waitForTimeout(700);
    await p.evaluate(() => scrollTo(0, 0));
    results.push(
      await p.evaluate(
        ({ name, width, height }) => {
          const box = (s) => {
            const e = document.querySelector(s);
            if (!e) return null;
            const b = e.getBoundingClientRect();
            return {
              top: Math.round(b.top + scrollY),
              height: Math.round(b.height),
              width: Math.round(b.width),
              bottom: Math.round(b.bottom + scrollY),
            };
          };
          return {
            name,
            width,
            height,
            header: box("header"),
            status:
              box(".mobile-connection") ??
              box(".desktop-runtime") ??
              box(".simulation"),
            heading: box(".page-heading"),
            toolbar: box(".toolbar") ?? box(".air-object-toolbar"),
            list: box(".request-list-panel"),
            map: box(".aircraft-map") ?? box(".map"),
            detail: box("#request-workspace") ?? box(".aircraft-detail-panel"),
            form: box(".request-page"),
            pageHeight: document.documentElement.scrollHeight,
          };
        },
        { name, width, height },
      ),
    );
    await p.screenshot({
      path: `${out}/${phase}-${name}-${width}.png`,
      fullPage: true,
    });
  };
  await capture("public", "/");
  await capture("login", "/mobile/login");
  await p.getByRole("radio", { name: /^Administrator/ }).check();
  await p.getByRole("button", { name: /^Masuk sebagai/ }).click();
  await capture(
    "requests",
    width >= 1100 ? "/internal/permohonan" : "/mobile/operasi/permohonan",
  );
  await capture("aircraft", "/mobile/operasi/helikopter");
  await capture(
    "facilities",
    width >= 1100 ? "/internal/fasilitas" : "/mobile/peta",
  );
  await capture("form", "/mobile/permohonan");
  await c.close();
}
await writeFile(
  `${out}/${phase}-metrics.json`,
  JSON.stringify(results, null, 2) + "\n",
);
await browser.close();
console.log(JSON.stringify(results));
