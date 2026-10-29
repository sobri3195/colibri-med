import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  LayoutDashboard,
  LogOut,
  Plane,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  Users,
  WalletCards,
} from "lucide-react";
import type { Actor } from "../types";
import BrandMark from "../components/BrandMark";
import type {
  CountGroup,
  LeadershipPeriod,
  LeadershipSummary,
} from "../types/leadership";
import { call } from "../services/api";
import { csv, date } from "../lib/domain";
import { usePolling } from "../features/usePolling";
import {
  attentionItems,
  leadershipReport,
  metricLabels,
  perspectives,
  type Perspective,
} from "../features/leadership/presentation";
import Login from "./Login";
import AsyncState from "../components/AsyncState";

const navigation = [
  { key: "", label: "Ringkasan", icon: LayoutDashboard },
  { key: "operasi", label: "Operasi", icon: Plane },
  { key: "kesiapan", label: "Kesiapan", icon: ShieldCheck },
  { key: "perhatian", label: "Perhatian", icon: TriangleAlert },
  { key: "laporan", label: "Laporan", icon: BarChart3 },
];
function Distribution({
  title,
  items,
}: {
  title: string;
  items: CountGroup[];
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <section className="card leadership-distribution">
      <h2>{title}</h2>
      {items.some((i) => i.count > 0) ? (
        items.map((item) => (
          <div className="leadership-status-row" key={item.label}>
            <div>
              <span>{item.label}</span>
              <strong>{item.count}</strong>
            </div>
            <div className="leadership-track" aria-hidden="true">
              <span style={{ width: (item.count / max) * 100 + "%" }} />
            </div>
          </div>
        ))
      ) : (
        <p className="empty">Belum ada data dalam periode ini.</p>
      )}
    </section>
  );
}
function Trend({ data }: { data: LeadershipSummary }) {
  const [metric, setMetric] = useState<"requests" | "completed" | "cancelled">(
    "requests",
  );
  const labels = {
    requests: "Permohonan dibuat",
    completed: "Misi selesai",
    cancelled: "Misi dibatalkan",
  };
  const max = Math.max(1, ...data.trend.map((t) => t[metric]));
  return (
    <section className="card leadership-trend">
      <div className="leadership-section-title">
        <h2>Tren harian</h2>
        <Activity size={19} />
      </div>
      <label>
        Indikator tren
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as typeof metric)}
        >
          {Object.entries(labels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <figure>
        <div
          className="leadership-bars"
          style={{
            gridTemplateColumns: `repeat(${data.trend.length},minmax(0,1fr))`,
          }}
        >
          {data.trend.map((day) => (
            <div
              key={day.date}
              className="leadership-bar-slot"
              title={day.date + ": " + day[metric]}
            >
              <span
                className={day[metric] ? "has-value" : ""}
                style={{ height: Math.max(2, (day[metric] / max) * 100) + "%" }}
              />
              <span className="sr-only">
                {day.date}: {day[metric]}
              </span>
            </div>
          ))}
        </div>
        <figcaption>
          <span>{data.trend[0]?.date}</span>
          <span>{data.trend.at(-1)?.date}</span>
        </figcaption>
      </figure>
      <small>
        Tanggal UTC · {data.trend.length} hari. {labels[metric]} dalam kohor.
        Bukan target waktu resmi.
      </small>
      <details>
        <summary>Data tren dalam daftar</summary>
        <div className="table-wrap">
          <table className="leadership-table">
            <thead>
              <tr>
                <th>Tanggal UTC</th>
                <th>{labels[metric]}</th>
              </tr>
            </thead>
            <tbody>
              {data.trend.map((d) => (
                <tr key={d.date}>
                  <td>{d.date}</td>
                  <td>{d[metric]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
export default function Leadership({
  actor,
  checking,
  logout,
  onLogin,
}: {
  actor: Actor | null;
  checking: boolean;
  logout: () => Promise<void>;
  onLogin: (a: Actor) => void;
}) {
  const location = useLocation();
  const section = location.pathname.replace(/\/+$/, "").split("/")[2] ?? "";
  const [params, setParams] = useSearchParams();
  const focus = (
    Object.hasOwn(perspectives, params.get("fokus") ?? "")
      ? params.get("fokus")
      : "presiden"
  ) as Perspective;
  const period = (
    ["all", "7", "30"].includes(params.get("periode") ?? "")
      ? params.get("periode")
      : "all"
  ) as LeadershipPeriod;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [section]);
  const eligible =
    !!actor && ["Viewer pimpinan", "Administrator"].includes(actor.role);
  return (
    <div className="mobile-shell leadership-shell">
      <header className="mobile-header">
        <Link
          className="brand"
          to="/pimpinan"
          aria-label="COLIBRI MED pimpinan"
        >
          <BrandMark />
          <div>
            COLIBRI <b>MED</b>
            <small>PENGAWASAN PIMPINAN</small>
          </div>
        </Link>
        {actor && (
          <button
            className="mobile-profile"
            aria-label="Keluar dari pengawasan"
            onClick={() => void logout()}
          >
            <LogOut size={19} />
          </button>
        )}
      </header>
      <div className="mobile-content leadership-content">
        {checking ? (
          <p role="status">Memeriksa sesi…</p>
        ) : !actor ? (
          <>
            <section className="leadership-intro">
              <div className="eyebrow">RINGKASAN LINTAS INSTANSI</div>
              <h1>Pengawasan pimpinan</h1>
              <p>
                Usulan tampilan pengawasan untuk Kasau, Kemenhan, Kemenkes, dan
                Presiden. Hanya data sintetis dan ringkasan agregat.
              </p>
              <span className="badge">
                <Eye size={14} /> Akses baca
              </span>
            </section>
            <Login
              onLogin={onLogin}
              destination={
                "/pimpinan" + (section ? "/" + section : "") + location.search
              }
              initialRole="Viewer pimpinan"
            />
          </>
        ) : !eligible ? (
          <section className="card">
            <h1>Akses pengawasan terbatas</h1>
            <p>
              Gunakan akun Viewer pimpinan atau Administrator yang diberikan
              pengelola.
            </p>
            <button onClick={() => void logout()}>
              Keluar untuk berganti akun
            </button>
            <Link className="mobile-info-link" to="/mobile">
              Kembali ke ruang petugas
            </Link>
          </section>
        ) : (
          <LeadershipDashboard
            key={actor.id + ":" + period}
            actor={actor}
            section={section}
            focus={focus}
            period={period}
            change={(key, value) => {
              const next = new URLSearchParams(params);
              next.set(key, value);
              setParams(next, { replace: true });
            }}
          />
        )}
      </div>
      <nav
        className="bottom-navigation leadership-navigation"
        aria-label="Navigasi pengawasan"
      >
        {navigation.map(({ key, label, icon: Icon }) => (
          <Link
            key={key}
            to={"/pimpinan" + (key ? "/" + key : "") + location.search}
            className={section === key ? "bottom-link active" : "bottom-link"}
            aria-current={section === key ? "page" : undefined}
          >
            <span className="bottom-icon">
              <Icon size={21} aria-hidden="true" />
            </span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <p className="mobile-disclaimer">
        PROTOTIPE SIMULASI — DATA SINTETIS
        <br />
        Bukan dashboard resmi pemerintah. Keputusan tetap pada petugas
        berwenang.
      </p>
    </div>
  );
}
function LeadershipDashboard({
  actor,
  section,
  focus,
  period,
  change,
}: {
  actor: Actor;
  section: string;
  focus: Perspective;
  period: LeadershipPeriod;
  change: (key: string, value: string) => void;
}) {
  const [data, setData] = useState<LeadershipSummary | null>(null);
  const [exportError, setExportError] = useState("");
  const load = useCallback(
    async () => setData(await call("leadership.summary", { period }, actor)),
    [actor, period],
  );
  const poll = usePolling(load, 60000);
  const perspective = perspectives[focus];
  const issues = data ? attentionItems(data) : [];
  const unknown = !navigation.some((n) => n.key === section);
  const exportFile = async (kind: "csv" | "pdf") => {
    if (!data || poll.error) return;
    try {
      setExportError("");
      const rows = leadershipReport(data, focus);
      if (kind === "csv") {
        const url = URL.createObjectURL(
          new Blob([csv(rows)], {
            type: "text/csv;charset=utf-8",
          }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = "COLIBRI-PIMPINAN-SIMULASI.csv";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF();
        let y = 18;
        pdf.setFontSize(10);
        for (const line of [
          "COLIBRI MED - PROTOTIPE SIMULASI - DATA SINTETIS",
          "Pengawasan pimpinan / " + perspective.label,
          "Diperbarui: " + date(data.generatedAt),
          "Kohor: " +
            (data.cohortStartAt ? date(data.cohortStartAt) : "Seluruh data"),
          ...rows.map(
            (r) =>
              r.kategori +
              " | " +
              r.indikator +
              ": " +
              r.nilai +
              " " +
              r.satuan,
          ),
        ])
          for (const part of pdf.splitTextToSize(line, 180)) {
            if (y > 277) {
              pdf.addPage();
              y = 18;
            }
            pdf.text(part, 14, y);
            y += 6;
          }
        pdf.save("COLIBRI-PIMPINAN-SIMULASI.pdf");
      }
    } catch {
      setExportError("Laporan belum dapat dibuat. Coba lagi.");
    }
  };
  if (unknown)
    return (
      <section className="card">
        <h1>Halaman tidak ditemukan</h1>
        <Link to="/pimpinan">Kembali ke ringkasan pimpinan</Link>
      </section>
    );
  return (
    <>
      <div className="leadership-heading">
        <div>
          <div className="eyebrow">PANTAU • TINJAU • KOORDINASIKAN</div>
          <h1>
            {navigation.find((n) => n.key === section)?.label === "Ringkasan"
              ? "Pengawasan pimpinan"
              : navigation.find((n) => n.key === section)?.label}
          </h1>
        </div>
        <button
          className="secondary"
          aria-label="Perbarui pengawasan"
          disabled={poll.loading}
          onClick={() => void poll.refresh()}
        >
          <RefreshCw size={18} />
        </button>
      </div>
      <div className="leadership-filters">
        <label>
          Sudut pantau
          <select
            value={focus}
            onChange={(e) => change("fokus", e.target.value)}
          >
            {Object.entries(perspectives).map(([key, p]) => (
              <option value={key} key={key}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Periode kohor
          <select
            value={period}
            onChange={(e) => change("periode", e.target.value)}
          >
            <option value="all">Seluruh data</option>
            <option value="7">7 hari kalender UTC</option>
            <option value="30">30 hari kalender UTC</option>
          </select>
        </label>
      </div>
      <small className="leadership-scope">
        Kohor mencakup permohonan/misi yang dibuat dalam hari kalender UTC
        terpilih. Kesiapan dan kualitas data memakai snapshot seluruh data.
        Sudut pantau tidak mengubah hak akses.
      </small>
      <AsyncState {...poll} reload={() => void poll.refresh()} />
      {poll.error && data && (
        <p role="status" className="notice">
          Data terakhir ditampilkan; belum berhasil diperbarui. Ekspor
          dinonaktifkan sampai refresh berhasil.
        </p>
      )}
      {data && (
        <>
          <div className="leadership-freshness">
            <span className="badge">
              <Eye size={13} /> Baca saja
            </span>
            <small>
              Pembaruan: {date(data.generatedAt)} · polling 60 detik
            </small>
          </div>
          {section === "" && (
            <>
              <div className="leadership-metrics">
                {perspective.metrics.map((key, index) => {
                  const Icon = [ClipboardList, Plane, CheckCircle2, Users][
                    index
                  ];
                  return (
                    <article className="card" key={key}>
                      <Icon size={20} />
                      <strong>{data.totals[key]}</strong>
                      <span>{metricLabels[key]}</span>
                    </article>
                  );
                })}
              </div>
              <section className="leadership-hero">
                <div className="leadership-hero-top">
                  <span>
                    <Eye size={17} /> {perspective.label}
                  </span>
                  <span>SIMULASI</span>
                </div>
                <h2>{perspective.subtitle}</h2>
                <p>{perspective.description}</p>
                <div className="leadership-hero-foot">
                  <span>{issues.length} jenis indikator perlu ditinjau</span>
                  <Link
                    to={
                      "/pimpinan/perhatian?" +
                      new URLSearchParams({ fokus: focus, periode: period })
                    }
                  >
                    Tinjau <ArrowRight size={15} />
                  </Link>
                </div>
              </section>
              {data.totals.activeOutsidePeriod > 0 && (
                <p className="notice">
                  Ada {data.totals.activeOutsidePeriod} misi aktif di luar kohor
                  ini. Pilih Seluruh data untuk meninjaunya.
                </p>
              )}
              <Trend data={data} />
              <section className="card leadership-coordination">
                <h2>Koordinasi yang perlu dipantau</h2>
                {issues.length ? (
                  issues.slice(0, 3).map((i) => (
                    <div key={i.code}>
                      <span>{i.label}</span>
                      <strong>{i.count}</strong>
                    </div>
                  ))
                ) : (
                  <p>
                    Tidak ada indikator tertunda pada data yang tersedia. Ini
                    bukan jaminan kesiapan operasional.
                  </p>
                )}
                <Link
                  to={
                    "/pimpinan/perhatian?" +
                    new URLSearchParams({ fokus: focus, periode: period })
                  }
                >
                  Lihat semua indikator <ArrowRight size={15} />
                </Link>
              </section>
            </>
          )}
          {section === "operasi" && (
            <>
              <div className="leadership-totals">
                <span>
                  <strong>{data.totals.activeMissions}</strong> aktif
                </span>
                <span>
                  <strong>{data.totals.completedMissions}</strong> selesai
                </span>
                <span>
                  <strong>{data.totals.cancelledMissions}</strong> dibatalkan
                </span>
              </div>
              <Distribution
                title="Tahapan misi"
                items={data.missionsByStatus}
              />
              <Distribution
                title="Tahapan permohonan"
                items={data.requestsByStatus}
              />
              <section className="card">
                <h2>Durasi tahap tercatat</h2>
                <p className="muted">
                  Rerata dari transisi yang memiliki sampel pada misi dalam
                  kohor. Bukan SLA atau target waktu resmi.
                </p>
                {data.stageDurations.some((d) => d.samples > 0) ? (
                  data.stageDurations
                    .filter((d) => d.samples > 0)
                    .map((d) => (
                      <div className="leadership-duration" key={d.stage}>
                        <strong>{d.stage}</strong>
                        <span>
                          {d.meanSeconds.toFixed(0)} detik · {d.samples}{" "}
                          transisi
                        </span>
                      </div>
                    ))
                ) : (
                  <p className="empty">
                    Belum ada sampel durasi yang tercatat.
                  </p>
                )}
              </section>
            </>
          )}
          {section === "kesiapan" && (
            <>
              <section className="card">
                <div className="leadership-section-title">
                  <h2>Sumber daya</h2>
                  <ShieldCheck size={22} />
                </div>
                <p>
                  Snapshot seluruh data, bukan kapasitas atau batas operasi
                  resmi.
                </p>
                <div className="leadership-readiness">
                  {[
                    ["Siap simulasi", data.resources.ready],
                    ["Perlu konfirmasi", data.resources.unconfirmed],
                    ["Tidak siap simulasi", data.resources.unavailable],
                    ["Belum dikenali", data.resources.unknown],
                  ].map(([label, count]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>{count}</strong>
                    </div>
                  ))}
                </div>
                <small>
                  Total {data.resources.total} record sumber daya sintetis.
                </small>
              </section>
              <section className="card">
                <h2>Koordinasi fasilitas penerima</h2>
                <div className="leadership-totals">
                  <span>
                    <strong>{data.facilities.total}</strong> fasilitas di
                    direktori
                  </span>
                  <span>
                    <strong>{data.facilities.needsConfirmation}</strong>{" "}
                    berstatus perlu konfirmasi
                  </span>
                </div>
                <p>
                  {data.pending.handover} misi aktif dalam kohor belum memiliki
                  rekam serah terima.
                </p>
                <small>
                  Direktori tidak membuktikan ketersediaan tempat tidur,
                  kapasitas layanan, atau kelayakan pendaratan.
                </small>
              </section>
            </>
          )}
          {section === "perhatian" && (
            <>
              <p className="leadership-scope">
                Indikator dapat merujuk record yang sama. Jumlah antarindikator
                tidak boleh dijumlahkan sebagai kasus unik. Tidak ada keputusan
                atau penugasan otomatis.
              </p>
              {issues.length ? (
                issues.map((i) => (
                  <article className="card leadership-attention" key={i.code}>
                    <div className="leadership-section-title">
                      <h2>{i.label}</h2>
                      <strong>{i.count}</strong>
                    </div>
                    <span className="badge">{i.owner}</span>
                    <p>{i.detail}</p>
                  </article>
                ))
              ) : (
                <section className="card">
                  <CheckCircle2 size={26} />
                  <h2>Belum ada indikator tertunda</h2>
                  <p>
                    Hasil berdasarkan data yang tersedia; bukan jaminan kesiapan
                    operasi.
                  </p>
                </section>
              )}
              <section className="card">
                <h2>Kualitas data (snapshot)</h2>
                <ul className="leadership-quality">
                  <li>
                    Waktu tidak valid atau di masa depan:{" "}
                    {data.quality.invalidTimestamps}
                  </li>
                  <li>Status belum dikenali: {data.quality.unknownStatuses}</li>
                  <li>
                    Relasi misi tidak ditemukan: {data.quality.orphanMissions}
                  </li>
                  <li>
                    Relasi serah terima tidak ditemukan:{" "}
                    {data.quality.orphanHandovers}
                  </li>
                </ul>
              </section>
            </>
          )}
          {section === "laporan" && (
            <section className="card">
              <div className="leadership-section-title">
                <h2>Laporan pengawasan</h2>
                <WalletCards size={22} />
              </div>
              <p>
                Ringkasan agregat sesuai sudut pantau dan periode yang dipilih.
                Ekspor tidak memuat identitas pemohon, kontak, koordinat, atau
                catatan pasien.
              </p>
              <div className="actions">
                <button
                  disabled={!!poll.error || poll.loading}
                  onClick={() => void exportFile("csv")}
                >
                  <Download size={16} />
                  Unduh CSV
                </button>
                <button
                  className="secondary"
                  disabled={!!poll.error || poll.loading}
                  onClick={() => void exportFile("pdf")}
                >
                  Unduh PDF
                </button>
              </div>
              {exportError && <p role="alert">{exportError}</p>}
              <dl className="leadership-report-meta">
                <dt>Sudut pantau</dt>
                <dd>{perspective.label}</dd>
                <dt>Kohor dibuat sejak</dt>
                <dd>
                  {data.cohortStartAt
                    ? date(data.cohortStartAt)
                    : "Seluruh data"}
                </dd>
                <dt>Pembaruan sumber terakhir</dt>
                <dd>
                  {data.lastDataUpdatedAt
                    ? date(data.lastDataUpdatedAt)
                    : "Belum tersedia"}
                </dd>
              </dl>
              <small>
                Data sintetis, bukan laporan resmi pemerintah. Waktu ditampilkan
                WIB, tren harian dikelompokkan UTC.
              </small>
            </section>
          )}
        </>
      )}
      {!data && !poll.loading && !poll.error && (
        <p className="empty">Belum ada ringkasan tersedia.</p>
      )}
      <Link className="mobile-info-link" to="/mobile/akun">
        Akun & ruang petugas
      </Link>
    </>
  );
}
