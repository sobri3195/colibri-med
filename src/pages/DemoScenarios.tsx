import { useCallback, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import type { Actor } from "../types";
import { mode } from "../services/api";
import { canManageScenarios } from "../lib/permissions";
import { scenarioDefinitions, type ScenarioKey } from "../lib/scenarios";
import {
  loadScenario,
  resetScenario,
  scenarioManifests,
} from "../services/demoScenarios";
import { usePolling } from "../features/usePolling";
import AsyncState from "../components/AsyncState";
export default function DemoScenarios({ actor }: { actor: Actor | null }) {
  if (mode !== "demo")
    return (
      <section className="card">
        <h1>Skenario demo tidak tersedia</h1>
        <p>
          Mode connected tetap memakai data backend. Tidak ada data latihan yang
          dimuat.
        </p>
        <Link to="/mobile">Kembali ke beranda</Link>
      </section>
    );
  if (!actor)
    return (
      <Navigate
        to="/mobile/login"
        state={{ from: "/mobile/skenario" }}
        replace
      />
    );
  if (!canManageScenarios(actor))
    return (
      <section className="card">
        <h1>Panduan skenario demo</h1>
        <p>
          Operator atau Administrator menyiapkan skenario. Pergantian peran
          adalah simulasi, bukan autentikasi akun.
        </p>
        <Link
          className="button"
          to={actor.role === "Viewer pimpinan" ? "/pimpinan" : "/mobile/akun"}
        >
          {actor.role === "Viewer pimpinan"
            ? "Buka pengawasan"
            : "Buka akun petugas"}
        </Link>
      </section>
    );
  return <ScenarioManager actor={actor} />;
}
function ScenarioManager({ actor }: { actor: Actor }) {
  const [manifests, setManifests] = useState<
    Awaited<ReturnType<typeof scenarioManifests>>
  >({});
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState<ScenarioKey | null>(null);
  const load = useCallback(
    async () => setManifests(await scenarioManifests(actor)),
    [actor],
  );
  const poll = usePolling(load);
  const run = async (key: ScenarioKey, reset = false) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      if (reset) {
        await resetScenario(actor, key);
        setConfirm(null);
      } else await loadScenario(actor, key);
      await poll.refresh();
      setMessage(
        reset
          ? "Data skenario dihapus. Data demo lain dan draft tetap disimpan."
          : "Skenario tersimpan di perangkat. Data pengguna lain tidak diganti.",
      );
    } catch (e) {
      setMessage(String(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <>
      <div className="mobile-page-title">
        <div className="eyebrow">LATIHAN TERPADU · DATA SINTETIS</div>
        <h1>Skenario demo</h1>
        <p>
          Paket riwayat latihan yang sudah disiapkan, bukan keputusan medis atau
          penerbangan baru. Memuat ulang paket tidak menimpa perubahan Anda.
        </p>
      </div>
      <AsyncState {...poll} reload={() => void poll.refresh()} />
      {busy && <p role="status">Memproses data skenario…</p>}
      <p>
        Mulai sebagai Operator/Administrator untuk menyiapkan paket. Gunakan
        Akun → Keluar → Login untuk mencoba peran lain. Pergantian peran hanya
        simulasi.
      </p>
      <div className="scenario-grid">
        {(
          Object.entries(scenarioDefinitions) as [
            ScenarioKey,
            (typeof scenarioDefinitions)[ScenarioKey],
          ][]
        ).map(([key, item]) => (
          <section className="card scenario-card" key={key}>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
            <p className="muted">
              {manifests[key] ? "Tersimpan di perangkat" : "Belum dimuat"}
            </p>
            <div className="actions">
              <button disabled={busy} onClick={() => void run(key)}>
                {manifests[key] ? "Periksa paket " : "Muat skenario "}
                {item.title}
              </button>
              {manifests[key] && (
                <>
                  <Link
                    className="button secondary"
                    to={
                      "/mobile/operasi/permohonan?" +
                      new URLSearchParams({ request: manifests[key].requestId })
                    }
                  >
                    Buka permohonan {item.title}
                  </Link>
                  <button
                    className="tertiary"
                    disabled={busy}
                    onClick={() => setConfirm(key)}
                  >
                    Reset {item.title}
                  </button>
                </>
              )}
            </div>
            {confirm === key && (
              <div
                className="notice"
                role="group"
                aria-label={"Konfirmasi reset " + item.title}
              >
                <p>
                  Hapus hanya seluruh data dan perubahan pada skenario “
                  {item.title}”. Draft, antrean, dan data demo lain tidak
                  dihapus. Reset ditolak bila masih ada antrean atau relasi data
                  lain. Draft lama harus ditinjau sebelum dimuat kembali.
                </p>
                <button
                  className="danger"
                  disabled={busy}
                  onClick={() => void run(key, true)}
                >
                  Ya, reset data skenario ini
                </button>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => setConfirm(null)}
                >
                  Batal reset
                </button>
              </div>
            )}
          </section>
        ))}
      </div>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      <section className="card">
        <h2>Panduan demonstrasi</h2>
        <ol className="scenario-guide">
          <li>Pilih paket latihan di atas dan buka permohonannya.</li>
          <li>
            Operator memeriksa kelengkapan dan meneruskan status satu tahap.
          </li>
          <li>
            Koordinator medis mencatat penilaian; Koordinator penerbangan
            mencatat tinjauan yang terpisah.
          </li>
          <li>
            Operator meninjau sumber daya lalu membentuk misi persiapan dan
            menetapkan tim. Keberangkatan tetap memerlukan tinjauan penerbangan
            Disetujui.
          </li>
          <li>
            Dokter/perawat atau Koordinator penerbangan mengisi daftar periksa;
            petugas mencatat perkembangan.
          </li>
          <li>
            Dokter/perawat atau Rumah sakit penerima mencatat serah terima yang
            terhubung; Operator menyelesaikan misi.
          </li>
          <li>
            Periksa <Link to="/mobile/operasi/laporan">laporan</Link> dan{" "}
            <Link to="/pimpinan">pengawasan pimpinan</Link> dari data yang sama.
          </li>
        </ol>
        <p>
          Antrean lokal tidak berjalan ketika aplikasi/browser ditutup. Skenario
          ini tidak dikirim ke deployment atau Google Sheets.
        </p>
      </section>
    </>
  );
}
