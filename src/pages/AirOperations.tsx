import { canAction } from "../lib/permissions";
import { StatusBadge } from "../components/MobileUI";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Download,
  FileText,
  Pause,
  Play,
  Plane,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  MapPin,
  MessageSquare,
  TriangleAlert,
  CircleCheck,
  Check,
  Search,
} from "lucide-react";
import type { Actor } from "../types";
import type { AviationSnapshot } from "../types/aviation";
import { call, mode } from "../services/api";
import { usePolling } from "../features/usePolling";
import { csv, date } from "../lib/domain";
import { playbackPosition, reportCategories } from "../lib/aviation";
import AircraftMap from "../components/AircraftMap";
import AircraftReportForm from "../features/aircraft/AircraftReportForm";
import AsyncState from "../components/AsyncState";
import Login from "./Login";
export function AdminFlightPage({
  actor,
  checking,
  onLogin,
}: {
  actor: Actor | null;
  checking: boolean;
  onLogin: (a: Actor) => void;
}) {
  const { section = "" } = useParams();
  const location = useLocation();
  if (section === "login")
    return (
      <Login
        initialRole="Administrator"
        destination={
          location.state?.from === "/admin/laporan"
            ? "/admin/laporan"
            : "/admin"
        }
        onLogin={onLogin}
      />
    );
  if (!["", "laporan"].includes(section))
    return (
      <section className="card">
        <h1>Halaman tidak ditemukan</h1>
        <Link to="/admin">Buka dashboard admin</Link>
      </section>
    );
  if (checking) return <p role="status">Memeriksa sesi…</p>;
  if (!actor)
    return (
      <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
    );
  if (actor.role !== "Administrator")
    return (
      <section className="card">
        <h1>Dashboard khusus Administrator</h1>
        <p>
          Akun ini tidak memiliki peran Administrator. Gunakan akun undangan
          yang sesuai atau kembali ke ruang petugas.
        </p>
        <Link className="button" to="/mobile/akun">
          Buka akun petugas
        </Link>
      </section>
    );
  return <AirOperations actor={actor} key={actor.id} />;
}
export default function AirOperations({
  actor,
  mobile = false,
}: {
  actor: Actor;
  mobile?: boolean;
}) {
  const location = useLocation();
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const [params, setParams] = useSearchParams();
  const [snapshot, setSnapshot] = useState<AviationSnapshot | null>(null);
  const [running, setRunning] = useState(false);
  const [airSearch, setAirSearch] = useState("");
  const [airStatus, setAirStatus] = useState("");
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => {
      setReducedMotion(mq.matches);
      if (mq.matches) setRunning(false);
    };
    mq.addEventListener("change", change);
    return () => mq.removeEventListener("change", change);
  }, []);
  const [detailsOpen, setDetailsOpen] = useState(
    () => window.matchMedia("(min-width: 1100px)").matches,
  );
  const [tick, setTick] = useState(0);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(10);
  const [exportError, setExportError] = useState("");
  const reportPanel = mobile
    ? params.get("panel") === "laporan"
    : location.pathname.endsWith("/laporan");
  const load = useCallback(async () => {
    setSnapshot(await call("aircraft.snapshot", {}, actor));
  }, [actor]);
  const poll = usePolling(load, 30000);
  const aircraft = snapshot?.aircraft ?? [];
  const selected = params.get("aircraft") ?? aircraft[0]?.id ?? "";
  const current = aircraft.find((a) => a.id === selected);
  const visibleAircraft = aircraft.filter(
    (a) =>
      (!airStatus || a.status === airStatus) &&
      (a.name + " " + a.demoCode)
        .toLowerCase()
        .includes(airSearch.toLowerCase()),
  );
  const latestReports = (snapshot?.reports ?? [])
    .filter((r) => r.aircraftId === selected)
    .slice()
    .sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
  const relatedMissions = (snapshot?.missions ?? []).filter(
    (m) =>
      m.id === current?.missionId ||
      latestReports.some((r) => r.missionId === m.id),
  );
  const resetReports = () => {
    setSearch("");
    setCategory("all");
  };
  const select = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("aircraft", id);
    setParams(next, { replace: true });
  };
  const link = (reports: boolean) => {
    const q = new URLSearchParams();
    if (selected) q.set("aircraft", selected);
    if (mobile && reports) q.set("panel", "laporan");
    return (
      (mobile
        ? "/mobile/operasi/helikopter"
        : reports
          ? "/admin/laporan"
          : "/admin") + (q.size ? "?" + q : "")
    );
  };
  useEffect(() => {
    if (reportPanel) {
      setRunning(false);
      return;
    }
    if (!running) return;
    const timer = setInterval(() => {
      if (!document.hidden) setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [running, reportPanel]);
  useEffect(() => {
    setLimit(10);
  }, [category, search, selected]);
  const markers = useMemo(
    () =>
      aircraft.map((a) => {
        const [lat, lng] =
          running || tick > 0 ? playbackPosition(a, tick) : [a.lat, a.lng];
        return { id: a.id, name: a.name, lat, lng, path: a.trainingPath };
      }),
    [aircraft, running, tick],
  );
  const reports = (snapshot?.reports ?? []).filter(
    (r) =>
      (!selected || r.aircraftId === selected) &&
      (category === "all" || r.category === category) &&
      [r.text, r.category, r.aircraftStatus].some((v) =>
        v.toLowerCase().includes(search.toLowerCase()),
      ),
  );
  const canReport = canAction(actor, "aircraftReports.create");
  return (
    <div
      className={
        mobile ? "air-operations compact-air-operations" : "air-operations"
      }
    >
      <div className="page-heading">
        <div>
          <div className="eyebrow">COLIBRI MED / PUSAT PANTAU SINTETIS</div>
          <h1>
            {reportPanel ? "Laporan awak helikopter" : "Pemantauan helikopter"}
          </h1>
          <small>
            {poll.updated
              ? "Pembaruan data: " + date(poll.updated)
              : "Memuat snapshot"}{" "}
            · polling 30 detik
          </small>
        </div>
        <button
          className="secondary"
          disabled={poll.loading}
          aria-label="Perbarui data helikopter"
          onClick={() => void poll.refresh()}
        >
          <RefreshCw size={18} />
        </button>
      </div>
      <nav className="air-tabs" aria-label="Modul helikopter">
        <Link to={link(false)} aria-current={!reportPanel ? "page" : undefined}>
          <Plane size={17} />
          Pemantauan
        </Link>
        <Link to={link(true)} aria-current={reportPanel ? "page" : undefined}>
          <FileText size={17} />
          Laporan awak
        </Link>
        <Link to={mobile ? "/mobile/akun" : "/internal"}>
          Ruang koordinasi <ArrowRight size={15} />
        </Link>
      </nav>
      {!online && (
        <p role="status" className="notice">
          Perangkat offline. Data tersimpan tetap dapat dibaca; peta dasar
          memerlukan tile yang tersedia.
        </p>
      )}
      <AsyncState {...poll} reload={() => void poll.refresh()} />
      {poll.error && snapshot && (
        <p role="status" className="notice">
          Snapshot lama ditampilkan. Backend belum berhasil diperbarui; tidak
          beralih ke data demo.
        </p>
      )}
      {snapshot && (
        <>
          {aircraft.length === 0 ? (
            <section className="card">
              <h2>Belum ada helikopter sintetis</h2>
              <p>
                Gunakan setup/seed data sintetis yang didokumentasikan. Tidak
                ada data armada nyata yang diasumsikan tersedia.
              </p>
            </section>
          ) : (
            <>
              <div className="air-object-toolbar">
                <details className="air-object-filters">
                  <summary>
                    <Search size={16} /> Cari & filter helikopter
                  </summary>
                  <div>
                    {" "}
                    <label>
                      Cari helikopter
                      <input
                        value={airSearch}
                        onChange={(e) => setAirSearch(e.target.value)}
                        placeholder="Kode atau nama helikopter"
                      />
                    </label>
                    <label>
                      Status tercatat
                      <select
                        value={airStatus}
                        onChange={(e) => setAirStatus(e.target.value)}
                      >
                        <option value="">Semua status</option>
                        {[...new Set(aircraft.map((a) => a.status))].map(
                          (status) => (
                            <option key={status}>{status}</option>
                          ),
                        )}
                      </select>
                    </label>
                  </div>
                </details>
                <label className="air-selector">
                  Pilih helikopter sintetis
                  <select
                    value={current?.id ?? ""}
                    onChange={(e) => select(e.target.value)}
                  >
                    <option value="" disabled>
                      Pilih helikopter
                    </option>
                    {aircraft.map((a) => (
                      <option value={a.id} key={a.id}>
                        {a.demoCode} · {a.name} · {a.status}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {(airSearch || airStatus) && (
                <p role="status" className="air-filter-result">
                  {visibleAircraft.length} helikopter sesuai filter.{" "}
                  <button
                    className="tertiary"
                    onClick={() => {
                      setAirSearch("");
                      setAirStatus("");
                    }}
                  >
                    Reset filter helikopter
                  </button>
                  {current &&
                    !visibleAircraft.some((a) => a.id === current.id) &&
                    " Pilihan saat ini berada di luar filter; detail tersimpan tetap ditampilkan."}
                </p>
              )}
              {!current && (
                <p role="alert" className="error">
                  Helikopter yang dipilih tidak ditemukan. Pilih record lain;
                  laporan tidak akan dikirim.
                </p>
              )}
              {!reportPanel && (
                <div className="air-monitor-layout">
                  <section className="card air-map-card">
                    <div className="air-map-heading">
                      <h2>Peta pemantauan simulasi</h2>
                      <span className="badge">
                        {running || tick
                          ? "Animasi simulasi"
                          : "Posisi berdasarkan laporan sintetis."}
                      </span>
                    </div>
                    <AircraftMap
                      aircraft={markers.filter((m) =>
                        visibleAircraft.some((a) => a.id === m.id),
                      )}
                      selected={selected}
                      select={select}
                      playback={running || tick > 0}
                    />
                    <div className="actions">
                      <button
                        disabled={
                          reducedMotion ||
                          aircraft.every((a) => a.trainingPath.length < 2)
                        }
                        onClick={() => setRunning((r) => !r)}
                      >
                        {running ? <Pause size={16} /> : <Play size={16} />}{" "}
                        {running
                          ? "Jeda simulasi"
                          : "Mulai simulasi pergerakan"}
                      </button>
                      <button
                        className="secondary"
                        onClick={() => {
                          setRunning(false);
                          setTick(0);
                        }}
                      >
                        <RotateCcw size={16} />
                        Reset ke posisi laporan
                      </button>
                    </div>
                    {reducedMotion && (
                      <small>
                        Animasi dinonaktifkan mengikuti preferensi pengurangan
                        gerakan.
                      </small>
                    )}
                    <p role="status" className="air-playback-status">
                      {running
                        ? "Animasi lokal berjalan; bukan posisi aktual."
                        : tick
                          ? "Animasi dijeda; posisi ilustrasi tetap ditampilkan."
                          : "Animasi nonaktif; memakai posisi laporan terakhir."}
                    </p>
                    {current && (
                      <div className="air-selected-summary">
                        <span className="eyebrow">{current.demoCode}</span>
                        <h3>{current.name}</h3>
                        <StatusBadge status={current.status} />
                        <p>
                          Laporan terakhir:{" "}
                          {(() => {
                            const latest = (snapshot.reports ?? [])
                              .filter((r) => r.aircraftId === current.id)
                              .sort((a, b) =>
                                b.reportedAt.localeCompare(a.reportedAt),
                              )[0];
                            return latest
                              ? date(latest.reportedAt)
                              : "Belum ada laporan";
                          })()}
                        </p>
                        <span
                          className={
                            running || tick
                              ? "playback-label"
                              : "stored-position-label"
                          }
                        >
                          {running || tick
                            ? "Animasi pergerakan lokal · bukan posisi tersimpan"
                            : "Posisi laporan tersimpan · data sintetis"}
                        </span>
                      </div>
                    )}
                  </section>
                  <details
                    className="aircraft-detail-panel"
                    open={detailsOpen}
                    onToggle={(e) => setDetailsOpen(e.currentTarget.open)}
                  >
                    <summary>
                      <span>Detail & posisi helikopter</span>
                      <span className="sheet-action">
                        {detailsOpen ? "Tutup detail" : "Buka detail"}
                      </span>
                    </summary>
                    <div className="sheet-content">
                      {current && (
                        <section
                          className="selected-air-detail"
                          aria-label="Ringkasan helikopter terpilih"
                        >
                          <span className="eyebrow">
                            {current.demoCode} · Dipilih
                          </span>
                          <h2>{current.name}</h2>
                          <StatusBadge status={current.status} />
                          <p>
                            Posisi dicatat:{" "}
                            {current.positionReportedAt
                              ? date(current.positionReportedAt)
                              : "Belum ada laporan posisi"}
                          </p>
                          <details>
                            <summary>Koordinat laporan tersimpan</summary>
                            <p>
                              {current.lat.toFixed(5)}, {current.lng.toFixed(5)}
                            </p>
                          </details>
                          <h3>Laporan awak terbaru</h3>
                          {latestReports[0] ? (
                            <p>
                              {latestReports[0].category} ·{" "}
                              {date(latestReports[0].reportedAt)}
                              <br />
                              {latestReports[0].text}
                            </p>
                          ) : (
                            <p>Belum ada laporan awak.</p>
                          )}
                          <Link className="button secondary" to={link(true)}>
                            Buka laporan lengkap <ArrowRight size={16} />
                          </Link>
                          <h3>Misi terkait</h3>
                          {relatedMissions.length ? (
                            relatedMissions.map((m) => (
                              <p key={m.id}>
                                Misi {m.id.slice(0, 8)} ·{" "}
                                <StatusBadge status={m.status} />
                              </p>
                            ))
                          ) : (
                            <p>
                              Belum ada misi terkait pada data yang tersedia.
                            </p>
                          )}
                          {relatedMissions.length > 0 && (
                            <Link
                              to={mobile ? "/mobile/misi" : "/internal/misi"}
                            >
                              Buka daftar misi →
                            </Link>
                          )}
                        </section>
                      )}
                      <p className="air-list-hint">
                        Pilih helikopter lain · daftar dapat digeser pada
                        ponsel.
                      </p>
                      <section
                        className="aircraft-list"
                        aria-label="Daftar helikopter sintetis"
                      >
                        {visibleAircraft.map((a) => {
                          const marker = markers.find((m) => m.id === a.id)!;
                          return (
                            <article
                              className={
                                selected === a.id
                                  ? "card aircraft-card selected"
                                  : "card aircraft-card"
                              }
                              key={a.id}
                            >
                              <div>
                                <span className="eyebrow">{a.demoCode}</span>
                                <StatusBadge status={a.status} />
                              </div>
                              <h2>{a.name}</h2>
                              {selected === a.id && (
                                <span className="record-selected">
                                  <Check size={16} /> Dipilih
                                </span>
                              )}
                              <p data-testid={"position-" + a.demoCode}>
                                {running || tick
                                  ? "Ilustrasi: "
                                  : "Posisi laporan: "}
                                {marker.lat.toFixed(5)}, {marker.lng.toFixed(5)}
                              </p>
                              <small>
                                Posisi dicatat:{" "}
                                {a.positionReportedAt
                                  ? date(a.positionReportedAt)
                                  : "Belum tersedia"}
                              </small>
                              <button
                                className="secondary"
                                aria-pressed={selected === a.id}
                                onClick={() => select(a.id)}
                              >
                                Pilih {a.demoCode}
                              </button>
                            </article>
                          );
                        })}
                      </section>
                      {!visibleAircraft.length && (
                        <p>
                          Tidak ada helikopter sesuai filter.{" "}
                          <button
                            className="tertiary"
                            onClick={() => {
                              setAirSearch("");
                              setAirStatus("");
                            }}
                          >
                            Reset filter helikopter
                          </button>
                        </p>
                      )}
                    </div>
                  </details>
                </div>
              )}
              <details className="notice air-simulation">
                <summary>
                  <ShieldCheck size={18} aria-hidden="true" /> Data sintetis ·
                  informasi simulasi
                </summary>
                <p>
                  Tidak terhubung GPS, ADS-B, sensor, atau armada nyata. Animasi
                  hanya ilustrasi lokal dan tidak mengubah data posisi yang
                  dilaporkan, izin penerbangan, atau status misi.
                </p>
              </details>
              <div className="air-summary">
                <article>
                  <Plane size={20} />
                  <strong>{aircraft.length}</strong>
                  <span>Helikopter sintetis</span>
                </article>
                <article>
                  <FileText size={20} />
                  <strong>{snapshot.reports.length}</strong>
                  <span>Laporan tercatat</span>
                </article>
                <article>
                  <Activity size={20} />
                  <strong>
                    {running ? "Berjalan" : tick ? "Jeda" : "Nonaktif"}
                  </strong>
                  <span>Animasi lokal</span>
                </article>
              </div>
              {current && (
                <section className="card aircraft-report-list">
                  <div className="air-map-heading">
                    <h2>Laporan {current.demoCode}</h2>
                    <span className="badge">{reports.length} hasil</span>
                  </div>
                  <p>
                    Catatan operasional awak sintetis yang dicatat petugas;
                    bukan komunikasi langsung dari helikopter nyata.
                  </p>
                  <div className="grid two">
                    <label>
                      Cari laporan
                      <input
                        value={search}
                        maxLength={100}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari isi laporan sintetis…"
                      />
                    </label>
                    <label>
                      Filter jenis laporan
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        <option value="all">Semua jenis</option>
                        {reportCategories.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <button
                    className="tertiary"
                    onClick={resetReports}
                    disabled={!search && category === "all"}
                  >
                    Reset filter laporan
                  </button>
                  {reports.length ? (
                    reports
                      .slice()
                      .sort((a, b) => b.reportedAt.localeCompare(a.reportedAt))
                      .slice(0, limit)
                      .map((r) => (
                        <article className="air-report" key={r.id}>
                          <div>
                            <span className="badge">
                              {r.category === "Posisi" ? (
                                <MapPin size={16} />
                              ) : r.category === "Kendala" ? (
                                <TriangleAlert size={16} />
                              ) : r.category === "Laporan akhir" ? (
                                <CircleCheck size={16} />
                              ) : (
                                <MessageSquare size={16} />
                              )}{" "}
                              {r.category}
                            </span>
                            <small>
                              {r.reportedAt
                                ? date(r.reportedAt)
                                : "Waktu tidak tersedia"}
                            </small>
                          </div>
                          <h3>{r.aircraftStatus}</h3>
                          <p>{r.text}</p>
                          <small>
                            {r.positionSupplied
                              ? "Koordinat baru dilaporkan: "
                              : "Memakai posisi sebelumnya: "}
                            {r.lat.toFixed(5)}, {r.lng.toFixed(5)} ·{" "}
                            {r.missionId
                              ? "Misi " + r.missionId.slice(0, 8)
                              : "Latihan tanpa misi"}
                          </small>
                        </article>
                      ))
                  ) : (
                    <div className="coord-empty">
                      <h3>Belum ada laporan sesuai filter.</h3>
                      <p>
                        Ubah kata kunci atau jenis laporan untuk melihat catatan
                        tersimpan.
                      </p>
                      <button className="secondary" onClick={resetReports}>
                        Tampilkan semua laporan
                      </button>
                    </div>
                  )}
                  {reports.length > limit && (
                    <button
                      className="secondary"
                      onClick={() => setLimit((n) => n + 10)}
                    >
                      Muat 10 laporan berikutnya
                    </button>
                  )}
                  <button
                    className="secondary"
                    disabled={!reports.length || !!poll.error || poll.loading}
                    onClick={() => {
                      try {
                        const rows = reports.map((r) => ({
                          simulasi: "PROTOTIPE SIMULASI — DATA SINTETIS",
                          helikopter: current.demoCode,
                          jenis: r.category,
                          status: r.aircraftStatus,
                          waktuUTC: r.reportedAt,
                          lat: r.lat,
                          lng: r.lng,
                          catatan: r.text,
                        }));
                        const url = URL.createObjectURL(
                          new Blob([csv(rows)], {
                            type: "text/csv;charset=utf-8",
                          }),
                        );
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "COLIBRI-LAPORAN-HELIKOPTER-SIMULASI.csv";
                        a.click();
                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                        setExportError("");
                      } catch {
                        setExportError("Laporan belum dapat diunduh.");
                      }
                    }}
                  >
                    <Download size={16} />
                    Unduh laporan helikopter CSV
                  </button>
                  {exportError && <p role="alert">{exportError}</p>}
                </section>
              )}
              {current && canReport && (
                <AircraftReportForm
                  key={actor.id + ":" + current.id}
                  actor={actor}
                  aircraft={current}
                  missions={snapshot.missions}
                  saved={poll.refresh}
                  mobile={mobile}
                />
              )}{" "}
              {!canReport && (
                <p className="notice">
                  Akun ini memantau data. Pencatatan laporan hanya untuk
                  Administrator, Koordinator penerbangan, atau Dokter/perawat.
                </p>
              )}
            </>
          )}
        </>
      )}
      <p className="air-footer-note">
        Mode {mode}. Lokasi dan laporan hanya sintetis. Keputusan operasional
        tetap pada petugas berwenang.
      </p>
    </div>
  );
}
