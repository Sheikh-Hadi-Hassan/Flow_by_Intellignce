import {
  roleConfusionPairsV1,
  roleEvaluationCasesV1,
  universalBusinessRolesV1,
  type RoleGapRepairRequest,
} from "@flow/blm-contracts";

import type {
  EvaluationFailure,
  EvaluationFailureCategory,
} from "./industrial-evaluation.js";

export interface RoleFocusedEvaluationCase {
  readonly evaluationId: string;
  readonly roleId: string;
  readonly category: string;
  readonly languageVariants: readonly ("en" | "ur" | "ur-Latn" | "mixed")[];
  readonly expectedMetricIds: readonly string[];
  readonly expectedEvidenceRequirementIds: readonly string[];
  readonly expectedAuthorityBoundary: string;
  readonly integratesWith0080: true;
}

export interface RoleFocusedEvaluationCorpus {
  readonly releaseId: "flow.blm.role-evaluation.008.1";
  readonly roleCount: number;
  readonly evaluationCaseCount: number;
  readonly confusionPairCount: number;
  readonly multilingualCoverage: readonly string[];
  readonly cases: readonly RoleFocusedEvaluationCase[];
}

export function createRoleFocusedEvaluationCorpus(): RoleFocusedEvaluationCorpus {
  const cases = roleEvaluationCasesV1.map((item) => ({
    evaluationId: item.evaluationId,
    roleId: item.roleId,
    category: item.category,
    languageVariants: item.languageVariants,
    expectedMetricIds: item.expectedMetricIds,
    expectedEvidenceRequirementIds: item.expectedEvidenceRequirementIds,
    expectedAuthorityBoundary: item.expectedAuthorityBoundary,
    integratesWith0080: true as const,
  }));
  return {
    releaseId: "flow.blm.role-evaluation.008.1",
    roleCount: universalBusinessRolesV1.length,
    evaluationCaseCount: cases.length,
    confusionPairCount: roleConfusionPairsV1.length,
    multilingualCoverage: ["en", "ur", "ur-Latn", "mixed"],
    cases,
  };
}

export function createRoleGapRepairRequest(input: {
  readonly evaluationId: string;
  readonly roleId: string;
  readonly categories: readonly EvaluationFailureCategory[];
  readonly missingCapability?: string;
  readonly missingDecision?: string;
  readonly missingMetric?: string;
  readonly missingLanguageMapping?: string;
  readonly missingEvidenceExpectation?: string;
  readonly missingAuthorityMapping?: string;
}): RoleGapRepairRequest | undefined {
  if (!input.categories.includes("ROLE_GAP")) return undefined;
  return {
    failingEvaluationId: input.evaluationId,
    roleId: input.roleId,
    ...(input.missingCapability
      ? { missingCapability: input.missingCapability }
      : {}),
    ...(input.missingDecision
      ? { missingDecision: input.missingDecision }
      : {}),
    ...(input.missingMetric ? { missingMetric: input.missingMetric } : {}),
    ...(input.missingLanguageMapping
      ? { missingLanguageMapping: input.missingLanguageMapping }
      : {}),
    ...(input.missingEvidenceExpectation
      ? { missingEvidenceExpectation: input.missingEvidenceExpectation }
      : {}),
    ...(input.missingAuthorityMapping
      ? { missingAuthorityMapping: input.missingAuthorityMapping }
      : {}),
  } as RoleGapRepairRequest;
}

export function roleGapRepairRequestFromFailure(
  failure: EvaluationFailure,
): RoleGapRepairRequest | undefined {
  const roleId = failure.repairTargets.find(
    (target) => target === "ROLE_PACKET",
  )
    ? "flow.role.business.unknown"
    : undefined;
  if (!roleId || !failure.categories.includes("ROLE_GAP")) return undefined;
  return {
    failingEvaluationId: failure.caseId,
    roleId,
    missingCapability: failure.explanation,
  } as RoleGapRepairRequest;
}
