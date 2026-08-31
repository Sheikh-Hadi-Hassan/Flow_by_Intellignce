#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BLMBusinessContextCompiler,
  BusinessModuleRecommendationEngine,
  MinimumSufficientSolutionOptimizer,
  createBLMKnowledgeReleaseManifestV1,
  createBuildingBlockRegistryV1,
  createBusinessModuleRegistryV1,
  createDigitalAgency35PersonDemoInput,
  runBLMRuntimeEvaluationSuiteV1,
} from "../packages/blm-core/dist/index.js";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

function writeJson(path, value) {
  const absolutePath = join(ROOT, path);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`);
}

const modules = createBusinessModuleRegistryV1();
const buildingBlocks = createBuildingBlockRegistryV1();
const demoInput = createDigitalAgency35PersonDemoInput();
const recommendationResult = new BusinessModuleRecommendationEngine().recommend(
  demoInput,
);
const buildingBlockPlan = new MinimumSufficientSolutionOptimizer().optimize({
  recommendations: recommendationResult.recommendations,
  requiredCapabilityIds: demoInput.capabilityGaps,
  evidenceRefs: demoInput.evidenceRefs,
});
const runtimeContext = new BLMBusinessContextCompiler().compile({
  request: {
    requestId: "artifact-runtime-context",
    workspaceId: "workspace-artifact",
    userId: "user-artifact",
    text: "35-person digital agency B2B project and retainer business using QuickBooks accounting and ClickUp delivery with cash collection pain and scope creep.",
    accessMode: "CUSTOMER",
    authorizedWorkspaceFacts: [
      "35-person digital agency",
      "QuickBooks accounting remains finance system of record",
      "ClickUp delivery is used for projects",
    ],
    userAssertions: ["B2B project and retainer revenue model"],
    currentEvidenceRefs: ["evidence:quickbooks", "evidence:clickup"],
    requestedSemanticIds: [],
    requestedCapabilityIds: demoInput.capabilityGaps,
  },
});

writeJson("knowledge/blm/compiled/modules/business-module-registry-v1.json", {
  registryId: "blm-business-module-registry-1.0.0",
  version: "1.0.0",
  modules,
});
writeJson(
  "knowledge/blm/compiled/building-blocks/building-block-registry-v1.json",
  {
    registryId: "blm-building-block-registry-1.0.0",
    version: "1.0.0",
    buildingBlocks,
  },
);
writeJson(
  "knowledge/blm/compiled/building-blocks/digital-agency-building-block-plan-v1.json",
  buildingBlockPlan,
);
writeJson(
  "knowledge/blm/compiled/modules/digital-agency-module-recommendations-v1.json",
  {
    scenarioId: "35-person-digital-agency",
    recommendationResult,
  },
);
writeJson(
  "knowledge/blm/compiled/reasoning/compiled-blm-context-demo-v1.json",
  runtimeContext,
);
writeJson(
  "knowledge/blm/compiled/reasoning/blm-knowledge-release-manifest-v1.json",
  createBLMKnowledgeReleaseManifestV1(),
);
writeJson(
  "knowledge/blm/compiled/evaluations/blm-runtime-evaluation-v1.json",
  runBLMRuntimeEvaluationSuiteV1(),
);
