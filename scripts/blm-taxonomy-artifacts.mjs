#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BusinessClassificationEngine,
  createBLMExpertisePacksV1,
  createGlobalIndustryReleaseV1,
  createReferenceBusinessArchitectureGraphV1,
  createUniversalCapabilityRegistryV1,
} from "../packages/blm-core/dist/index.js";
import { blmRoleExpertiseV1 } from "../packages/blm-contracts/dist/index.js";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

function writeJson(path, value) {
  const absolutePath = join(ROOT, path);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`);
}

const taxonomy = createGlobalIndustryReleaseV1();
const architecture = createReferenceBusinessArchitectureGraphV1();
const capabilities = createUniversalCapabilityRegistryV1();
const expertisePacks = createBLMExpertisePacksV1();
const engine = new BusinessClassificationEngine(taxonomy, expertisePacks);

const demonstrations = [
  {
    id: "digital-agency",
    input:
      "A small digital agency sells client retainers and project work for campaign delivery.",
  },
  {
    id: "saas",
    input:
      "A SaaS company has subscription software, trials, MRR, activation, and churn.",
  },
  {
    id: "manufacturer",
    input:
      "A manufacturer runs production work orders, raw material inventory, BOMs, and capacity planning.",
  },
  {
    id: "retailer",
    input:
      "A retailer operates stores, POS, online stock, fulfillment, and returns.",
  },
  {
    id: "construction",
    input:
      "A construction firm manages job sites, subcontractors, crews, estimates, and change orders.",
  },
].map((demo) => {
  const classification = engine.classify({ businessDescription: demo.input });
  return {
    ...demo,
    classification,
    context: engine.compileContext({ classification }),
  };
});

writeJson(
  "knowledge/blm/compiled/taxonomy/global-business-taxonomy-v1.json",
  taxonomy,
);
writeJson(
  "knowledge/blm/compiled/architecture/reference-business-architecture-graph-v1.json",
  architecture,
);
writeJson(
  "knowledge/blm/compiled/capabilities/universal-capability-registry-v1.json",
  capabilities,
);
writeJson("knowledge/blm/compiled/expertise/blm-expertise-packs-v1.json", {
  registryId: "blm-expertise-packs-1.0.0",
  version: "1.0.0",
  packs: expertisePacks,
});
writeJson("knowledge/blm/compiled/expertise/role-expertise-v1.json", {
  registryId: "blm-role-expertise-1.0.0",
  version: "1.0.0",
  roles: blmRoleExpertiseV1,
});
writeJson(
  "knowledge/blm/compiled/evaluations/business-taxonomy-demonstrations-v1.json",
  {
    suiteId: "business-taxonomy-demonstrations-v1",
    demonstrations,
  },
);
