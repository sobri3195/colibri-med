import { Link } from "react-router-dom";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "tertiary";
}) {
  return (
    <button
      className={`${variant === "primary" ? "" : variant} ${className}`}
      {...props}
    />
  );
}
export function DataCard({
  className = "",
  ...props
}: HTMLAttributes<HTMLElement>) {
  return <article className={`card data-card ${className}`} {...props} />;
}
export function PageHeading({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {children}
      </div>
      {action}
    </div>
  );
}
export function FormSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <fieldset className="form-section">
      <legend>
        <Icon size={18} aria-hidden="true" />
        {title}
      </legend>
      {children}
    </fieldset>
  );
}
export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="toolbar filter-bar">{children}</div>;
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="design-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function NavigationLink({
  to,
  active,
  label,
  icon: Icon,
}: {
  to: string;
  active: boolean;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      to={to}
      className={active ? "bottom-link active" : "bottom-link"}
      aria-current={active ? "page" : undefined}
    >
      <span className="bottom-icon">
        <Icon size={22} aria-hidden="true" />
      </span>
      <span>{label}</span>
    </Link>
  );
}
