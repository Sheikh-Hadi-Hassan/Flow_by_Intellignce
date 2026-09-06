import { describe, expect, it } from "vitest";
import { northstarBusinessRegistrySeed } from "@flow/contracts";

import {
  applyBusinessRegistrySeed,
  archiveDemoLocation,
  businessRegistryView,
  readBusinessRegistryState,
  setBusinessRegistryRole,
  updateTradingName,
} from "./store";

describe("business registry demo store", () => {
  it("seeds one entity and two locations, and archives the non-primary", () => {
    applyBusinessRegistrySeed(northstarBusinessRegistrySeed(), "local");
    const seed = readBusinessRegistryState().seed;
    expect(seed?.organizationId).toBe("00000000-0000-4000-b001-000000000001");
    expect(seed?.locations.filter((row) => row.status === "ACTIVE")).toHaveLength(
      2,
    );
    const remote = seed?.locations.find((row) => row.demoKey === "ns-loc-remote");
    archiveDemoLocation(remote!.id, "Close the remote desk");
    expect(
      readBusinessRegistryState().seed?.locations.find(
        (row) => row.demoKey === "ns-loc-remote",
      )?.status,
    ).toBe("ARCHIVED");
    updateTradingName("Northstar Creative", "Keep trading name");
    expect(readBusinessRegistryState().seed?.audits[0]?.action).toBe(
      "business_profile.updated",
    );
  });

  it("hides tax and banking from employees", () => {
    applyBusinessRegistrySeed(northstarBusinessRegistrySeed(), "local");
    setBusinessRegistryRole("employee");
    const view = businessRegistryView();
    expect(view?.profile.tax).toEqual([]);
    expect(view?.showRestrictedFinancials).toBe(false);
    setBusinessRegistryRole("founder");
    expect(businessRegistryView()?.profile.tax.length).toBeGreaterThan(0);
  });
});
