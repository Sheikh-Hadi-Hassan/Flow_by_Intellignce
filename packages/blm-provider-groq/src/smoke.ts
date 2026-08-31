import {
  BusinessContextCompiler,
  BusinessReasoningRuntime,
  DeterministicModelRouter,
  InMemoryBusinessPolicyProvider,
  InMemoryBusinessProfileProvider,
  InMemoryBusinessRecordProvider,
  representativeModelCapabilityProfilesV1,
  type BusinessReasoningResult,
} from "@flow/blm-core";
import {
  blmExpandedDomainIdsV1,
  toSemanticId,
  type BusinessProfile,
} from "@flow/blm-contracts";
import type { ActorContext, WorkspaceContext } from "@flow/contracts";

import { createGroqAdapterFromEnv } from "./index.js";

const smokeTask =
  "A company is profitable but regularly runs out of cash. Diagnose the likely business areas to investigate.";

const workspace: WorkspaceContext = {
  workspaceId: "workspace-groq-smoke" as WorkspaceContext["workspaceId"],
  slug: "groq-smoke",
};

const actor: ActorContext = {
  actorId: "actor-groq-smoke" as ActorContext["actorId"],
  userId: "user-groq-smoke" as ActorContext["userId"],
  membershipId: "membership-groq-smoke" as ActorContext["membershipId"],
  actorKind: "user",
  workspace,
  roleIds: ["finance-analyst"],
  permissionIds: ["finance.analysis.read"],
  requestSource: "UI",
  correlationId: "correlation-groq-smoke" as ActorContext["correlationId"],
};

const profile: BusinessProfile = {
  profileId: "profile-groq-smoke",
  workspaceId: workspace.workspaceId,
  version: "1",
  businessType: "Synthetic inventory-backed B2B distributor",
  businessModel: "Profitable invoice-based sales with inventory purchasing",
  productsAndServices: ["Synthetic wholesale products"],
  customerTypes: ["Synthetic B2B customers"],
  departments: ["Sales", "Finance", "Operations"],
  teamStructure: ["Sales lead", "Finance analyst", "Operations manager"],
  locations: ["Synthetic region"],
  requiredCapabilityIds: [],
  salesModel: "Relationship-led B2B sales",
  billingModel: "Invoice billing",
  approvalRequirements: ["Cash-management actions require human approval"],
  importantProcesses: ["Invoice-to-cash", "Procure-to-pay"],
  complianceRequirements: ["No production data in model smoke tests"],
  integrations: [],
};

async function main(): Promise<void> {
  if (process.env.BLM_REAL_MODEL_TESTS !== "1") {
    printSmokeResult({
      status: "SKIPPED",
      reason: "REAL_MODEL_TESTS_DISABLED",
    });
    return;
  }
  const adapter = createGroqAdapterFromEnv();
  if (!adapter) {
    printSmokeResult({
      status: "SKIPPED",
      reason: "REQUIRED_CONFIGURATION_UNAVAILABLE",
    });
    return;
  }

  const compiler = new BusinessContextCompiler({
    businessProfileProvider: new InMemoryBusinessProfileProvider([profile]),
    policyProvider: new InMemoryBusinessPolicyProvider([]),
    recordProvider: new InMemoryBusinessRecordProvider([]),
  });
  const context = compiler.compile({
    workspace,
    actor,
    task: {
      taskType: "DIAGNOSTIC",
      taskKey: "profitable-cash-shortage",
      requestedTask: smokeTask,
    },
    referencedConceptIds: [
      toSemanticId("flow.concept.finance.cash-flow"),
      toSemanticId("flow.concept.finance.receivable"),
      toSemanticId("flow.concept.finance.working-capital"),
      toSemanticId("flow.concept.finance.payable"),
      toSemanticId("flow.concept.inventory.stock-on-hand"),
    ],
    requestedDomainIds: [
      blmExpandedDomainIdsV1.financeAccounting,
      blmExpandedDomainIdsV1.inventoryLogistics,
    ],
    channel: "TEXT",
    knowledgeReleaseId: "flow.blm.knowledge-release.groq-smoke",
    workspaceContextVersion: "synthetic-1",
    budget: {
      maxDomains: 2,
      maxRecords: 0,
      maxSkills: 0,
      maxEstimatedCharacters: 8000,
    },
  });
  const runtime = new BusinessReasoningRuntime({
    router: new DeterministicModelRouter(),
    modelProfiles: representativeModelCapabilityProfilesV1,
    modelAdapter: adapter,
  });
  const result = await runtime.reasonAsync({
    compiledContext: context,
    objective: smokeTask,
    expectedOutputType: "DIAGNOSTIC",
    riskProfile: "MEDIUM",
    taskType: "DIAGNOSTIC",
    responseMode: "STRUCTURED",
  });
  const validation = validateSmokeResult(result);
  printSmokeResult({
    status: validation.valid ? "PASSED" : "FAILED",
    reason: validation.reason,
    model: process.env.BLM_GROQ_MODEL,
    context: {
      fingerprint: context.fingerprint,
      domainKeys: context.relevantDomains.map((domain) => domain.key),
      conceptCount: context.relevantConceptIds.length,
      recordCount: context.authorizedRecords.length,
      skillCount: context.availableBusinessSkills.length,
    },
    reasoning: {
      status: result.status,
      confidence: result.confidence,
      summary: result.summary,
      warnings: result.warnings.map((warning) => warning.code),
      concepts: result.businessConceptReferences,
      records: result.recordReferences,
      proposedSkillCount: result.proposedSkills.length,
      recommendationCount: result.recommendations.length,
    },
    provider: result.modelExecutionMetadata.providerMetadata,
  });
  if (!validation.valid) {
    process.exitCode = 1;
  }
}

function validateSmokeResult(result: BusinessReasoningResult): {
  readonly valid: boolean;
  readonly reason: string;
} {
  if (result.status === "MODEL_FAILURE") {
    return { valid: false, reason: "MODEL_FAILURE" };
  }
  const text = JSON.stringify({
    summary: result.summary,
    findings: result.findings,
    diagnosticHypotheses: result.diagnosticHypotheses,
    decisionFactors: result.decisionFactors,
    recommendations: result.recommendations,
    concepts: result.businessConceptReferences,
  }).toLowerCase();
  const hasCashFlow =
    text.includes("cash flow") ||
    result.businessConceptReferences.includes(
      toSemanticId("flow.concept.finance.cash-flow"),
    );
  const hasReceivables =
    text.includes("receivable") ||
    text.includes("payment timing") ||
    result.businessConceptReferences.includes(
      toSemanticId("flow.concept.finance.receivable"),
    );
  const hasWorkingCapital =
    text.includes("working capital") ||
    result.businessConceptReferences.includes(
      toSemanticId("flow.concept.finance.working-capital"),
    );
  const hasPayablesOrInventory =
    text.includes("payable") ||
    text.includes("inventory") ||
    result.businessConceptReferences.includes(
      toSemanticId("flow.concept.finance.payable"),
    ) ||
    result.businessConceptReferences.includes(
      toSemanticId("flow.concept.inventory.stock-on-hand"),
    );
  if (
    !hasCashFlow ||
    !hasReceivables ||
    !hasWorkingCapital ||
    !hasPayablesOrInventory
  ) {
    return { valid: false, reason: "MISSING_EXPECTED_BUSINESS_CONCEPTS" };
  }
  if (result.recordReferences.length > 0) {
    return { valid: false, reason: "WORKSPACE_FACT_HALLUCINATION" };
  }
  if (
    result.warnings.some(
      (warning) => warning.code === "INVALID_REFERENCE_REJECTED",
    )
  ) {
    return { valid: false, reason: "INVALID_REFERENCE_REJECTED" };
  }
  if (result.proposedSkills.some((skill) => skill.status === "ACCEPTED")) {
    return { valid: false, reason: "INVALID_SKILL_PROPOSAL" };
  }
  return { valid: true, reason: "VALIDATED" };
}

function printSmokeResult(value: unknown): void {
  console.log(JSON.stringify(redactSecrets(value), null, 2));
}

function redactSecrets(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(/gsk_[A-Za-z0-9]+/g, "[REDACTED]");
  }
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key.toLowerCase().includes("key") ? key : key,
      key.toLowerCase().includes("key") ? "[REDACTED]" : redactSecrets(item),
    ]),
  );
}

void main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unknown smoke error.";
  printSmokeResult({ status: "FAILED", reason: message });
  process.exitCode = 1;
});
