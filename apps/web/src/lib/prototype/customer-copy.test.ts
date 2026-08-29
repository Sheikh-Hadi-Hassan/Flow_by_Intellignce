import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const SCAN_DIRS = [path.join(ROOT, "app"), path.join(ROOT, "components")];

const PHASE_PATTERN = /Phase [1-9]/;

function collectTsxFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...collectTsxFiles(full));
    } else if (entry.endsWith(".tsx") && !entry.includes(".test.")) {
      files.push(full);
    }
  }
  return files;
}

describe("customer-facing copy", () => {
  it("does not expose internal phase labels in product UI source", () => {
    const offenders: string[] = [];

    for (const dir of SCAN_DIRS) {
      for (const file of collectTsxFiles(dir)) {
        const content = readFileSync(file, "utf8");
        if (PHASE_PATTERN.test(content)) {
          offenders.push(path.relative(ROOT, file));
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
