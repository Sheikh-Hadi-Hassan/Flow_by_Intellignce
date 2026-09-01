#!/usr/bin/env node
/**
 * afterFileEdit — lightweight post-edit checks and audit trail.
 */
import { appendFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { detectConflictMarkers, detectSecretLiterals } from "./lib/hook-utils.mjs";
import { readStdinJson } from "./lib/hook-utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUDIT_LOG = join(__dirname, "..", "quality", "edit-audit.log");
const QUALITY_DIR = join(__dirname, "..", "quality");

async function main() {
  const input = await readStdinJson();
  const filePath =
    input.file_path ?? input.path ?? input.filePath ?? input.edited_file ?? "";

  if (!filePath) {
    process.exit(0);
  }

  mkdirSync(QUALITY_DIR, { recursive: true });
  const timestamp = new Date().toISOString();
  appendFileSync(AUDIT_LOG, `${timestamp}\t${filePath}\n`);

  const findings = [];
  if (existsSync(filePath)) {
    const content = readFileSync(filePath, "utf8");
    if (detectConflictMarkers(content)) {
      findings.push(`Conflict markers detected in ${filePath}`);
    }
    const secrets = detectSecretLiterals(content);
    if (secrets.length > 0) {
      findings.push(`Possible secret literals in ${filePath}: ${secrets.join(", ")}`);
    }
  }

  if (findings.length > 0) {
    console.log(
      JSON.stringify({
        additional_context: `Edit quality warnings:\n${findings.map((f) => `- ${f}`).join("\n")}`,
      }),
    );
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(0);
});
