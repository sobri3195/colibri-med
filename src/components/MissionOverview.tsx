import {
  CheckCircle2,
  Circle,
  CircleDot,
  CircleX,
  ArrowRight,
  Plane,
} from "lucide-react";
import type { RecordData } from "../types";
import { missionStages, date } from "../lib/domain";
import { StatusBadge } from "./MobileUI";
export default function MissionOverview({
  mission,
  request,
  tables,
}: {
  mission: RecordData;
  request: RecordData;
  tables: Record<string, RecordData[]>;
}) {
  const history = (tables.ActivityLogs ?? [])
    .filter((log) => log.entityId === mission.id)
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const aircraft = tables.Aircraft?.find((a) => a.id === mission.aircraftId);
  const receiver = tables.Facilities?.find(
    (f) => f.id === mission.receivingFacilityId,
  );
  const cancelled = mission.status === "Dibatalkan";
  return (
    <section className="mission-brief" aria-label="Ringkasan misi tercatat">
      <div className="mission-brief-title">
        <Plane size={22} />
        <div>
          <span className="eyebrow">MISI {mission.id.slice(0, 8)}</span>
          <h3>{String(mission.team)}</h3>
        </div>
        <StatusBadge status={mission.status} />
      </div>
      <div className="mission-route">
        <div>
          <small>Asal</small>
          <strong>{String(request.facility)}</strong>
        </div>
        <ArrowRight size={18} aria-hidden="true" />
        <div>
          <small>Tujuan tercatat</small>
          <strong>{String(receiver?.name ?? "Belum ditetapkan")}</strong>
        </div>
      </div>
      <dl>
        <div>
          <dt>Helikopter ditugaskan</dt>
          <dd>
            {aircraft
              ? `${aircraft.demoCode} · ${aircraft.name}`
              : "Belum ditetapkan"}
          </dd>
        </div>
        <div>
          <dt>Tahap terakhir tercatat</dt>
          <dd>
            {history.at(-1)?.status ?? mission.status} ·{" "}
            {date(history.at(-1)?.createdAt ?? mission.updatedAt)}
          </dd>
        </div>
      </dl>
      <ol className="mission-stage-track">
        {[...missionStages, ...(cancelled ? ["Dibatalkan"] : [])].map(
          (stage) => {
            const event = history
              .slice()
              .reverse()
              .find((log) => log.status === stage);
            const current = stage === mission.status;
            const state =
              stage === "Dibatalkan"
                ? "cancelled"
                : current
                  ? "active"
                  : event
                    ? "recorded"
                    : "pending";
            const Icon =
              state === "cancelled"
                ? CircleX
                : state === "active"
                  ? CircleDot
                  : state === "recorded"
                    ? CheckCircle2
                    : Circle;
            return (
              <li
                key={stage}
                data-state={state}
                aria-current={current ? "step" : undefined}
              >
                <Icon size={20} />
                <div>
                  <strong>{stage}</strong>
                  <span>
                    {state === "cancelled"
                      ? "Misi dibatalkan"
                      : current
                        ? "Status saat ini"
                        : event
                          ? "Tahap tercatat"
                          : cancelled
                            ? "Tidak dilanjutkan / belum tercatat"
                            : "Belum tercatat"}
                    {event && ` · ${date(event.createdAt)}`}
                  </span>
                </div>
              </li>
            );
          },
        )}
      </ol>
      <small>
        Hanya status dan kejadian tersimpan; tanpa estimasi kedatangan atau
        persentase progres.
      </small>
    </section>
  );
}
