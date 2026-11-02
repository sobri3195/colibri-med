import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
async function choose(page: Page, role: string) {
  await page.getByRole("radio", { name: role, exact: false }).check();
  await page.getByRole("button", { name: /^Masuk sebagai/ }).click();
}
async function start(page: Page, role = "Operator") {
  await page.route("**/tile.openstreetmap.org/**", (r) => r.abort());
  await page.goto("/mobile/login");
  await choose(page, role);
}
async function changeRole(page: Page, role: string, path: string) {
  await settled(page);
  await page.goto("/mobile/akun");
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await page.getByRole("link", { name: "Login petugas", exact: true }).click();
  await choose(page, role);
  await page.goto(path);
}
async function settled(page: Page) {
  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const { outbox } = await import("/src/services/storage.ts");
        const actor = JSON.parse(
          sessionStorage.getItem("colibri-demo-session")!,
        ).actor;
        return (await outbox("demo:" + actor.id)).length;
      }),
    )
    .toBe(0);
}
async function saved(page: Page) {
  await expect(
    page.getByRole("status").filter({ hasText: /^Tersimpan di perangkat$/ }),
  ).toBeVisible();
  await settled(page);
}
const section = (page: Page, title: string) =>
  page.locator("details").filter({
    has: page
      .locator("summary")
      .filter({ hasText: new RegExp("^" + title + "$") }),
  });
async function note(page: Page, title: string, text: string, status?: string) {
  const form = section(page, title);
  await form.locator(":scope > summary").click();
  await form.getByLabel("Catatan sintetis", { exact: true }).fill(text);
  if (status)
    await form
      .getByRole("combobox", { name: "Status", exact: true })
      .selectOption(status);
  await form
    .getByRole("button", { name: "Catat " + title.toLowerCase(), exact: true })
    .click();
  await saved(page);
  await expect(
    form.getByRole("button", {
      name: "Catat " + title.toLowerCase(),
      exact: true,
    }),
  ).toBeEnabled();
}
test("three scenarios are isolated, reload-safe, repeatable, and reset only the chosen package", async ({
  page,
}) => {
  await start(page);
  await page.goto("/mobile/skenario");
  for (const title of [
    "Permohonan baru",
    "Koordinasi berlangsung",
    "Misi selesai",
  ]) {
    await page
      .getByRole("button", { name: "Muat skenario " + title, exact: true })
      .dblclick();
    await expect(
      page.getByRole("link", { name: "Buka permohonan " + title, exact: true }),
    ).toBeVisible();
  }
  await page.reload();
  await page
    .getByRole("button", {
      name: "Periksa paket Koordinasi berlangsung",
      exact: true,
    })
    .click();
  const state = await page.evaluate(async () => {
    const { getLocal } = await import("/src/services/storage.ts");
    return getLocal("demo", "state");
  });
  expect(state.tables.Requests.filter((r: any) => r.demoScenario)).toHaveLength(
    3,
  );
  expect(state.tables.Missions.filter((r: any) => r.demoScenario)).toHaveLength(
    2,
  );
  await page
    .getByRole("button", { name: "Reset Permohonan baru", exact: true })
    .click();
  await page.getByRole("button", { name: "Batal reset", exact: true }).click();
  await expect(
    page.getByRole("link", {
      name: "Buka permohonan Permohonan baru",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Reset Permohonan baru", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ya, reset data skenario ini", exact: true })
    .click();
  await expect(
    page.getByRole("link", {
      name: "Buka permohonan Permohonan baru",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", {
      name: "Buka permohonan Misi selesai",
      exact: true,
    }),
  ).toBeVisible();
  const after = await page.evaluate(async () => {
    const { getLocal } = await import("/src/services/storage.ts");
    return getLocal("demo", "state");
  });
  expect(after.tables.Requests.filter((r: any) => !r.demoScenario)).toEqual(
    state.tables.Requests.filter((r: any) => !r.demoScenario),
  );
});
test("new scenario completes through actual role changes and produces readable CSV/PDF exports", async ({
  page,
}) => {
  await start(page);
  await page.goto("/mobile/skenario");
  await page
    .getByRole("button", { name: "Muat skenario Permohonan baru", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Buka permohonan Permohonan baru", exact: true })
    .click();
  test.setTimeout(60000);
  const request = new URL(page.url()).searchParams.get("request")!;
  const detail = "/mobile/operasi/permohonan?request=" + request;
  const assessment = "/mobile/operasi/penilaian?request=" + request;
  for (const status of [
    "Diterima Operator",
    "Diverifikasi",
    "Dalam Koordinasi",
  ]) {
    await page
      .getByRole("button", { name: "Permohonan → " + status, exact: true })
      .click();
    await saved(page);
  }
  await changeRole(page, "Koordinator medis", assessment);
  await note(
    page,
    "Penilaian medis",
    "Penilaian kebutuhan sintetis latihan terpadu",
    "Rekomendasi Dicatat",
  );
  await changeRole(page, "Koordinator penerbangan", assessment);
  await note(
    page,
    "Tinjauan penerbangan",
    "Tinjauan latihan terpisah dari penilaian medis",
    "Disetujui",
  );
  await changeRole(
    page,
    "Operator",
    "/mobile/operasi/sumber-daya?request=" + request,
  );
  const ready = page.locator("form").filter({
    has: page.getByRole("combobox", {
      name: "Kesiapan Tim Latihan Permohonan baru",
      exact: true,
    }),
  });
  await ready.getByRole("combobox").selectOption("Siap simulasi");
  await ready
    .getByRole("button", { name: "Catat kesiapan", exact: true })
    .click();
  await saved(page);
  await page.goto(detail);
  await page
    .getByLabel("Tim simulasi", { exact: true })
    .fill("Tim Latihan Terpadu");
  const resource = page.getByLabel("Sumber daya ditinjau (opsional)", {
    exact: true,
  });
  await resource.selectOption(
    (await resource
      .locator("option")
      .filter({ hasText: "Tim Latihan Permohonan baru" })
      .getAttribute("value")) as string,
  );
  const aircraft = page.getByLabel("Helikopter sintetis (opsional)", {
    exact: true,
  });
  await aircraft.selectOption(
    (await aircraft
      .locator("option")
      .filter({ hasText: "SK-BARU" })
      .getAttribute("value")) as string,
  );
  await page
    .getByRole("button", { name: "Buat misi & tetapkan tim", exact: true })
    .evaluate((button) => {
      const form = (button as HTMLButtonElement).form!;
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
  await saved(page);
  await expect(
    page.getByRole("heading", { name: "Misi · Persiapan", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Misi → Tim Ditugaskan", exact: true })
    .click();
  await saved(page);
  await changeRole(page, "Dokter/perawat", assessment);
  const checklist = section(page, "Checklist");
  await checklist.locator(":scope > summary").click();
  for (const checkbox of await checklist.getByRole("checkbox").all())
    await checkbox.check();
  await checklist
    .getByRole("button", { name: "Catat checklist", exact: true })
    .click();
  await expect(
    checklist.getByRole("button", { name: "Catat checklist", exact: true }),
  ).toBeEnabled();
  await note(
    page,
    "Catatan pasien sintetis",
    "CATATAN-KLINIS-SINTETIS-TERPADU",
  );
  await changeRole(page, "Operator", "/mobile/misi?request=" + request);
  for (const status of [
    "Berangkat",
    "Tiba di Lokasi",
    "Pasien Dijemput",
    "Menuju Fasilitas Penerima",
    "Serah Terima",
  ]) {
    await page
      .getByRole("button", { name: "Misi → " + status, exact: true })
      .click();
    await saved(page);
  }
  await expect(
    page.getByRole("button", { name: "Misi → Selesai", exact: true }),
  ).toBeDisabled();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Serah terima atau alasan override diperlukan" }),
  ).toBeVisible();
  await changeRole(page, "Rumah sakit penerima", assessment);
  await note(
    page,
    "Serah terima",
    "Serah terima pasien sintetis tercatat pada fasilitas latihan",
  );
  await changeRole(page, "Operator", "/mobile/misi?request=" + request);
  await page
    .getByRole("button", { name: "Misi → Selesai", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Misi · Selesai", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Misi · Selesai", exact: true }),
  ).toBeVisible();
  const stored = await page.evaluate(async () => {
    const { getLocal } = await import("/src/services/storage.ts");
    return getLocal("demo", "state");
  });
  expect(
    stored.tables.Missions.filter((m: any) => m.requestId === request),
  ).toHaveLength(1);
  expect(
    stored.tables.HandoverRecords.filter((h: any) => h.requestId === request),
  ).toHaveLength(1);
  await page.goto("/mobile/operasi/laporan");
  for (const format of ["CSV", "PDF"]) {
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Ekspor " + format, exact: true })
      .click();
    const file = await download;
    const path = `/tmp/colibri-integrated-demo.${format.toLowerCase()}`;
    await file.saveAs(path);
    const bytes = await readFile(path);
    if (format === "CSV") {
      expect(bytes.toString()).toContain("PROTOTIPE SIMULASI");
      expect(bytes.toString()).toContain("Selesai");
      expect(bytes.toString()).toContain("Pembaruan (WIB)");
      expect(bytes.toString()).not.toContain("CATATAN-KLINIS-SINTETIS-TERPADU");
    } else {
      expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
      expect(bytes.toString("latin1")).toContain("%%EOF");
      expect(bytes.toString("latin1")).toMatch(/\/Type \/Page/);
    }
  }
  await changeRole(page, "Viewer pimpinan", "/pimpinan");
  await expect(
    page
      .locator(".leadership-metrics article")
      .filter({ hasText: "Misi selesai" })
      .locator("strong"),
  ).toHaveText("1");
  await page.goto("/mobile/skenario");
  await expect(page.getByRole("button")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Panduan skenario demo" }),
  ).toBeVisible();
});
test("draft restore warns before replacing unsaved input and duplicate submit remains one request", async ({
  page,
}) => {
  await start(page);
  await page.goto("/mobile/permohonan");
  await page
    .getByLabel("Nama pemohon sintetis", { exact: true })
    .fill("Pemohon latihan");
  await page
    .getByLabel("Fasilitas asal", { exact: true })
    .fill("Fasilitas latihan");
  await page
    .getByLabel("Deskripsi lokasi", { exact: true })
    .fill("Lokasi latihan");
  await page
    .getByLabel("Ringkasan kebutuhan", { exact: true })
    .fill("Ringkasan tersimpan");
  await page.getByRole("button", { name: "Simpan draft", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "draft belum dikirim" }),
  ).toBeVisible();
  await page
    .getByLabel("Ringkasan kebutuhan", { exact: true })
    .fill("Isian belum disimpan");
  await page.getByRole("button", { name: "Muat draft", exact: true }).click();
  await page
    .getByRole("button", { name: "Pertahankan isian", exact: true })
    .click();
  await expect(
    page.getByLabel("Ringkasan kebutuhan", { exact: true }),
  ).toHaveValue("Isian belum disimpan");
  await page.getByRole("button", { name: "Muat draft", exact: true }).click();
  await page
    .getByRole("button", { name: "Ganti isian dengan draft", exact: true })
    .click();
  await expect(
    page.getByLabel("Ringkasan kebutuhan", { exact: true }),
  ).toHaveValue("Ringkasan tersimpan");
  await page.locator(".request-page > form").evaluate((form) => {
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  });
  await expect(
    page.getByRole("status").filter({ hasText: "Belum diterima operator" }),
  ).toBeVisible();
  const rows = await page.evaluate(async () => {
    const { getLocal } = await import("/src/services/storage.ts");
    return (await getLocal("demo", "state")).tables.Requests;
  });
  expect(
    rows.filter((r: any) => r.facility === "Fasilitas latihan"),
  ).toHaveLength(1);
});

test("failed storage never claims a loaded package and can be retried", async ({
  page,
}) => {
  await start(page);
  await page.goto("/mobile/skenario");
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    (window as any).restoreScenarioPut = () => {
      IDBObjectStore.prototype.put = original;
    };
    IDBObjectStore.prototype.put = function (...args: any[]) {
      if (this.name === "demo")
        throw new DOMException("Simulated quota", "QuotaExceededError");
      return original.apply(this, args as any);
    };
  });
  await page
    .getByRole("button", { name: "Muat skenario Permohonan baru", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Penyimpanan perangkat gagal" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Buka permohonan Permohonan baru",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.evaluate(() => (window as any).restoreScenarioPut());
  await page
    .getByRole("button", { name: "Muat skenario Permohonan baru", exact: true })
    .click();
  await expect(
    page.getByRole("link", {
      name: "Buka permohonan Permohonan baru",
      exact: true,
    }),
  ).toBeVisible();
});
test("a visible Viewer dashboard refreshes from a scenario committed in another tab", async ({
  page,
  context,
}) => {
  await start(page, "Viewer pimpinan");
  await page.goto("/pimpinan");
  const completed = page
    .locator(".leadership-metrics article")
    .filter({ hasText: "Misi selesai" })
    .locator("strong");
  await expect(completed).toHaveText("0");
  const other = await context.newPage();
  await start(other);
  await other.goto("/mobile/skenario");
  await other
    .getByRole("button", { name: "Muat skenario Misi selesai", exact: true })
    .click();
  await expect(
    other.getByRole("link", {
      name: "Buka permohonan Misi selesai",
      exact: true,
    }),
  ).toBeVisible();
  await page.bringToFront();
  await expect(completed).toHaveText("1");
  await other.close();
});
