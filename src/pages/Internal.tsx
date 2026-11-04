import MissionOverview from "../components/MissionOverview";
import { PageHeading, FilterBar, Field } from "../components/DesignSystem";
import BrandMark from "../components/BrandMark";
import {
  LayoutDashboard,
  ClipboardList,
  Plane,
  HeartPulse,
  MapPin,
  Boxes,
  FileText,
  Inbox,
  Settings,
  UserRound,
} from "lucide-react";
import { operationalReportRows } from "../lib/reports";
import { canAction } from "../lib/permissions";
import WorkflowSummary from "../components/WorkflowSummary";
import { tableLabel, actionLabel, displayStatus } from "../lib/presentation";
import { EmptyState } from "../components/MobileUI";
import { useCallback, useState, useEffect, useRef } from "react";
import {
  Link,
  useParams,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import { Download, RefreshCw } from "lucide-react";
import type { Actor, RecordData } from "../types";
import { call, mode, submit, retry, outboxOwner } from "../services/api";
import {
  outbox,
  archiveOperation,
  archivedOperations,
} from "../services/storage";
import { StatusBadge } from "../components/MobileUI";
import { CircleCheck, Clock } from "lucide-react";
import RecordTable from "../components/RecordTable";
import OperationalForm from "../features/OperationalForm";
import MissionControls from "../features/MissionControls";
import { usePolling } from "../features/usePolling";
import {
  csv,
  summaryCounts,
  date,
  missionStages,
  requestStages,
  haversine,
} from "../lib/domain";
import AsyncState from "../components/AsyncState";
import type { Point } from "../components/LocationMap";
import LocationMap from "../components/LocationMap";
import { usePreferences } from "../features/usePreferences";
import CatalogueManager from "../features/CatalogueManager";
const tabs = [
  ["", "Ringkasan"],
  ["permohonan", "Permohonan"],
  ["misi", "Papan misi"],
  ["penilaian", "Penilaian & catatan"],
  ["fasilitas", "Fasilitas & peta"],
  ["sumber-daya", "Sumber daya"],
  ["laporan", "Laporan"],
  ["outbox", "Outbox & notifikasi"],
  ["pengaturan", "Pengaturan"],
];
export default function Internal({
  actor,
  compact = false,
  section: sectionOverride,
}: {
  actor: Actor;
  compact?: boolean;
  section?: string;
}) {
  const { section: routeSection = "" } = useParams();
  const section = sectionOverride ?? routeSection;
  const [data, setData] = useState<Record<string, RecordData[]>>({});
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const selected = params.get("request") ?? "";
  const setSelected = (id: string) => {
    const next = new URLSearchParams(params);
    if (id) next.set("request", id);
    else next.delete("request");
    setParams(next, { replace: true });
  };
  const [locationSelected, setLocationSelected] = useState<Point | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [view, setView] = useState("table");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<any[]>([]);
  const [archived, setArchived] = useState<any[]>([]);
  const preferences = usePreferences(actor);
  const interval = preferences.interval;
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setPending(await outbox(outboxOwner(actor)));
    setArchived(await archivedOperations(outboxOwner(actor)));
    const result = await call("reports.summary", {}, actor);
    setData(result);
  }, [actor]);
  const poll = usePolling(load, interval);
  useEffect(() => {
    setSearch("");
    setFilter("");
    setMessage("");
  }, [section]);
  const requests = data.Requests ?? [];
  const missions = data.Missions ?? [];
  const request = selected
    ? requests.find((r) => r.id === selected)
    : requests[0];
  const mission = missions.find((r) => r.requestId === request?.id);
  const actLock = useRef(false);
  const act = async (action: string, payload: Record<string, unknown>) => {
    if (actLock.current) return null;
    actLock.current = true;
    setMessage("");
    setBusy(true);
    try {
      const r = await submit(actor, action, payload);
      setMessage(
        r.queued
          ? "Menunggu sinkronisasi"
          : mode === "demo"
            ? "Tersimpan di perangkat"
            : "Tersinkron ke server",
      );
      await poll.refresh();
      return r;
    } catch (e) {
      setMessage(String(e));
      return null;
    } finally {
      try {
        setPending(await outbox(outboxOwner(actor)));
      } catch {
        setMessage(
          "Outbox lokal belum dapat dibaca. Periksa penyimpanan perangkat.",
        );
      } finally {
        actLock.current = false;
        setBusy(false);
      }
    }
  };
  const filtered = (rows: RecordData[]) =>
    rows.filter(
      (r) =>
        (!filter || r.status === filter) &&
        JSON.stringify(r).toLowerCase().includes(search.toLowerCase()),
    );
  const download = (ext: string, body: BlobPart, type: string) => {
    const url = URL.createObjectURL(new Blob([body], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "COLIBRI-MED-SIMULASI." + ext;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const openRequest = (id: string) => {
    navigate(
      (compact
        ? section === "misi"
          ? "/mobile/misi"
          : "/mobile/operasi/permohonan"
        : section === "misi"
          ? "/internal/misi"
          : "/internal/permohonan") +
        "?" +
        new URLSearchParams({ request: id }),
    );
    requestAnimationFrame(() =>
      document
        .getElementById("request-workspace")
        ?.scrollIntoView({ block: "start" }),
    );
  };
  const rows = (items: RecordData[], onOpen?: (r: RecordData) => void) => (
    <RecordTable
      items={items}
      query={search}
      status={filter}
      compact={compact || section === "permohonan" || section === "misi"}
      requests={requests}
      selectedId={
        !selected ? undefined : section === "misi" ? mission?.id : request?.id
      }
      onOpen={onOpen}
    />
  );
  return (
    <div
      data-section={section}
      className={compact ? "workspace compact-workspace" : "workspace"}
    >
      {!compact && (
        <aside>
          <Link className="sidebar-brand" to="/">
            <BrandMark />
            <span>
              COLIBRI MED<small>Air Medical</small>
            </span>
          </Link>
          <div className="eyebrow">RUANG KOORDINASI</div>
          <nav>
            {tabs.map(([path, label], index) => {
              const Icon = [
                LayoutDashboard,
                ClipboardList,
                Plane,
                HeartPulse,
                MapPin,
                Boxes,
                FileText,
                Inbox,
                Settings,
              ][index];
              return (
                <Link
                  key={path}
                  className={section === path ? "active" : ""}
                  to={"/internal/" + path}
                >
                  <Icon size={18} aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="sidebar-role">
            <UserRound size={18} aria-hidden="true" />
            <span>{actor.role}</span>
          </div>
          <small>
            Semua data sintetis.
            <br />
            Keputusan tetap pada petugas.
          </small>
        </aside>
      )}
      <div className="workspace-content">
        <PageHeading
          eyebrow="COLIBRI MED / KOORDINASI"
          title={
            section
              ? (tabs.find((t) => t[0] === section)?.[1] ?? "Ringkasan")
              : "Ringkasan koordinasi"
          }
          action={
            <div className="page-heading-actions">
              {section === "permohonan" &&
                canAction(actor, "requests.create") && (
                  <Link
                    className="button"
                    to={compact ? "/mobile/permohonan" : "/permohonan"}
                  >
                    Buat permohonan baru
                  </Link>
                )}
              <button
                className="secondary"
                disabled={poll.loading}
                aria-label="Refresh"
                onClick={() => void poll.refresh()}
              >
                <RefreshCw size={16} />{" "}
                {poll.loading ? "Memperbarui…" : "Refresh"}
              </button>
            </div>
          }
        >
          <small>
            {poll.updated
              ? "Pembaruan: " + date(poll.updated)
              : "Belum diperbarui"}{" "}
            · polling {interval / 1000} detik
          </small>
        </PageHeading>
        <AsyncState inline {...poll} reload={() => void poll.refresh()} />
        {busy && (
          <p role="status">
            Menyimpan perubahan… Tunggu konfirmasi sebelum menutup halaman.
          </p>
        )}
        {message && (
          <div
            role="status"
            className={
              "notice " +
              (message === "Tersinkron ke server" ||
              message === "Tersimpan di perangkat"
                ? "feedback-success"
                : /Error:|[A-Z_]{3,}:/.test(message)
                  ? "feedback-error"
                  : "")
            }
          >
            {message}
          </div>
        )}
        {section === "" && (
          <>
            <div className="grid three">
              {Object.entries(summaryCounts(data)).map(([title, count]) => (
                <article className="card stat" key={title}>
                  <span>{title}</span>
                  <strong>{count}</strong>
                  <small>DATA SIMULASI</small>
                </article>
              ))}
            </div>
            <section className="card">
              <h2>Aktivitas terbaru</h2>
              {rows((data.ActivityLogs ?? []).slice(0, 8))}
            </section>
          </>
        )}
        {["permohonan", "misi", "fasilitas", "sumber-daya"].includes(
          section,
        ) && (
          <FilterBar>
            <Field label="Cari data">
              <input
                aria-label="Cari data"
                placeholder="Cari data tersimpan…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Field>
            <Field label="Filter status">
              <select
                aria-label="Filter status"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="">Semua status</option>
                {[
                  ...new Set(
                    (section === "misi"
                      ? missions
                      : section === "fasilitas"
                        ? (data.Facilities ?? [])
                        : section === "sumber-daya"
                          ? (data.Resources ?? [])
                          : requests
                    ).map((r) => r.status),
                  ),
                ]
                  .sort()
                  .map((status) => (
                    <option key={status} value={status}>
                      {displayStatus(status, mode === "demo")}
                    </option>
                  ))}
              </select>
            </Field>
            <button
              className="secondary reset-filter"
              disabled={!search && !filter}
              onClick={() => {
                setSearch("");
                setFilter("");
              }}
            >
              Reset filter
            </button>
          </FilterBar>
        )}
        {section === "permohonan" && (
          <section className="card request-list-panel">
            <h2>Daftar permohonan</h2>
            {rows(requests, (r) => openRequest(r.id))}
          </section>
        )}
        {section === "misi" && (
          <section className="card">
            <div
              className="view-switch"
              role="group"
              aria-label="Tampilan misi"
            >
              <button
                type="button"
                aria-pressed={view === "table"}
                onClick={() => setView("table")}
              >
                Tampilan tabel
              </button>
              <button
                type="button"
                aria-pressed={view === "kanban"}
                onClick={() => setView("kanban")}
              >
                Tampilan kanban
              </button>
            </div>
            {!missions.length && (
              <EmptyState
                title="Belum ada misi tercatat"
                to={
                  compact
                    ? "/mobile/operasi/permohonan"
                    : "/internal/permohonan"
                }
                action="Kelola permohonan"
              >
                Terima dan verifikasi permohonan, lalu tetapkan tim untuk
                membentuk misi.
              </EmptyState>
            )}
            {!!missions.length &&
              (view === "table" ? (
                rows(missions, (r) => openRequest(String(r.requestId)))
              ) : (
                <div className="kanban">
                  {[...missionStages, "Dibatalkan"].map((s) => (
                    <div key={s}>
                      <h3>
                        {s}{" "}
                        <span className="badge">
                          {
                            filtered(missions).filter((m) => m.status === s)
                              .length
                          }
                        </span>
                      </h3>
                      {filtered(missions)
                        .filter((r) => r.status === s)
                        .map((m) => (
                          <article className="card" key={m.id}>
                            <strong>{String(m.team)}</strong>
                            <p>{m.id.slice(0, 8)}</p>
                            <button
                              className="secondary"
                              onClick={() => openRequest(String(m.requestId))}
                            >
                              Buka permohonan
                            </button>
                          </article>
                        ))}
                    </div>
                  ))}
                </div>
              ))}
          </section>
        )}
        {["permohonan", "misi", "penilaian"].includes(section) &&
          (!!selected || section === "penilaian") && (
            <section className="card" id="request-workspace">
              <div className="detail-heading">
                <h2>
                  {section === "misi"
                    ? "Detail misi & permohonan terkait"
                    : "Ruang kerja permohonan"}
                </h2>
                {selected && (
                  <button className="secondary" onClick={() => setSelected("")}>
                    Tutup detail
                  </button>
                )}
              </div>
              {section === "misi" && (
                <p className="muted">
                  Misi terhubung ke permohonan berikut. Perubahan permohonan dan
                  keputusan penerbangan tetap dicatat terpisah.
                </p>
              )}
              {request && (
                <div className="selected-request">
                  <strong>{String(request.facility)}</strong>
                  <details>
                    <summary>Referensi dan waktu lengkap</summary>
                    <p>{request.id}</p>
                    <p>Diperbarui {date(request.updatedAt)}</p>
                  </details>
                </div>
              )}
              {request &&
                (search || filter) &&
                !(section === "misi"
                  ? filtered(missions).some((m) => m.requestId === request.id)
                  : filtered(requests).some((r) => r.id === request.id)) && (
                  <p role="status" className="notice">
                    Item terpilih berada di luar hasil filter. Ruang kerja ini
                    tetap untuk {String(request.facility)} ·{" "}
                    {request.id.slice(0, 8)}. Reset filter untuk melihatnya di
                    daftar.
                  </p>
                )}
              {selected && !request && !poll.loading && (
                <p role="alert">
                  Permohonan yang dipilih tidak ditemukan. Pilih record lain;
                  tidak ada perubahan yang dikirim.
                </p>
              )}
              <label>
                Pilih permohonan
                <select
                  value={request?.id ?? ""}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  <option value="" disabled>
                    Pilih permohonan
                  </option>
                  {requests.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.id.slice(0, 8)} · {String(r.facility)}
                    </option>
                  ))}
                </select>
              </label>
              {!request && !selected && !poll.loading && (
                <p className="empty">
                  Belum ada permohonan.{" "}
                  {compact && (
                    <Link to="/mobile/permohonan">
                      Buat permohonan simulasi
                    </Link>
                  )}
                </p>
              )}
              {request && (
                <>
                  <WorkflowSummary
                    request={request}
                    mission={mission}
                    tables={data}
                    actor={actor}
                    pending={pending}
                  />
                  <p>
                    {String(request.summary)} ·{" "}
                    <StatusBadge status={request.status} />
                  </p>
                  <p>
                    Lokasi: {String(request.location)} · Akses:{" "}
                    {String(request.access)}
                  </p>
                  {canAction(actor, "requests.transition") && (
                    <details>
                      <summary>Perbarui ringkasan permohonan</summary>
                      <form
                        key={request.id + ":" + request.revision}
                        onSubmit={(e) => {
                          e.preventDefault();
                          const f = new FormData(e.currentTarget);
                          void act("requests.update", {
                            id: request.id,
                            baseRevision: request.revision,
                            data: { ...request, summary: f.get("summary") },
                          });
                        }}
                      >
                        <label>
                          Ringkasan sintetis
                          <textarea
                            name="summary"
                            required
                            maxLength={2000}
                            defaultValue={String(request.summary)}
                          />
                        </label>
                        <button disabled={busy}>
                          Simpan perubahan permohonan
                        </button>
                      </form>
                    </details>
                  )}
                  {canAction(actor, "requests.transition") && (
                    <div className="actions">
                      {requestStages.indexOf(request.status) <
                        requestStages.length - 1 && (
                        <button
                          disabled={busy}
                          onClick={() =>
                            void act("requests.transition", {
                              id: request.id,
                              baseRevision: request.revision,
                              status:
                                requestStages[
                                  requestStages.indexOf(request.status) + 1
                                ],
                            })
                          }
                        >
                          Permohonan →{" "}
                          {
                            requestStages[
                              requestStages.indexOf(request.status) + 1
                            ]
                          }
                        </button>
                      )}
                      {!mission && request.status === "Dalam Koordinasi" && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const f = new FormData(e.currentTarget);
                            void act("missions.assign", {
                              requestId: request.id,
                              team: f.get("team"),
                              resourceIds: f.get("resourceId")
                                ? [f.get("resourceId")]
                                : [],
                              aircraftId: f.get("aircraftId") || undefined,
                              receivingFacilityId:
                                f.get("receivingFacilityId") || undefined,
                            });
                          }}
                        >
                          <label>
                            Tim simulasi
                            <input name="team" required maxLength={150} />
                          </label>
                          <label htmlFor="mission-resource">
                            Sumber daya ditinjau (opsional)
                          </label>
                          <select id="mission-resource" name="resourceId">
                            <option value="">Tanpa referensi direktori</option>
                            {(data.Resources ?? []).map((r) => (
                              <option key={r.id} value={r.id}>
                                {String(r.name)} · {r.status}
                              </option>
                            ))}
                          </select>

                          <label htmlFor="mission-aircraft">
                            Helikopter sintetis (opsional)
                          </label>
                          <select id="mission-aircraft" name="aircraftId">
                            <option value="">Belum dipilih</option>
                            {(data.Aircraft ?? []).map((a) => (
                              <option key={a.id} value={a.id}>
                                {String(a.demoCode)} · {String(a.name)}
                              </option>
                            ))}
                          </select>

                          <label htmlFor="mission-receiver">
                            Fasilitas penerima (opsional)
                          </label>
                          <select
                            id="mission-receiver"
                            name="receivingFacilityId"
                            defaultValue={String(
                              request.receivingFacilityId ?? "",
                            )}
                          >
                            <option value="">Belum dipilih</option>
                            {(data.Facilities ?? []).map((f) => (
                              <option key={f.id} value={f.id}>
                                {String(f.name)}
                              </option>
                            ))}
                          </select>

                          <button disabled={busy}>
                            Buat misi & tetapkan tim
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                  {mission && (
                    <div className="inset">
                      <h3>Misi · {mission.status}</h3>
                      <MissionOverview
                        mission={mission}
                        request={request}
                        tables={data}
                      />
                      <p className="record-reference">
                        Misi {mission.id.slice(0, 8)} · Diperbarui{" "}
                        {date(mission.updatedAt)}
                      </p>
                      <p>Tim: {String(mission.team)}</p>
                      <p>
                        Asal: {String(request.facility)} · Lokasi:{" "}
                        {String(request.location)}
                      </p>
                      <p className="muted">
                        Jadwal penerbangan tidak tersedia pada record misi ini.
                      </p>
                      <details className="mission-history">
                        <summary>Riwayat tahapan tercatat</summary>
                        <ol>
                          {(data.ActivityLogs ?? [])
                            .filter((log) => log.entityId === mission.id)
                            .slice()
                            .sort((a, b) =>
                              a.createdAt.localeCompare(b.createdAt),
                            )
                            .map((log, index, logs) => (
                              <li key={log.id}>
                                {index === logs.length - 1 &&
                                log.status === mission.status ? (
                                  <Clock size={18} aria-hidden="true" />
                                ) : (
                                  <CircleCheck size={18} aria-hidden="true" />
                                )}
                                <div>
                                  <strong>{log.status}</strong>
                                  <span>
                                    {index === logs.length - 1 &&
                                    log.status === mission.status
                                      ? "Status saat ini"
                                      : "Tahap tercatat"}{" "}
                                    · {date(log.createdAt)}
                                  </span>
                                  {!!log.reason && <p>{String(log.reason)}</p>}
                                </div>
                              </li>
                            ))}
                        </ol>
                        {!(data.ActivityLogs ?? []).some(
                          (log) => log.entityId === mission.id,
                        ) && <p>Belum ada riwayat tahapan tersimpan.</p>}
                        <small>
                          Hanya menampilkan kejadian tersimpan, tanpa perkiraan
                          progres.
                        </small>
                      </details>
                      {canAction(actor, "missions.transition") && (
                        <MissionControls
                          tables={data}
                          mission={mission}
                          busy={busy}
                          act={act}
                        />
                      )}
                    </div>
                  )}
                  {[
                    ["medicalReviews", "Penilaian medis", "Koordinator medis"],
                    [
                      "flightReviews",
                      "Tinjauan penerbangan",
                      "Koordinator penerbangan",
                    ],
                    [
                      "patientNotes",
                      "Catatan pasien sintetis",
                      "Dokter/perawat",
                    ],
                    ["checklists", "Checklist", "Dokter/perawat"],
                    ["handovers", "Serah terima", "Rumah sakit penerima"],
                  ].map(
                    ([group, title, role]) =>
                      canAction(
                        actor,
                        group +
                          (group === "patientNotes" ? ".create" : ".save"),
                      ) && (
                        <OperationalForm
                          key={group + ":" + request.id}
                          actor={actor}
                          request={request}
                          mission={mission}
                          group={group}
                          title={title}
                          current={(
                            data[
                              group === "medicalReviews"
                                ? "MedicalReviews"
                                : group === "flightReviews"
                                  ? "FlightReviews"
                                  : group === "checklists"
                                    ? "Checklists"
                                    : ""
                            ] ?? []
                          )
                            .filter((r) => r.requestId === request.id)
                            .at(-1)}
                          busy={busy}
                          act={act}
                          notice={setMessage}
                        />
                      ),
                  )}
                  <p className="muted">
                    Rekomendasi medis tidak memberikan persetujuan penerbangan.
                    Semua keputusan dicatat oleh petugas berwenang.
                  </p>
                </>
              )}
            </section>
          )}
        {section === "penilaian" &&
          Object.entries(data)
            .filter(([k]) =>
              [
                "MedicalReviews",
                "FlightReviews",
                "PatientNotes",
                "Checklists",
                "HandoverRecords",
              ].includes(k),
            )
            .map(([k, v]) => (
              <section key={k} className="card">
                <h3>{tableLabel(k)}</h3>
                {rows(v.filter((r) => r.requestId === request?.id))}
              </section>
            ))}
        {section === "fasilitas" && (
          <section className="card facility-workspace">
            <div className="facility-map-area">
              <LocationMap
                onSelect={setLocationSelected}
                selected={
                  locationSelected
                    ? [locationSelected.lat, locationSelected.lng]
                    : undefined
                }
                locations={[
                  ...(data.Facilities ?? []),
                  ...requests.filter(
                    (r) =>
                      r.lat !== "" &&
                      r.lng !== "" &&
                      Number.isFinite(Number(r.lat)) &&
                      Number.isFinite(Number(r.lng)),
                  ),
                ]
                  .filter(
                    (r) =>
                      (!filter || r.status === filter) &&
                      JSON.stringify(r)
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                  )
                  .map((r) => ({
                    name: String(r.name ?? r.facility ?? "Lokasi permohonan"),
                    status: r.status,
                    summary: String(
                      r.location ?? r.address ?? "Lokasi sintetis tersimpan",
                    ),
                    kind: requests.some((request) => request.id === r.id)
                      ? ("request" as const)
                      : ("facility" as const),
                    lat: Number(r.lat),
                    lng: Number(r.lng),
                  }))}
              />
            </div>
            <details className="facility-side-panel" open={!compact}>
              <summary>Daftar lokasi sintetis</summary>
              <h2>Daftar lokasi sintetis</h2>
              {locationSelected ? (
                <section className="facility-selection">
                  <small>
                    {locationSelected.kind === "request"
                      ? "Lokasi permohonan"
                      : "Fasilitas kesehatan"}
                  </small>
                  <h3>{locationSelected.name}</h3>
                  {locationSelected.status && (
                    <StatusBadge status={locationSelected.status} />
                  )}
                  <p>{locationSelected.summary}</p>
                  <small>
                    {locationSelected.lat.toFixed(5)},{" "}
                    {locationSelected.lng.toFixed(5)} · Data sintetis
                  </small>
                </section>
              ) : (
                <p className="form-help">
                  Pilih marker untuk melihat ringkasan lokasi.
                </p>
              )}
              {rows(data.Facilities ?? [])}
              {actor.role === "Administrator" && (
                <CatalogueManager
                  kind="facilities"
                  records={data.Facilities ?? []}
                  busy={busy}
                  act={act}
                />
              )}
              <h3>Lokasi permohonan sintetis</h3>
              {rows(requests, (r) => openRequest(r.id))}
              {request &&
                request.lat !== "" &&
                request.lng !== "" &&
                (data.Facilities ?? []).map((f) => (
                  <p key={f.id}>
                    {String(f.name)}: Jarak garis lurus{" "}
                    {haversine(
                      [Number(request.lat), Number(request.lng)],
                      [Number(f.lat), Number(f.lng)],
                    ).toFixed(1)}{" "}
                    km. Bukan rute penerbangan atau ETA.
                  </p>
                ))}
            </details>
          </section>
        )}
        {section === "sumber-daya" && (
          <section className="card">
            <h2>Kesiapan sumber daya sintetis</h2>
            {rows(data.Resources ?? [])}
            {actor.role === "Administrator" && (
              <CatalogueManager
                kind="resources"
                records={data.Resources ?? []}
                busy={busy}
                act={act}
              />
            )}
            {canAction(actor, "resources.update") &&
              (data.Resources ?? []).map((r) => (
                <form
                  key={r.id + ":" + r.revision}
                  onSubmit={(e) => {
                    e.preventDefault();
                    void act("resources.update", {
                      id: r.id,
                      baseRevision: r.revision,
                      data: {
                        status: new FormData(e.currentTarget).get("status"),
                      },
                    });
                  }}
                >
                  <label>
                    Kesiapan {String(r.name)}
                    <select name="status" defaultValue={r.status}>
                      <option>Perlu konfirmasi</option>
                      <option>Siap simulasi</option>
                      <option>Tidak siap simulasi</option>
                    </select>
                  </label>
                  <button disabled={busy}>Catat kesiapan</button>
                </form>
              ))}
            <p>
              Kesiapan perlu konfirmasi petugas. Tidak mencantumkan kapasitas
              atau batas operasi resmi.
            </p>
          </section>
        )}
        {section === "laporan" && (
          <section className="card">
            <h2>Laporan simulasi</h2>
            <p>
              Ekspor memuat seluruh data yang diizinkan peran ini, bukan filter
              pada daftar modul lain. Semua data sintetis. Kolom waktu memakai
              WIB; rincian JSON menyimpan waktu ISO UTC. Jumlah pasien berasal
              dari permohonan; jumlah catatan serah terima bukan jumlah pasien
              yang telah diterima.
            </p>
            <div className="actions">
              <button
                disabled={poll.loading || !!poll.error}
                onClick={() =>
                  download(
                    "csv",
                    csv(
                      operationalReportRows(data, mode === "demo", actor.role),
                    ),
                    "text/csv;charset=utf-8",
                  )
                }
              >
                <Download size={16} /> Ekspor CSV
              </button>
              <button
                disabled={poll.loading || !!poll.error}
                className="secondary"
                onClick={async () => {
                  const { jsPDF } = await import("jspdf");
                  const pdf = new jsPDF();
                  let y = 20;
                  pdf.setFontSize(10);
                  for (const line of [
                    "COLIBRI MED — PROTOTIPE SIMULASI — DATA SINTETIS",
                    "Cakupan: seluruh data yang diizinkan peran; bukan filter modul lain.",
                    "Peran: " + actor.role,
                    "Sumber: " +
                      (mode === "demo"
                        ? "Tersimpan di perangkat"
                        : "Tersinkron ke server") +
                      ". Waktu tampilan WIB.",
                    ...Object.entries(data).flatMap(([table, records]) => [
                      tableLabel(table) + " (" + records.length + ")",
                      ...records.map(
                        (r) =>
                          r.id.slice(0, 8) +
                          " | " +
                          displayStatus(r.status, mode === "demo") +
                          " | " +
                          String(r.reason ?? "") +
                          (r.durationSeconds !== undefined
                            ? " | durasi tahap: " +
                              Number(r.durationSeconds).toFixed(0) +
                              " detik"
                            : "") +
                          " | " +
                          date(r.updatedAt),
                      ),
                    ]),
                  ]) {
                    for (const part of pdf.splitTextToSize(line, 180)) {
                      if (y > 275) {
                        pdf.addPage();
                        y = 20;
                      }
                      pdf.text(part, 12, y);
                      y += 6;
                    }
                  }
                  pdf.save("COLIBRI-MED-SIMULASI.pdf");
                }}
              >
                Ekspor PDF
              </button>
            </div>
            {Object.entries(data).map(([k, v]) => (
              <div key={k}>
                <h3>{tableLabel(k)}</h3>
                {rows(v)}
              </div>
            ))}
          </section>
        )}
        {section === "outbox" && (
          <section className="card">
            <h2>Outbox milik Anda</h2>
            <p>
              Konflik harus ditinjau melalui data terbaru dan dicatat sebagai
              operasi baru. Operasi konflik tidak dikirim ulang otomatis.
            </p>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await retry(actor);
                  setMessage("Pengiriman ulang selesai.");
                  await poll.refresh();
                } catch (e) {
                  setMessage(String(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Kirim ulang operasi tertunda
            </button>
            {pending.map((p) => (
              <details key={p.operationId}>
                <summary>
                  {actionLabel(p.action)} ·{" "}
                  {displayStatus(p.status, mode === "demo")} · percobaan{" "}
                  {p.retryCount}
                </summary>
                <details>
                  <summary>Referensi teknis operasi</summary>
                  <p>
                    {p.action} · ID operasi: {p.operationId}
                  </p>
                </details>
                <p>
                  Revision lokal: {p.baseRevision} · Revision data terbaru:{" "}
                  {Object.values(data)
                    .flat()
                    .find((r) => r.id === p.entityId)?.revision ??
                    "belum ditemukan"}
                </p>
                <p>
                  Periksa data terbaru sebelum membuat perubahan pengganti.
                  Pengarsipan menyimpan salinan operasi lokal dan tidak
                  membatalkan perubahan di server.
                </p>
                {["Konflik perubahan", "Perlu ditinjau"].includes(p.status) && (
                  <button
                    className="secondary"
                    onClick={async () => {
                      try {
                        await archiveOperation(
                          outboxOwner(actor),
                          p.operationId,
                        );
                        setMessage(
                          "Operasi diarsipkan. Muat data terbaru lalu tinjau perubahan pengganti.",
                        );
                        await poll.refresh();
                      } catch (e) {
                        setMessage(String(e));
                      }
                    }}
                  >
                    Arsipkan operasi setelah ditinjau
                  </button>
                )}
                {p.status === "Perlu rekonsiliasi" && (
                  <p>
                    Hubungi administrator dengan ID operasi. Jangan membuat
                    operasi pengganti sebelum rekonsiliasi selesai.
                  </p>
                )}
              </details>
            ))}
            {!pending.length && <p>Tidak ada operasi tertunda.</p>}
            {!!archived.length && (
              <details>
                <summary>Arsip operasi ditinjau ({archived.length})</summary>
                <p>Salinan lokal; tidak dikirim ulang.</p>
                <button
                  className="secondary"
                  onClick={() =>
                    download(
                      "json",
                      JSON.stringify(archived, null, 2),
                      "application/json",
                    )
                  }
                >
                  Unduh arsip sintetis saya
                </button>
              </details>
            )}
            <h3>Inbox aktivitas</h3>
            {rows((data.ActivityLogs ?? []).slice(0, 10))}
          </section>
        )}
        {section === "pengaturan" && (
          <section className="card">
            <h2>Preferensi perangkat</h2>
            <label>
              Interval polling
              <select
                value={interval}
                onChange={(e) =>
                  void preferences.change(Number(e.target.value))
                }
              >
                <option value={30000}>30 detik</option>
                <option value={60000}>60 detik</option>
                <option value={120000}>120 detik</option>
              </select>
            </label>
            {preferences.error ? (
              <p role="alert">{preferences.error}</p>
            ) : (
              <p role="status">
                {preferences.saving
                  ? "Menyimpan pengaturan…"
                  : "Pengaturan tersimpan untuk pengguna ini pada perangkat dan mode yang sama."}
              </p>
            )}
            <p>
              Polling berhenti ketika tab tersembunyi atau perangkat offline.
              Backoff diterapkan saat gagal.
            </p>
            <p>
              Mode: {mode}.{" "}
              {mode === "demo"
                ? "Data disimpan di browser ini."
                : "Data bersama melalui Vercel dan Google Apps Script."}
            </p>
            <p>
              Draft dipisah menurut pengguna. Penyimpanan perangkat dapat
              dihapus; tidak ada sinkronisasi saat browser ditutup.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
