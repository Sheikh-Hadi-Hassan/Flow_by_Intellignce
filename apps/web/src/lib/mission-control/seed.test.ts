import { describe, expect, it } from "vitest";

import { formatMoney, formatMoneyCompact } from "./format";
import { missionControlSeed } from "./seed";
import {
  MISSION_STATE_KINDS,
  missionViewForState,
  isMissionStateKind,
} from "./states";
import {
  missionDemoDefault,
  parseMissionDemoState,
  readMissionControl,
} from "./store";

describe("mission control seed", () => {
  it("meets the MC-01 record counts", () => {
    expect(missionControlSeed.opportunities).toHaveLength(8);
    expect(missionControlSeed.projects).toHaveLength(5);
    expect(missionControlSeed.risks).toHaveLength(2);
    expect(missionControlSeed.decisions).toHaveLength(3);
    expect(missionControlSeed.clientActions).toHaveLength(4);
    expect(
      missionControlSeed.invoices.filter((row) => row.state === "overdue"),
    ).not.toHaveLength(0);
    expect(
      missionControlSeed.invoices.filter((row) => row.state !== "overdue"),
    ).not.toHaveLength(0);
    expect(
      missionControlSeed.capacity.filter((row) => row.utilizationBps > 10000),
    ).not.toHaveLength(0);
    expect(missionControlSeed.askFlow.suggestions).not.toHaveLength(0);
  });

  it("headline matches the number of open decisions", () => {
    expect(missionControlSeed.headline.answer).toBe(
      `${missionControlSeed.decisions.length} decisions need you`,
    );
  });

  it("weighted values roll up to the weighted pipeline metric", () => {
    const rolled = missionControlSeed.opportunities.reduce(
      (sum, row) => sum + BigInt(row.weightedValue.minor),
      0n,
    );
    const metric = missionControlSeed.metrics.find(
      (row) => row.id === "met-weighted-pipeline",
    );
    expect(metric).toBeDefined();
    expect("minor" in metric!.value && metric!.value.minor).toBe(
      rolled.toString(),
    );
  });

  it("active delivery metric equals the sum of project contract values", () => {
    const rolled = missionControlSeed.projects.reduce(
      (sum, row) => sum + BigInt(row.contractValue.minor),
      0n,
    );
    const metric = missionControlSeed.metrics.find(
      (row) => row.id === "met-delivery-value",
    );
    expect("minor" in metric!.value && metric!.value.minor).toBe(
      rolled.toString(),
    );
  });

  it("receivables metric equals the sum of open invoices", () => {
    const rolled = missionControlSeed.invoices.reduce(
      (sum, row) => sum + BigInt(row.amount.minor),
      0n,
    );
    const metric = missionControlSeed.metrics.find(
      (row) => row.id === "met-receivables",
    );
    expect("minor" in metric!.value && metric!.value.minor).toBe(
      rolled.toString(),
    );
  });

  it("every decision and metric carries evidence", () => {
    for (const decision of missionControlSeed.decisions) {
      expect(decision.evidence.length).toBeGreaterThan(0);
    }
    for (const metric of missionControlSeed.metrics) {
      expect(metric.evidence.id).toBeTruthy();
    }
  });

  it("ids are unique across every collection", () => {
    const ids = [
      ...missionControlSeed.opportunities,
      ...missionControlSeed.projects,
      ...missionControlSeed.risks,
      ...missionControlSeed.decisions,
      ...missionControlSeed.clientActions,
      ...missionControlSeed.invoices,
      ...missionControlSeed.capacity,
      ...missionControlSeed.activity,
      ...missionControlSeed.pulse,
      ...missionControlSeed.metrics,
    ].map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("mission control states", () => {
  it("resolves a view for every declared state", () => {
    for (const kind of MISSION_STATE_KINDS) {
      expect(missionViewForState(kind).kind).toBeTruthy();
    }
    expect(missionViewForState("loading").kind).toBe("loading");
    expect(missionViewForState("error").kind).toBe("error");
    expect(missionViewForState("restricted").kind).toBe("restricted");
  });

  it("empty state renders ready with nothing to act on", () => {
    const view = missionViewForState("empty");
    expect(view.kind).toBe("ready");
    if (view.kind !== "ready") return;
    expect(view.data.decisions).toHaveLength(0);
    expect(view.data.metrics).toHaveLength(0);
  });

  it("dense state stresses the layout beyond the populated seed", () => {
    const view = missionViewForState("dense");
    if (view.kind !== "ready") throw new Error("expected ready");
    expect(view.data.opportunities.length).toBeGreaterThan(
      missionControlSeed.opportunities.length,
    );
    expect(view.data.decisions.length).toBeGreaterThan(
      missionControlSeed.decisions.length,
    );
    const ids = view.data.opportunities.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("restricted state withholds the operating picture", () => {
    const view = missionViewForState("restricted");
    if (view.kind !== "restricted") throw new Error("expected restricted");
    expect(view.viewer.permissions).not.toContain("finance.read");
    expect(view.restriction.missingPermission).toBeTruthy();
  });

  it("is deterministic across reads", () => {
    expect(missionViewForState("populated")).toEqual(
      missionViewForState("populated"),
    );
    expect(missionViewForState("dense")).toEqual(missionViewForState("dense"));
  });

  it("guards the state kind parser", () => {
    expect(isMissionStateKind("dense")).toBe(true);
    expect(isMissionStateKind("nonsense")).toBe(false);
    expect(isMissionStateKind(null)).toBe(false);
  });
});

describe("mission control demo store", () => {
  it("falls back to the seed for missing or malformed storage", () => {
    expect(parseMissionDemoState(null)).toEqual(missionDemoDefault);
    expect(parseMissionDemoState("not json")).toEqual(missionDemoDefault);
    expect(parseMissionDemoState("[]")).toEqual(missionDemoDefault);
    expect(parseMissionDemoState('{"stateKind":"bogus"}')).toEqual(
      missionDemoDefault,
    );
  });

  it("restores a persisted state kind and resolutions", () => {
    const restored = parseMissionDemoState(
      '{"stateKind":"dense","resolutions":{"dec-meridian-margin":"approved","junk":"maybe"}}',
    );
    expect(restored.stateKind).toBe("dense");
    expect(restored.resolutions).toEqual({
      "dec-meridian-margin": "approved",
    });
  });

  it("reads the populated view through the adapter", async () => {
    const view = await readMissionControl(missionDemoDefault);
    expect(view.kind).toBe("ready");
  });
});

describe("headline matches the decision list in every state", () => {
  it.each(MISSION_STATE_KINDS)("stays consistent in %s", (kind) => {
    const view = missionViewForState(kind);
    if (view.kind !== "ready") return;
    const { headline, decisions } = view.data;

    // Zero reads as prose ("Nothing needs you yet"), not as a digit.
    if (decisions.length > 0) {
      expect(headline.answer).toContain(String(decisions.length));
      expect(headline.evidence.source).toContain(String(decisions.length));
    }

    // Exposure is the sum of each decision's largest money impact, so a new
    // decision cannot leave the figure describing the old list.
    const expected = decisions.reduce((total, decision) => {
      const largest = decision.impacts.reduce(
        (max, impact) =>
          impact.amount && BigInt(impact.amount.minor) > max
            ? BigInt(impact.amount.minor)
            : max,
        0n,
      );
      return total + largest;
    }, 0n);
    expect(headline.impactAmount?.minor ?? "0").toBe(expected.toString());
  });

  it("has no decision that duplicates another's body", () => {
    for (const kind of MISSION_STATE_KINDS) {
      const view = missionViewForState(kind);
      if (view.kind !== "ready") continue;
      const bodies = view.data.decisions.map(
        (decision) => `${decision.whatHappened}|${decision.whyItMatters}`,
      );
      expect(new Set(bodies).size).toBe(bodies.length);
    }
  });
});

describe("seed copy stays founder-readable", () => {
  /** Internal representations (basis points, minor units, minutes) must be
   * converted before they reach a label a founder reads. */
  const leaks: readonly (readonly [string, RegExp])[] = [
    ["basis points", /\bbps\b/i],
    ["raw minutes", /\d\s?min(ute)?s?\b/i],
    ["unformatted money", /(?<![$\d.])\d{1,3}(,\d{3})+\.\d{2}\b/],
  ];

  function stringsIn(value: unknown, path: string): [string, string][] {
    if (typeof value === "string") return [[path, value]];
    if (Array.isArray(value))
      return value.flatMap((row, i) => stringsIn(row, `${path}[${i}]`));
    if (value && typeof value === "object")
      return Object.entries(value).flatMap(([key, row]) =>
        stringsIn(row, `${path}.${key}`),
      );
    return [];
  }

  it.each(MISSION_STATE_KINDS)("has no internal units in %s", (kind) => {
    const found = stringsIn(missionViewForState(kind), kind)
      // `id`/`href`/`minor` carry machine values, never rendered as prose.
      .filter(([path]) => !/\.(id|href|minor|currency|kind)$/.test(path))
      .flatMap(([path, text]) =>
        leaks
          .filter(([, pattern]) => pattern.test(text))
          .map(([name]) => `${path}: ${name} in "${text}"`),
      );
    expect(found).toEqual([]);
  });
});

describe("money formatting", () => {
  it("renders minor units without inventing precision", () => {
    expect(formatMoney({ minor: "12400000", currency: "USD" })).toBe("$124,000");
    expect(formatMoneyCompact({ minor: "40487500", currency: "USD" })).toBe(
      "$404.9K",
    );
  });
});
