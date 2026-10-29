import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Plane, ShieldCheck, ClipboardList } from "lucide-react";
import LocationMap from "../components/LocationMap";
import { requestSchema } from "../lib/domain";
import { submit, retry } from "../services/api";
import type { Actor } from "../types";
import { getLocal, putLocal } from "../services/storage";
export function Home() {
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
        </div>
        <div className="hero-icon">
          <Plane size={160} strokeWidth={1} />
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
      await putLocal("drafts", (actor?.id ?? "public") + ":request", form);
      setNotice("Tersimpan lokal — draft belum dikirim.");
    } catch {
      setNotice("Penyimpanan browser tidak tersedia.");
    }
  };
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
            setNotice(String(e));
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
                type={key === "patients" ? "number" : "text"}
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
        <LocationMap onPick={pick} />
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
          <button disabled={busy} type="submit">
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
                    (actor?.id ?? "public") + ":request",
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
            await retry(actor);
            setNotice(
              "Operasi outbox terkirim. Muat data terbaru untuk memeriksa status; belum berarti bantuan ditugaskan.",
            );
          } catch (e) {
            setNotice(String(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        Kirim ulang outbox saya
      </button>
      <small>
        Data browser dapat dihapus perangkat dan dibatasi kapasitas. Pengiriman
        tidak berjalan saat browser ditutup.
      </small>
    </section>
  );
}
