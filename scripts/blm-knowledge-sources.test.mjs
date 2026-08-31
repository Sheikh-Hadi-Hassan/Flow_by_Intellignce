import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  CHECKSUM_PATH,
  MANIFEST_PATH,
  RELEASE_PATH,
  ROOT,
} from "./blm-knowledge-sources.mjs";

const manifest = readJson(MANIFEST_PATH);
const checksumManifest = readJson(CHECKSUM_PATH);
const releaseManifest = readJson(RELEASE_PATH);

test("source manifest has unique source keys and paths", () => {
  assert.equal(
    new Set(manifest.sources.map((source) => source.sourceKey)).size,
    12,
  );
  assert.equal(
    new Set(manifest.sources.map((source) => source.repositoryPath)).size,
    12,
  );
});

test("source files exist and checksums are reproducible", () => {
  const checksumsBySourceKey = new Map(
    checksumManifest.checksums.map((entry) => [entry.sourceKey, entry]),
  );

  for (const source of manifest.sources) {
    const checksum = checksumsBySourceKey.get(source.sourceKey);
    assert.ok(checksum, `missing checksum for ${source.sourceKey}`);
    assert.equal(checksum.repositoryPath, source.repositoryPath);
    assert.equal(
      statSync(join(ROOT, source.repositoryPath)).size,
      checksum.fileSize,
    );
  }
});

test("classification keeps synthetic and internal sources isolated", () => {
  for (const source of manifest.sources) {
    assert.equal(source.sourceGovernanceRequired, true);
    assert.equal(source.trainingEligibility, "TASK_001_GOVERNED");
    assert.equal(source.commercialTrainingEligibility, "TASK_001_GOVERNED");
    assert.equal(source.repositoryPath.startsWith("/"), false);
    assert.equal(source.repositoryPath.includes("/Users/"), false);
  }

  const evaluationSources = manifest.sources.filter(
    (source) => source.knowledgeGroup === "EVALUATION",
  );
  assert.ok(evaluationSources.length > 0);
  for (const source of evaluationSources) {
    assert.equal(source.isSyntheticEvaluation, true);
    assert.equal(source.universalRuntimeKnowledge, false);
    assert.equal(source.runtimeAvailability, false);
  }

  const internalSources = manifest.sources.filter(
    (source) => source.knowledgeGroup === "FLOW_INTERNAL",
  );
  assert.ok(internalSources.length > 0);
  for (const source of internalSources) {
    assert.equal(source.isFlowInternal, true);
    assert.deepEqual(source.knowledgeUse, ["REFERENCE"]);
    assert.equal(source.universalRuntimeKnowledge, false);
    assert.equal(source.runtimeAvailability, false);
  }
});

test("release manifest tracks exactly the source manifest keys", () => {
  assert.deepEqual(
    releaseManifest.sourceKeys,
    manifest.sources.map((source) => source.sourceKey),
  );
  assert.equal(releaseManifest.status, "SOURCE_INVENTORY_READY");
  assert.equal(releaseManifest.compiledKnowledgeStatus, "NOT_COMPILED");
});

function readJson(path) {
  return JSON.parse(readFileSync(join(ROOT, path), "utf8"));
}
