import { describe, expect, it } from "vitest";

import {
  assertNoDuplicateExpandedSemanticIdsV1,
  blmBusinessDecisionPatternsV1,
  blmBusinessDiagnosticPatternsV1,
  blmBusinessPsychologyInsightsV1,
  blmExpandedBusinessRelationshipsV1,
  blmExpandedDomainIdsV1,
  blmExpandedDomainPacksV1,
  blmExpandedEvaluationCasesV1,
  calculateDomainExpertiseScoresV1,
  findCrossDomainKnowledgePathV1,
} from "./business-expertise-expansion.js";
import {
  ComponentRegistry,
  customerManagementComponentId,
  type ComponentRegistration,
} from "./component-registry.js";
import { toSemanticId } from "./business-semantic-model.js";

function domain(key: string) {
  const found = blmExpandedDomainPacksV1.find((pack) => pack.key === key);
  if (!found) {
    throw new Error(`Missing domain ${key}`);
  }
  return found;
}

describe("BLM Business Expertise Expansion v1", () => {
  it("defines all 15 universal expertise domain tracks without duplicate semantic IDs", () => {
    expect(blmExpandedDomainPacksV1.map((pack) => pack.key)).toEqual([
      "universal-core",
      "crm-sales",
      "marketing-growth",
      "customer-sales-psychology",
      "finance-accounting",
      "commercial-documents-contracts",
      "procurement-vendors",
      "product-catalog-pricing",
      "inventory-logistics",
      "projects-service-operations",
      "hr-organizational-psychology",
      "assets-rental-maintenance",
      "commerce-pos-marketplace",
      "manufacturing-mrp",
      "analytics-strategy-planning",
    ]);
    expect(() => assertNoDuplicateExpandedSemanticIdsV1()).not.toThrow();
  });

  it("extends the existing four proof packs instead of duplicating them", () => {
    expect(domain("universal-core").domainId).toBe(
      blmExpandedDomainIdsV1.universalCore,
    );
    expect(domain("crm-sales").domainId).toBe(blmExpandedDomainIdsV1.crmSales);
    expect(domain("finance-accounting").domainId).toBe(
      blmExpandedDomainIdsV1.financeAccounting,
    );
    expect(domain("inventory-logistics").conceptIds).toContain(
      toSemanticId("flow.concept.inventory.available-stock"),
    );
  });

  it("represents cross-domain operational business relationships", () => {
    const pathPairs = blmExpandedBusinessRelationshipsV1.map((relationship) => [
      relationship.sourceConceptId,
      relationship.relationship,
      relationship.targetConceptId,
    ]);

    expect(pathPairs).toEqual(
      expect.arrayContaining([
        [
          toSemanticId("flow.concept.marketing.campaign"),
          "GENERATES",
          toSemanticId("flow.concept.crm.lead"),
        ],
        [
          toSemanticId("flow.concept.crm.quote"),
          "MAY_BECOME",
          toSemanticId("flow.concept.commercial-document.contract"),
        ],
        [
          toSemanticId("flow.concept.finance.invoice"),
          "CREATES",
          toSemanticId("flow.concept.finance.receivable"),
        ],
        [
          toSemanticId("flow.concept.finance.payment"),
          "SETTLES",
          toSemanticId("flow.concept.finance.receivable"),
        ],
      ]),
    );
    expect(
      findCrossDomainKnowledgePathV1(toSemanticId("flow.concept.crm.lead")),
    ).toContainEqual(
      expect.objectContaining({
        sourceConceptId: toSemanticId("flow.concept.marketing.campaign"),
      }),
    );
  });

  it("keeps finance formulas deterministic and separates universal accounting from jurisdiction rules", () => {
    const finance = domain("finance-accounting");

    expect(finance.formulaIds).toEqual(
      expect.arrayContaining([
        toSemanticId("flow.decision.formula.finance.gross-profit"),
        toSemanticId("flow.decision.formula.finance.gross-margin"),
        toSemanticId("flow.decision.formula.finance.working-capital"),
      ]),
    );
    expect(finance.ruleIds).toContain(
      toSemanticId(
        "flow.decision.rule.finance.jurisdiction-tax-rules-deferred",
      ),
    );
  });

  it("distinguishes markup from margin and physical stock from available stock", () => {
    expect(domain("product-catalog-pricing").ruleIds).toContain(
      toSemanticId("flow.decision.rule.pricing.markup-is-not-margin"),
    );
    expect(domain("product-catalog-pricing").formulaIds).toEqual(
      expect.arrayContaining([
        toSemanticId("flow.decision.formula.pricing.markup"),
        toSemanticId("flow.decision.formula.pricing.margin"),
      ]),
    );
    expect(domain("inventory-logistics").ruleIds).toContain(
      toSemanticId(
        "flow.decision.rule.inventory.available-stock-excludes-reserved-stock",
      ),
    );
    expect(blmExpandedBusinessRelationshipsV1).toContainEqual(
      expect.objectContaining({
        sourceConceptId: toSemanticId("flow.concept.inventory.stock-on-hand"),
        relationship: "DISTINGUISHES",
        targetConceptId: toSemanticId("flow.concept.inventory.available-stock"),
      }),
    );
  });

  it("connects project margin to finance and marketing to CRM to commercial documents", () => {
    expect(blmExpandedBusinessRelationshipsV1).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceConceptId: toSemanticId("flow.concept.project.project-cost"),
          targetConceptId: toSemanticId("flow.concept.project.project-margin"),
        }),
        expect.objectContaining({
          sourceConceptId: toSemanticId("flow.concept.marketing.campaign"),
          targetConceptId: toSemanticId("flow.concept.crm.lead"),
        }),
        expect.objectContaining({
          sourceConceptId: toSemanticId("flow.concept.crm.quote"),
          targetConceptId: toSemanticId(
            "flow.concept.commercial-document.contract",
          ),
        }),
      ]),
    );
  });

  it("connects commercial documents, procurement, inventory, assets, and marketplace semantics to finance", () => {
    expect(blmExpandedBusinessRelationshipsV1).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceConceptId: toSemanticId("flow.concept.commerce.fulfillment"),
          targetConceptId: toSemanticId("flow.concept.finance.invoice"),
        }),
        expect.objectContaining({
          sourceConceptId: toSemanticId(
            "flow.concept.procurement.supplier-invoice",
          ),
          targetConceptId: toSemanticId("flow.concept.finance.payable"),
        }),
        expect.objectContaining({
          sourceConceptId: toSemanticId("flow.concept.asset.depreciation"),
          targetConceptId: toSemanticId("flow.concept.finance.expense"),
        }),
        expect.objectContaining({
          sourceConceptId: toSemanticId("flow.concept.commerce.marketplace"),
          targetConceptId: toSemanticId("flow.concept.commerce.seller"),
        }),
        expect.objectContaining({
          sourceConceptId: toSemanticId("flow.concept.commerce.commission"),
          targetConceptId: toSemanticId("flow.concept.commerce.payout"),
        }),
      ]),
    );
  });

  it("models psychology insights with alternatives and explicit safety boundaries", () => {
    const priceObjection = blmBusinessPsychologyInsightsV1.find(
      (item) =>
        item.semanticId ===
        toSemanticId("flow.concept.psychology.insight-high-price-objection"),
    );

    expect(priceObjection?.possibleInterpretations).toEqual(
      expect.arrayContaining([
        "true budget constraint",
        "insufficient perceived value",
        "risk uncertainty",
        "comparison pressure",
      ]),
    );
    expect(
      blmBusinessPsychologyInsightsV1.every(
        (item) =>
          item.prohibitedMisuse.length > 0 &&
          !item.prohibitedMisuse.includes("coercion"),
      ),
    ).toBe(true);
    expect(domain("hr-organizational-psychology").ruleIds).toContain(
      toSemanticId("flow.decision.rule.hr.no-mental-health-diagnosis"),
    );
  });

  it("represents diagnostic patterns and decision patterns without silently deciding", () => {
    const cashFlow = blmBusinessDiagnosticPatternsV1.find(
      (item) =>
        item.semanticId ===
        toSemanticId("flow.decision.diagnostic.negative-cash-flow"),
    );
    const discount = blmBusinessDecisionPatternsV1.find(
      (item) =>
        item.semanticId ===
        toSemanticId("flow.decision.pattern.discount-decision"),
    );

    expect(cashFlow?.investigationConceptIds).toEqual(
      expect.arrayContaining([
        toSemanticId("flow.concept.finance.receivable"),
        toSemanticId("flow.concept.finance.working-capital"),
        toSemanticId("flow.concept.finance.cash-flow"),
      ]),
    );
    expect(discount?.decisionFactors).toEqual(
      expect.arrayContaining([
        "margin",
        "deal value",
        "customer lifetime value",
        "pricing policy",
      ]),
    );
    expect(discount?.outputBoundary).toContain("no automatic approval");
  });

  it("contains 50+ deterministic evaluation cases with required cross-domain examples", () => {
    expect(blmExpandedEvaluationCasesV1.length).toBeGreaterThanOrEqual(50);
    expect(
      blmExpandedEvaluationCasesV1.every((item) => item.deterministic),
    ).toBe(true);
    expect(
      blmExpandedEvaluationCasesV1.find(
        (item) => item.name === "Profitable but cash flow negative",
      )?.expectedKnowledgePath,
    ).toEqual(
      expect.arrayContaining([
        toSemanticId("flow.concept.finance.receivable"),
        toSemanticId("flow.concept.finance.payable"),
        toSemanticId("flow.concept.finance.working-capital"),
        toSemanticId("flow.concept.finance.cash-flow"),
      ]),
    );
    expect(
      blmExpandedEvaluationCasesV1.find(
        (item) => item.name === "Customer requests 15 percent discount",
      )?.expectedDecisionFactors,
    ).toEqual(expect.arrayContaining(["margin", "pricing policy"]));
  });

  it("calculates deterministic domain expertise scores from measurable contents", () => {
    const scores = calculateDomainExpertiseScoresV1();
    const finance = scores.find(
      (score) => score.domainId === blmExpandedDomainIdsV1.financeAccounting,
    );
    const manufacturing = scores.find(
      (score) => score.domainId === blmExpandedDomainIdsV1.manufacturingMrp,
    );

    expect(scores).toHaveLength(15);
    expect(finance?.conceptCoverage).toBe(1);
    expect(finance?.overall).toBeGreaterThan(manufacturing?.overall ?? 1);
    expect(
      scores.every((score) => score.overall >= 0 && score.overall <= 1),
    ).toBe(true);
  });

  it("keeps expanded expertise Flow-curated with no fake external provenance or workspace ownership", () => {
    expect(
      blmExpandedDomainPacksV1.every(
        (pack) =>
          pack.provenance.use === "FLOW_NATIVE" &&
          pack.provenance.sourceIds.length === 0 &&
          (pack as { readonly workspaceId?: string }).workspaceId === undefined,
      ),
    ).toBe(true);
  });

  it("preserves Component Registry behavior", () => {
    const component: ComponentRegistration = {
      semanticId: customerManagementComponentId,
      version: "1.0.0",
      displayName: "Customer Management",
      description: "Semantic customer component.",
      lifecycleStatus: "ACTIVE",
      providesCapabilityIds: [
        toSemanticId("flow.capability.crm.customer-management"),
      ],
      requiresCapabilityIds: [],
      dependsOnComponentIds: [],
      optionalDependencyIds: [],
      conflictsWithComponentIds: [],
      implementation: { availability: "SEMANTIC_ONLY", moduleBindings: [] },
      usesEntityTypeKeys: [],
      exposesActions: [],
      producesEvents: [],
      consumesEvents: [],
      scope: "GLOBAL",
    };
    const registry = new ComponentRegistry({
      trustedModules: [],
      knownCapabilityIds: [
        toSemanticId("flow.capability.crm.customer-management"),
      ],
      components: [component],
    });

    expect(registry.isTrustedComponent(customerManagementComponentId)).toBe(
      true,
    );
  });
});
