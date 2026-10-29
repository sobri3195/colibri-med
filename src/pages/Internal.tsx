import { useCallback, useState, useEffect } from "react";
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
import LocationMap from "../components/LocationMap";
import { usePreferences } from "../features/usePreferences";
import CatalogueManager from "../features/CatalogueManager";
const tabs = [
  ["", "Vue d’ensemble"],
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
  const allowed = (...r: string[]) =>
    actor.role === "Administrator" || r.includes(actor.role);
  const act = async (action: string, payload: Record<string, unknown>) => {
    setBusy(true);
    try {
      const r = await submit(actor, action, payload);
      setMessage(r.queued ? "Menunggu jaringan" : "Perubahan dicatat.");
      await poll.refresh();
      return r;
    } catch (e) {
      setMessage(String(e));
      return null;
    } finally {
      setBusy(false);
      try {
        setPending(await outbox(outboxOwner(actor)));
      } catch {
        setMessage(
          "Outbox lokal belum dapat dibaca. Periksa penyimpanan perangkat.",
        );
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
      compact={compact}
      onOpen={onOpen}
    />
  );
  return (
    <div className={compact ? "workspace compact-workspace" : "workspace"}>
      {!compact && (
        <aside>
          <div className="eyebrow">RUANG KOORDINASI</div>
          <strong>{actor.role}</strong>
          <nav>
            {tabs.map(([path, label]) => (
              <Link
                key={path}
                className={section === path ? "active" : ""}
                to={"/internal/" + path}
              >
                {label === "Vue d’ensemble" ? "Ringkasan" : label}
              </Link>
            ))}
          </nav>
          <small>
            Semua data sintetis.
            <br />
            Keputusan tetap pada petugas.
          </small>
        </aside>
      )}
      <div className="workspace-content">
        <div className="page-heading">
          <div>
            <div className="eyebrow">COLIBRI MED / OPERASI SIMULASI</div>
            <h1>
              {tabs
                .find((t) => t[0] === section)?.[1]
                .replace("Vue d’ensemble", "Ringkasan koordinasi") ??
                "Ringkasan"}
            </h1>
            <small>
              {poll.updated
                ? "Pembaruan: " + date(poll.updated)
                : "Belum diperbarui"}{" "}
              · polling {interval / 1000} detik
            </small>
          </div>
          <button
            className="secondary"
            disabled={poll.loading}
            onClick={() => void poll.refresh()}
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
        <AsyncState {...poll} reload={() => void poll.refresh()} />
        {message && (
          <div role="status" className="notice">
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
          <div className="toolbar">
            <input
              aria-label="Cari data"
              placeholder="Cari data tersimpan…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <input
              aria-label="Filter status"
              placeholder="Filter status (teks tepat)"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        )}
        {section === "permohonan" && (
          <section className="card">
            <h2>Daftar permohonan</h2>
            {compact && (
              <Link className="button" to="/mobile/permohonan">
                Buat permohonan baru
              </Link>
            )}
            {rows(requests, (r) => openRequest(r.id))}
          </section>
        )}
        {section === "misi" && (
          <section className="card">
            <div className="actions">
              <button
                className="secondary"
                onClick={() => setView(view === "table" ? "kanban" : "table")}
              >
                {view === "table" ? "Tampilan kanban" : "Tampilan tabel"}
              </button>
            </div>
            {view === "table" ? (
              rows(missions, (r) => openRequest(String(r.requestId)))
            ) : (
              <div className="kanban">
                {[...missionStages, "Dibatalkan"].map((s) => (
                  <div key={s}>
                    <h3>{s}</h3>
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
            )}
          </section>
        )}
        {["permohonan", "misi", "penilaian"].includes(section) && (
          <section className="card" id="request-workspace">
            <h2>Ruang kerja permohonan</h2>
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
                  <Link to="/mobile/permohonan">Buat permohonan simulasi</Link>
                )}
              </p>
            )}
            {request && (
              <>
                <p>
                  {String(request.summary)} ·{" "}
                  <span className="badge">{request.status}</span>
                </p>
                <p>
                  Lokasi: {String(request.location)} · Akses:{" "}
                  {String(request.access)}
                </p>
                {allowed("Operator") && (
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
                {allowed("Operator") && (
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
                          });
                        }}
                      >
                        <label>
                          Tim simulasi
                          <input name="team" required maxLength={150} />
                        </label>
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
                    <p>Tim: {String(mission.team)}</p>
                    {allowed("Operator") && (
                      <MissionControls
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
                  ["patientNotes", "Catatan pasien sintetis", "Dokter/perawat"],
                  ["checklists", "Checklist", "Dokter/perawat"],
                  ["handovers", "Serah terima", "Rumah sakit penerima"],
                ].map(
                  ([group, title, role]) =>
                    allowed(
                      role,
                      ...(group === "handovers"
                        ? ["Dokter/perawat"]
                        : group === "checklists"
                          ? ["Koordinator penerbangan"]
                          : []),
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
                <h3>{k}</h3>
                {rows(v.filter((r) => r.requestId === request?.id))}
              </section>
            ))}
        {section === "fasilitas" && (
          <section className="card">
            <LocationMap
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
                  name: String(r.name),
                  lat: Number(r.lat),
                  lng: Number(r.lng),
                }))}
            />
            <h2>Daftar lokasi sintetis</h2>
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
            {allowed("Operator") &&
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
              Ringkasan alur, perubahan status, penundaan, checklist, serah
              terima, dan sumber daya. Waktu penyimpanan ISO UTC; tampilan WIB.
            </p>
            <div className="actions">
              <button
                onClick={() =>
                  download(
                    "csv",
                    csv(
                      Object.entries(data).flatMap(([table, records]) =>
                        records.map((r) => ({
                          table,
                          id: r.id,
                          status: r.status,
                          createdAt: r.createdAt,
                          updatedAt: r.updatedAt,
                          reason: r.reason ?? "",
                          details: JSON.stringify(r),
                        })),
                      ),
                    ),
                    "text/csv;charset=utf-8",
                  )
                }
              >
                <Download size={16} /> Ekspor CSV
              </button>
              <button
                className="secondary"
                onClick={async () => {
                  const { jsPDF } = await import("jspdf");
                  const pdf = new jsPDF();
                  let y = 20;
                  pdf.setFontSize(10);
                  for (const line of [
                    "COLIBRI MED — PROTOTIPE SIMULASI — DATA SINTETIS",
                    ...Object.entries(data).flatMap(([table, records]) => [
                      table + " (" + records.length + ")",
                      ...records.map(
                        (r) =>
                          r.id.slice(0, 8) +
                          " | " +
                          r.status +
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
                <h3>{k}</h3>
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
                  {p.action} · {p.status} · percobaan {p.retryCount}
                </summary>
                <p>ID operasi: {p.operationId}</p>
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
