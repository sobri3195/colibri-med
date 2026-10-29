import { useState } from "react";
import type { Actor, RecordData } from "../types";
import { mode } from "../services/api";
import { getLocal, putLocal } from "../services/storage";
import { checklistItems } from "../lib/domain";
import { date } from "../lib/domain";
import { Link, useLocation } from "react-router-dom";
type Fields = {
  text: string;
  status: string;
  reason: string;
  items?: Record<string, boolean>;
};
export default function OperationalForm({
  actor,
  request,
  mission,
  group,
  title,
  current,
  busy,
  act,
  notice,
}: {
  actor: Actor;
  request: RecordData;
  mission?: RecordData;
  group: string;
  title: string;
  current?: RecordData;
  busy: boolean;
  act: (action: string, p: Record<string, unknown>) => Promise<any>;
  notice: (message: string) => void;
}) {
  const review = group.includes("Reviews");
  const location = useLocation();
  const [queued, setQueued] = useState(false);
  const editable = review || group === "checklists";
  const emptyItems = () =>
    Object.fromEntries(checklistItems.map((item) => [item.id, false]));
  const initial = (r?: RecordData): Fields => ({
    text: String(r?.text ?? ""),
    status: String(
      r?.status ??
        (group === "medicalReviews"
          ? "Belum Dinilai"
          : group === "flightReviews"
            ? "Belum Ditinjau"
            : "Dicatat"),
    ),
    reason: String(r?.reason ?? ""),
    ...(group === "checklists"
      ? {
          items: {
            ...emptyItems(),
            ...((r?.items as Record<string, boolean>) ?? {}),
          },
        }
      : {}),
  });
  const [snapshot, setSnapshot] = useState(current);
  const [fields, setFields] = useState(() => initial(current));
  const key = mode + ":" + actor.id + ":" + request.id + ":" + group;
  const changed =
    editable &&
    !!current &&
    (current.revision > (snapshot?.revision ?? 0) ||
      current.id !== snapshot?.id);
  return (
    <details>
      <summary>{title}</summary>
      {editable && snapshot && (
        <p className="form-version" role="status">
          Versi server yang ditinjau: revision {snapshot.revision} ·{" "}
          {date(snapshot.updatedAt)}
        </p>
      )}
      {changed && (
        <div role="alert" className="notice">
          Penilaian di server telah berubah. Draft Anda dipertahankan.{" "}
          <button
            className="secondary"
            onClick={() => {
              setSnapshot(current);
              setFields(initial(current));
            }}
          >
            Muat penilaian terbaru
          </button>
        </div>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const result = await act(
            group + (group === "patientNotes" ? ".create" : ".save"),
            {
              ...(editable && snapshot
                ? { id: snapshot.id, baseRevision: snapshot.revision }
                : {}),
              data: {
                requestId: request.id,
                missionId: mission?.id,
                ...fields,
                ...(group === "checklists"
                  ? {
                      items: fields.items ?? emptyItems(),
                      text:
                        fields.text.trim() || "Checklist koordinasi simulasi",
                    }
                  : {}),
              },
            },
          );
          if (result && !result.queued && editable) {
            setSnapshot(result);
            setFields(initial(result));
          }
          if (result && !result.queued && !editable) setFields(initial());
          if (result?.queued) setQueued(true);
        }}
      >
        <label>
          Catatan sintetis
          <textarea
            name="text"
            required={group !== "checklists"}
            maxLength={2000}
            value={fields.text}
            onChange={(e) => setFields({ ...fields, text: e.target.value })}
          />
        </label>
        {group === "checklists" && (
          <fieldset className="coordination-checklist">
            <legend>Checklist koordinasi simulasi</legend>
            {checklistItems.map((item) => (
              <label className="checklist-item" key={item.id}>
                <input
                  type="checkbox"
                  checked={fields.items?.[item.id] ?? false}
                  onChange={(e) =>
                    setFields({
                      ...fields,
                      items: {
                        ...emptyItems(),
                        ...fields.items,
                        [item.id]: e.target.checked,
                      },
                    })
                  }
                />
                {item.label}
              </label>
            ))}
            <small>
              Bukan checklist penerbangan resmi. Centang tidak memberi
              persetujuan medis atau penerbangan.
            </small>
          </fieldset>
        )}
        {review && (
          <label>
            Status
            <select
              value={fields.status}
              onChange={(e) => setFields({ ...fields, status: e.target.value })}
            >
              {(group === "medicalReviews"
                ? ["Belum Dinilai", "Sedang Dinilai", "Rekomendasi Dicatat"]
                : [
                    "Belum Ditinjau",
                    "Dalam Peninjauan",
                    "Disetujui",
                    "Ditunda",
                    "Tidak Disetujui",
                  ]
              ).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        )}
        {review && (
          <label>
            Alasan penundaan/penolakan
            <input
              maxLength={500}
              required={["Ditunda", "Tidak Disetujui"].includes(fields.status)}
              value={fields.reason}
              onChange={(e) => setFields({ ...fields, reason: e.target.value })}
            />
          </label>
        )}
        <div className="actions">
          <button disabled={busy || queued || (!mission && !review)}>
            Catat {title.toLowerCase()}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={async () => {
              try {
                await putLocal("drafts", key, { fields, snapshot });
                notice("Tersimpan lokal");
              } catch (e) {
                notice(String(e));
              }
            }}
          >
            Simpan draft lokal
          </button>
          <button
            type="button"
            className="secondary"
            onClick={async () => {
              try {
                const draft = await getLocal("drafts", key);
                if (draft === undefined) {
                  notice("Belum ada draft untuk formulir ini.");
                  return;
                }
                if (typeof draft === "string")
                  setFields({ ...fields, text: draft });
                else {
                  setFields(draft.fields);
                  setSnapshot(draft.snapshot);
                }
                notice(
                  "Draft lokal dimuat; periksa revision sebelum mengirim.",
                );
              } catch (e) {
                notice(String(e));
              }
            }}
          >
            Muat draft
          </button>
        </div>
        {queued && (
          <p className="notice" role="status">
            Operasi menunggu pengiriman.{" "}
            <Link
              to={
                (location.pathname.startsWith("/mobile")
                  ? "/mobile/operasi/outbox"
                  : "/internal/outbox") +
                "?" +
                new URLSearchParams({ request: request.id })
              }
            >
              Buka Outbox untuk mengirim ulang
            </Link>
          </p>
        )}
      </form>
    </details>
  );
}
