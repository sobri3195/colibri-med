import React, { useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { Plane } from "lucide-react";
import { Home, Info, RequestForm } from "./pages/Public";
import Login from "./pages/Login";
import Internal from "./pages/Internal";
import Leadership from "./pages/Leadership";
import {
  MobileLayout,
  MobileHome,
  MobileProtected,
  MobileLogin,
  MobileAccount,
} from "./pages/Mobile";
import { call, mode } from "./services/api";
import type { Actor } from "./types";
import {
  readDemoSession,
  saveDemoSession,
  clearDemoSession,
} from "./services/session";
import "./styles.css";
function App() {
  const [initialDemo] = useState(() =>
    mode === "demo" ? readDemoSession() : null,
  );
  const [actor, setActor] = useState<Actor | null>(initialDemo?.actor ?? null);
  const [expiresAt, setExpiresAt] = useState(initialDemo?.expiresAt ?? 0);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(mode === "connected");
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = /^\/mobile(?:\/|$)/.test(location.pathname);
  const isLeadership = /^\/pimpinan(?:\/|$)/.test(location.pathname);
  const mobileRef = useRef(isMobile);
  mobileRef.current = isMobile;
  const leadershipRef = useRef(isLeadership);
  leadershipRef.current = isLeadership;
  const onLogin = (a: Actor) => {
    setError("");
    setExpiresAt(
      mode === "demo" ? saveDemoSession(a).expiresAt : Date.now() + 3600000,
    );
    setActor(a);
  };
  const logout = async () => {
    try {
      if (mode === "connected") await call("auth.logout");
      if (mode === "demo") clearDemoSession();
      setActor(null);
      setError("");
      navigate(
        leadershipRef.current
          ? "/pimpinan"
          : mobileRef.current
            ? "/mobile/akun"
            : "/login",
      );
    } catch (e) {
      setError(String(e));
    }
  };
  useEffect(() => {
    if (mode === "connected")
      void call("auth.me")
        .then(setActor)
        .catch(() => setActor(null))
        .finally(() => setChecking(false));
  }, []);
  useEffect(() => {
    if (!actor) return;
    const expired = () => {
      setActor(null);
      if (mode === "demo") clearDemoSession();
      setError("Sesi kedaluwarsa. Masuk kembali untuk mengirim operasi.");
      navigate(
        leadershipRef.current
          ? "/pimpinan"
          : mobileRef.current
            ? "/mobile/login"
            : "/login",
      );
    };
    window.addEventListener("colibri-session-expired", expired);
    return () => window.removeEventListener("colibri-session-expired", expired);
  }, [actor, navigate]);
  useEffect(() => {
    if (!actor) return;
    const timer = setTimeout(
      () => {
        setActor(null);
        if (mode === "demo") clearDemoSession();
        setError("Sesi kedaluwarsa. Masuk kembali untuk mengirim operasi.");
        navigate(
          leadershipRef.current
            ? "/pimpinan"
            : mobileRef.current
              ? "/mobile/login"
              : "/login",
        );
      },
      mode === "demo" ? Math.max(0, expiresAt - Date.now()) : 60 * 60 * 1000,
    );
    return () => clearTimeout(timer);
  }, [actor, navigate, expiresAt]);
  return (
    <div
      className={
        isLeadership
          ? "app-shell mobile-app leadership-app"
          : isMobile
            ? "app-shell mobile-app"
            : "app-shell"
      }
    >
      <div className="simulation">
        PROTOTIPE SIMULASI — DATA SINTETIS{" "}
        <span>MODE {mode.toUpperCase()}</span>
      </div>
      {!isMobile && !isLeadership && (
        <header>
          <Link className="brand" to="/">
            <Plane size={30} />
            <div>
              COLIBRI <b>MED</b>
              <small>KOORDINASI EVAKUASI MEDIS UDARA</small>
            </div>
          </Link>
          <nav>
            <Link to="/tentang">Tentang & FAQ</Link>
            <Link to="/permohonan">Permohonan</Link>
            {actor ? (
              <>
                <Link
                  to={
                    actor.role === "Viewer pimpinan" ? "/pimpinan" : "/internal"
                  }
                >
                  Dashboard
                </Link>
                <button className="secondary" onClick={() => void logout()}>
                  Keluar
                </button>
              </>
            ) : (
              <Link className="button small" to="/login">
                Login petugas
              </Link>
            )}
          </nav>
        </header>
      )}
      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}
      <main>
        <Routes>
          <Route
            path="/pimpinan/:section?"
            element={
              <Leadership
                actor={actor}
                checking={checking}
                logout={logout}
                onLogin={onLogin}
              />
            }
          />
          <Route path="/mobile" element={<MobileLayout actor={actor} />}>
            <Route index element={<MobileHome actor={actor} />} />
            <Route
              path="permohonan"
              element={
                <RequestForm key={actor?.id ?? "public"} actor={actor} />
              }
            />
            <Route
              path="misi"
              element={
                <MobileProtected
                  actor={actor}
                  checking={checking}
                  section="misi"
                />
              }
            />
            <Route
              path="peta"
              element={
                <MobileProtected
                  actor={actor}
                  checking={checking}
                  section="fasilitas"
                />
              }
            />
            <Route
              path="operasi/:section?"
              element={<MobileProtected actor={actor} checking={checking} />}
            />
            <Route
              path="akun"
              element={
                <MobileAccount
                  actor={actor}
                  checking={checking}
                  logout={logout}
                />
              }
            />
            <Route path="login" element={<MobileLogin onLogin={onLogin} />} />
            <Route path="tentang" element={<Info />} />
            <Route
              path="*"
              element={
                <section className="card">
                  <h1>Halaman tidak ditemukan</h1>
                  <Link to="/mobile">Kembali ke beranda mobile</Link>
                </section>
              }
            />
          </Route>
          <Route path="/" element={<Home />} />
          <Route path="/tentang" element={<Info />} />
          <Route
            path="/permohonan"
            element={<RequestForm key={actor?.id ?? "public"} actor={actor} />}
          />
          <Route path="/login" element={<Login onLogin={onLogin} />} />
          <Route
            path="/internal/:section?"
            element={
              checking ? (
                <p role="status">Memeriksa sesi…</p>
              ) : actor?.role === "Viewer pimpinan" ? (
                <Navigate to="/pimpinan" replace />
              ) : actor ? (
                <Internal key={actor.id} actor={actor} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="*"
            element={
              <section className="card">
                <h1>Halaman tidak ditemukan</h1>
                <Link to="/">Kembali ke beranda</Link>
              </section>
            }
          />
        </Routes>
      </main>
      {!isMobile && !isLeadership && (
        <footer>
          <strong>COLIBRI MED</strong>
          <p>
            Prototipe usulan • Seluruh data sintetis • Bukan layanan darurat
            resmi
          </p>
          <small>
            Penilaian medis dan persetujuan penerbangan dilakukan petugas
            berwenang.
          </small>
        </footer>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
