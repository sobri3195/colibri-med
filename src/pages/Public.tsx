import { useCallback, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Plane, ShieldCheck, ClipboardList } from "lucide-react";
import LocationMap from "../components/LocationMap";
import { requestSchema } from "../lib/domain";
import { submit, retry, mode, outboxOwner } from "../services/api";
import type { Actor } from "../types";
import {
  getLocal,
  putLocal,
  receipts,
  outbox,
  archiveOperation,
} from "../services/storage";
import { date } from "../lib/domain";
import { errorCode } from "../lib/errors";
export function Home({
  actor = null,
  onDemoAdmin,
}: {
  actor?: Actor | null;
  onDemoAdmin?: () => void;
}) {
  return (
    <>
      <section className="hero">
        <div className="eyebrow">KOORDINASI • KESIAPAN • KEPEDULIAN</div>
        <h1>
          Menghubungkan tim.
          <br />
          <span>Mendekatkan pertolongan.</span>
        </h1>
        <p>Sistem Koordinasi Helikopter Dokter dan Evakuasi Medis Udara</p>
        <p className="muted">
          Ruang simulasi koordinasi: dari permohonan bantuan, penilaian petugas,
          hingga serah terima pasien.
        </p>
        <div className="actions">
          <Link className="button" to="/permohonan">
            Buat permohonan simulasi <ArrowRight size={18} />
          </Link>
          <Link className="button secondary" to="/login">
            Masuk ruang koordinasi
          </Link>
          <Link className="button secondary" to="/mobile">
            Versi mobile
          </Link>
          <Link className="button secondary" to="/pimpinan">
            Pengawasan pimpinan
          </Link>
        </div>
        <div className="hero-icon">
          <Plane size={160} strokeWidth={1} />
        </div>
      </section>
      <section className="card index-admin">
        <div>
          <span className="eyebrow">AKSES ADMINISTRATOR</span>
          <h2>Pantau helikopter dan laporan awak</h2>
          <p>
            Buka pusat pantau sintetis untuk melihat posisi laporan, memutar
            simulasi pergerakan, dan membaca laporan operasional per helikopter.
          </p>
          <small>
            {mode === "demo"
              ? "Akun: Administrator Demo · latihan lokal tanpa password. Bukan autentikasi layanan nyata."
              : "Gunakan akun undangan Administrator. Akses demo tidak tersedia dalam mode connected."}
          </small>
        </div>
        <div className="index-admin-actions">
          {actor?.role === "Administrator" ? (
            <Link className="button" to="/admin">
              Buka dashboard admin <ArrowRight size={17} />
            </Link>
          ) : mode === "demo" ? (
            <button onClick={onDemoAdmin} disabled={!onDemoAdmin}>
              Masuk admin demo <ArrowRight size={17} />
            </button>
          ) : (
            <Link className="button" to="/admin/login">
              Login admin <ArrowRight size={17} />
            </Link>
          )}
          <Link to="/admin/laporan">Lihat laporan helikopter</Link>
        </div>
      </section>
      <div className="grid three">
        {[
          [
            ClipboardList,
            "Alur yang tercatat",
            "Setiap tahap dicatat untuk membantu koordinasi antar peran.",
          ],
          [
            ShieldCheck,
            "Keputusan oleh petugas",
            "Penilaian medis dan tinjauan penerbangan tetap terpisah.",
          ],
          [
            Plane,
            "Simulasi menyeluruh",
            "Data contoh untuk menguji kesiapan alur operasional.",
          ],
        ].map(([Icon, title, text]: any) => (
          <article className="card" key={title}>
            <Icon color="#0d9488" />
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
      <Info />
    </>
  );
}
export function Info() {
  return (
    <section className="card info">
      <h2>Tentang prototipe</h2>
      <p>
        Prototipe usulan untuk konsep layanan Helikopter Dokter Colibri TNI AU.
        Belum merupakan layanan resmi dan bukan saluran permintaan pertolongan
        darurat.
      </p>
      <h3>Alur layanan simulasi</h3>
      <p>
        Permohonan → Verifikasi operator → Penilaian medis & tinjauan
        penerbangan → Penugasan tim → Catatan & checklist → Serah terima →
        Laporan.
      </p>
      <h3>FAQ</h3>
      <details>
        <summary>Apakah permohonan langsung menugaskan bantuan?</summary>
        <p>
          Tidak. Tercatat di server berbeda dari diterima operator dan
          ditugaskan. Keputusan petugas tetap diperlukan.
        </p>
      </details>
      <details>
        <summary>Apakah lokasi di peta layak untuk pendaratan?</summary>
        <p>
          Peta hanya alat bantu koordinasi; kelayakan harus ditinjau petugas
          berwenang.
        </p>
      </details>
      <h3>Kontak</h3>
      <p>
        {import.meta.env.VITE_PUBLIC_CONTACT ||
          "Kontak prototipe belum dikonfigurasi. Tidak tersedia nomor layanan darurat melalui prototipe ini."}
      </p>
    </section>
  );
}
const empty = {
  name: "",
  contact: "contoh@invalid.example",
  facility: "",
  summary: "",
  patients: 1,
  location: "",
  access: "",
  lat: "" as string | number,
  lng: "" as string | number,
};
export function RequestForm({ actor = null }: { actor?: Actor | null }) {
  const [form, setForm] = useState(empty);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const owner = outboxOwner(actor);
  const refreshLocal = useCallback(async () => {
    setHistory(await receipts(owner));
    setPending(
      (await outbox(owner)).filter((op) => op.action === "requests.create"),
    );
  }, [owner]);
  useEffect(() => {
    void refreshLocal().catch(() =>
      setNotice("Riwayat lokal belum dapat dibaca."),
    );
  }, [refreshLocal]);
  const pick = useCallback(
    (lat: number, lng: number) =>
      setForm((f) => ({
        ...f,
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
      })),
    [],
  );
  const save = async () => {
    try {
      await putLocal(
        "drafts",
        mode + ":" + (actor?.id ?? "public") + ":request",
        form,
      );
      setNotice("Tersimpan lokal — draft belum dikirim.");
    } catch {
      setNotice("Penyimpanan browser tidak tersedia.");
    }
  };
  if (actor?.role === "Viewer pimpinan")
    return (
      <section className="card">
        <h1>Akun pengawasan hanya baca</h1>
        <p>Gunakan akun operator untuk mengirim permohonan simulasi.</p>
        <Link className="button" to="/pimpinan">
          Buka pengawasan pimpinan
        </Link>
      </section>
    );
  return (
    <section className="card">
      <div className="eyebrow">PERMOHONAN SIMULASI</div>
      <h1>Mulai koordinasi</h1>
      <p>
        Gunakan identitas dan kebutuhan sintetis. Jangan masukkan data pasien
        nyata.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const p = requestSchema.parse(form);
            const r = await submit(actor, "requests.create", { data: p });
            setSubmitted(true);
            await refreshLocal();
            setNotice(
              r.queued
                ? "Menunggu jaringan — tersimpan di outbox lokal."
                : "Tercatat di " +
                    (import.meta.env.VITE_APP_MODE === "connected"
                      ? "server"
                      : "penyimpanan demo lokal") +
                    ". Belum diterima operator dan belum ada penugasan.",
            );
          } catch (e) {
            if (e && typeof e === "object" && "issues" in e)
              setNotice(
                "Periksa isian: nama/fasilitas/lokasi wajib, jumlah pasien 1–100, dan koordinat harus berpasangan.",
              );
            else {
              setNotice(String(e));
              if (
                ["NETWORK", "UPSTREAM", "BUSY", "PARTIAL_FAILURE"].includes(
                  errorCode(e),
                )
              )
                setSubmitted(true);
            }
            await refreshLocal().catch(() => {});
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="grid two">
          {[
            ["name", "Nama pemohon sintetis"],
            ["contact", "Kontak contoh"],
            ["facility", "Fasilitas asal"],
            ["patients", "Jumlah pasien"],
            ["location", "Deskripsi lokasi"],
            ["access", "Informasi akses"],
            ["lat", "Lintang (opsional)"],
            ["lng", "Bujur (opsional)"],
          ].map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                required={!["lat", "lng", "access"].includes(key)}
                type={
                  ["patients", "lat", "lng"].includes(key) ? "number" : "text"
                }
                min={
                  key === "patients"
                    ? 1
                    : key === "lat"
                      ? -90
                      : key === "lng"
                        ? -180
                        : undefined
                }
                max={
                  key === "patients"
                    ? 100
                    : key === "lat"
                      ? 90
                      : key === "lng"
                        ? 180
                        : undefined
                }
                step={
                  key === "patients"
                    ? 1
                    : ["lat", "lng"].includes(key)
                      ? "any"
                      : undefined
                }
                maxLength={
                  key === "name" || key === "contact"
                    ? 100
                    : key === "facility"
                      ? 150
                      : key === "location"
                        ? 300
                        : 500
                }
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </label>
          ))}
        </div>
        <label>
          Ringkasan kebutuhan
          <textarea
            required
            value={form.summary}
            maxLength={2000}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
          />
        </label>
        <LocationMap
          onPick={pick}
          selected={
            form.lat !== "" && form.lng !== ""
              ? [Number(form.lat), Number(form.lng)]
              : undefined
          }
        />
        <button
          type="button"
          className="secondary"
          onClick={() => {
            if (!navigator.geolocation) {
              setNotice(
                "Lokasi perangkat tidak didukung; isi koordinat manual.",
              );
              return;
            }
            navigator.geolocation.getCurrentPosition(
              (p) => pick(p.coords.latitude, p.coords.longitude),
              () =>
                setNotice(
                  "Izin lokasi ditolak atau lokasi tidak tersedia. Isi koordinat manual.",
                ),
            );
          }}
        >
          Gunakan Lokasi Saya
        </button>
        <div className="actions">
          <button disabled={busy || submitted} type="submit">
            {busy ? "Mengirim…" : "Kirim permohonan simulasi"}
          </button>
          <button className="secondary" type="button" onClick={save}>
            Simpan draft
          </button>
          <button
            className="secondary"
            type="button"
            onClick={async () => {
              try {
                setForm(
                  (await getLocal(
                    "drafts",
                    mode + ":" + (actor?.id ?? "public") + ":request",
                  )) ?? empty,
                );
              } catch {
                setNotice("Draft tidak dapat dibuka.");
              }
            }}
          >
            Muat draft
          </button>
        </div>
      </form>
      <p role="status">{notice}</p>
      {submitted && (
        <div className="notice">
          <p>
            Pengiriman ini sudah diproses atau masuk antrean. Gunakan kirim
            ulang untuk operasi yang sama agar tidak menggandakan permohonan.
          </p>
          <button
            className="secondary"
            onClick={() => {
              setForm({ ...empty });
              setSubmitted(false);
              setNotice(
                "Form baru. Permohonan sebelumnya tetap tercatat atau berada di outbox.",
              );
            }}
          >
            Mulai permohonan baru
          </button>
        </div>
      )}
      <button
        disabled={busy}
        className="secondary"
        onClick={async () => {
          setBusy(true);
          try {
            if (!navigator.onLine) {
              setNotice("Menunggu jaringan.");
              return;
            }
            const result = await retry(actor);
            await refreshLocal();
            setNotice(
              result.sent
                ? result.sent +
                    " operasi outbox terkirim. Belum berarti bantuan ditugaskan."
                : "Tidak ada operasi yang menunggu pengiriman.",
            );
          } catch (e) {
            setNotice(String(e));
          } finally {
            setBusy(false);
            await refreshLocal().catch(() => {});
          }
        }}
      >
        Kirim ulang outbox saya
      </button>
      {!!pending.length && (
        <section className="submission-history">
          <h2>Pengiriman tertunda saya</h2>
          {pending.map((p) => (
            <div key={p.operationId}>
              <strong>{p.status}</strong>
              <small>
                Operasi {p.operationId.slice(0, 8)} · percobaan {p.retryCount}
              </small>
              {["Konflik perubahan", "Perlu ditinjau"].includes(p.status) && (
                <button
                  className="secondary"
                  onClick={async () => {
                    try {
                      await archiveOperation(owner, p.operationId);
                      await refreshLocal();
                      setSubmitted(false);
                      setNotice(
                        "Operasi ditolak diarsipkan; periksa dan perbaiki data sebelum membuat pengiriman baru.",
                      );
                    } catch (e) {
                      setNotice(String(e));
                    }
                  }}
                >
                  Arsipkan setelah ditinjau
                </button>
              )}
              {p.status === "Perlu rekonsiliasi" && (
                <p>
                  Hubungi administrator dengan ID operasi; jangan membuat
                  operasi pengganti.
                </p>
              )}
            </div>
          ))}
        </section>
      )}
      {!!history.length && (
        <section className="submission-history">
          <h2>Bukti pencatatan saya</h2>
          <p>
            Salinan lokal penerimaan, bukan status misi terkini atau bukti
            penugasan.
          </p>
          {history.map((r) => (
            <div key={r.operationId}>
              <strong>
                {mode === "demo"
                  ? "Tercatat di demo lokal"
                  : "Tercatat di server"}
              </strong>
              <small>
                Referensi {r.id.slice(0, 8)} · {date(r.recordedAt)}
              </small>
              <Link
                className="button secondary"
                to={
                  "/mobile/operasi/permohonan?" +
                  new URLSearchParams({ request: r.id })
                }
              >
                Buka melalui akun petugas
              </Link>
            </div>
          ))}
        </section>
      )}
      <small>
        Data browser dapat dihapus perangkat dan dibatasi kapasitas. Pengiriman
        tidak berjalan saat browser ditutup.
      </small>
    </section>
  );
}
