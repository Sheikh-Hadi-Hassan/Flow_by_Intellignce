import {
  blmBuildingBlocksV1,
  blmBusinessModulesV1,
  blmExpertisePacksV1,
  blmModulePlanningProvenanceV1,
  blmTaxonomyProvenanceV1,
  industryIdsV1,
  universalCapabilityIdsV1,
  type BuildingBlockDefinition,
  type BuildingBlockPlan,
  type BusinessModuleDefinition,
  type ModuleCriticality,
  type ModuleMaturitySupport,
  type ModuleRecommendation,
  type ModuleRecommendationOutcome,
  type ModuleTiming,
} from "@flow/blm-contracts";
import type { SystemOfRecordClass } from "@flow/blm-contracts";
import type { SemanticId } from "@flow/blm-contracts";
import { stableFingerprint } from "./knowledge-acquisition.js";

export interface CurrentSystemProfile {
  readonly name: string;
  readonly category:
    | "ACCOUNTING"
    | "PROJECT_MANAGEMENT"
    | "CRM"
    | "ERP"
    | "SPREADSHEET"
    | "POS"
    | "OTHER";
  readonly coverageCapabilityIds: readonly SemanticId[];
  readonly systemOfRecordClass: SystemOfRecordClass;
  readonly evidenceRef: string;
}

export interface BusinessModuleRecommendationInput {
  readonly classification: {
    readonly industryId?: SemanticId;
    readonly scale?: "SOLO" | "SMB" | "MID_MARKET" | "ENTERPRISE";
    readonly customerModel?: string;
    readonly revenueModel?: string;
  };
  readonly operatingModelSignals: readonly string[];
  readonly capabilityGaps: readonly SemanticId[];
  readonly valueStreams: readonly string[];
  readonly currentSystems: readonly CurrentSystemProfile[];
  readonly painSignals: readonly string[];
  readonly regulationSignals: readonly string[];
  readonly evidenceRefs: readonly string[];
}

export interface BusinessModuleRecommendationResult {
  readonly recommendations: readonly ModuleRecommendation[];
  readonly excludedModuleIds: readonly SemanticId[];
  readonly overbuildRejected: boolean;
  readonly fingerprint: string;
}

export class BusinessModuleRecommendationEngine {
  constructor(
    private readonly modules: readonly BusinessModuleDefinition[] = createBusinessModuleRegistryV1(),
  ) {}

  recommend(
    input: BusinessModuleRecommendationInput,
  ): BusinessModuleRecommendationResult {
    const recommendations = this.modules
      .map((module) => this.recommendModule(module, input))
      .filter((recommendation) => recommendation.outcome !== "DO_NOT_INSTALL")
      .sort((a, b) => a.priority - b.priority);
    const excludedModuleIds = this.modules
      .filter(
        (module) =>
          !recommendations.some(
            (recommendation) => recommendation.moduleId === module.moduleId,
          ),
      )
      .map((module) => module.moduleId);
    const overbuildRejected = recommendations.length <= 6;
    const withoutFingerprint = {
      recommendations,
      excludedModuleIds,
      overbuildRejected,
    };
    return {
      ...withoutFingerprint,
      fingerprint: stableFingerprint(withoutFingerprint),
    };
  }

  private recommendModule(
    module: BusinessModuleDefinition,
    input: BusinessModuleRecommendationInput,
  ): ModuleRecommendation {
    const signalText = [
      input.classification.customerModel,
      input.classification.revenueModel,
      ...input.operatingModelSignals,
      ...input.valueStreams,
      ...input.painSignals,
      ...input.regulationSignals,
      ...input.currentSystems.map((system) => system.name),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const directEvidence = module.applicabilityTriggers.filter((trigger) =>
      signalText.includes(trigger.toLowerCase()),
    );
    const negativeEvidence = module.exclusions.filter((exclusion) =>
      signalText.includes(exclusion.toLowerCase()),
    );
    const gapCoverage = module.capabilityIds.filter((capabilityId) =>
      input.capabilityGaps.includes(capabilityId),
    );
    const currentCoverage = input.currentSystems
      .filter((system) =>
        module.capabilityIds.some((capabilityId) =>
          system.coverageCapabilityIds.includes(capabilityId),
        ),
      )
      .map((system) => system.name);
    const evidenceScore = directEvidence.length * 0.15;
    const gapScore = gapCoverage.length * 0.25;
    const foundationScore = module.moduleClass === "FOUNDATION" ? 0.35 : 0;
    const negativeScore = negativeEvidence.length * 0.3;
    const needProbability = clamp(
      0.25 + evidenceScore + gapScore + foundationScore - negativeScore,
    );
    const systemOfRecordPolicy = this.systemOfRecordPolicy(module, input);
    const outcome = this.outcomeFor({
      module,
      needProbability,
      directEvidence,
      gapCoverage,
      currentCoverage,
      negativeEvidence,
      systemOfRecordPolicy,
    });
    const criticality = criticalityFor(module, gapCoverage);
    const priority = priorityFor(outcome, criticality, needProbability);
    const targetMaturity = targetMaturityFor(input.classification.scale);
    const timing = timingFor(outcome);
    const missingInformation =
      directEvidence.length === 0 && gapCoverage.length === 0
        ? ["Need more evidence before installing this module."]
        : [];
    const withoutFingerprint = {
      moduleId: module.moduleId,
      capabilityIds: module.capabilityIds,
      outcome,
      needProbability,
      confidence: clamp(
        0.45 + directEvidence.length * 0.1 + gapCoverage.length * 0.15,
      ),
      criticality,
      priority,
      targetMaturity,
      timing,
      directEvidence,
      inferredEvidence: gapCoverage.map(
        (capabilityId) => `Capability gap: ${capabilityId}`,
      ),
      negativeEvidence,
      dependencies: module.dependencies,
      substitutes: module.substitutes,
      currentCoverage,
      systemOfRecordPolicy,
      requiredBuildingBlocks: module.buildingBlockRequirements,
      requiredWorkflows: module.workflowRequirements,
      requiredRules: module.ruleRequirements,
      requiredMetrics: module.metricRequirements,
      requiredIntegrations: input.currentSystems.map((system) => system.name),
      authorityBoundaries: module.authorityBoundaries,
      why: whyFor(
        module,
        outcome,
        directEvidence,
        gapCoverage,
        currentCoverage,
      ),
      whyNotAlternatives: whyNotAlternativesFor(module, negativeEvidence),
      missingInformation,
    };
    return {
      ...withoutFingerprint,
      fingerprint: stableFingerprint(withoutFingerprint),
    };
  }

  private outcomeFor(input: {
    readonly module: BusinessModuleDefinition;
    readonly needProbability: number;
    readonly directEvidence: readonly string[];
    readonly gapCoverage: readonly SemanticId[];
    readonly currentCoverage: readonly string[];
    readonly negativeEvidence: readonly string[];
    readonly systemOfRecordPolicy: SystemOfRecordClass;
  }): ModuleRecommendationOutcome {
    if (input.negativeEvidence.length > input.directEvidence.length) {
      return "DO_NOT_INSTALL";
    }
    if (input.module.moduleClass === "FOUNDATION") return "INSTALL_NOW";
    if (
      input.currentCoverage.length > 0 &&
      input.systemOfRecordPolicy === "EXTERNAL_AUTHORITATIVE"
    ) {
      return "READ_ONLY_OVERLAY";
    }
    if (input.gapCoverage.length > 0 && input.needProbability >= 0.55) {
      return "INSTALL_NOW";
    }
    if (input.needProbability >= 0.45) return "INSTALL_NEXT";
    if (input.directEvidence.length === 0) return "NEEDS_INFORMATION";
    return "DEFER";
  }

  private systemOfRecordPolicy(
    module: BusinessModuleDefinition,
    input: BusinessModuleRecommendationInput,
  ): SystemOfRecordClass {
    const externalCoverage = input.currentSystems.find(
      (system) =>
        system.systemOfRecordClass === "EXTERNAL_AUTHORITATIVE" &&
        module.capabilityIds.some((capabilityId) =>
          system.coverageCapabilityIds.includes(capabilityId),
        ),
    );
    if (externalCoverage) return "EXTERNAL_AUTHORITATIVE";
    if (module.blmRole === "READ_ONLY_OVERLAY") return "DERIVED_ONLY";
    if (module.moduleClass === "CONDITIONAL") return "FLOW_AUTHORITATIVE";
    return "SHARED_WITH_RECONCILIATION";
  }
}

export class MinimumSufficientSolutionOptimizer {
  optimize(input: {
    readonly recommendations: readonly ModuleRecommendation[];
    readonly requiredCapabilityIds: readonly SemanticId[];
    readonly buildingBlocks?: readonly BuildingBlockDefinition[];
    readonly evidenceRefs: readonly string[];
  }): BuildingBlockPlan {
    const selected = this.selectMinimumModules(
      input.recommendations,
      input.requiredCapabilityIds,
    );
    const buildingBlocks =
      input.buildingBlocks ?? createBuildingBlockRegistryV1();
    const selectedBlockIds = uniqueSemanticIds(
      selected.flatMap(
        (recommendation) => recommendation.requiredBuildingBlocks,
      ),
    );
    const selectedBlocks = buildingBlocks.filter((block) =>
      selectedBlockIds.includes(block.blockId),
    );
    const approvedCapabilityIds = uniqueSemanticIds(
      selected.flatMap((recommendation) => recommendation.capabilityIds),
    );
    const targetMaturityByCapability = Object.fromEntries(
      approvedCapabilityIds.map((capabilityId) => [
        capabilityId,
        selected.find((recommendation) =>
          recommendation.capabilityIds.includes(capabilityId),
        )?.targetMaturity ?? "BASIC",
      ]),
    ) as Readonly<Record<string, ModuleMaturitySupport>>;
    const withoutFingerprint = {
      planId: "pending",
      dryRunOnly: true as const,
      approvedCapabilityIds,
      modules: selected,
      targetMaturityByCapability,
      canonicalEntitiesAndRelationships: idsByType(selectedBlocks, "ENTITY"),
      documents: idsByType(selectedBlocks, "DOCUMENT"),
      workflowTemplatesAndParameters: idsByType(selectedBlocks, "WORKFLOW"),
      rolePermissionTemplates: [
        ...idsByType(selectedBlocks, "ROLE"),
        ...idsByType(selectedBlocks, "PERMISSION"),
      ],
      businessLogicAndDecisionRuleIds: [
        ...idsByType(selectedBlocks, "LOGIC"),
        ...idsByType(selectedBlocks, "RULE"),
        ...idsByType(selectedBlocks, "DECISION"),
      ],
      uiBlocksAndViews: idsByType(selectedBlocks, "UI_BLOCK"),
      blmSkillsAndExpertisePacks: expertisePacksForCapabilities(
        approvedCapabilityIds,
      ),
      integrationAdapterCapabilities: uniqueStrings(
        selected.flatMap(
          (recommendation) => recommendation.requiredIntegrations,
        ),
      ),
      systemOfRecordPolicies: selected.map((recommendation) => ({
        moduleId: recommendation.moduleId,
        policy: recommendation.systemOfRecordPolicy,
        reason:
          recommendation.systemOfRecordPolicy === "EXTERNAL_AUTHORITATIVE"
            ? "Existing external system remains authoritative; Flow plans overlay/context only."
            : "Flow may own or reconcile this capability after approval.",
      })),
      notificationApprovalPolicies: idsByType(selectedBlocks, "NOTIFICATION"),
      migrationMappings: selected
        .filter(
          (recommendation) =>
            recommendation.outcome === "REPLACE_EXISTING" ||
            recommendation.systemOfRecordPolicy === "FLOW_AUTHORITATIVE",
        )
        .map((recommendation) => `migration:${recommendation.moduleId}`),
      implementationWave: implementationWaves(selected),
      evidenceRefs: input.evidenceRefs,
      approvalRequirements: [
        "Dry-run plan only.",
        "Production module installation requires Action Wall approval.",
        "External ERP/accounting mutation is not authorized by this plan.",
      ],
    };
    const architectureFingerprint = stableFingerprint(withoutFingerprint);
    return {
      ...withoutFingerprint,
      planId: `building-block-plan:${architectureFingerprint.slice(0, 24)}`,
      architectureFingerprint,
    };
  }

  private selectMinimumModules(
    recommendations: readonly ModuleRecommendation[],
    requiredCapabilityIds: readonly SemanticId[],
  ): readonly ModuleRecommendation[] {
    const selected: ModuleRecommendation[] = [];
    const covered = new Set<SemanticId>();
    const candidates = recommendations
      .filter((recommendation) =>
        [
          "INSTALL_NOW",
          "INSTALL_NEXT",
          "READ_ONLY_OVERLAY",
          "EXTERNAL_SYSTEM_REMAINS_SOR",
        ].includes(recommendation.outcome),
      )
      .sort((a, b) => a.priority - b.priority);

    for (const recommendation of candidates) {
      const addsRequiredCoverage = recommendation.capabilityIds.some(
        (capabilityId) =>
          requiredCapabilityIds.includes(capabilityId) &&
          !covered.has(capabilityId),
      );
      const isP0 = recommendation.criticality === "P0";
      const isSecurityOrControl = recommendation.authorityBoundaries.length > 0;
      if (addsRequiredCoverage || isP0 || isSecurityOrControl) {
        selected.push(recommendation);
        for (const capabilityId of recommendation.capabilityIds) {
          covered.add(capabilityId);
        }
      }
    }
    return selected;
  }
}

export function createBusinessModuleRegistryV1(): readonly BusinessModuleDefinition[] {
  return blmBusinessModulesV1.map((module) => {
    const withoutFingerprint = { ...module, fingerprint: "" };
    return { ...module, fingerprint: stableFingerprint(withoutFingerprint) };
  });
}

export function createBuildingBlockRegistryV1(): readonly BuildingBlockDefinition[] {
  return blmBuildingBlocksV1;
}

export function createDigitalAgency35PersonDemoInput(): BusinessModuleRecommendationInput {
  return {
    classification: {
      industryId: industryIdsV1.digitalAgency,
      scale: "SMB",
      customerModel: "B2B",
      revenueModel: "project + retainer",
    },
    operatingModelSignals: [
      "35-person agency",
      "project delivery",
      "client retainers",
      "spreadsheet/ClickUp delivery",
    ],
    capabilityGaps: [
      universalCapabilityIdsV1.leadManagement,
      universalCapabilityIdsV1.quoteToCash,
      universalCapabilityIdsV1.projectDelivery,
      universalCapabilityIdsV1.financialControl,
    ],
    valueStreams: ["lead-to-cash", "project-to-margin"],
    currentSystems: [
      {
        name: "QuickBooks accounting",
        category: "ACCOUNTING",
        coverageCapabilityIds: [universalCapabilityIdsV1.financialControl],
        systemOfRecordClass: "EXTERNAL_AUTHORITATIVE",
        evidenceRef: "evidence:quickbooks-accounting",
      },
      {
        name: "ClickUp delivery",
        category: "PROJECT_MANAGEMENT",
        coverageCapabilityIds: [universalCapabilityIdsV1.projectDelivery],
        systemOfRecordClass: "EXTERNAL_AUTHORITATIVE",
        evidenceRef: "evidence:clickup-delivery",
      },
      {
        name: "Spreadsheet delivery tracker",
        category: "SPREADSHEET",
        coverageCapabilityIds: [universalCapabilityIdsV1.projectDelivery],
        systemOfRecordClass: "DERIVED_ONLY",
        evidenceRef: "evidence:spreadsheet-delivery",
      },
    ],
    painSignals: ["cash collection pain", "scope creep"],
    regulationSignals: [],
    evidenceRefs: [
      "evidence:35-person-agency",
      "evidence:b2b-project-retainer",
      "evidence:quickbooks-accounting",
      "evidence:clickup-spreadsheet-delivery",
      "evidence:cash-collection-scope-creep",
    ],
  };
}

function criticalityFor(
  module: BusinessModuleDefinition,
  gapCoverage: readonly SemanticId[],
): ModuleCriticality {
  if (module.moduleClass === "FOUNDATION") return "P0";
  if (gapCoverage.includes(universalCapabilityIdsV1.financialControl))
    return "P0";
  if (gapCoverage.length > 0) return "P1";
  if (module.moduleClass === "CONDITIONAL") return "P3";
  return "P2";
}

function priorityFor(
  outcome: ModuleRecommendationOutcome,
  criticality: ModuleCriticality,
  probability: number,
): number {
  const outcomeRank: Record<ModuleRecommendationOutcome, number> = {
    INSTALL_NOW: 10,
    READ_ONLY_OVERLAY: 20,
    INSTALL_NEXT: 30,
    EXTERNAL_SYSTEM_REMAINS_SOR: 40,
    DEFER: 60,
    NEEDS_INFORMATION: 70,
    REPLACE_EXISTING: 80,
    DO_NOT_INSTALL: 99,
  };
  const criticalityRank: Record<ModuleCriticality, number> = {
    P0: 0,
    P1: 4,
    P2: 8,
    P3: 12,
  };
  return outcomeRank[outcome] + criticalityRank[criticality] - probability;
}

function targetMaturityFor(
  scale: BusinessModuleRecommendationInput["classification"]["scale"],
): ModuleMaturitySupport {
  if (scale === "ENTERPRISE") return "ADVANCED";
  if (scale === "MID_MARKET") return "STANDARD";
  if (scale === "SMB") return "BASIC";
  return "FOUNDATION";
}

function timingFor(outcome: ModuleRecommendationOutcome): ModuleTiming {
  if (outcome === "INSTALL_NOW" || outcome === "READ_ONLY_OVERLAY")
    return "NOW";
  if (outcome === "INSTALL_NEXT") return "NEXT";
  if (outcome === "NEEDS_INFORMATION") return "NEEDS_INFORMATION";
  return "LATER";
}

function whyFor(
  module: BusinessModuleDefinition,
  outcome: ModuleRecommendationOutcome,
  directEvidence: readonly string[],
  gapCoverage: readonly SemanticId[],
  currentCoverage: readonly string[],
): readonly string[] {
  return [
    `${module.canonicalName} outcome: ${outcome}.`,
    directEvidence.length > 0
      ? `Direct evidence matched: ${directEvidence.join(", ")}.`
      : "No direct trigger evidence matched.",
    gapCoverage.length > 0
      ? `Covers capability gaps: ${gapCoverage.join(", ")}.`
      : "No explicit capability gap matched.",
    currentCoverage.length > 0
      ? `Current systems cover part of this area: ${currentCoverage.join(", ")}.`
      : "No current system coverage was supplied.",
  ];
}

function whyNotAlternativesFor(
  module: BusinessModuleDefinition,
  negativeEvidence: readonly string[],
): readonly string[] {
  if (negativeEvidence.length === 0) {
    return ["No substitute module has stronger evidence in this dry run."];
  }
  return [
    `${module.canonicalName} has negative evidence: ${negativeEvidence.join(", ")}.`,
  ];
}

function idsByType(
  blocks: readonly BuildingBlockDefinition[],
  type: BuildingBlockDefinition["blockType"],
): readonly SemanticId[] {
  return blocks
    .filter((block) => block.blockType === type)
    .map((block) => block.blockId);
}

function expertisePacksForCapabilities(
  capabilityIds: readonly SemanticId[],
): readonly SemanticId[] {
  return blmExpertisePacksV1
    .filter((pack) =>
      pack.metrics.some((metricId) =>
        capabilityIds.some((capabilityId) =>
          metricId.includes(capabilityId.split(".").at(-1) ?? ""),
        ),
      ),
    )
    .map((pack) => pack.packId);
}

function implementationWaves(
  selected: readonly ModuleRecommendation[],
): BuildingBlockPlan["implementationWave"] {
  const waveOne = selected.filter(
    (recommendation) => recommendation.criticality === "P0",
  );
  const waveTwo = selected.filter(
    (recommendation) => recommendation.criticality !== "P0",
  );
  return [
    {
      wave: 1,
      moduleIds: waveOne.map((recommendation) => recommendation.moduleId),
      rationale: "P0 foundation, controls, and cash/finance visibility.",
    },
    {
      wave: 2,
      moduleIds: waveTwo.map((recommendation) => recommendation.moduleId),
      rationale: "Remaining minimum sufficient capability coverage.",
    },
  ].filter((wave) => wave.moduleIds.length > 0);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(0.99, Number(value.toFixed(2))));
}

function uniqueSemanticIds(ids: readonly SemanticId[]): readonly SemanticId[] {
  return [...new Set(ids)];
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

export const blmModulePlanningSafety = {
  dryRunOnly: true,
  noAutomaticProductionInstall: true,
  noErpMutation: true,
  actionWallRequiredForSideEffects: true,
  provenance: [blmModulePlanningProvenanceV1, blmTaxonomyProvenanceV1],
} as const;
