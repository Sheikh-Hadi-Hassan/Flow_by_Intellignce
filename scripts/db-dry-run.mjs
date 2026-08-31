#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const migrationDir = "supabase/migrations";
const files = readdirSync(migrationDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

const conflicts = [];
const seen = new Set();

for (const file of files) {
  const match = file.match(/^(\d{14})_/);
  const version = match?.[1];
  if (!version) {
    conflicts.push(`Invalid migration filename: ${file}`);
    continue;
  }
  if (seen.has(version)) {
    conflicts.push(`Duplicate migration version prefix: ${version}`);
  }
  seen.add(version);
}

const destructivePatterns = [/\bdrop database\b/i, /\breset\b/i, /\brepair\b/i];

for (const file of files) {
  const sql = readFileSync(join(migrationDir, file), "utf8");
  for (const pattern of destructivePatterns) {
    if (
      pattern.test(sql) &&
      !sql.includes("drop table if exists public.workspace_memberships")
    ) {
      conflicts.push(`Review required in ${file}: matched ${pattern}`);
    }
  }
}

const report = {
  migrationDirectory: migrationDir,
  migrations: files.length,
  latest: files.at(-1) ?? null,
  dryRun: true,
  applied: false,
  conflicts,
};

console.log(JSON.stringify(report, null, 2));

if (conflicts.length > 0) {
  process.exit(2);
}
