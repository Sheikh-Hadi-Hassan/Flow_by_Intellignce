import {
  CRM_CORE_BLOCK_ID,
  CRM_CORE_DEFAULT_CONFIGURATION,
  crmKnownModelVocabulary,
} from "./crm-core/config.js";
import {
  REGISTRY_BUSINESS_BLOCK_ID,
  REGISTRY_BUSINESS_DEFAULT_CONFIGURATION,
  registryKnownModelVocabulary,
} from "./registry-business/config.js";
import { rejectUnknownModelOutput } from "./schema.js";
import type {
  BuildingBlockManifest,
  BuildingBlockRecommendation,
  BusinessComposerProfile,
} from "./types.js";

function scoreCrmCore(profile: BusinessComposerProfile): {
  readonly evidence: string[];
  readonly confidence: "low" | "medium" | "high";
} {
  const evidence: string[] = [];
  if (
    /agency|studio|services/i.test(profile.industry) ||
    /agency|studio|services/i.test(profile.businessModel)
  ) {
    evidence.push("industry:agency");
  }
  if (
    profile.problems.some((problem) => /client|crm|relationship/i.test(problem))
  ) {
    evidence.push("problem:client-tracking");
  }
  if (/relationship|pipeline|proposal/i.test(profile.salesProcess)) {
    evidence.push("sales-process:relationship");
  }
  if (
    profile.verifiedFacts.some((fact) => /client/i.test(fact)) ||
    profile.questionnaireAnswers.clientType
  ) {
    evidence.push("verified-fact:has-clients");
  }
  if (profile.goals.some((goal) => /retain|account|client/i.test(goal))) {
    evidence.push("goal:client-retention");
  }
  const confidence =
    evidence.length >= 3 ? "high" : evidence.length === 2 ? "medium" : "low";
  return { evidence, confidence };
}

function scoreRegistryBusiness(profile: BusinessComposerProfile): {
  readonly evidence: string[];
  readonly confidence: "low" | "medium" | "high";
} {
  const evidence: string[] = [];
  if (
    /agency|studio|services/i.test(profile.industry) ||
    /agency|studio|services/i.test(profile.businessModel)
  ) {
    evidence.push("industry:agency");
  }
  if (profile.companySize || profile.verifiedFacts.length > 0) {
    evidence.push("need:legal-entity");
  }
  if (
    profile.verifiedFacts.some((fact) => /northstar|registered|legal/i.test(fact))
  ) {
    evidence.push("verified-fact:registered-company");
  }
  if (profile.roles.length > 0 || profile.companySize) {
    evidence.push("operating-profile:firmographics");
  }
  const confidence =
    evidence.length >= 3 ? "high" : evidence.length === 2 ? "medium" : "low";
  return { evidence, confidence };
}

export function composeBuildingBlockRecommendations(
  profile: BusinessComposerProfile,
  manifests: readonly BuildingBlockManifest[],
  modelOutput?: unknown,
): readonly BuildingBlockRecommendation[] {
  const knownIds = new Set(manifests.map((row) => row.id));
  const crm = manifests.find((row) => row.id === CRM_CORE_BLOCK_ID);
  const registry = manifests.find((row) => row.id === REGISTRY_BUSINESS_BLOCK_ID);
  const deterministic: BuildingBlockRecommendation[] = [];

  if (crm) {
    const scored = scoreCrmCore(profile);
    if (scored.evidence.length > 0) {
      deterministic.push({
        blockId: crm.id,
        reason:
          "This business keeps named client relationships and needs a governed client record, not a spreadsheet.",
        requirementEvidence: scored.evidence,
        recommendedConfiguration: { ...CRM_CORE_DEFAULT_CONFIGURATION },
        dependencies: crm.dependencies,
        confidence: scored.confidence,
        risks: [
          "Similar legal names can appear twice. A founder still has to approve any merge.",
          "Merge remains a protected action.",
        ],
        alternatives: [],
        requiresHumanApproval: true,
      });
    }
  }

  if (registry) {
    const scored = scoreRegistryBusiness(profile);
    if (scored.evidence.length > 0) {
      deterministic.push({
        blockId: registry.id,
        reason:
          "This workspace needs one canonical registered company, offices, and renewal records — not a second legal-entity table.",
        requirementEvidence: scored.evidence,
        recommendedConfiguration: { ...REGISTRY_BUSINESS_DEFAULT_CONFIGURATION },
        dependencies: registry.dependencies,
        confidence: scored.confidence,
        risks: [
          "Registration and tax identifiers must stay fictional DEMO- values.",
          "Primary location changes remain a protected action.",
        ],
        alternatives: [],
        requiresHumanApproval: true,
      });
    }
  }

  if (modelOutput === undefined) {
    return deterministic;
  }

  const crmVocab = crmKnownModelVocabulary();
  const registryVocab = registryKnownModelVocabulary();
  const parsed = rejectUnknownModelOutput(modelOutput, {
    blockIds: knownIds,
    stages: new Set([...crmVocab.stages, ...registryVocab.stages]),
    fields: new Set([...crmVocab.fields, ...registryVocab.fields]),
    permissions: new Set([...crmVocab.permissions, ...registryVocab.permissions]),
    integrations: new Set([
      ...crmVocab.integrations,
      ...registryVocab.integrations,
    ]),
  });
  const merged = new Map<string, BuildingBlockRecommendation>();
  for (const row of deterministic) merged.set(row.blockId, row);
  for (const row of parsed) {
    const manifest = manifests.find((item) => item.id === row.blockId);
    if (!manifest) throw new Error("Unknown building block in recommendation.");
    merged.set(row.blockId, {
      ...row,
      dependencies: manifest.dependencies,
      requiresHumanApproval: true,
    });
  }
  return [...merged.values()];
}

export const NORTHSTAR_COMPOSER_PROFILE: BusinessComposerProfile = {
  workspaceId: "northstar-creative",
  industry: "creative_marketing_agency",
  businessModel: "creative_marketing_agency",
  companySize: "12",
  roles: ["founder", "operations", "strategist", "designer"],
  existingSystems: ["spreadsheet"],
  salesProcess: "relationship proposals and retainers",
  deliveryProcess: "project phases with named leads",
  financialProcess: "milestone invoices and retainers",
  problems: ["client tracking", "capacity", "late invoices"],
  goals: ["retain flagship accounts", "protect margin"],
  compliance: [],
  questionnaireAnswers: { clientType: "b2b_enterprise" },
  verifiedFacts: [
    "Northstar Creative serves named brand and healthcare clients.",
  ],
};
