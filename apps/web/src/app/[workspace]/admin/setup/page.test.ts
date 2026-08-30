import { describe, expect, it } from "vitest";

import { northstarDemoSession } from "../../../../content/demo/northstar";
import { getSetupChecklist } from "../../../../lib/prototype/setup-checklist";

describe("admin setup page module", () => {
  it("imports without founder-home initialization", async () => {
    const pageModule = await import("./page");
    expect(typeof pageModule.default).toBe("function");
  });

  it("builds setup checklist from setup-checklist directly", () => {
    const checklist = getSetupChecklist(northstarDemoSession());
    const ready = checklist.filter((item) => item.status === "Ready");
    expect(ready.map((item) => item.label)).toContain(
      "Business profile and operating model",
    );
    expect(ready.map((item) => item.label)).toContain("Business Twin");
  });
});
