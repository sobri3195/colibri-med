import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import type { Actor, RecordData } from "../types";
import { call } from "../services/api";
import { usePolling } from "../features/usePolling";
import { summaryCounts, date } from "../lib/domain";
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
                      <small>Diperbarui {date(m.updatedAt)}</small>
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
