import { describe, expect, it } from "vitest";
import {
  benchmarkCasesV01,
  businessOntologyV01,
  routeBusinessIntent,
  validateBusinessIntent,
  type LegacyBusinessIntent,
} from "./index.js";

describe("Business semantic contracts", () => {
  it("defines the v0.1 business ontology using controlled concepts and relationships", () => {
    expect(businessOntologyV01.concepts).toContain("Workspace");
    expect(businessOntologyV01.concepts).toContain("Decision");
    expect(businessOntologyV01.relationships).toContain("EVIDENCED_BY");
    expect(businessOntologyV01.relationships).not.toContain("ANYTHING_GOES");
  });

  it("validates BusinessIntent schema without granting authorization", () => {
    const intent: LegacyBusinessIntent = {
      language: "roman-ur",
      rawInput: "Mr X ki attendance change kar do.",
      normalizedIntent: "attendance.update",
      workspaceId: "workspace-alpha",
      requestedAction: "attendance.update",
      entityReferences: ["Mr X"],
      parameters: {},
      missingInformation: ["date", "new_value"],
      assumptions: [],
      evidenceReferences: [],
      requiredCapabilities: ["hr.attendance"],
      confidence: 0.76,
      reasoningRoute: "LOCAL_MODEL",
    };

    expect(() => validateBusinessIntent(intent)).not.toThrow();
    expect(intent).not.toHaveProperty("permissionGranted");
    expect(intent).not.toHaveProperty("executeTool");
  });

  it("rejects malformed confidence instead of silently trusting model output", () => {
    expect(() =>
      validateBusinessIntent({
        language: "en",
        rawInput: "Invoice send kar do.",
        normalizedIntent: "invoice.send",
        workspaceId: "workspace-alpha",
        entityReferences: [],
        parameters: {},
        missingInformation: ["invoice", "client"],
        assumptions: [],
        evidenceReferences: [],
        requiredCapabilities: ["invoicing.invoices"],
        confidence: 1.2,
        reasoningRoute: "LOCAL_MODEL",
      }),
    ).toThrow("confidence");
  });

  it("keeps multilingual benchmark cases schema-stable", () => {
    expect(benchmarkCasesV01.map((entry) => entry.language)).toEqual(
      expect.arrayContaining(["en", "ur", "roman-ur"]),
    );
    expect(
      benchmarkCasesV01.find((entry) => entry.id === "invoice-roman-ur"),
    ).toMatchObject({
      expectedAction: "invoice.create",
      expectedEntities: ["Amar"],
      expectedMissingFields: ["contract", "billing_schedule"],
    });
  });

  it("routes low-confidence or high-risk requests away from automatic model answers", () => {
    expect(
      routeBusinessIntent({ task: "classification", confidence: 0.5 }),
    ).toMatchObject({
      route: "HUMAN_CLARIFICATION",
    });
    expect(
      routeBusinessIntent({ task: "high-risk", confidence: 0.9 }),
    ).toMatchObject({
      route: "HUMAN_CLARIFICATION",
    });
    expect(
      routeBusinessIntent({ task: "classification", confidence: 0.82 }),
    ).toMatchObject({
      route: "LOCAL_MODEL",
    });
  });
});
