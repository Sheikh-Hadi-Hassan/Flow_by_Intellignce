import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { northstarDemoSession } from "../../content/demo/northstar";
import { getSetupChecklist } from "./setup-checklist";

const moduleDir = dirname(fileURLToPath(import.meta.url));

describe("setup checklist leaf module", () => {
  it("does not import recommendations or UI components", () => {
    const source = readFileSync(join(moduleDir, "setup-checklist.ts"), "utf8");
    expect(source).not.toMatch(/recommendations/);
    expect(source).not.toMatch(/components\//);
    expect(source).not.toMatch(/from "\.\/context"/);
  });

  it("exports a callable checklist builder", () => {
    expect(typeof getSetupChecklist).toBe("function");
    const checklist = getSetupChecklist(northstarDemoSession());
    expect(checklist.length).toBeGreaterThan(0);
    expect(checklist.some((item) => item.status === "Ready")).toBe(true);
  });
});
