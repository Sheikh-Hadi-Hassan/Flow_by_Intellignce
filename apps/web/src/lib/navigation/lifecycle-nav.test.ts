import { describe, expect, it } from "vitest";

import {
  founderLifecycleNav,
  isLifecycleNavActive,
} from "./lifecycle-nav";

describe("lifecycle navigation", () => {
  const nav = founderLifecycleNav("acme");

  it("exposes business lifecycle stages instead of module labels", () => {
    expect(nav.map((item) => item.label)).toEqual([
      "Mission Control",
      "Sales",
      "Discovery",
      "Proposal",
      "Contracts",
      "Projects",
      "Reporting",
    ]);
  });

  it("highlights discovery for opportunity routes", () => {
    const discovery = nav.find((item) => item.id === "discovery")!;
    expect(
      isLifecycleNavActive(
        "/acme/admin/opportunities/opp-1/discovery",
        discovery,
      ),
    ).toBe(true);
    expect(
      isLifecycleNavActive("/acme/admin/opportunities/opp-1/proposal", discovery),
    ).toBe(false);
  });

  it("highlights proposal for proposal routes", () => {
    const proposal = nav.find((item) => item.id === "proposal")!;
    expect(
      isLifecycleNavActive(
        "/acme/admin/opportunities/opp-1/proposal",
        proposal,
      ),
    ).toBe(true);
    expect(
      isLifecycleNavActive("/acme/admin/lifecycle/proposals", proposal),
    ).toBe(true);
  });
});
