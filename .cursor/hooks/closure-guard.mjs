#!/usr/bin/env node
/**
 * stop — closure guard. Activates only when .cursor/quality/closure-request.json exists.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readStdinJson } from "./lib/hook-utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUALITY_DIR = join(__dirname, "..", "quality");
const CLOSURE_REQUEST = join(QUALITY_DIR, "closure-request.json");
const EVIDENCE_MANIFEST = join(QUALITY_DIR, "evidence-manifest.json");

const MANDATORY_VERDICTS = [
  "functionality",
  "visual",
  "accessibility",
  "security",
  "dataIntegrity",
  "browser",
  "performance",
];

function loadJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function evaluateClosure(manifest) {
  const errors = [];

  if (!manifest) {
    return ["Evidence manifest missing or invalid JSON."];
  }

  for (const key of MANDATORY_VERDICTS) {
    const verdict = manifest.verdicts?.[key];
    if (!verdict) {
      errors.push(`Missing verdict: ${key}`);
    } else if (verdict !== "PASS" && verdict !== "PARTIAL" && verdict !== "FAIL") {
      errors.push(`Invalid verdict for ${key}: ${verdict}`);
    }
  }

  if (manifest.overallVerdict === "PASS") {
    for (const key of MANDATORY_VERDICTS) {
      if (manifest.verdicts?.[key] !== "PASS") {
        errors.push(`Overall PASS blocked: ${key} is ${manifest.verdicts?.[key] ?? "missing"}`);
      }
    }

    if ((manifest.skippedTestCount ?? 0) > 0) {
      errors.push(`Overall PASS blocked: ${manifest.skippedTestCount} skipped tests`);
    }

    if (!manifest.productOwnerVisualApproval) {
      errors.push("Overall PASS blocked: product-owner visual approval not recorded");
    }

    if (manifest.secretScanPassed === false) {
      errors.push("Overall PASS blocked: secret scan failed");
    }

    if (manifest.browserConsoleErrors === true) {
      errors.push("Overall PASS blocked: browser console errors remain");
    }

    const builder = manifest.builderAgentId;
    const evaluators = manifest.evaluatorAgentIds ?? [];
    if (builder && evaluators.length === 1 && evaluators[0] === builder) {
      errors.push("Overall PASS blocked: same agent is builder and only evaluator");
    }

    if (!Array.isArray(manifest.commandsRun) || manifest.commandsRun.length === 0) {
      errors.push("Overall PASS blocked: no commands recorded");
    }

    if (!Array.isArray(manifest.screenshotPaths) || manifest.screenshotPaths.length === 0) {
      errors.push("Overall PASS blocked: no screenshot paths recorded");
    }

    if (!Array.isArray(manifest.criticReports) || manifest.criticReports.length === 0) {
      errors.push("Overall PASS blocked: no independent critic reports");
    }
  }

  return errors;
}

async function main() {
  await readStdinJson();

  if (!existsSync(CLOSURE_REQUEST)) {
    process.exit(0);
  }

  const manifest = loadJson(EVIDENCE_MANIFEST);
  const errors = evaluateClosure(manifest);

  if (errors.length > 0) {
    const message = [
      "Closure guard denied completion:",
      ...errors.map((e) => `- ${e}`),
      "",
      "Fix evidence in .cursor/quality/evidence-manifest.json or set overallVerdict to PARTIAL/FAIL.",
      "The closure guard cannot forge evidence.",
    ].join("\n");

    console.log(JSON.stringify({ followup_message: message }));
    process.exit(0);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(0);
});
