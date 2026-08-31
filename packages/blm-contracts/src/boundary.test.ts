import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("BLM package boundaries", () => {
  it("keeps Semantica imports out of TypeScript Flow packages and apps", () => {
    const root = resolve(process.cwd(), "../..");
    const checkedFiles = [
      "packages/blm-contracts/src/index.ts",
      "packages/contracts/src/index.ts",
      "apps/api/src/app.module.ts",
      "apps/api/src/internal-actions.controller.ts",
    ].map((file) => readFileSync(resolve(root, file), "utf8"));

    for (const source of checkedFiles) {
      expect(source).not.toContain("semantica");
      expect(source).not.toContain("from 'python");
      expect(source).not.toContain('from "python');
    }
  });

  it("documents benchmark data without requiring cloud credentials", () => {
    const root = resolve(process.cwd(), "../..");
    const benchmark = readFileSync(
      resolve(root, "experiments/blm/business-intent-benchmark-v0.1.json"),
      "utf8",
    );

    expect(benchmark).toContain("roman-ur");
    expect(benchmark).toContain("ur");
    expect(benchmark).not.toContain("OPENAI_API_KEY");
    expect(benchmark).not.toContain("ANTHROPIC_API_KEY");
  });
});
