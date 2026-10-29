import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { roles, type Actor } from "../types";
import { mode, call } from "../services/api";
export default function Login({
  onLogin,
  destination = "/internal",
}: {
  onLogin: (a: Actor) => void;
  destination?: string;
}) {
  const [role, setRole] = useState(roles[0]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  return (
    <section className="card login">
      <div className="eyebrow">RUANG KOORDINASI</div>
      <h1>Login petugas</h1>
      <p>
        {mode === "demo"
          ? "Akun simulasi lokal. Pergantian peran ini bukan autentikasi layanan connected."
          : "Hanya akun undangan administrator. Tidak ada pendaftaran publik."}
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const data = new FormData(e.currentTarget);
            const actor =
              mode === "demo"
                ? { id: "demo:" + role, name: "Petugas Simulasi", role }
                : await call("auth.login", {
                    username: data.get("username"),
                    password: data.get("password"),
                  });
            onLogin(actor);
            navigate(destination, { replace: true });
          } catch (e) {
            setError(String(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {mode === "demo" ? (
          <label>
            Peran demo
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
            >
              {roles.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
        ) : (
          <>
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
          </>
        )}
        <button disabled={busy}>Masuk</button>
      </form>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
