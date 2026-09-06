import { describe, expect, it } from "vitest";

import {
  approveCrmCore,
  configureCrmCore,
  crmClientsVisible,
  isCrmCoreActive,
  readBuildingBlockState,
  submitCrmCore,
  suspendCrmCore,
} from "./store";

describe("building-block demo store", () => {
  it("activates CRM Core and seeds 52 clients without changing Mission Control math", () => {
    configureCrmCore({ duplicateThreshold: 82 });
    submitCrmCore({ duplicateThreshold: 82 });
    expect(isCrmCoreActive()).toBe(false);
    approveCrmCore();
    expect(isCrmCoreActive()).toBe(true);
    expect(crmClientsVisible()).toHaveLength(52);
    expect(crmClientsVisible().map((row) => row.name)).toContain(
      "Meridian Health",
    );
    suspendCrmCore();
    expect(isCrmCoreActive()).toBe(false);
    expect(crmClientsVisible()).toEqual([]);
    expect(readBuildingBlockState().clients).toHaveLength(52);
  });
});
