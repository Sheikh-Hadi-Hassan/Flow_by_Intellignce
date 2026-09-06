import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { analyzeCommand, detectSecretLiterals, detectConflictMarkers } from "../lib/hook-utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOKS_DIR = join(__dirname, "..");
const QUALITY_DIR = join(HOOKS_DIR, "..", "quality");

function runHook(script, stdin = {}) {
  const result = spawnSync("node", [join(HOOKS_DIR, script)], {
    input: JSON.stringify(stdin),
    encoding: "utf8",
  });
  return {
    exitCode: result.status,
    stdout: result.stdout?.trim() ?? "",
    stderr: result.stderr?.trim() ?? "",
  };
}

function parsePermission(stdout) {
  return JSON.parse(stdout);
}

test("analyzeCommand allows safe test command", () => {
  const result = analyzeCommand("npx pnpm@11.16.0 test");
  assert.equal(result.action, "allow");
});

test("analyzeCommand denies git add .", () => {
  const result = analyzeCommand("git add .");
  assert.equal(result.action, "deny");
});

test("analyzeCommand denies git reset --hard", () => {
  const result = analyzeCommand("git reset --hard HEAD");
  assert.equal(result.action, "deny");
});

test("analyzeCommand denies git stash apply", () => {
  const result = analyzeCommand("git stash apply stash@{0}");
  assert.equal(result.action, "deny");
});

test("analyzeCommand denies wrong Supabase project", () => {
  const result = analyzeCommand("supabase link --project-ref apptech");
  assert.equal(result.action, "deny");
});

test("analyzeCommand allows approved Supabase read-only command", () => {
  const result = analyzeCommand(
    "npx supabase@2.116.0 migration list --linked --project-ref zuvtnmmnwohrapaecsuj",
  );
  assert.equal(result.action, "allow");
});

test("analyzeCommand denies .env printing", () => {
  const result = analyzeCommand("cat .env.local");
  assert.equal(result.action, "deny");
});

test("detectSecretLiterals finds JWT pattern", () => {
  const findings = detectSecretLiterals("token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U");
  assert.ok(findings.length > 0);
});

test("detectConflictMarkers finds merge conflict", () => {
  assert.equal(detectConflictMarkers("<<<<<<< HEAD\nfoo\n=======\nbar\n>>>>>>> main"), true);
});

test("command-guard allows safe command", () => {
  const { exitCode, stdout } = runHook("command-guard.mjs", { command: "pnpm lint" });
  assert.equal(exitCode, 0);
  assert.equal(parsePermission(stdout).permission, "allow");
});

test("command-guard denies git add .", () => {
  const { exitCode, stdout } = runHook("command-guard.mjs", { command: "git add ." });
  assert.equal(exitCode, 2);
  assert.equal(parsePermission(stdout).permission, "deny");
});

test("closure guard allows normal stop without closure request", () => {
  const closurePath = join(QUALITY_DIR, "closure-request.json");
  const hadClosure = existsSync(closurePath);
  if (hadClosure) rmSync(closurePath);
  const { exitCode } = runHook("closure-guard.mjs", {});
  assert.equal(exitCode, 0);
});

test("closure guard denies PASS without evidence", () => {
  mkdirSync(QUALITY_DIR, { recursive: true });
  writeFileSync(join(QUALITY_DIR, "closure-request.json"), "{}");
  writeFileSync(join(QUALITY_DIR, "evidence-manifest.json"), "{}");
  const { stdout } = runHook("closure-guard.mjs", {});
  const parsed = JSON.parse(stdout || "{}");
  assert.ok(parsed.followup_message?.includes("denied"));
  rmSync(join(QUALITY_DIR, "closure-request.json"));
  rmSync(join(QUALITY_DIR, "evidence-manifest.json"));
});

test("closure guard allows PARTIAL report", () => {
  mkdirSync(QUALITY_DIR, { recursive: true });
  const partial = readFileSync(join(__dirname, "../test-fixtures/evidence-partial.json"), "utf8");
  writeFileSync(join(QUALITY_DIR, "closure-request.json"), "{}");
  writeFileSync(join(QUALITY_DIR, "evidence-manifest.json"), partial);
  const { stdout } = runHook("closure-guard.mjs", {});
  const parsed = JSON.parse(stdout || "{}");
  assert.equal(parsed.followup_message, undefined);
  rmSync(join(QUALITY_DIR, "closure-request.json"));
  rmSync(join(QUALITY_DIR, "evidence-manifest.json"));
});

test("closure guard denies PASS without product-owner visual approval", () => {
  mkdirSync(QUALITY_DIR, { recursive: true });
  const fixture = readFileSync(
    join(__dirname, "../test-fixtures/evidence-pass-no-po-approval.json"),
    "utf8",
  );
  writeFileSync(join(QUALITY_DIR, "closure-request.json"), "{}");
  writeFileSync(join(QUALITY_DIR, "evidence-manifest.json"), fixture);
  const { stdout } = runHook("closure-guard.mjs", {});
  const parsed = JSON.parse(stdout || "{}");
  assert.ok(parsed.followup_message?.includes("product-owner visual approval"));
  rmSync(join(QUALITY_DIR, "closure-request.json"));
  rmSync(join(QUALITY_DIR, "evidence-manifest.json"));
});

test("closure guard accepts PASS with complete evidence", () => {
  mkdirSync(QUALITY_DIR, { recursive: true });
  const fixture = readFileSync(join(__dirname, "../test-fixtures/evidence-pass.json"), "utf8");
  writeFileSync(join(QUALITY_DIR, "closure-request.json"), "{}");
  writeFileSync(join(QUALITY_DIR, "evidence-manifest.json"), fixture);
  const { stdout } = runHook("closure-guard.mjs", {});
  const parsed = JSON.parse(stdout || "{}");
  assert.equal(parsed.followup_message, undefined);
  rmSync(join(QUALITY_DIR, "closure-request.json"));
  rmSync(join(QUALITY_DIR, "evidence-manifest.json"));
});
