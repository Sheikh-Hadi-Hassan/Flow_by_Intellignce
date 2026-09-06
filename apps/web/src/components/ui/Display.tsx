import type { ReactNode } from "react";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`flow-wordmark ${className}`} aria-label="Flow">
      Flow
    </span>
  );
}

export function StatusBadge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?:
    | "default"
    | "demo"
    | "success"
    | "warning"
    | "danger"
    | "essential";
}) {
  return (
    <span className={`flow-badge flow-badge--${variant}`}>{children}</span>
  );
}

export function ProofLabel({
  type = "inference",
  children,
}: {
  type?: "fact" | "inference" | "recommendation";
  children: ReactNode;
}) {
  return (
    <span className={`flow-proof-label flow-proof-label--${type}`}>
      {children}
    </span>
  );
}

export function InlineAlert({
  children,
  variant = "info",
}: {
  children: ReactNode;
  variant?: "info" | "warning";
}) {
  return <div className={`flow-alert flow-alert--${variant}`}>{children}</div>;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="flow-section-header">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </header>
  );
}

export function ProgressBar({
  value,
  label,
  help,
}: {
  value: number;
  label: string;
  help?: string;
}) {
  return (
    <div className="flow-progress" role="group" aria-label={label}>
      <div className="flow-progress__header">
        <span className="flow-progress__label tabular-nums">
          {label} — {value}%
        </span>
        {help && <p className="flow-progress__help">{help}</p>}
      </div>
      <div className="flow-progress__track">
        <div
          className="flow-progress__fill"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        />
      </div>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="flow-empty">{children}</div>;
}
