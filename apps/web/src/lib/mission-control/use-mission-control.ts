"use client";

import { useCallback, useEffect, useState } from "react";

import { decisionHeadline } from "./seed";
import {
  loadMissionDemoState,
  missionDemoDefault,
  readMissionControl,
  saveMissionDemoState,
  type MissionDemoState,
} from "./store";
import type {
  DecisionResolution,
  MissionControlView,
  MissionStateKind,
} from "./types";

export interface MissionControlHandle {
  readonly view: MissionControlView;
  readonly stateKind: MissionStateKind;
  readonly resolutions: Readonly<Record<string, DecisionResolution>>;
  readonly setStateKind: (kind: MissionStateKind) => void;
  readonly resolveDecision: (
    decisionId: string,
    resolution: DecisionResolution,
  ) => void;
}

function viewWithResolutions(
  view: MissionControlView,
  resolutions: Readonly<Record<string, DecisionResolution>>,
): MissionControlView {
  if (view.kind !== "ready") return view;
  const decisions = view.data.decisions.filter(
    (row) => !resolutions[row.id],
  );
  if (decisions.length === view.data.decisions.length) return view;
  if (decisions.length === 0) {
    return {
      kind: "ready",
      data: {
        ...view.data,
        decisions,
        headline: {
          answer: "Nothing needs you yet",
          because: "You cleared every open founder decision.",
          impactLabel: "No open exposure",
          evidence: view.data.headline.evidence,
        },
      },
    };
  }
  return {
    kind: "ready",
    data: {
      ...view.data,
      decisions,
      headline: decisionHeadline(decisions, view.data.headline.because),
    },
  };
}

/**
 * Reads Mission Control through the seed adapter and keeps the demo state in
 * sessionStorage so a reload restores exactly what the founder was looking at.
 */
export function useMissionControl(): MissionControlHandle {
  const [demo, setDemo] = useState<MissionDemoState>(missionDemoDefault);
  const [view, setView] = useState<MissionControlView>({ kind: "loading" });

  useEffect(() => {
    setDemo(loadMissionDemoState());
  }, []);

  useEffect(() => {
    let active = true;
    void readMissionControl(demo).then((next) => {
      if (active) setView(viewWithResolutions(next, demo.resolutions));
    });
    return () => {
      active = false;
    };
  }, [demo]);

  const persist = useCallback((next: MissionDemoState) => {
    setDemo(next);
    saveMissionDemoState(next);
  }, []);

  const setStateKind = useCallback(
    (kind: MissionStateKind) => {
      persist({ stateKind: kind, resolutions: {} });
    },
    [persist],
  );

  const resolveDecision = useCallback(
    (decisionId: string, resolution: DecisionResolution) => {
      setDemo((current) => {
        const next: MissionDemoState = {
          ...current,
          resolutions: { ...current.resolutions, [decisionId]: resolution },
        };
        saveMissionDemoState(next);
        return next;
      });
    },
    [],
  );

  return {
    view,
    stateKind: demo.stateKind,
    resolutions: demo.resolutions,
    setStateKind,
    resolveDecision,
  };
}
