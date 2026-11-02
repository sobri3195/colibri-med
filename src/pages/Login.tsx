import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { type Actor, type Role } from "../types";
import { mode, call } from "../services/api";
import MobileDemoLogin from "./MobileDemoLogin";
export default function Login({
  onLogin,
  destination = "/internal",
  initialRole = "Operator",
}: {
  onLogin: (a: Actor) => void;
  destination?: string;
  initialRole?: Role;
  mobile?: boolean;
}) {
  const [role, setRole] = useState(initialRole);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  if (mode === "demo")
    return (
      <MobileDemoLogin
        role={role}
        onRoleChange={setRole}
        onEnter={() => {
          onLogin({ id: "demo:" + role, name: "Petugas Simulasi", role });
          navigate(
            role === "Viewer pimpinan" && destination === "/internal"
              ? "/pimpinan"
              : destination,
            { replace: true },
          );
        }}
      />
    );
  return (
    <section className="card login">
      <div className="eyebrow">RUANG KOORDINASI</div>
      <h1>Login petugas</h1>
      <p>Hanya akun undangan administrator. Tidak ada pendaftaran publik.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const data = new FormData(e.currentTarget);
            const actor = await call("auth.login", {
              username: data.get("username"),
              password: data.get("password"),
            });
            onLogin(actor);
            navigate(
              actor.role === "Viewer pimpinan" && destination === "/internal"
                ? "/pimpinan"
                : destination,
              { replace: true },
            );
          } catch (e) {
            setError(String(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Nama pengguna
          <input
            name="username"
            autoComplete="username"
            required
            maxLength={100}
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={200}
          />
        </label>
        <button disabled={busy}>Masuk</button>
      </form>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
