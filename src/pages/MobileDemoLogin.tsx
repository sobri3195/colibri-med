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

// Decorative generic helicopter: no claim of model or technical accuracy.
function FlightAccent() {
  return (
    <svg
      className="login-flight"
      viewBox="0 0 360 150"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 125C65 125 44 60 108 60s50 65 113 65h127"
        stroke="#a6c6cb"
        strokeWidth="2"
        strokeDasharray="4 7"
      />
      <circle cx="12" cy="125" r="5" fill="#087F8C" />
      <g
        stroke="#102A43"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M177 37h122m-61 0v15m-25 0h39c17 0 38 14 41 29h-67c-13 0-21-8-26-16l-34-9-9-20h-13l4 28 45 14"
          fill="#e7f5f4"
        />
        <path d="M250 54v16h37m-77 11-5 15m59-15 5 15m-75 0h91l9-6" />
        <path d="M230 61v12m-6-6h12" stroke="#087F8C" />
      </g>
    </svg>
  );
}

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
            <p>Koordinasi Medis Udara</p>
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
          <p className="login-kicker">RUANG KOORDINASI</p>
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
          <button className="login-enter" type="submit">
            <span>Masuk sebagai {role}</span>
            <ArrowRight size={20} aria-hidden="true" />
          </button>
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
