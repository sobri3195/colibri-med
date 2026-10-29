import { useState } from "react";
import type { RecordData } from "../types";
export default function CatalogueManager({
  kind,
  records,
  busy,
  act,
}: {
  kind: "facilities" | "resources";
  records: RecordData[];
  busy: boolean;
  act: (action: string, data: Record<string, unknown>) => Promise<any>;
}) {
  const [id, setId] = useState("");
  const current = records.find((r) => r.id === id);
  return (
    <details className="catalogue-manager">
      <summary>
        Kelola {kind === "facilities" ? "fasilitas" : "sumber daya"} sintetis
        (Administrator)
      </summary>
      <label>
        Pilih record direktori
        <select value={id} onChange={(e) => setId(e.target.value)}>
          <option value="">Tambahkan record baru</option>
          {records.map((r) => (
            <option value={r.id} key={r.id}>
              {String(r.name)}
            </option>
          ))}
        </select>
      </label>
      <CatalogueEditor
        key={kind + ":" + id}
        kind={kind}
        current={current}
        busy={busy}
        act={act}
        saved={setId}
      />
    </details>
  );
}
function CatalogueEditor({
  kind,
  current,
  busy,
  act,
  saved,
}: {
  kind: "facilities" | "resources";
  current?: RecordData;
  busy: boolean;
  act: (action: string, p: Record<string, unknown>) => Promise<any>;
  saved: (id: string) => void;
}) {
  const statuses =
    kind === "facilities"
      ? ["Perlu konfirmasi", "Tersedia simulasi", "Tidak tersedia simulasi"]
      : ["Perlu konfirmasi", "Siap simulasi", "Tidak siap simulasi"];
  const initial = (r?: RecordData) => ({
    name: String(r?.name ?? ""),
    location: String(r?.location ?? ""),
    lat: String(r?.lat ?? ""),
    lng: String(r?.lng ?? ""),
    category: String(r?.category ?? "Dukungan"),
    status: statuses.includes(r?.status ?? "") ? r!.status : statuses[0],
  });
  const [snapshot, setSnapshot] = useState(current);
  const [data, setData] = useState(() => initial(current));
  const [queued, setQueued] = useState(false);
  const changed = !!current && current.revision > (snapshot?.revision ?? 0);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const result = await act(kind + (snapshot ? ".update" : ".create"), {
          ...(snapshot
            ? { id: snapshot.id, baseRevision: snapshot.revision }
            : {}),
          data,
        });
        if (result && !result.queued) {
          setSnapshot(result);
          setData(initial(result));
          saved(result.id);
        }
        if (result?.queued) setQueued(true);
      }}
    >
      {changed && (
        <div className="notice">
          Data server berubah. Isian Anda dipertahankan.{" "}
          <button
            type="button"
            onClick={() => {
              setSnapshot(current);
              setData(initial(current));
            }}
          >
            Muat record terbaru
          </button>
        </div>
      )}
      <label>
        Nama sintetis
        <input
          required
          minLength={3}
          maxLength={150}
          value={data.name}
          onChange={(e) => setData({ ...data, name: e.target.value })}
        />
      </label>
      {kind === "facilities" ? (
        <>
          <label>
            Deskripsi lokasi fasilitas
            <input
              required
              minLength={3}
              maxLength={300}
              value={data.location}
              onChange={(e) => setData({ ...data, location: e.target.value })}
            />
          </label>
          <div className="grid two">
            <label>
              Lintang fasilitas
              <input
                required
                type="number"
                step="any"
                min={-90}
                max={90}
                value={data.lat}
                onChange={(e) => setData({ ...data, lat: e.target.value })}
              />
            </label>
            <label>
              Bujur fasilitas
              <input
                required
                type="number"
                step="any"
                min={-180}
                max={180}
                value={data.lng}
                onChange={(e) => setData({ ...data, lng: e.target.value })}
              />
            </label>
          </div>
        </>
      ) : (
        <label>
          Kategori sumber daya
          <select
            value={data.category}
            onChange={(e) => setData({ ...data, category: e.target.value })}
          >
            <option>Personel</option>
            <option>Peralatan</option>
            <option>Dukungan</option>
          </select>
        </label>
      )}
      <label>
        Status direktori
        <select
          value={data.status}
          onChange={(e) => setData({ ...data, status: e.target.value })}
        >
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <p className="muted">
        Data sintetis. Status ini tidak membuktikan kapasitas layanan, armada,
        atau kelayakan pendaratan.
      </p>
      {queued && (
        <p role="status" className="notice">
          Operasi direktori menunggu pengiriman di Outbox. Kirim ulang operasi
          yang sama; jangan membuat duplikat.
        </p>
      )}
      <button disabled={busy || queued}>
        {snapshot ? "Simpan perubahan direktori" : "Tambahkan record sintetis"}
      </button>
    </form>
  );
}
