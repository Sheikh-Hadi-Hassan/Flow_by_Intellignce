"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useMissionControl } from "../../lib/mission-control/use-mission-control";
import {
  isMissionDemoWorkspace,
  isMissionQaEnabled,
} from "../../lib/mission-control/store";
import { MISSION_STATE_KINDS, isMissionStateKind } from "../../lib/mission-control/states";
import type { MissionStateKind } from "../../lib/mission-control/types";
import { DominantAnswer } from "./DominantAnswer";
import {
  MissionErrorState,
  MissionLoading,
  MissionRestrictedState,
} from "./MissionStates";
import { OperationalField } from "./OperationalField";
import { SignalStrip } from "./SignalStrip";

const STATE_LABELS: Record<MissionStateKind, string> = {
  populated: "Populated",
  empty: "Empty",
  loading: "Loading",
  error: "Error",
  restricted: "Restricted",
  dense: "Dense",
};

/** Demo-only switch so every seeded state is reachable for review and capture. */
function StateSwitcher({
  current,
  onSelect,
}: {
  current: MissionStateKind;
  onSelect: (kind: MissionStateKind) => void;
}) {
  return (
    <div
      className="flow-mc__inner"
      data-testid="mission-demo-switcher"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "var(--space-2)",
        padding: "var(--space-6) var(--mc-gutter) var(--space-4)",
        borderTop: "1px solid var(--color-border)",
      }}
    >
      <span className="flow-mc-block__title">Demo states</span>
      {MISSION_STATE_KINDS.map((kind) => (
        <button
          key={kind}
          type="button"
          className={
            kind === current
              ? "flow-btn flow-btn--secondary flow-btn--sm"
              : "flow-btn flow-btn--ghost flow-btn--sm"
          }
          aria-pressed={kind === current}
          onClick={() => onSelect(kind)}
        >
          {STATE_LABELS[kind]}
        </button>
      ))}
    </div>
  );
}

export function MissionControlScreen({ workspace }: { workspace: string }) {
  const { view, stateKind, setStateKind } = useMissionControl();
  const [showQaSwitcher, setShowQaSwitcher] = useState(false);
  const isDemo = isMissionDemoWorkspace(workspace);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectDemoState = (kind: MissionStateKind) => {
    setStateKind(kind);
    const params = new URLSearchParams(searchParams.toString());
    params.set("state", kind);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Lets screenshot runs and shared links land directly on a specific state.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("state");
    if (isMissionStateKind(requested)) setStateKind(requested);
    setShowQaSwitcher(isMissionQaEnabled());
  }, [setStateKind]);

  return (
    <div className="flow-mc">
      <a href="#mc-main" className="skip-link">
        Skip to Bird Eye View
      </a>

      <main id="mc-main" className="flow-mc__main">
        {view.kind === "loading" ? <MissionLoading /> : null}

        {view.kind === "error" ? (
          <MissionErrorState
            error={view.error}
            workspace={workspace}
            onRetry={() => setStateKind("populated")}
          />
        ) : null}

        {view.kind === "restricted" ? (
          <MissionRestrictedState
            restriction={view.restriction}
            viewer={view.viewer}
            workspace={workspace}
          />
        ) : null}

        {view.kind === "ready" ? (
          <>
            <div className="flow-mc__inner">
              <DominantAnswer
                headline={view.data.headline}
                generatedAtLabel={view.data.generatedAtLabel}
              />
            </div>
            <div className="flow-mc__inner">
              <SignalStrip metrics={view.data.metrics} />
              <OperationalField data={view.data} />
            </div>
          </>
        ) : null}

        {isDemo && showQaSwitcher ? (
          <StateSwitcher current={stateKind} onSelect={selectDemoState} />
        ) : null}
      </main>
    </div>
  );
}
