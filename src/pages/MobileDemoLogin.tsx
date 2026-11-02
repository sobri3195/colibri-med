import FlightAccent from "../components/FlightAccent";
import { useState } from "react";
import {
  ArrowRight,
  ClipboardList,
  HeartPulse,
  Plane,
  Stethoscope,
  Hospital,
  Settings2,
  ChartNoAxesCombined,
  Info,
  Wifi,
  WifiOff,
} from "lucide-react";
import BrandMark from "../components/BrandMark";
import { Button } from "../components/DesignSystem";
import { useConnection } from "../features/useConnection";
import { roles, type Role } from "../types";
import "./mobile-login.css";

const details = {
  Operator: [ClipboardList, "Kelola permohonan dan administrasi misi."],
  "Koordinator medis": [HeartPulse, "Tinjau dan catat penilaian medis."],
  "Koordinator penerbangan": [
    Plane,
    "Catat keputusan dan checklist penerbangan.",
  ],
  "Dokter/perawat": [Stethoscope, "Catat kebutuhan pasien dan serah terima."],
  "Rumah sakit penerima": [Hospital, "Koordinasikan penerimaan pasien."],
  Administrator: [Settings2, "Kelola direktori dan sumber daya aplikasi."],
  "Viewer pimpinan": [ChartNoAxesCombined, "Pantau ringkasan kegiatan."],
} as const;

export default function MobileDemoLogin({
  role,
  onRoleChange,
  onEnter,
}: {
  role: Role;
  onRoleChange: (role: Role) => void;
  onEnter: () => void;
}) {
  const { online } = useConnection(null, "/mobile/login");
  const [error, setError] = useState("");
  const ConnectionIcon = online ? Wifi : WifiOff;
  return (
    <section className="demo-login" aria-labelledby="demo-login-title">
      <div className="login-intro">
        <div className="login-brand">
          <BrandMark />
          <div>
            <strong>
              COLIBRI <span>MED</span>
            </strong>
            <p>COLIBRI Air Medical</p>
          </div>
        </div>
        <div className="login-meta">
          <span className="login-demo-badge">Mode demo</span>
          <span className="login-device" role="status">
            <ConnectionIcon size={16} aria-hidden="true" />
            Perangkat {online ? "online" : "offline"}
          </span>
        </div>
        <div className="login-intro-copy">
          <p className="login-kicker">TERHUBUNG UNTUK MENGOORDINASIKAN</p>
          <h1 id="demo-login-title">Masuk ke ruang koordinasi</h1>
          <p>Pilih peran untuk mencoba alur koordinasi evakuasi medis udara.</p>
          <FlightAccent />
        </div>
        <p className="login-device-note">
          Status perangkat hanya menunjukkan konektivitas, bukan status server
          atau sinkronisasi.
        </p>
      </div>
      <div className="login-panel">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setError("");
            try {
              onEnter();
            } catch {
              setError("Belum dapat masuk. Silakan coba kembali.");
            }
          }}
        >
          <fieldset className="login-roles" aria-describedby="demo-role-help">
            <legend>Pilih peran demo</legend>
            <p id="demo-role-help">Jelajahi alur sesuai tugas Anda.</p>
            <div className="login-role-grid">
              {roles.map((value) => {
                const [Icon, description] = details[value];
                return (
                  <label className="login-role" key={value}>
                    <input
                      type="radio"
                      name="demo-role"
                      value={value}
                      checked={role === value}
                      onChange={() => onRoleChange(value)}
                    />
                    <span className="login-role-icon">
                      <Icon size={21} aria-hidden="true" />
                    </span>
                    <span className="login-role-copy">
                      <strong>{value}</strong>
                      <span>{description}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}
          <Button className="login-enter" type="submit">
            <span>Masuk sebagai {role}</span>
            <ArrowRight size={20} aria-hidden="true" />
          </Button>
          <p className="login-demo-note">
            <Info size={18} aria-hidden="true" />
            <span>
              Mode simulasi menggunakan data sintetis. Pemilihan peran ini bukan
              autentikasi akun.
            </span>
          </p>
        </form>
      </div>
    </section>
  );
}
