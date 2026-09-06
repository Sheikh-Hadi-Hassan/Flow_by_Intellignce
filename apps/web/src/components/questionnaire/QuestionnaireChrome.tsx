"use client";

import type { ReactNode } from "react";
import { StatusBadge } from "../ui/Display";

export type AutosaveState = "idle" | "saving" | "saved" | "error";

export function AutosaveStatus({
  state,
  error,
}: {
  state: AutosaveState;
  error?: string;
}) {
  if (state === "idle") return null;
  const label =
    state === "saving"
      ? "Saving…"
      : state === "saved"
        ? "Saved"
        : "Save failed";
  const variant =
    state === "error" ? "warning" : state === "saved" ? "success" : "default";
  return (
    <p className="flow-autosave-status" role="status" aria-live="polite">
      <StatusBadge variant={variant}>{label}</StatusBadge>
      {error && <span className="flow-field__error">{error}</span>}
    </p>
  );
}

export function ValidationMessage({
  messages,
}: {
  messages: readonly string[];
}) {
  if (messages.length === 0) return null;
  return (
    <div className="flow-alert flow-alert--warning" role="alert">
      <ul className="flow-compact-list">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}

export function QuestionnaireProgress({
  answered,
  total,
}: {
  answered: number;
  total: number;
}) {
  const percent = total > 0 ? Math.round((answered / total) * 100) : 0;
  return (
    <div className="flow-progress" role="group" aria-label="Questionnaire progress">
      <div className="flow-progress__header">
        <span className="flow-progress__label tabular-nums">
          {answered} of {total} answered — {percent}%
        </span>
      </div>
      <div className="flow-progress__track">
        <div
          className="flow-progress__fill"
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

export function VersionStatusBadge({ status }: { status: string }) {
  const label = status.replaceAll("_", " ");
  const variant =
    status === "published"
      ? "success"
      : status === "draft"
        ? "essential"
        : "default";
  return <StatusBadge variant={variant}>{label}</StatusBadge>;
}

export function EmptyQuestionnaireState({ children }: { children: ReactNode }) {
  return <div className="flow-empty">{children}</div>;
}
