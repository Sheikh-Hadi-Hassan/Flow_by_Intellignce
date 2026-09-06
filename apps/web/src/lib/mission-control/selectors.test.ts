import { describe, expect, it } from "vitest";

import {
  executiveInsight,
  formatMetricValue,
  metricById,
  ALL_METRIC_IDS,
  SURFACE_METRIC_IDS,
} from "./selectors";
import { missionControlSeed } from "./seed";
import { MISSION_STATE_KINDS, missionViewForState } from "./states";

describe("Mission Control V2 selectors", () => {
  it("covers every V1 metric exactly once", () => {
    const ids = missionControlSeed.metrics.map((row) => row.id);
    expect([...ids].sort()).toEqual([...ALL_METRIC_IDS].sort());
    expect(new Set(ids).size).toBe(ids.length);
    expect(SURFACE_METRIC_IDS).toHaveLength(4);
  });

  it("formats money and hours without internal units", () => {
    for (const metric of missionControlSeed.metrics) {
      const text = formatMetricValue(metric);
      expect(text).not.toMatch(/bps|minor|minutes/i);
      expect(metricById(missionControlSeed, metric.id)).toBe(metric);
    }
  });

  it.each(MISSION_STATE_KINDS)("%s snapshot metrics match the view", (kind) => {
    const view = missionViewForState(kind);
    if (view.kind !== "ready") return;
    for (const metric of view.data.metrics) {
      expect(formatMetricValue(metric)).not.toMatch(/bps|minor|minutes/i);
    }
    const surface = SURFACE_METRIC_IDS.map((id) => metricById(view.data, id)).filter(Boolean);
    const extras = view.data.metrics.filter(
      (row) => !SURFACE_METRIC_IDS.includes(row.id as (typeof SURFACE_METRIC_IDS)[number]),
    );
    expect(surface.length + extras.length).toBe(view.data.metrics.length);
  });

  it("summarises exposure from the same decision snapshot the canvas renders", () => {
    const text = executiveInsight(missionControlSeed);
    expect(text).toBeDefined();
    expect(text).toMatch(/^3 decisions hold \$356\.0K in exposure, led by Meridian Health\.$/);
  });

  it("returns undefined when there are no decisions", () => {
    expect(executiveInsight({ ...missionControlSeed, decisions: [] })).toBeUndefined();
  });
});
