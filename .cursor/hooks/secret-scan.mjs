#!/usr/bin/env node
/**
 * Standalone secret scanner for staged/unstaged changes.
 * Usage: node .cursor/hooks/secret-scan.mjs [paths...]
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { detectSecretLiterals } from "./lib/hook-utils.mjs";

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  "dist",
  "test-results",
  "playwright-report",
  ".git",
]);

const SKIP_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".woff", ".woff2"]);

const SKIP_PATTERNS = [
  /^\.env/,
  /playwright\/\.auth/,
  /secret-scan\.mjs$/,
  /hook-utils\.mjs$/,
];

function shouldScan(filePath) {
  if (SKIP_EXTENSIONS.has(extname(filePath))) return false;
  if (/\.test\.(mjs|ts|tsx)$/.test(filePath)) return false;
  for (const pattern of SKIP_PATTERNS) {
    if (pattern.test(filePath)) return false;
  }
  return true;
}

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (SKIP_DIRS.has(entry)) continue;
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, files);
    } else if (shouldScan(full)) {
      files.push(full);
    }
  }
  return files;
}

const roots = process.argv.slice(2);
const targets = roots.length > 0 ? roots : [".cursor", "docs/quality", "apps/web/e2e/visual"];

let failed = false;
for (const root of targets) {
  const files = statSync(root).isDirectory() ? walk(root) : [root];
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const findings = detectSecretLiterals(content);
    if (findings.length > 0) {
      console.error(`SECRET: ${file} — patterns: ${findings.join(", ")}`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}
console.log("Secret scan: PASS");
process.exit(0);
