/**
 * Isolated demo store for Mission Control.
 *
 * Own sessionStorage key, separate from the commercial demo store, so seeding
 * or resetting Mission Control cannot disturb the questionnaire and lifecycle
 * demo state. Only reachable for the Northstar demo slug.
 */

import { NORTHSTAR_SLUG } from "../prototype/defaults";
import { isMissionStateKind, missionViewForState } from "./states";
import type {
  DecisionResolution,
  MissionControlView,
  MissionStateKind,
} from "./types";

export const MISSION_CONTROL_STORAGE_KEY = "flow-mission-control-demo-v1";

export interface MissionDemoState {
  readonly stateKind: MissionStateKind;
  /** Decision id → what the founder did with it, so a reload keeps the result. */
  readonly resolutions: Readonly<Record<string, DecisionResolution>>;
}

export const missionDemoDefault: MissionDemoState = {
  stateKind: "populated",
  resolutions: {},
};

export function isMissionDemoWorkspace(slug: string): boolean {
  return slug === NORTHSTAR_SLUG;
}

/** Visual demo switcher is QA-only. `?state=` still works without it. */
export function isMissionQaEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("qa") === "1";
}

function isResolution(value: unknown): value is DecisionResolution {
  return value === "approved" || value === "revised" || value === "rejected";
}

/** Tolerates hand-edited or stale storage by falling back field by field. */
export function parseMissionDemoState(raw: string | null): MissionDemoState {
  if (!raw) return missionDemoDefault;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return missionDemoDefault;
  }
  if (typeof parsed !== "object" || parsed === null) return missionDemoDefault;

  const record = parsed as Record<string, unknown>;
  const stateKind = isMissionStateKind(record.stateKind)
    ? record.stateKind
    : missionDemoDefault.stateKind;

  const resolutions: Record<string, DecisionResolution> = {};
  if (typeof record.resolutions === "object" && record.resolutions !== null) {
    for (const [key, value] of Object.entries(
      record.resolutions as Record<string, unknown>,
    )) {
      if (isResolution(value)) resolutions[key] = value;
    }
  }

  return { stateKind, resolutions };
}

export function loadMissionDemoState(): MissionDemoState {
  if (typeof window === "undefined") return missionDemoDefault;
  try {
    return parseMissionDemoState(
      window.sessionStorage.getItem(MISSION_CONTROL_STORAGE_KEY),
    );
  } catch {
    return missionDemoDefault;
  }
}

const listeners = new Set<() => void>();

export function subscribeMissionDemo(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function saveMissionDemoState(state: MissionDemoState): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      MISSION_CONTROL_STORAGE_KEY,
      JSON.stringify(state),
    );
  } catch {
    // Storage disabled or full — the screen still renders from the seed.
  }
  listeners.forEach((listener) => listener());
}

export function clearMissionDemoState(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(MISSION_CONTROL_STORAGE_KEY);
  } catch {
    // Nothing to recover from; the next load falls back to the seed.
  }
}

/**
 * The seed adapter MC-08 replaces. Async so swapping in a real read API is a
 * body change, not a signature change.
 */
export function readMissionControl(
  state: MissionDemoState,
): Promise<MissionControlView> {
  return Promise.resolve(missionViewForState(state.stateKind));
}
