import { describe, expect, it } from "vitest";

import type { OpportunityRecord } from "../commercial/api";
import { buildPriorities, hasFakeMetrics } from "./mission-control";

function opp(
  partial: Partial<OpportunityRecord> & Pick<OpportunityRecord, "id" | "name">,
): OpportunityRecord {
  return {
    clientId: "client-1",
    serviceId: "svc-1",
    journeyStatus: "collecting_information",
    currency: "USD",
    completeness: 0,
    revision: 1,
    ...partial,
  };
}

describe("mission-control", () => {
  it("never reports fake metrics", () => {
    expect(hasFakeMetrics()).toBe(false);
  });

  it("maps founder_review to urgent approval priority", () => {
    const items = buildPriorities("ws", [
      opp({ id: "o1", name: "Acme", journeyStatus: "founder_review" }),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]?.tone).toBe("urgent");
    expect(items[0]?.href).toContain("/approvals");
  });

  it("maps discovery statuses to discovery href", () => {
    const items = buildPriorities("ws", [
      opp({ id: "o2", name: "Beta", journeyStatus: "information_missing" }),
    ]);
    expect(items[0]?.href).toContain("/discovery");
    expect(items[0]?.tone).toBe("attention");
  });

  it("caps priority list at eight items", () => {
    const rows = Array.from({ length: 12 }, (_, i) =>
      opp({
        id: `o${i}`,
        name: `Opp ${i}`,
        journeyStatus: "founder_review",
      }),
    );
    expect(buildPriorities("ws", rows)).toHaveLength(8);
  });
});
