import { useState } from "react";
import { Link } from "react-router-dom";
import type {
  AircraftView,
  AviationSnapshot,
  AircraftReportView,
} from "../../types/aviation";
import { aircraftStatuses, reportCategories } from "../../lib/aviation";
import { submit, mode, outboxOwner } from "../../services/api";
import { getLocal, putLocal } from "../../services/storage";
import type { Actor } from "../../types";
export default function AircraftReportForm({
  actor,
  aircraft,
  missions,
  saved,
  mobile,
}: {
  actor: Actor;
  aircraft: AircraftView;
  missions: AviationSnapshot["missions"];
  saved: () => Promise<void>;
  mobile: boolean;
}) {
  const initial = (a: AircraftView) => ({
    missionId: a.missionId,
    category: "Koordinasi",
    aircraftStatus: a.status,
    text: "",
    lat: "",
    lng: "",
  });
  const [snapshot, setSnapshot] = useState(aircraft);
  const [form, setForm] = useState(() => initial(aircraft));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [queued, setQueued] = useState(false);
  const key = outboxOwner(actor) + ":aircraft-report:" + aircraft.id;
  const changed = aircraft.revision !== snapshot.revision;
  return (
    <section className="card aircraft-report-form">
      <h2>Catat laporan awak — simulasi</h2>
      <p>
        Laporan operasional nonklinis yang dicatat petugas. Jangan masukkan
        identitas pasien. Tidak ada keputusan medis atau persetujuan penerbangan
        otomatis.
      </p>
      {changed && (
        <div className="notice" role="alert">
          Versi helikopter berubah. Isian Anda dipertahankan.{" "}
          <button
            type="button"
            onClick={() => {
              setSnapshot(aircraft);
              setForm({ ...form, aircraftStatus: aircraft.status });
            }}
          >
            Muat versi helikopter terbaru
          </button>
        </div>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const result = await submit(actor, "aircraftReports.create", {
              baseRevision: snapshot.revision,
              data: { ...form, aircraftId: aircraft.id },
            });
            if (result.queued) {
              setQueued(true);
              setMessage(
                "Menunggu jaringan/pengiriman di Outbox. Jangan membuat laporan duplikat.",
              );
            } else {
              const report = result as AircraftReportView;
              setSnapshot({
                ...snapshot,
                revision: report.aircraftRevision,
                lat: report.lat,
                lng: report.lng,
                status: report.aircraftStatus,
              });
              setForm({ ...form, text: "", lat: "", lng: "" });
              setMessage(
                mode === "demo"
                  ? "Laporan awak tercatat di demo lokal."
                  : "Laporan awak tercatat di server.",
              );
              await saved();
            }
          } catch (e) {
            setMessage(String(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Referensi misi
          <select
            value={form.missionId}
            onChange={(e) => setForm({ ...form, missionId: e.target.value })}
          >
            <option value="">Latihan tanpa misi</option>
            {missions.map((m) => (
              <option value={m.id} key={m.id}>
                {m.id.slice(0, 8)} · {m.status}
              </option>
            ))}
          </select>
        </label>
        <div className="grid two">
          <label>
            Jenis laporan
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {reportCategories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Status helikopter sintetis
            <select
              value={form.aircraftStatus}
              onChange={(e) =>
                setForm({ ...form, aircraftStatus: e.target.value })
              }
            >
              {aircraftStatuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Catatan operasional awak
          <textarea
            required
            minLength={3}
            maxLength={1000}
            value={form.text}
            onChange={(e) => setForm({ ...form, text: e.target.value })}
          />
        </label>
        <div className="grid two">
          <label>
            Lintang laporan (opsional)
            <input
              type="number"
              step="any"
              min={-90}
              max={90}
              value={form.lat}
              onChange={(e) => setForm({ ...form, lat: e.target.value })}
            />
          </label>
          <label>
            Bujur laporan (opsional)
            <input
              type="number"
              step="any"
              min={-180}
              max={180}
              value={form.lng}
              onChange={(e) => setForm({ ...form, lng: e.target.value })}
            />
          </label>
        </div>
        <small>
          Koordinat wajib berpasangan. Jika kosong, laporan memakai posisi
          tercatat sebelumnya; tidak dianggap pengamatan posisi baru.
        </small>
        <div className="actions">
          <button disabled={busy || queued}>Kirim laporan awak</button>
          <button
            type="button"
            className="secondary"
            onClick={async () => {
              try {
                await putLocal("drafts", key, { form, snapshot });
                setMessage("Draft laporan tersimpan lokal.");
              } catch {
                setMessage("Draft belum dapat disimpan pada perangkat.");
              }
            }}
          >
            Simpan draft laporan
          </button>
          <button
            type="button"
            className="secondary"
            onClick={async () => {
              try {
                const draft = await getLocal("drafts", key);
                if (!draft) {
                  setMessage("Belum ada draft laporan.");
                  return;
                }
                setForm(draft.form);
                setSnapshot(draft.snapshot);
                setMessage(
                  "Draft laporan dimuat; tinjau revision sebelum mengirim.",
                );
              } catch {
                setMessage("Draft laporan belum dapat dibaca.");
              }
            }}
          >
            Muat draft laporan
          </button>
        </div>
      </form>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      <Link to={mobile ? "/mobile/operasi/outbox" : "/internal/outbox"}>
        Buka Outbox laporan
      </Link>
    </section>
  );
}
