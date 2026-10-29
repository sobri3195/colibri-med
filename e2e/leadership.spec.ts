import { test, expect, type Page } from "@playwright/test";
async function login(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pimpinan");
  await expect(
    page.getByRole("heading", { name: "Pengawasan pimpinan", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Peran demo" })).toHaveValue(
    "Viewer pimpinan",
  );
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Sudut pantau" }),
  ).toBeVisible();
  await expect(
    page.locator(".leadership-metrics .card").first().locator("strong"),
  ).toHaveText("1");
}
test("leadership mobile dashboard supports four perspectives, active bottom navigation and narrow screens", async ({
  page,
}) => {
  await login(page);
  const nav = page.getByRole("navigation", { name: "Navigasi pengawasan" });
  await expect(nav.getByRole("link")).toHaveCount(5);
  for (const focus of ["kasau", "kemenhan", "kemenkes", "presiden"]) {
    await page
      .getByRole("combobox", { name: "Sudut pantau" })
      .selectOption(focus);
    await expect(page).toHaveURL(new RegExp("fokus=" + focus));
    await expect(page.locator(".leadership-hero")).toContainText(
      (
        {
          kasau: "Operasi udara",
          kemenhan: "Kesiapan dukungan",
          kemenkes: "Koordinasi pelayanan kesehatan",
          presiden: "Koordinasi lintas instansi",
        } as Record<string, string>
      )[focus],
    );
  }
  await page.screenshot({ path: "/tmp/colibri-pimpinan.png", fullPage: true });
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const box = (await nav.boundingBox())!;
    expect(box.y + box.height).toBeCloseTo(844, 0);
  }
  await nav.getByRole("link", { name: "Operasi", exact: true }).click();
  await expect(
    nav.getByRole("link", { name: "Operasi", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("heading", { name: "Tahapan misi" }),
  ).toBeVisible();
  await expect(
    page.getByText("Belum ada sampel durasi yang tercatat."),
  ).toBeVisible();
  await nav.getByRole("link", { name: "Kesiapan", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Sumber daya", exact: true }),
  ).toBeVisible();
  await nav.getByRole("link", { name: "Perhatian", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Permohonan menunggu respons" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Kualitas data (snapshot)" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Misi →|Catat penilaian|Tetapkan tim/ }),
  ).toHaveCount(0);
});
test("leadership exports aggregates and preserves period/perspective across tabs", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("combobox", { name: "Periode kohor" }).selectOption("7");
  await page
    .getByRole("combobox", { name: "Sudut pantau" })
    .selectOption("kemenkes");
  const nav = page.getByRole("navigation", { name: "Navigasi pengawasan" });
  await nav.getByRole("link", { name: "Laporan", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Periode kohor" }),
  ).toHaveValue("7");
  await expect(
    page.getByRole("combobox", { name: "Sudut pantau" }),
  ).toHaveValue("kemenkes");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Unduh CSV", exact: true }).click();
  const csv = await download;
  expect(csv.suggestedFilename()).toBe("COLIBRI-PIMPINAN-SIMULASI.csv");
  const stream = await csv.createReadStream();
  const parts: Buffer[] = [];
  for await (const part of stream!) parts.push(part);
  const text = Buffer.concat(parts).toString();
  expect(text).toContain("PROTOTIPE SIMULASI");
  expect(text).toContain("Kemenkes");
  expect(text).not.toContain("Pemohon Contoh A");
  expect(text).not.toContain("kontak-contoh");
  expect(text).not.toContain("Klinik Simulasi Utara");
  const pdf = page.waitForEvent("download");
  await page.getByRole("button", { name: "Unduh PDF", exact: true }).click();
  expect((await pdf).suggestedFilename()).toBe("COLIBRI-PIMPINAN-SIMULASI.pdf");
});
test("operator cannot open leadership data and viewer is redirected from raw internal pages", async ({
  page,
}) => {
  await page.goto("/pimpinan");
  await page
    .getByRole("combobox", { name: "Peran demo" })
    .selectOption("Operator");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Akses pengawasan terbatas" }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Sudut pantau" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Keluar untuk berganti akun" })
    .click();
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Sudut pantau" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Akun & ruang petugas" }).click();
  await expect(
    page.getByRole("link", { name: "Pengawasan pimpinan", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Kelola permohonan" }),
  ).toHaveCount(0);
  await page.goto("/internal/permohonan");
  await expect(page).toHaveURL(/\/login$/);
  await page
    .getByRole("combobox", { name: "Peran demo" })
    .selectOption("Viewer pimpinan");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/pimpinan$/);
  await expect(
    page.getByRole("combobox", { name: "Sudut pantau" }),
  ).toBeVisible();
});
test("leadership polling pauses when hidden and expiry stays in the leadership shell", async ({
  page,
}) => {
  await page.clock.install();
  await login(page);
  const updated = page.locator(".leadership-freshness small");
  const first = await updated.textContent();
  await page.clock.runFor(61000);
  await expect(updated).not.toHaveText(first!);
  const visible = await updated.textContent();
  await page.evaluate(() =>
    Object.defineProperty(document, "hidden", {
      value: true,
      configurable: true,
    }),
  );
  await page.clock.runFor(121000);
  await expect(updated).toHaveText(visible!);
  await page.clock.fastForward(3600001);
  await expect(page).toHaveURL(/\/pimpinan$/);
  await expect(
    page.getByRole("heading", { name: "Login petugas" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Navigasi pengawasan" }),
  ).toBeVisible();
});
