import { useState } from "react";
import type { RecordData } from "../types";
import { date } from "../lib/domain";
export default function RecordTable({
  items,
  query = "",
  status = "",
  compact = false,
  onOpen,
}: {
  items: RecordData[];
  query?: string;
  status?: string;
  compact?: boolean;
  onOpen?: (record: RecordData) => void;
}) {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [key, setKey] = useState(JSON.stringify([query, status]));
  if (key !== JSON.stringify([query, status])) {
    setKey(JSON.stringify([query, status]));
    setPage(0);
  }
  const rows = items.filter(
    (r) =>
      (!status || r.status === status) &&
      JSON.stringify(r).toLowerCase().includes(query.toLowerCase()),
  );
  const last = Math.max(0, Math.ceil(rows.length / size) - 1);
  const current = Math.min(page, last);
  if (!items.length)
    return <p className="empty">Belum ada data untuk ditampilkan.</p>;
  return (
    <>
      {compact ? (
        <div className="mobile-record-list">
          {rows.slice(current * size, (current + 1) * size).map((r) => (
            <article className="mobile-record" key={r.id}>
              <div>
                <strong>
                  {String(
                    r.facility ??
                      r.name ??
                      r.team ??
                      r.action ??
                      "Record sintetis",
                  )}
                </strong>
                <span className="badge">{r.status}</span>
              </div>
              <small>
                Referensi {r.id.slice(0, 8)} · {date(r.updatedAt)}
              </small>
              {r.text !== undefined && <p>{String(r.text)}</p>}
              {r.location !== undefined && <p>Lokasi: {String(r.location)}</p>}
              {onOpen && (
                <button className="secondary" onClick={() => onOpen(r)}>
                  Buka permohonan {r.id.slice(0, 8)}
                </button>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Referensi</th>
                <th>Nama / rincian</th>
                <th>Status</th>
                <th>Pembaruan (WIB)</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(current * size, (current + 1) * size).map((r) => (
                <tr key={r.id}>
                  <td>{r.id.slice(0, 8)}</td>
                  <td>
                    {String(
                      r.name ??
                        r.facility ??
                        r.text ??
                        r.team ??
                        r.action ??
                        r.requestId ??
                        "—",
                    )}
                    {r.durationSeconds !== undefined && (
                      <small className="duration">
                        Durasi tahap sebelumnya:{" "}
                        {Number(r.durationSeconds).toFixed(0)} detik
                      </small>
                    )}
                  </td>
                  <td>
                    <span className="badge">● {r.status}</span>
                  </td>
                  <td>{date(r.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!rows.length ? (
        <p>Tidak ada hasil sesuai filter.</p>
      ) : (
        <nav className="pagination" aria-label="Navigasi halaman tabel">
          <span>
            {current * size + 1}–{Math.min((current + 1) * size, rows.length)}{" "}
            dari {rows.length}
          </span>
          <button
            className="secondary"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            Sebelumnya
          </button>
          <button
            className="secondary"
            disabled={current === last}
            onClick={() => setPage(current + 1)}
          >
            Berikutnya
          </button>
          <label>
            Baris per halaman
            <select
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value));
                setPage(0);
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>
        </nav>
      )}
    </>
  );
}
