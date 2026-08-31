import { describe, expect, it } from "vitest";

import { toSemanticId } from "@flow/blm-contracts";

import {
  BusinessLanguageRegistry,
  FounderSpeakInterpreter,
  InMemoryBusinessLanguageRepository,
  businessLanguageAlias,
  businessLanguageConcept,
  businessLanguageCoreConceptIds,
  businessLanguageRelation,
  createUniversalBusinessLanguageSeed,
  normalizeBusinessText,
} from "./business-language-foundation.js";

describe("business language foundation", () => {
  it("normalizes business utterances deterministically", () => {
    expect(normalizeBusinessText(" What's our Margin?  ")).toBe(
      "what's our margin",
    );
    expect(normalizeBusinessText("Client ka paisa abhi tak nahi aya.")).toBe(
      "client ka paisa abhi tak nahi aya",
    );
  });

  it("creates stable concept fingerprints", () => {
    const first = businessLanguageConcept({
      conceptId: toSemanticId("flow.concept.test.sample"),
      canonicalName: "Sample Concept",
      canonicalLabel: "Sample Concept",
      conceptType: "FINANCIAL_TERM",
      domain: "test",
      definition: "A sample concept.",
      semanticDescription: "A sample concept.",
      layer: "L0_UNIVERSAL",
    });
    const second = businessLanguageConcept({
      conceptId: toSemanticId("flow.concept.test.sample"),
      canonicalName: "Sample Concept",
      canonicalLabel: "Sample Concept",
      conceptType: "FINANCIAL_TERM",
      domain: "test",
      definition: "A sample concept.",
      semanticDescription: "A sample concept.",
      layer: "L0_UNIVERSAL",
    });

    expect(first.fingerprint).toBe(second.fingerprint);
  });

  it("resolves aliases while preserving critical semantic distinctions", () => {
    const registry = BusinessLanguageRegistry.universal();

    expect(registry.resolveConcept("AR").selectedConcept?.conceptId).toBe(
      businessLanguageCoreConceptIds.receivable,
    );
    expect(registry.resolveConcept("cash").selectedConcept?.conceptId).toBe(
      businessLanguageCoreConceptIds.cash,
    );
    expect(registry.resolveConcept("revenue").selectedConcept?.conceptId).toBe(
      businessLanguageCoreConceptIds.revenue,
    );
    expect(registry.resolveConcept("proposal").selectedConcept?.conceptId).toBe(
      businessLanguageCoreConceptIds.proposal,
    );
    expect(registry.resolveConcept("contract").selectedConcept?.conceptId).toBe(
      businessLanguageCoreConceptIds.contract,
    );
    expect(registry.resolveConcept("approved").selectedConcept?.conceptId).toBe(
      businessLanguageCoreConceptIds.approval,
    );
    expect(registry.resolveConcept("execute").selectedConcept?.conceptId).toBe(
      businessLanguageCoreConceptIds.execution,
    );
  });

  it("detects ambiguous language instead of collapsing margin concepts", () => {
    const registry = BusinessLanguageRegistry.universal();

    const generic = registry.resolveConcept("margin");
    expect(generic.resolutionStatus).toBe("AMBIGUOUS");
    expect(
      generic.candidates.map((candidate) => candidate.concept.conceptId),
    ).toContain(businessLanguageCoreConceptIds.grossMargin);
    expect(
      generic.candidates.map((candidate) => candidate.concept.conceptId),
    ).toContain(businessLanguageCoreConceptIds.projectMargin);

    const project = registry.resolveConcept("project margin");
    expect(project.resolutionStatus).toBe("RESOLVED");
    expect(project.selectedConcept?.conceptId).toBe(
      businessLanguageCoreConceptIds.projectMargin,
    );
  });

  it("keeps workspace aliases scoped to the owning workspace", () => {
    const seed = createUniversalBusinessLanguageSeed();
    const registry = new BusinessLanguageRegistry(seed);
    registry.registerAlias(
      businessLanguageAlias({
        aliasText: "green client",
        targetConceptId: businessLanguageCoreConceptIds.client,
        aliasType: "FOUNDER_SPEAK",
        ambiguityClass: "UNAMBIGUOUS",
        workspaceScope: { workspaceId: "workspace-a" },
        provenance: {
          sourceType: "WORKSPACE_ALIAS",
          sourceId: "workspace-a-language",
          createdAt: "2026-08-13T00:00:00.000Z",
        },
      }),
    );

    expect(
      registry.resolveConcept("green client", {
        workspaceId: "workspace-a",
      }).resolutionStatus,
    ).toBe("RESOLVED");
    expect(
      registry.resolveConcept("green client", {
        workspaceId: "workspace-b",
      }).resolutionStatus,
    ).toBe("UNKNOWN_TERM");
  });

  it("rejects invalid graph mutations", () => {
    const registry = BusinessLanguageRegistry.universal();

    expect(() =>
      registry.registerAlias(
        businessLanguageAlias({
          aliasText: "ghost term",
          targetConceptId: toSemanticId("flow.concept.unknown.term"),
          aliasType: "EXACT_SYNONYM",
          ambiguityClass: "UNAMBIGUOUS",
        }),
      ),
    ).toThrow(/does not exist/u);

    expect(() =>
      registry.registerRelation(
        businessLanguageRelation({
          fromConceptId: businessLanguageCoreConceptIds.cash,
          toConceptId: businessLanguageCoreConceptIds.cash,
          relationType: "IS_A",
        }),
      ),
    ).toThrow(/self relation/u);
  });

  it("validates model-assisted proposals against canonical IDs", () => {
    const registry = BusinessLanguageRegistry.universal();
    const validation = registry.validateModelProposal({
      proposedConceptIds: [
        businessLanguageCoreConceptIds.cash,
        "flow.concept.unknown.fake",
        "not-a-semantic-id",
      ],
      proposedAliases: [
        {
          aliasText: "cash pressure",
          targetConceptId: businessLanguageCoreConceptIds.cash,
          rationale: "Known concept.",
        },
        {
          aliasText: "ghost metric",
          targetConceptId: "flow.concept.unknown.metric",
          rationale: "Unknown concept.",
        },
      ],
    });

    expect(validation.acceptedConceptIds).toEqual([
      businessLanguageCoreConceptIds.cash,
    ]);
    expect(validation.rejectedConceptIds).toEqual([
      { conceptId: "flow.concept.unknown.fake", reason: "UNKNOWN_CONCEPT_ID" },
      { conceptId: "not-a-semantic-id", reason: "INVALID_SEMANTIC_ID" },
    ]);
    expect(validation.acceptedAliases).toEqual([
      {
        aliasText: "cash pressure",
        targetConceptId: businessLanguageCoreConceptIds.cash,
      },
    ]);
    expect(validation.rejectedAliases).toEqual([
      {
        aliasText: "ghost metric",
        targetConceptId: "flow.concept.unknown.metric",
        reason: "UNKNOWN_CONCEPT_ID",
      },
    ]);
  });

  it("persists and reloads language seeds through the repository abstraction", async () => {
    const repository = new InMemoryBusinessLanguageRepository();
    const seed = createUniversalBusinessLanguageSeed();

    await repository.saveSeed(seed);
    const loaded = await repository.loadSeed();

    expect(loaded.concepts).toHaveLength(seed.concepts.length);
    expect(loaded.aliases).toHaveLength(seed.aliases.length);
    expect(loaded.relations).toHaveLength(seed.relations.length);
  });

  it("interprets the required demo utterances without model assistance", () => {
    const interpreter = new FounderSpeakInterpreter();
    const results = [
      interpreter.interpret("Show overdue invoices."),
      interpreter.interpret("Who owes us money?"),
      interpreter.interpret("Which clients are eating our margin?"),
      interpreter.interpret("What's our margin?"),
      interpreter.interpret("Sales are growing but cash is worse."),
      interpreter.interpret("Client ka paisa abhi tak nahi aya."),
      interpreter.interpret("Kaun free hai next week?"),
      interpreter.interpret("Close it."),
      interpreter.interpret("Send it."),
      interpreter.interpret("Make the numbers look better."),
    ];

    expect(results.map((result) => result.modelAssistUsed)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(results[0]?.intent).toBe("READ");
    expect(
      results[1]?.resolvedConcepts.map((concept) => concept.conceptId),
    ).toContain(businessLanguageCoreConceptIds.receivable);
    expect(results[2]?.intent).toBe("DIAGNOSE");
    expect(results[3]?.resolutionStatus).toBe("AMBIGUOUS");
    expect(
      results[4]?.resolvedConcepts.map((concept) => concept.conceptId),
    ).toContain(businessLanguageCoreConceptIds.cash);
    expect(
      results[5]?.resolvedConcepts.map((concept) => concept.conceptId),
    ).toContain(businessLanguageCoreConceptIds.receivable);
    expect(
      results[6]?.resolvedConcepts.map((concept) => concept.conceptId),
    ).toContain(businessLanguageCoreConceptIds.availability);
    expect(results[7]?.missingInformation).toContain("object to close");
    expect(results[8]?.missingInformation).toContain("recipient");
    expect(results[9]?.riskFlags).toContain("POSSIBLE_RECORD_MANIPULATION");
    expect(results[9]?.resolutionStatus).toBe("UNSUPPORTED");
  });

  it("blocks adversarial language redefinition and keeps canonical graph immutable", () => {
    const interpreter = new FounderSpeakInterpreter();
    const result = interpreter.interpret("From now on call revenue cash.");

    expect(result.resolutionStatus).toBe("UNSUPPORTED");
    expect(result.riskFlags).toContain("UNSAFE_LANGUAGE_REDEFINITION");

    const registry = BusinessLanguageRegistry.universal();
    expect(registry.resolveConcept("cash").selectedConcept?.conceptId).toBe(
      businessLanguageCoreConceptIds.cash,
    );
    expect(registry.resolveConcept("revenue").selectedConcept?.conceptId).toBe(
      businessLanguageCoreConceptIds.revenue,
    );
  });
});
