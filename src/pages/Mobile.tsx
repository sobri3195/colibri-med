import { useEffect } from "react";
import {
  Link,
  Navigate,
  Outlet,
  useLocation,
  useParams,
} from "react-router-dom";
import {
  ArrowRight,
  ClipboardPlus,
  House,
  MapPin,
  Plane,
  UserRound,
  ClipboardCheck,
  FileText,
  Inbox,
  Settings,
  Boxes,
  LogOut,
} from "lucide-react";
import type { Actor } from "../types";
import { mode } from "../services/api";
import Login from "./Login";
import Internal from "./Internal";
import AirOperations from "./AirOperations";
import { useConnection } from "../features/useConnection";
import {
  requestSearch,
  mobileDestination,
  mobileSections,
} from "../lib/mobile";

const tabs = [
  { path: "/mobile", label: "Beranda", icon: House },
  { path: "/mobile/permohonan", label: "Permohonan", icon: ClipboardPlus },
  { path: "/mobile/misi", label: "Misi", icon: Plane },
  { path: "/mobile/peta", label: "Peta", icon: MapPin },
  { path: "/mobile/akun", label: "Akun", icon: UserRound },
];
export function MobileLayout({ actor }: { actor: Actor | null }) {
  const location = useLocation();
  const pathname = location.pathname.replace(/\/+$/, "") || "/";
  const context = requestSearch(location.search);
  const connection = useConnection(actor, pathname);
  const navigation = tabs.map((t) =>
    actor?.role === "Viewer pimpinan"
      ? t.path === "/mobile/misi"
        ? { ...t, path: "/pimpinan/operasi", label: "Operasi" }
        : t.path === "/mobile/peta"
          ? { ...t, path: "/pimpinan/kesiapan", label: "Kesiapan" }
          : t.path === "/mobile/permohonan"
            ? { ...t, path: "/pimpinan", label: "Ringkasan" }
            : t
      : actor && t.path === "/mobile/permohonan"
        ? { ...t, path: "/mobile/operasi/permohonan" }
        : t,
  );
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="mobile-shell">
      <header className="mobile-header">
        <Link className="brand" to="/mobile" aria-label="COLIBRI MED mobile">
          <span className="mobile-logo">
            <Plane size={24} />
          </span>
          <div>
            COLIBRI <b>MED</b>
            <small>KOORDINASI MEDIS UDARA</small>
          </div>
        </Link>
        <Link
          className="mobile-profile"
          to="/mobile/akun"
          aria-label="Buka akun"
          title={actor?.role ?? "Akun petugas"}
        >
          <UserRound size={21} />
        </Link>
      </header>
      <div
        className={
          connection.online ? "mobile-connection" : "mobile-connection offline"
        }
        role="status"
      >
        <span>
          {connection.online
            ? "Perangkat online"
            : "Offline · gunakan draft lokal"}
        </span>
        {!!connection.pending && (
          <Link
            to={
              actor?.role === "Viewer pimpinan"
                ? "/pimpinan"
                : actor
                  ? "/mobile/operasi/outbox" + context
                  : "/mobile/permohonan"
            }
          >
            {connection.pending} operasi tertunda
          </Link>
        )}
      </div>
      <div className="mobile-content">
        <Outlet />
      </div>
      <nav className="bottom-navigation" aria-label="Navigasi bawah">
        {navigation.map(({ path, label, icon: Icon }) => {
          const active =
            label === "Permohonan" && pathname === "/mobile/permohonan"
              ? true
              : path === "/mobile"
                ? pathname === path
                : path === "/mobile/akun"
                  ? pathname === path ||
                    pathname === "/mobile/login" ||
                    (pathname.startsWith("/mobile/operasi") &&
                      pathname !== "/mobile/operasi/permohonan")
                  : pathname === path || pathname.startsWith(path + "/");
          return (
            <Link
              key={path}
              to={path + context}
              className={active ? "bottom-link active" : "bottom-link"}
              aria-current={active ? "page" : undefined}
            >
              <span className="bottom-icon">
                <Icon size={22} aria-hidden="true" />
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <p className="mobile-disclaimer">
        Data sintetis • Bukan layanan darurat resmi
      </p>
    </div>
  );
}
export function MobileHome({ actor }: { actor: Actor | null }) {
  const context = requestSearch(useLocation().search);
  const viewer = actor?.role === "Viewer pimpinan";
  return (
    <>
      <section className="mobile-welcome">
        <div className="eyebrow">
          {actor ? "RUANG KOORDINASI" : "COLIBRI MED / SIMULASI"}
        </div>
        <h1>
          Koordinasi dalam
          <br />
          <span>genggaman.</span>
        </h1>
        <p>Sistem Koordinasi Helikopter Dokter dan Evakuasi Medis Udara</p>
        <div className="mobile-status">
          <span aria-hidden="true">●</span> Mode{" "}
          {mode === "demo" ? "demo lokal" : "connected"} · Data sintetis
        </div>
        <Link
          className="button"
          to={
            viewer
              ? "/pimpinan"
              : actor
                ? "/mobile/operasi" + context
                : "/mobile/permohonan"
          }
        >
          {viewer
            ? "Buka pengawasan pimpinan"
            : actor
              ? "Buka ringkasan koordinasi"
              : "Buat permohonan simulasi"}
          <ArrowRight size={18} />
        </Link>
      </section>
      <section className="mobile-section">
        <div className="mobile-section-heading">
          <h2>Akses cepat</h2>
          <span>Alur simulasi</span>
        </div>
        <div className="mobile-shortcuts">
          {[
            {
              to: viewer
                ? "/pimpinan"
                : actor
                  ? "/mobile/operasi/permohonan" + context
                  : "/mobile/permohonan",
              title: "Permohonan",
              text: viewer
                ? "Pantau ringkasan"
                : actor
                  ? "Kelola & buat permohonan"
                  : "Kirim kebutuhan sintetis",
              icon: ClipboardPlus,
            },
            {
              to: viewer ? "/pimpinan/operasi" : "/mobile/misi" + context,
              title: "Papan misi",
              text: "Lanjutkan koordinasi",
              icon: Plane,
            },
            {
              to: viewer ? "/pimpinan/kesiapan" : "/mobile/peta" + context,
              title: viewer ? "Kesiapan" : "Peta & fasilitas",
              text: "Lihat lokasi contoh",
              icon: MapPin,
            },
            {
              to: "/mobile/akun",
              title: actor ? "Akun petugas" : "Login petugas",
              text: actor ? actor.role : "Masuk ruang koordinasi",
              icon: UserRound,
            },
          ].map(({ to, title, text, icon: Icon }) => (
            <Link className="mobile-shortcut" key={to} to={to}>
              <Icon size={24} />
              <strong>{title}</strong>
              <small>{text}</small>
            </Link>
          ))}
        </div>
      </section>
      <section className="card mobile-guide">
        <div className="eyebrow">TETAP DALAM KENDALI PETUGAS</div>
        <h2>Setiap tahap, terkoordinasi.</h2>
        <ol>
          <li>Permohonan dicatat dan diperiksa operator.</li>
          <li>Penilaian medis dan keputusan penerbangan dilakukan terpisah.</li>
          <li>Tim, catatan, dan serah terima dicatat pada misi.</li>
        </ol>
        <Link to="/mobile/tentang">
          Tentang prototipe & FAQ <ArrowRight size={15} />
        </Link>
      </section>
    </>
  );
}
export function MobileProtected({
  actor,
  checking,
  section,
}: {
  actor: Actor | null;
  checking: boolean;
  section?: string;
}) {
  const location = useLocation();
  const params = useParams();
  const currentSection = section ?? params.section ?? "";
  if (!mobileSections.includes(currentSection))
    return (
      <section className="card">
        <h1>Halaman tidak ditemukan</h1>
        <Link to="/mobile/akun">Kembali ke modul petugas</Link>
      </section>
    );
  if (checking) return <p role="status">Memeriksa sesi…</p>;
  if (!actor)
    return (
      <Navigate
        to="/mobile/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  if (actor.role === "Viewer pimpinan")
    return <Navigate to="/pimpinan" replace />;
  if (currentSection === "helikopter")
    return <AirOperations actor={actor} mobile key={actor.id} />;
  return <Internal actor={actor} compact section={section} key={actor.id} />;
}
export function MobileLogin({ onLogin }: { onLogin: (a: Actor) => void }) {
  const location = useLocation();
  const from = location.state?.from;
  const destination = mobileDestination(from);
  return <Login onLogin={onLogin} destination={destination} />;
}
export function MobileAccount({
  actor,
  checking,
  logout,
}: {
  actor: Actor | null;
  checking: boolean;
  logout: () => Promise<void>;
}) {
  const context = requestSearch(useLocation().search);
  if (checking) return <p role="status">Memeriksa sesi…</p>;
  return (
    <>
      <div className="mobile-page-title">
        <div className="eyebrow">PROFIL & MODUL</div>
        <h1>Akun</h1>
      </div>
      <section className="card mobile-account">
        <span className="mobile-account-icon">
          <UserRound size={28} />
        </span>
        <h2>{actor?.name ?? "Selamat datang"}</h2>
        <p>
          {actor ? actor.role : "Masuk untuk membuka modul koordinasi petugas."}
        </p>
        {!actor && (
          <Link className="button" to="/mobile/login">
            Login petugas <ArrowRight size={17} />
          </Link>
        )}
        {actor && <span className="badge">Sesi petugas aktif</span>}
      </section>
      {actor && (
        <section className="mobile-menu" aria-label="Modul petugas">
          {["Viewer pimpinan", "Administrator"].includes(actor.role) && (
            <Link to="/pimpinan">
              <House size={20} />
              <span>Pengawasan pimpinan</span>
              <ArrowRight size={16} />
            </Link>
          )}
          {actor.role !== "Viewer pimpinan" &&
            [
              { path: "", label: "Ringkasan koordinasi", icon: House },
              {
                path: "helikopter",
                label: "Pemantauan helikopter",
                icon: Plane,
              },
              {
                path: "permohonan",
                label: "Kelola permohonan",
                icon: ClipboardPlus,
              },
              {
                path: "penilaian",
                label: "Penilaian & catatan",
                icon: ClipboardCheck,
              },
              {
                path: "sumber-daya",
                label: "Kesiapan sumber daya",
                icon: Boxes,
              },
              { path: "laporan", label: "Laporan", icon: FileText },
              { path: "outbox", label: "Outbox & notifikasi", icon: Inbox },
              { path: "pengaturan", label: "Pengaturan", icon: Settings },
            ].map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={"/mobile/operasi" + (path ? "/" + path : "") + context}
              >
                <Icon size={20} />
                <span>{label}</span>
                <ArrowRight size={16} />
              </Link>
            ))}
          <button className="mobile-logout" onClick={() => void logout()}>
            <LogOut size={20} />
            Keluar
          </button>
        </section>
      )}
      <Link className="mobile-info-link" to="/mobile/tentang">
        Tentang prototipe & FAQ
      </Link>
      <Link className="mobile-info-link" to="/">
        Buka tampilan website
      </Link>
    </>
  );
}
