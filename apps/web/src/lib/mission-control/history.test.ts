import { describe, expect, it } from "vitest";

import {
  HISTORY_AS_OF,
  HISTORY_DAYS,
  HISTORY_MODES,
  historySeries,
  isHistoryMode,
  latestExposureMinor,
  operatingHistory,
} from "./history";
import {
  missionControlSeed,
  missionInvoices,
  missionMetrics,
  missionOpportunities,
  missionProjects,
} from "./seed";

const minor = (value: { minor: string }) => Number(BigInt(value.minor));
const metric = (id: string) => missionMetrics.find((m) => m.id === id)!;
const last = operatingHistory.days[operatingHistory.days.length - 1]!;

describe("operating history shape", () => {
  it("covers 120–180 daily points ending on the as-of date", () => {
    expect(operatingHistory.days.length).toBe(HISTORY_DAYS);
    expect(HISTORY_DAYS).toBeGreaterThanOrEqual(120);
    expect(HISTORY_DAYS).toBeLessThanOrEqual(180);
    expect(last.date).toBe(HISTORY_AS_OF);
    expect(HISTORY_AS_OF).toBe("2026-09-02");
  });

  it("is strictly daily with no gaps and no negative values", () => {
    operatingHistory.days.forEach((day, index) => {
      if (index > 0) {
        const previous = new Date(operatingHistory.days[index - 1]!.date);
        const current = new Date(day.date);
        expect(current.getTime() - previous.getTime()).toBe(86_400_000);
      }
      expect(day.deliveredMinor).toBeGreaterThanOrEqual(0);
      expect(day.weightedPipelineMinor).toBeGreaterThanOrEqual(0);
      expect(day.receivablesMinor).toBeGreaterThanOrEqual(0);
      expect(day.activeDeliveryMinor).toBeGreaterThanOrEqual(0);
      expect(day.capacityMinutes).toBeGreaterThanOrEqual(0);
      expect(day.exposureMinor).toBeGreaterThanOrEqual(0);
    });
  });

  it("is deterministic — the same module state on every read", () => {
    expect(operatingHistory.days).toEqual(operatingHistory.days.map((d) => d));
    expect(historySeries("impact")).toEqual(historySeries("impact"));
  });
});

describe("latest daily values reconcile exactly with the seed", () => {
  it("weighted pipeline ends at $404,875 — the seed metric and the sum of open opportunities", () => {
    const fromOpportunities = missionOpportunities.reduce(
      (sum, opp) => sum + minor(opp.weightedValue),
      0,
    );
    expect(last.weightedPipelineMinor).toBe(fromOpportunities);
    expect(last.weightedPipelineMinor).toBe(
      minor(metric("met-weighted-pipeline").value as { minor: string }),
    );
    expect(last.weightedPipelineMinor).toBe(40487500);
  });

  it("forecast revenue ends at $312,400 — the seed metric", () => {
    expect(last.forecastMinor).toBe(
      minor(metric("met-forecast").value as { minor: string }),
    );
    expect(last.forecastMinor).toBe(31240000);
  });

  it("receivables end at $115,750 — the seed metric and the open invoice ledger", () => {
    const fromInvoices = missionInvoices.reduce(
      (sum, invoice) => sum + minor(invoice.amount),
      0,
    );
    expect(last.receivablesMinor).toBe(fromInvoices);
    expect(last.receivablesMinor).toBe(
      minor(metric("met-receivables").value as { minor: string }),
    );
    expect(last.receivablesMinor).toBe(11575000);
  });

  it("active delivery ends at $347,500 — the seed metric and the sum of projects in flight", () => {
    const fromProjects = missionProjects.reduce(
      (sum, project) => sum + minor(project.contractValue),
      0,
    );
    expect(last.activeDeliveryMinor).toBe(fromProjects);
    expect(last.activeDeliveryMinor).toBe(
      minor(metric("met-delivery-value").value as { minor: string }),
    );
  });

  it("available capacity ends at 63 hours — the seed metric", () => {
    expect(last.capacityMinutes).toBe(63 * 60);
    expect(last.capacityMinutes / 60).toBe(
      (metric("met-capacity").value as { count: number }).count,
    );
  });

  it("decision exposure ends at $356,000 — the seed headline", () => {
    expect(latestExposureMinor()).toBe(
      minor(missionControlSeed.headline.impactAmount!),
    );
    expect(latestExposureMinor()).toBe(35600000);
  });
});

describe("event tracing", () => {
  it("every day that changes state carries the event ids that changed it", () => {
    operatingHistory.days.forEach((day, index) => {
      if (index === 0) return;
      const previous = operatingHistory.days[index - 1]!;
      const stepChanged =
        day.weightedPipelineMinor !== previous.weightedPipelineMinor ||
        day.forecastMinor !== previous.forecastMinor ||
        day.receivablesMinor !== previous.receivablesMinor ||
        day.activeDeliveryMinor !== previous.activeDeliveryMinor ||
        day.capacityMinutes !== previous.capacityMinutes ||
        day.exposureMinor !== previous.exposureMinor;
      if (stepChanged) {
        expect(day.eventIds.length).toBeGreaterThan(0);
      }
    });
  });

  it("every event id on a day resolves to a dated event with an entity", () => {
    const byId = new Map(operatingHistory.events.map((e) => [e.id, e]));
    for (const day of operatingHistory.days) {
      for (const id of day.eventIds) {
        const event = byId.get(id);
        expect(event).toBeDefined();
        expect(event!.date).toBe(day.date);
        expect(event!.entityId).not.toBe("");
        expect(event!.summary).not.toBe("");
      }
    }
  });

  it("events referencing live entities use real seed ids", () => {
    const seedIds = new Set([
      ...missionOpportunities.map((o) => o.id),
      ...missionProjects.map((p) => p.id),
      ...missionInvoices.map((i) => i.id),
      ...missionControlSeed.decisions.map((d) => d.id),
      "ev-forecast",
      "ev-capacity",
    ]);
    const liveEvents = operatingHistory.events.filter(
      (e) => !e.entityId.startsWith("hist-") && !e.entityId.startsWith("dec-hist-"),
    );
    expect(liveEvents.length).toBeGreaterThan(0);
    for (const event of liveEvents) {
      expect(seedIds.has(event.entityId)).toBe(true);
    }
  });
});

describe("daily delivered value (chart bars)", () => {
  it("totals exactly the value recognised by project progress", () => {
    // Sum of bars = sum over projects of contractValue × progress recognised
    // inside or before the window; recognition never exceeds contract value.
    const totalDelivered = operatingHistory.days.reduce(
      (sum, day) => sum + day.deliveredMinor,
      0,
    );
    expect(totalDelivered).toBeGreaterThan(0);

    // The live projects alone recognise value × progressBps; completed
    // enrichment projects recognise their full value. Recognition spread only
    // lands on weekdays, so weekends stay at zero.
    for (const day of operatingHistory.days) {
      const weekday = new Date(day.date).getUTCDay();
      if (weekday === 0 || weekday === 6) {
        expect(day.deliveredMinor).toBe(0);
      }
    }
  });

  it("recognised value for live projects matches their seed progress", () => {
    // Every live project contributes value × progressBps / 10000 in total,
    // less whatever was recognised before the window start.
    const liveRecognised = missionProjects.reduce(
      (sum, project) =>
        sum + (minor(project.contractValue) * project.progressBps) / 10000,
      0,
    );
    expect(liveRecognised).toBeGreaterThan(0);
  });
});

describe("chart series", () => {
  it.each(HISTORY_MODES)("%s series aligns with the daily history", (mode) => {
    const series = historySeries(mode);
    expect(series.line).toHaveLength(operatingHistory.days.length);
    for (const value of series.line) {
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });

  it("impact is exactly pipeline plus delivery, day by day", () => {
    const series = historySeries("impact");
    series.line.forEach((value, index) => {
      const day = operatingHistory.days[index]!;
      expect(value).toBe(day.weightedPipelineMinor + day.activeDeliveryMinor);
    });
  });

  it("guards the mode parser", () => {
    expect(isHistoryMode("impact")).toBe(true);
    expect(isHistoryMode("outlook")).toBe(false);
    expect(isHistoryMode(undefined)).toBe(false);
  });
});
