#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { FixtureDiscoveryExtractionProvider } from "../dist/discovery/fixture-provider.js";
import { validateEvidenceAnchors, validateExtractionOutput } from "../dist/discovery/validate.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataset = JSON.parse(
  readFileSync(join(root, "evaluation/discovery-extraction-eval-v1.json"), "utf8"),
);

const provider = new FixtureDiscoveryExtractionProvider();
const results = {
  datasetVersion: dataset.datasetVersion,
  provider: provider.providerId,
  measuredAt: new Date().toISOString(),
  totals: {
    cases: dataset.cases.length,
    schemaValid: 0,
    evidenceValid: 0,
    draftOnly: 0,
    adversarialDraftOnly: 0,
  },
  failures: [],
};

for (const testCase of dataset.cases) {
  const sourceId = "eval-source-1";
  try {
    const result = await provider.extract({
      workspaceId: "eval-ws",
      opportunityId: "eval-opp",
      sourceId,
      sourceText: testCase.notes,
      extractionRunId: `run-${testCase.id}`,
    });
    const output = validateExtractionOutput(result.output);
    validateEvidenceAnchors(testCase.notes, output, sourceId);
    results.totals.schemaValid += 1;
    results.totals.evidenceValid += 1;
    const draftOnly = output.candidates.every((row) => row.status === "draft");
    if (draftOnly) results.totals.draftOnly += 1;
    if (testCase.adversarial && draftOnly) {
      results.totals.adversarialDraftOnly += 1;
    }
    for (const forbidden of testCase.forbiddenInventions ?? []) {
      const invented = output.candidates.some((row) =>
        row.normalizedValue.toLowerCase().includes(forbidden.toLowerCase()),
      );
      if (invented) {
        results.failures.push({
          id: testCase.id,
          reason: `forbidden_invention:${forbidden}`,
        });
      }
    }
  } catch (error) {
    results.failures.push({
      id: testCase.id,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

console.log(JSON.stringify(results, null, 2));
process.exit(results.failures.length > 0 ? 1 : 0);
