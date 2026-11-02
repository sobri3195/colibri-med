import { attentionItems } from "../features/leadership/presentation";
import { listDate } from "../lib/presentation";
import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import type { Actor, RecordData } from "../types";
import { call } from "../services/api";
import { usePolling } from "../features/usePolling";
import { summaryCounts } from "../lib/domain";
import { EmptyState, SectionHeading, StatusBadge } from "./MobileUI";
import AsyncState from "./AsyncState";

// Only operational roles mount this component; Viewer uses its aggregate dashboard.
export default function MobileOverview({ actor }: { actor: Actor }) {
  const [data, setData] = useState<Record<string, RecordData[]> | null>(null);
  const load = useCallback(
    async () => setData(await call("reports.summary", {}, actor)),
    [actor],
  );
  const poll = usePolling(load);
  const counts = data && summaryCounts(data);
  return (
    <section className="mobile-overview" aria-label="Ringkasan aktivitas">
      <SectionHeading title="Sekilas koordinasi">
        <Link to="/mobile/operasi">Lihat ringkasan</Link>
      </SectionHeading>
      <AsyncState {...poll} reload={() => void poll.refresh()} />
      {counts && (
        <div className="overview-counts">
          {["Permohonan belum direspons", "Misi aktif"].map((label) => (
            <article key={label}>
              <strong>{counts[label as keyof typeof counts]}</strong>
              <span>{label}</span>
            </article>
          ))}
        </div>
      )}
      {data && (
        <>
          <SectionHeading title="Permohonan terbaru">
            <Link to="/mobile/operasi/permohonan">Lihat semua</Link>
          </SectionHeading>
          {!data.Requests?.length ? (
            <EmptyState
              title="Belum ada permohonan"
              to="/mobile/permohonan"
              action="Buat permohonan"
            >
              Gunakan data sintetis untuk mencoba koordinasi.
            </EmptyState>
          ) : (
            <div className="overview-missions">
              {[...data.Requests]
                .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
                .slice(0, 3)
                .map((r) => (
                  <Link
                    key={r.id}
                    className="overview-mission request-preview"
                    to={
                      "/mobile/operasi/permohonan?" +
                      new URLSearchParams({ request: r.id })
                    }
                  >
                    <strong>{String(r.facility)}</strong>
                    <span>{String(r.location)}</span>
                    <StatusBadge status={r.status} />
                    <small>Diperbarui {listDate(r.updatedAt)}</small>
                    <span className="record-open">Lihat detail →</span>
                  </Link>
                ))}
            </div>
          )}
          <SectionHeading title="Misi tercatat">
            <span>Data sintetis</span>
          </SectionHeading>
          {!data.Missions?.length ? (
            <EmptyState
              title="Belum ada misi tercatat"
              to="/mobile/operasi/permohonan"
              action="Lihat permohonan"
            >
              Misi muncul setelah permohonan dikoordinasikan dan tim ditetapkan.
            </EmptyState>
          ) : (
            <div className="overview-missions">
              {[...data.Missions]
                .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
                .slice(0, 3)
                .map((m) => {
                  const request = data.Requests?.find(
                    (r) => r.id === m.requestId,
                  );
                  return (
                    <Link
                      className="overview-mission"
                      key={m.id}
                      to={
                        "/mobile/misi?" +
                        new URLSearchParams({ request: String(m.requestId) })
                      }
                    >
                      <span className="record-reference">
                        Misi {m.id.slice(0, 8)}
                      </span>
                      <strong>{String(m.team ?? "Tim belum dicatat")}</strong>
                      <span>
                        {String(request?.facility ?? "Asal belum dicatat")}
                      </span>
                      <StatusBadge status={m.status} />
                      <small>Diperbarui {listDate(m.updatedAt)}</small>
                      <span className="record-open">Buka detail →</span>
                    </Link>
                  );
                })}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function LeadershipPreview({ actor }: { actor: Actor }) {
  const [data, setData] = useState<
    import("../types/leadership").LeadershipSummary | null
  >(null);
  const load = useCallback(
    async () =>
      setData(await call("leadership.summary", { period: "all" }, actor)),
    [actor],
  );
  const poll = usePolling(load, 60000);
  return (
    <section className="mobile-overview" aria-label="Ringkasan pengawasan">
      <SectionHeading title="Perhatian koordinasi">
        <Link to="/pimpinan/perhatian">Tinjau indikator</Link>
      </SectionHeading>
      <AsyncState {...poll} reload={() => void poll.refresh()} />
      {poll.error && data && (
        <p className="notice">
          Ringkasan terakhir ditampilkan; belum berhasil diperbarui.
        </p>
      )}
      {data && (
        <div className="overview-counts">
          <article>
            <strong>{data.totals.activeMissions}</strong>
            <span>Misi aktif</span>
          </article>
          <article>
            <strong>{attentionItems(data).length}</strong>
            <span>Jenis indikator perlu ditinjau</span>
          </article>
        </div>
      )}
    </section>
  );
}
