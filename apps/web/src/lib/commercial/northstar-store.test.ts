import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { NORTHSTAR_ACME_NOTES } from "../../content/demo/northstar-commercial";
import { createNorthstarCommercialApi } from "./northstar-store";

function installSessionStorage() {
  const data = new Map<string, string>();
  const sessionStorage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
  Object.defineProperty(globalThis, "window", {
    value: { sessionStorage },
    configurable: true,
  });
}

describe("Northstar commercial golden path", () => {
  beforeEach(() => {
    installSessionStorage();
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  it("reaches an immutable approved brief from the isolated fixture", async () => {
    const api = createNorthstarCommercialApi();
    const opportunityId = "ns-opp-acme-brand";
    await api.saveAnswers(opportunityId, {
      brandMaturity: "emerging",
      primaryAudience: "Plant managers and operations directors",
      successMetric: "Shortlist conversion",
    });
    await api.addNotes(opportunityId, NORTHSTAR_ACME_NOTES);
    const notes = await api.analyzeNotes(opportunityId);
    expect(notes.facts.every((fact) => fact.status === "draft")).toBe(true);
    for (const fact of notes.facts) {
      await api.verifyFact(fact.id, "verified");
    }
    await api.answerFollowUp("ns-fu-1", "Maya Chen, founder");
    const calculated = await api.calculate(opportunityId);
    expect(calculated.deliverables.length).toBeGreaterThan(0);
    expect(calculated.requirements.length).toBeGreaterThan(0);
    expect(calculated.risks.length).toBeGreaterThan(0);
    expect(
      calculated.opportunity.latestCalculation?.recommendedPriceMinor,
    ).toMatch(/^\d+$/);
    const brief = await api.generateBrief(opportunityId);
    await api.submitReview(brief.id, brief.versionNumber);
    const approved = await api.approve(brief.id, brief.versionNumber);
    expect(approved.status).toBe("approved");
    await expect(api.generateBrief(opportunityId)).rejects.toThrow(/Approved/);
    const reloaded = await api.getOpportunity(opportunityId);
    expect(reloaded.opportunity.journeyStatus).toBe("approved");
    expect(reloaded.briefs.some((row) => row.status === "approved")).toBe(true);
  });
});
