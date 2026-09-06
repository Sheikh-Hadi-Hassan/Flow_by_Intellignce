"use client";

import Link from "next/link";

import { joinReadable, permissionLabel } from "../../lib/mission-control/format";
import type {
  MissionError,
  MissionRestriction,
  MissionViewer,
} from "../../lib/mission-control/types";

function SkeletonRow({ width, height }: { width: string; height: string }) {
  return (
    <span
      className="flow-mc-skeleton"
      style={{ display: "block", width, height }}
      aria-hidden
    />
  );
}

/** Mirrors the real layout so the screen does not jump when data lands. */
export function MissionLoading() {
  return (
    <div
      className="flow-mc__inner"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading Bird Eye View</span>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
          padding: "var(--space-10) 0 var(--space-8)",
        }}
      >
        <SkeletonRow width="180px" height="12px" />
        <SkeletonRow width="min(520px, 90%)" height="48px" />
        <SkeletonRow width="min(640px, 100%)" height="16px" />
        <SkeletonRow width="min(560px, 95%)" height="16px" />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "var(--space-4)",
          paddingBottom: "var(--space-8)",
        }}
      >
        {Array.from({ length: 8 }, (_, index) => (
          <SkeletonRow key={index} width="100%" height="72px" />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
        }}
      >
        {Array.from({ length: 5 }, (_, index) => (
          <SkeletonRow key={index} width="100%" height="56px" />
        ))}
      </div>
    </div>
  );
}

export function MissionErrorState({
  error,
  workspace,
  onRetry,
}: {
  error: MissionError;
  workspace: string;
  onRetry: () => void;
}) {
  return (
    <div className="flow-mc__inner">
      <div className="flow-mc-state" role="alert">
        <h1 className="flow-mc-state__title">{error.title}</h1>
        <p className="flow-mc-state__detail">{error.detail}</p>
        <div className="flow-mission__actions">
          <button
            type="button"
            className="flow-btn flow-btn--primary"
            onClick={onRetry}
          >
            Retry
          </button>
          <Link
            href={`/${workspace}/admin/opportunities`}
            className="flow-btn flow-btn--secondary"
          >
            Open pipeline
          </Link>
        </div>
        <p className="flow-mc-state__meta">Reference {error.correlationId}</p>
      </div>
    </div>
  );
}

export function MissionRestrictedState({
  restriction,
  viewer,
  workspace,
}: {
  restriction: MissionRestriction;
  viewer: MissionViewer;
  workspace: string;
}) {
  return (
    <div className="flow-mc__inner">
      <div className="flow-mc-state">
        <h1 className="flow-mc-state__title">{restriction.title}</h1>
        <p className="flow-mc-state__detail">{restriction.reason}</p>
        <p className="flow-mc-state__detail">
          You are signed in as {viewer.person.name} ({viewer.person.role}), which
          covers {joinReadable(viewer.permissions.map(permissionLabel))}.
        </p>
        <div className="flow-mission__actions">
          <Link
            href={`/${workspace}/work`}
            className="flow-btn flow-btn--primary"
          >
            Go to My Work
          </Link>
          <Link
            href={`/${workspace}/admin/opportunities`}
            className="flow-btn flow-btn--secondary"
          >
            Open pipeline
          </Link>
        </div>
        <p className="flow-mc-state__meta">
          Needs {permissionLabel(restriction.missingPermission)} ·{" "}
          {restriction.contactLabel}
        </p>
      </div>
    </div>
  );
}
