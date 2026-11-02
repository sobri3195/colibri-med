import { mode } from "../services/api";
import { displayStatus } from "../lib/presentation";
import type { ReactNode } from "react";
import {
  CircleCheck,
  CircleAlert,
  CircleDashed,
  ArrowRight,
  ClipboardList,
} from "lucide-react";
import { Link } from "react-router-dom";

export function StatusBadge({ status }: { status: string }) {
  const tone =
    /^(Selesai|Dicatat|Rekomendasi Dicatat|Disetujui|Tersedia|Tersedia simulasi|Siap simulasi)$/.test(
      status,
    )
      ? "success"
      : /^(Dibatalkan|Tidak Disetujui|Tidak siap simulasi|Tidak tersedia simulasi|Gagal dikirim|Perlu rekonsiliasi|Konflik perubahan)$/.test(
            status,
          )
        ? "danger"
        : /tertunda|Perlu|Belum|Menunggu/i.test(status)
          ? "attention"
          : "neutral";
  const Icon =
    tone === "success"
      ? CircleCheck
      : tone === "danger" || tone === "attention"
        ? CircleAlert
        : CircleDashed;
  return (
    <span className={`badge status-badge status-${tone}`}>
      <Icon size={14} aria-hidden="true" />
      {displayStatus(status, mode === "demo")}
    </span>
  );
}
export function EmptyState({
  title,
  children,
  to,
  action,
}: {
  title: string;
  children?: ReactNode;
  to?: string;
  action?: string;
}) {
  return (
    <div className="coord-empty">
      <ClipboardList size={26} aria-hidden="true" />
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      {to && action && (
        <Link className="button secondary" to={to}>
          {action}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
export function SectionHeading({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mobile-section-heading">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
