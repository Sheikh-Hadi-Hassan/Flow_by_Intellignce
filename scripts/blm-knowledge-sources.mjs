#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const VAULT_ROOT = "knowledge/blm";
const MANIFEST_PATH = `${VAULT_ROOT}/manifests/sources.manifest.json`;
const CHECKSUM_PATH = `${VAULT_ROOT}/manifests/checksums.manifest.json`;
const RELEASE_PATH = `${VAULT_ROOT}/manifests/releases.manifest.json`;
const SCHEMA_PATH = `${VAULT_ROOT}/schemas/source-manifest.schema.json`;
const README_PATH = `${VAULT_ROOT}/README.md`;
const AUDIT_PATH = `${VAULT_ROOT}/compiled/evaluations/source-vault-audit-v1.json`;

const CREATED_AT = "2026-08-13";
const GROUPS = new Set([
  "GLOBAL_CORE",
  "CURRICULUM",
  "EVALUATION",
  "FLOW_INTERNAL",
]);
const USES = new Set([
  "REFERENCE",
  "MAPPING",
  "INGESTION",
  "CONTEXT",
  "RETRIEVAL",
  "EVALUATION",
  "TRAINING",
  "COMMERCIAL_TRAINING",
  "REDISTRIBUTION",
]);

const sources = [
  source({
    sourceKey: "BLM-CORE-ARCHITECTURE-V1",
    title: "Flow BLM Factual Business Architecture Library",
    version: "v1",
    knowledgeGroup: "GLOBAL_CORE",
    repositoryPath:
      "knowledge/blm/sources/global-core/Flow_BLM_Factual_Business_Architecture_Library_v1.docx",
    sourceType: "DOCX",
    intendedUse:
      "Reference source for factual business architecture, entity, capability, and operating-model concepts.",
    expectedTaskConsumers: ["TASK_007_1", "TASK_007_2"],
  }),
  source({
    sourceKey: "BLM-CORE-MATH-V3",
    title: "Flow BLM Superintelligence Business Knowledge Mathematics Library",
    version: "v3",
    knowledgeGroup: "GLOBAL_CORE",
    repositoryPath:
      "knowledge/blm/sources/global-core/Flow_BLM_Superintelligence_Business_Knowledge_Mathematics_Library_v3.docx",
    sourceType: "DOCX",
    intendedUse:
      "Reference source for business metrics, formulas, deterministic calculation boundaries, and quantitative reasoning patterns.",
    expectedTaskConsumers: ["TASK_007_1", "TASK_007_2", "TASK_007_3"],
  }),
  source({
    sourceKey: "BLM-LANGUAGE-V4",
    title: "Flow BLM Business Language Execution Corpus",
    version: "v4",
    knowledgeGroup: "GLOBAL_CORE",
    repositoryPath:
      "knowledge/blm/sources/global-core/Flow_BLM_Business_Language_Execution_Corpus_v4.docx",
    sourceType: "DOCX",
    intendedUse:
      "Reference source for canonical business language, aliases, CRUD/workflow semantics, roles, and execution wording.",
    expectedTaskConsumers: ["TASK_007_1", "TASK_007_2"],
  }),
  source({
    sourceKey: "BLM-EXPERTISE-V5",
    title:
      "Flow BLM Global Business Industry Niche Expertise Psychology Strategy Library",
    version: "v5",
    knowledgeGroup: "GLOBAL_CORE",
    repositoryPath:
      "knowledge/blm/sources/global-core/Flow_BLM_Industry_Niche_Expertise_Psychology_Strategy_Library_v5.docx",
    sourceType: "DOCX",
    intendedUse:
      "Reference source for cross-industry expertise packs, niche operating patterns, psychology-safe strategy context, and role-specific reasoning.",
    expectedTaskConsumers: ["TASK_007_1", "TASK_007_3"],
  }),
  source({
    sourceKey: "BLM-TAXONOMY-V1",
    title: "Flow BLM Global Business Taxonomy Context Architecture",
    version: "v1",
    knowledgeGroup: "GLOBAL_CORE",
    repositoryPath:
      "knowledge/blm/sources/global-core/Flow_BLM_Global_Business_Taxonomy_Context_Architecture_v1.docx",
    sourceType: "DOCX",
    intendedUse:
      "Reference source for global business taxonomy, context selection, and domain classification.",
    expectedTaskConsumers: ["TASK_007_1", "TASK_007_2"],
  }),
  source({
    sourceKey: "BLM-MODULE-ARCH-V1",
    title:
      "Flow BLM Business Operating System Module Building Block Architecture",
    version: "v1",
    knowledgeGroup: "GLOBAL_CORE",
    repositoryPath:
      "knowledge/blm/sources/global-core/Flow_BLM_Business_Operating_System_Module_Building_Block_Architecture_v1.pdf",
    sourceType: "PDF",
    intendedUse:
      "Reference source for Business Operating System module boundaries, reusable building blocks, and module composition architecture.",
    expectedTaskConsumers: ["TASK_007_1", "TASK_007_4"],
  }),
  source({
    sourceKey: "BLM-KG-REGISTRY-V2",
    title: "Flow BLM Business Operating System Knowledge Graph Registry",
    version: "v2",
    knowledgeGroup: "GLOBAL_CORE",
    repositoryPath:
      "knowledge/blm/sources/global-core/Flow_BLM_Business_Operating_System_Knowledge_Graph_Registry_v2.json",
    sourceType: "JSON",
    intendedUse:
      "Machine-readable registry reference for future governed graph compilation and source-backed capability mapping.",
    expectedTaskConsumers: ["TASK_007_1", "TASK_007_2", "TASK_007_4"],
  }),
  source({
    sourceKey: "BLM-CURRICULUM-MODULE-1-ETHICS-CSR-ESG",
    title: "Flow BLM Master Business Curriculum Module 1 Ethics CSR ESG",
    version: "module-1",
    knowledgeGroup: "CURRICULUM",
    repositoryPath:
      "knowledge/blm/sources/curriculum/Flow_BLM_Master_Business_Curriculum_Module_1_Ethics_CSR_ESG.docx",
    sourceType: "DOCX",
    runtimeAvailability: false,
    universalRuntimeKnowledge: false,
    intendedUse:
      "Curriculum source for governed learning/curriculum extraction, not automatic universal runtime context.",
    expectedTaskConsumers: ["TASK_007_1"],
  }),
  source({
    sourceKey: "BLM-CURRICULUM-MODULE-3",
    title: "Flow BLM Master Business Curriculum Module 3",
    version: "module-3",
    knowledgeGroup: "CURRICULUM",
    repositoryPath:
      "knowledge/blm/sources/curriculum/Flow_BLM_Master_Business_Curriculum_Module_3.docx",
    sourceType: "DOCX",
    runtimeAvailability: false,
    universalRuntimeKnowledge: false,
    intendedUse:
      "Curriculum source for governed learning/curriculum extraction, not automatic universal runtime context.",
    expectedTaskConsumers: ["TASK_007_1"],
  }),
  source({
    sourceKey: "FLOW-EVAL-AGENCY-DEMO-BLUEPRINT",
    title: "Flow Agency Case Study and Investor Demo Blueprint",
    version: "v1",
    knowledgeGroup: "EVALUATION",
    repositoryPath:
      "knowledge/blm/sources/evaluation/Flow_Agency_Case_Study_and_Investor_Demo_Blueprint.docx",
    sourceType: "DOCX",
    runtimeAvailability: false,
    universalRuntimeKnowledge: false,
    intendedUse:
      "Synthetic evaluation and demo scenario source. It must not be promoted to global BLM knowledge.",
    expectedTaskConsumers: ["TASK_007_3", "EVALUATION_FIXTURES"],
  }),
  source({
    sourceKey: "FLOW-INTERNAL-FUNDRAISING-GTM-18M",
    title: "Flow Fundraising GTM and 18 Month Execution Plan",
    version: "v1",
    knowledgeGroup: "FLOW_INTERNAL",
    repositoryPath:
      "knowledge/blm/sources/flow-internal/Flow_Fundraising_GTM_and_18_Month_Execution_Plan.docx",
    sourceType: "DOCX",
    runtimeAvailability: false,
    universalRuntimeKnowledge: false,
    intendedUse:
      "Flow-internal planning and fundraising context. It is isolated from universal runtime knowledge.",
    expectedTaskConsumers: ["FLOW_INTERNAL_STRATEGY"],
  }),
  source({
    sourceKey: "FLOW-INTERNAL-INVESTOR-STRATEGY-2026",
    title: "Flow Investor Master Strategy 2026",
    version: "2026",
    knowledgeGroup: "FLOW_INTERNAL",
    repositoryPath:
      "knowledge/blm/sources/flow-internal/Flow_Investor_Master_Strategy_2026.docx",
    sourceType: "DOCX",
    runtimeAvailability: false,
    universalRuntimeKnowledge: false,
    intendedUse:
      "Flow-internal investor strategy context. It is isolated from universal runtime knowledge.",
    expectedTaskConsumers: ["FLOW_INTERNAL_STRATEGY"],
  }),
];

const missingSources = [
  {
    title: "Flow BLM Master Business Curriculum Module 2",
    expectedKnowledgeGroup: "CURRICULUM",
    status: "MISSING_SOURCE_FILE",
    reason: "No Module 2 source file was supplied in this session.",
  },
  {
    title: "Flow BLM Master Business Curriculum Module 4",
    expectedKnowledgeGroup: "CURRICULUM",
    status: "MISSING_SOURCE_FILE",
    reason: "No Module 4 source file was supplied in this session.",
  },
];

function source(input) {
  const isFlowInternal = input.knowledgeGroup === "FLOW_INTERNAL";
  const isEvaluation = input.knowledgeGroup === "EVALUATION";
  const runtimeAvailability =
    input.runtimeAvailability ?? input.knowledgeGroup === "GLOBAL_CORE";
  const universalRuntimeKnowledge =
    input.universalRuntimeKnowledge ?? input.knowledgeGroup === "GLOBAL_CORE";
  return {
    sourceKey: input.sourceKey,
    title: input.title,
    version: input.version,
    knowledgeGroup: input.knowledgeGroup,
    repositoryPath: input.repositoryPath,
    sourceType: input.sourceType,
    authorityClass: "FLOW_INTERNAL",
    knowledgeUse: knowledgeUseFor(input.knowledgeGroup),
    runtimeAvailability,
    universalRuntimeKnowledge,
    trainingEligibility: "TASK_001_GOVERNED",
    commercialTrainingEligibility: "TASK_001_GOVERNED",
    freshnessClass: "CURRENT",
    sourceGovernanceRequired: true,
    expectedTaskConsumers: input.expectedTaskConsumers,
    status: existsSync(join(ROOT, input.repositoryPath))
      ? "AVAILABLE"
      : "MISSING_SOURCE_FILE",
    intendedUse: input.intendedUse,
    documentIsCanonicalTruth: false,
    isSyntheticEvaluation: isEvaluation,
    isFlowInternal,
    governanceMapping: {
      businessSourceId: `source:${input.sourceKey.toLowerCase()}`,
      sourceReleaseId: `release:${input.sourceKey.toLowerCase()}:${input.version.toLowerCase()}`,
      licenseProfileId: "license:flow-internal-task-001-governed",
      seedCandidate: true,
      mappedContracts: [
        "BusinessSource",
        "SourceRelease",
        "SourceLicenseProfile",
      ],
      notes:
        "Prepared as a deterministic Task 001 seed candidate only. This manifest does not grant training or commercial training permission.",
    },
    fingerprint: sha256Text(
      JSON.stringify({
        sourceKey: input.sourceKey,
        title: input.title,
        version: input.version,
        knowledgeGroup: input.knowledgeGroup,
        repositoryPath: input.repositoryPath,
        intendedUse: input.intendedUse,
      }),
    ),
  };
}

function knowledgeUseFor(group) {
  if (group === "GLOBAL_CORE") {
    return ["REFERENCE", "MAPPING", "CONTEXT", "EVALUATION"];
  }
  if (group === "CURRICULUM") {
    return ["REFERENCE", "CONTEXT", "EVALUATION"];
  }
  if (group === "EVALUATION") {
    return ["REFERENCE", "EVALUATION"];
  }
  return ["REFERENCE"];
}

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function readJson(path) {
  return JSON.parse(readFileSync(join(ROOT, path), "utf8"));
}

function writeJson(path, value) {
  writeFileSync(join(ROOT, path), `${JSON.stringify(value, null, 2)}\n`);
}

function checksumsFor(records) {
  return {
    schemaVersion: 1,
    algorithm: "SHA-256",
    generatedFrom: MANIFEST_PATH,
    checksums: records.map((record) => {
      const absolutePath = join(ROOT, record.repositoryPath);
      return {
        sourceKey: record.sourceKey,
        repositoryPath: record.repositoryPath,
        sha256: existsSync(absolutePath) ? sha256File(absolutePath) : null,
        fileSize: existsSync(absolutePath) ? statSync(absolutePath).size : null,
        version: record.version,
        status: record.status,
      };
    }),
  };
}

function generate() {
  const manifest = {
    schemaVersion: 1,
    corpusName: "Flow BLM Knowledge Source Vault",
    createdAt: CREATED_AT,
    status: "SOURCE_INVENTORY_READY",
    task001GovernanceRequired: true,
    sourceCount: sources.length,
    missingSourceCount: missingSources.length,
    sources,
    missingSources,
  };
  const checksums = checksumsFor(sources);
  const release = {
    schemaVersion: 1,
    corpusRelease: "1.0.0",
    createdAt: CREATED_AT,
    createdFrom: "approved Flow BLM source corpus",
    status: "SOURCE_INVENTORY_READY",
    sourceKeys: sources.map((record) => record.sourceKey),
    manifestPath: MANIFEST_PATH,
    checksumManifestPath: CHECKSUM_PATH,
    compiledKnowledgeStatus: "NOT_COMPILED",
    notes:
      "This release records source inventory readiness only. It does not claim compiled BLM knowledge, training eligibility, or publication readiness.",
  };
  const audit = {
    schemaVersion: 1,
    generatedAt: CREATED_AT,
    existingSourceArchitectureAudit: [
      "Task 001 source governance exists in packages/blm-contracts/src/business-knowledge-governance.ts.",
      "BusinessSource, SourceRelease, SourceLicenseProfile, and BusinessKnowledgeUnit are canonical contracts.",
      "stableFingerprint remains semantic/provenance oriented and is not replaced by source-file SHA-256 checksums.",
      "docs/blm/blm-source-manifest-v1.md is a governance note for external references, not a repository-native vault for these supplied documents.",
    ],
    largeFilePolicy:
      "No repository rule currently ignores DOCX, PDF, or JSON source documents under knowledge/blm.",
    sourceVaultScope:
      "Original supplied source files are preserved. No full knowledge extraction, RAG, vector search, module compiler, or training publication is implemented.",
    missingSources,
  };
  writeJson(MANIFEST_PATH, manifest);
  writeJson(CHECKSUM_PATH, checksums);
  writeJson(RELEASE_PATH, release);
  writeJson(SCHEMA_PATH, sourceManifestSchema());
  writeJson(AUDIT_PATH, audit);
  writeFileSync(join(ROOT, README_PATH), readme());
}

function sourceManifestSchema() {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://flow.local/schemas/blm/source-manifest.schema.json",
    title: "Flow BLM Source Manifest",
    type: "object",
    required: [
      "schemaVersion",
      "corpusName",
      "status",
      "task001GovernanceRequired",
      "sources",
      "missingSources",
    ],
    additionalProperties: false,
    properties: {
      schemaVersion: { type: "integer", const: 1 },
      corpusName: { type: "string" },
      createdAt: { type: "string" },
      status: { type: "string", const: "SOURCE_INVENTORY_READY" },
      task001GovernanceRequired: { type: "boolean", const: true },
      sourceCount: { type: "integer" },
      missingSourceCount: { type: "integer" },
      sources: {
        type: "array",
        items: {
          type: "object",
          required: [
            "sourceKey",
            "title",
            "version",
            "knowledgeGroup",
            "repositoryPath",
            "sourceType",
            "authorityClass",
            "knowledgeUse",
            "runtimeAvailability",
            "trainingEligibility",
            "commercialTrainingEligibility",
            "sourceGovernanceRequired",
            "governanceMapping",
            "fingerprint",
          ],
        },
      },
      missingSources: { type: "array" },
    },
  };
}

function readme() {
  return `# Flow BLM Knowledge Source Vault

This directory is the permanent repository-native source vault for approved Flow BLM source documents. It records where the original documents live, how they are classified, which version is present, and which Task 001 governance concepts must authorize later extraction or publication.

All BLM knowledge-engineering tasks must begin by reading \`knowledge/blm/manifests/sources.manifest.json\`.
Do not rely on remembered document names or machine-local paths.

## Source Groups

- \`GLOBAL_CORE\`: global BLM business knowledge source material. These documents may be candidates for governed extraction, mapping, context, or evaluation use after Task 001 review.
- \`CURRICULUM\`: curriculum modules. These are learning/curriculum sources and are not automatically universal runtime knowledge.
- \`EVALUATION\`: synthetic case studies, demos, and benchmark fixtures. These must not be promoted to global BLM knowledge.
- \`FLOW_INTERNAL\`: Flow strategy, fundraising, and product planning context. These remain isolated from universal runtime knowledge and model prompts unless a future task explicitly authorizes that use.

## Originals vs Compiled Assets

\`knowledge/blm/sources/\` preserves the original supplied documents. Do not rewrite these files into summaries and discard the originals.

\`knowledge/blm/compiled/\` is reserved for later governed compilers. Task 007.0 does not publish compiled BLM knowledge.

## Governance

The Task 001 source-governance contracts remain authoritative:

- \`BusinessSource\`
- \`SourceRelease\`
- \`SourceLicenseProfile\`
- \`BusinessKnowledgeUnit\`

The source vault prepares deterministic seed candidates for those contracts but does not automatically grant model-training or commercial-training permission.

Documents are not automatically truth. Later extraction must classify facts, inferences, recommendations, and assumptions, then link every extracted knowledge unit to source provenance and review status.

Do not load these documents wholesale into every LLM prompt. Future context compilers must select only task-relevant source-backed knowledge and must preserve permission, authority, and tenant boundaries.

## Adding A Source

1. Place the original file under the correct \`knowledge/blm/sources/<group>/\` directory.
2. Add one record to \`knowledge/blm/manifests/sources.manifest.json\`.
3. Set \`sourceGovernanceRequired: true\`.
4. Add or update the Task 001 governance mapping.
5. Regenerate \`knowledge/blm/manifests/checksums.manifest.json\`.
6. Run \`pnpm blm:knowledge:sources:validate\`.

## Updating A Version

Add the new file as a new versioned source record or update the existing record only when the source is truly the same release. Preserve superseded source files unless a future retention policy says otherwise.

## Superseding A Source

Use release metadata to identify the superseding source and keep the older source available for audit. Do not silently replace source files.

## Evaluation And Internal Isolation

Synthetic evaluation documents belong to \`EVALUATION\` and are fixture material only. Flow-internal strategy documents belong to \`FLOW_INTERNAL\` and must not become global runtime knowledge.

## Commands

- \`pnpm blm:knowledge:sources:list\`
- \`pnpm blm:knowledge:sources:validate\`
- \`pnpm blm:knowledge:sources:test\`
`;
}

function validate() {
  const errors = [];
  for (const path of [
    MANIFEST_PATH,
    CHECKSUM_PATH,
    RELEASE_PATH,
    SCHEMA_PATH,
  ]) {
    if (!existsSync(join(ROOT, path))) errors.push(`missing file: ${path}`);
  }
  if (errors.length > 0) return fail(errors);

  const manifest = readJson(MANIFEST_PATH);
  const checksumManifest = readJson(CHECKSUM_PATH);
  const releaseManifest = readJson(RELEASE_PATH);
  const seenKeys = new Set();
  const seenPaths = new Set();
  const checksumByKey = new Map(
    checksumManifest.checksums.map((entry) => [entry.sourceKey, entry]),
  );

  if (manifest.schemaVersion !== 1) errors.push("invalid schemaVersion");
  if (manifest.task001GovernanceRequired !== true) {
    errors.push("task001GovernanceRequired must be true");
  }
  if (manifest.sourceCount !== manifest.sources.length) {
    errors.push("sourceCount does not match sources length");
  }

  for (const record of manifest.sources) {
    validateRecord(record, errors, seenKeys, seenPaths, checksumByKey);
  }

  if (
    JSON.stringify(releaseManifest.sourceKeys) !==
    JSON.stringify(manifest.sources.map((record) => record.sourceKey))
  ) {
    errors.push("release manifest sourceKeys do not match source manifest");
  }

  if (errors.length > 0) return fail(errors);
  console.log(
    `BLM knowledge source validation passed: ${manifest.sources.length} sources, ${manifest.missingSources.length} missing-source notices.`,
  );
}

function validateRecord(record, errors, seenKeys, seenPaths, checksumByKey) {
  if (!record.sourceKey) errors.push("missing sourceKey");
  if (seenKeys.has(record.sourceKey)) {
    errors.push(`duplicate sourceKey: ${record.sourceKey}`);
  }
  seenKeys.add(record.sourceKey);
  if (!record.version) errors.push(`missing version: ${record.sourceKey}`);
  if (!GROUPS.has(record.knowledgeGroup)) {
    errors.push(`invalid knowledgeGroup: ${record.sourceKey}`);
  }
  if (!record.repositoryPath) {
    errors.push(`missing repositoryPath: ${record.sourceKey}`);
  } else {
    if (
      record.repositoryPath.startsWith("/") ||
      record.repositoryPath.includes(":\\")
    )
      errors.push(`absolute path is not allowed: ${record.sourceKey}`);
    if (record.repositoryPath.includes("Users/sheikhhadihassan")) {
      errors.push(`machine-specific path is not allowed: ${record.sourceKey}`);
    }
    if (seenPaths.has(record.repositoryPath)) {
      errors.push(`duplicate repositoryPath: ${record.repositoryPath}`);
    }
    seenPaths.add(record.repositoryPath);
    if (!existsSync(join(ROOT, record.repositoryPath))) {
      errors.push(`source file missing: ${record.sourceKey}`);
    }
  }
  if (record.sourceGovernanceRequired !== true) {
    errors.push(`sourceGovernanceRequired must be true: ${record.sourceKey}`);
  }
  for (const use of record.knowledgeUse ?? []) {
    if (!USES.has(use))
      errors.push(`invalid knowledgeUse ${use}: ${record.sourceKey}`);
  }
  if (
    record.knowledgeGroup === "EVALUATION" &&
    (record.universalRuntimeKnowledge || record.runtimeAvailability)
  ) {
    errors.push(
      `evaluation source marked runtime knowledge: ${record.sourceKey}`,
    );
  }
  if (record.knowledgeGroup === "FLOW_INTERNAL") {
    if (record.universalRuntimeKnowledge || record.runtimeAvailability) {
      errors.push(
        `Flow internal source marked runtime knowledge: ${record.sourceKey}`,
      );
    }
    if ((record.knowledgeUse ?? []).some((use) => use !== "REFERENCE")) {
      errors.push(
        `Flow internal source has non-reference use: ${record.sourceKey}`,
      );
    }
  }
  const checksum = checksumByKey.get(record.sourceKey);
  if (!checksum) {
    errors.push(`checksum missing: ${record.sourceKey}`);
  } else if (record.repositoryPath !== checksum.repositoryPath) {
    errors.push(`checksum path mismatch: ${record.sourceKey}`);
  } else {
    const actualPath = join(ROOT, record.repositoryPath);
    if (!existsSync(actualPath)) return;
    const actualSha = sha256File(actualPath);
    const actualSize = statSync(actualPath).size;
    if (actualSha !== checksum.sha256) {
      errors.push(`checksum mismatch: ${record.sourceKey}`);
    }
    if (actualSize !== checksum.fileSize) {
      errors.push(`file size mismatch: ${record.sourceKey}`);
    }
  }
}

function fail(errors) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
}

function list() {
  const manifest = readJson(MANIFEST_PATH);
  for (const record of manifest.sources) {
    console.log(
      [
        record.sourceKey,
        record.title,
        record.version,
        record.knowledgeGroup,
        record.status,
        record.repositoryPath,
      ].join(" | "),
    );
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2] ?? "validate";
  if (command === "generate") generate();
  else if (command === "validate") validate();
  else if (command === "list") list();
  else {
    console.error(`Unknown command: ${command}`);
    process.exitCode = 1;
  }
}

export {
  CHECKSUM_PATH,
  MANIFEST_PATH,
  RELEASE_PATH,
  ROOT,
  validateRecord,
  sources,
};
