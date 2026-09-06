"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { type HistoryMode } from "../../../lib/mission-control/history";
import {
  isMissionDemoWorkspace,
  isMissionQaEnabled,
} from "../../../lib/mission-control/store";
import {
  MISSION_STATE_KINDS,
  isMissionStateKind,
} from "../../../lib/mission-control/states";
import type { MissionStateKind } from "../../../lib/mission-control/types";
import { useMissionControl } from "../../../lib/mission-control/use-mission-control";
import {
  applyAccent,
  loadSession,
  DEFAULT_ACCENT,
} from "../../../lib/prototype/storage";
import {
  MissionErrorState,
  MissionRestrictedState,
} from "../MissionStates";
import { BusinessImpactHero } from "./BusinessImpactHero";
import { CANVAS_ACCENTS } from "./CanvasHeader";
import { DecisionQueuePreview } from "./DecisionQueuePreview";
import { OperatingBody } from "./OperatingBody";
import { OperatingHistoryChart } from "./OperatingHistoryChart";
import { SignalLedger } from "./SignalLedger";

const STATE_LABELS: Record<MissionStateKind, string> = {
  populated: "Populated",
  empty: "Empty",
  loading: "Loading",
  error: "Error",
  restricted: "Restricted",
  dense: "Dense",
};

function CanvasStateSwitcher({
  current,
  onSelect,
}: {
  current: MissionStateKind;
  onSelect: (kind: MissionStateKind) => void;
}) {
  return (
    <div className="flow-canvas-demo" data-testid="mission-demo-switcher">
      <span className="flow-canvas-microlabel">Demo states</span>
      {MISSION_STATE_KINDS.map((kind) => (
        <button
          key={kind}
          type="button"
          className={
            kind === current
              ? "flow-canvas-demo__btn flow-canvas-demo__btn--on"
              : "flow-canvas-demo__btn"
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

/**
 * MC-02R canvas. 1440 light/dark composition is locked. Mobile layout lives
 * entirely in the canvas stylesheet's max-width query.
 */
export function MissionControlCanvas({ workspace }: { workspace: string }) {
  const { view, stateKind, setStateKind, resolveDecision } = useMissionControl();
  const [mode, setMode] = useState<HistoryMode>("impact");
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

  useEffect(() => {
    applyAccent(CANVAS_ACCENTS[0].value);
    return () => {
      applyAccent(loadSession()?.accentColor ?? DEFAULT_ACCENT);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("state");
    if (isMissionStateKind(requested)) setStateKind(requested);
    setShowQaSwitcher(isMissionQaEnabled());
  }, [setStateKind]);

  const hasLedger = view.kind === "ready" && view.data.metrics.length > 0;

  return (
    <div className="flow-canvas">
      <a href="#canvas-main" className="skip-link">
        Skip to Bird Eye View
      </a>

      <main id="canvas-main" className="flow-canvas__main">
        {view.kind === "loading" ? (
          <div
            className="flow-canvas__sheet"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <span className="sr-only">Loading Bird Eye View</span>
            <div className="flow-canvas-load">
              <span className="flow-mc-skeleton flow-canvas-load__line flow-canvas-load__line--sm" />
              <span className="flow-mc-skeleton flow-canvas-load__line flow-canvas-load__line--hero" />
              <span className="flow-mc-skeleton flow-canvas-load__line" />
              <span className="flow-mc-skeleton flow-canvas-load__plot" />
            </div>
          </div>
        ) : null}

        {view.kind === "error" ? (
          <MissionErrorState
            error={view.error}
            workspace={workspace}
            onRetry={() => window.location.reload()}
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
          <div className="flow-canvas__sheet">
            <div className="flow-canvas__viewport">
              <div className="flow-canvas__frame">
                <p className="flow-canvas__context">
                  <span className="flow-canvas__context-title">
                    Bird Eye View
                  </span>
                  <span aria-hidden>·</span>
                  <span>{view.data.generatedAtLabel}</span>
                </p>

                <BusinessImpactHero
                  data={view.data}
                  mode={mode}
                  onModeChange={setMode}
                />

                <div className="flow-canvas__stage">
                  {hasLedger ? <OperatingHistoryChart mode={mode} /> : null}
                </div>
              </div>

              {hasLedger ? (
                <SignalLedger
                  metrics={view.data.metrics}
                  invoices={view.data.invoices}
                  capacity={view.data.capacity}
                />
              ) : null}
            </div>

            <DecisionQueuePreview
              decisions={view.data.decisions}
              onResolve={resolveDecision}
            />
            <OperatingBody data={view.data} />
          </div>
        ) : null}

        {isDemo && showQaSwitcher ? (
          <div className="flow-canvas__sheet">
            <CanvasStateSwitcher
              current={stateKind}
              onSelect={selectDemoState}
            />
          </div>
        ) : null}
      </main>
    </div>
  );
}
