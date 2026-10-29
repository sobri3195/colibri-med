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
import {
  MobileLayout,
  MobileHome,
  MobileProtected,
  MobileLogin,
  MobileAccount,
} from "./pages/Mobile";
import { call, mode } from "./services/api";
import type { Actor } from "./types";
import "./styles.css";
function App() {
  const [actor, setActor] = useState<Actor | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(mode === "connected");
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = /^\/mobile(?:\/|$)/.test(location.pathname);
  const mobileRef = useRef(isMobile);
  mobileRef.current = isMobile;
  const onLogin = (a: Actor) => {
    setError("");
    setActor(a);
  };
  const logout = async () => {
    try {
      if (mode === "connected") await call("auth.logout");
      setActor(null);
      setError("");
      navigate(mobileRef.current ? "/mobile/akun" : "/login");
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
      setError("Sesi kedaluwarsa. Masuk kembali untuk mengirim operasi.");
      navigate(mobileRef.current ? "/mobile/login" : "/login");
    };
    window.addEventListener("colibri-session-expired", expired);
    return () => window.removeEventListener("colibri-session-expired", expired);
  }, [actor, navigate]);
  useEffect(() => {
    if (!actor) return;
    const timer = setTimeout(
      () => {
        setActor(null);
        setError("Sesi kedaluwarsa. Masuk kembali untuk mengirim operasi.");
        navigate(mobileRef.current ? "/mobile/login" : "/login");
      },
      60 * 60 * 1000,
    );
    return () => clearTimeout(timer);
  }, [actor, navigate]);
  return (
    <div className={isMobile ? "app-shell mobile-app" : "app-shell"}>
      <div className="simulation">
        PROTOTIPE SIMULASI — DATA SINTETIS{" "}
        <span>MODE {mode.toUpperCase()}</span>
      </div>
      {!isMobile && (
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
                <Link to="/internal">Dashboard</Link>
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
      {!isMobile && (
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
