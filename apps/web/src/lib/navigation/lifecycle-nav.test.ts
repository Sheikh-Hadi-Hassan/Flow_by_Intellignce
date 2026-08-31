import { describe, expect, it } from "vitest";

import {
  founderLifecycleNav,
  founderUtilityNav,
  isLifecycleNavActive,
  MOBILE_LIFECYCLE_NAV_IDS,
} from "./lifecycle-nav";

describe("lifecycle-nav", () => {
  const workspace = "acme";
  const nav = founderLifecycleNav(workspace);

  it("maps primary nav to real routes only", () => {
    const hrefs = nav.map((item) => item.href);
    expect(hrefs).toEqual([
      `/${workspace}/admin`,
      `/${workspace}/admin/clients`,
      `/${workspace}/admin/opportunities`,
      `/${workspace}/admin/lifecycle/projects`,
      `/${workspace}/admin/team`,
      `/${workspace}/work`,
      `/${workspace}/admin/lifecycle/reporting`,
    ]);
  });

  it("marks pipeline active for opportunity and lifecycle commercial routes", () => {
    const pipeline = nav.find((item) => item.id === "pipeline")!;
    expect(
      isLifecycleNavActive(`/${workspace}/admin/opportunities/abc`, pipeline),
    ).toBe(true);
    expect(
      isLifecycleNavActive(`/${workspace}/admin/lifecycle/proposals`, pipeline),
    ).toBe(true);
    expect(
      isLifecycleNavActive(`/${workspace}/admin/lifecycle/contracts`, pipeline),
    ).toBe(true);
    expect(
      isLifecycleNavActive(`/${workspace}/admin/lifecycle/projects`, pipeline),
    ).toBe(false);
  });

  it("marks delivery active for project routes", () => {
    const delivery = nav.find((item) => item.id === "delivery")!;
    expect(
      isLifecycleNavActive(
        `/${workspace}/admin/opportunities/x/project`,
        delivery,
      ),
    ).toBe(true);
    expect(
      isLifecycleNavActive(`/${workspace}/admin/lifecycle/projects`, delivery),
    ).toBe(true);
  });

  it("exposes utility nav for twin, setup, services, settings", () => {
    const utility = founderUtilityNav(workspace).map((item) => item.label);
    expect(utility).toEqual([
      "Business Twin",
      "Setup plan",
      "Services",
      "Settings",
    ]);
  });

  it("limits mobile bottom nav to four lifecycle items plus more", () => {
    expect(MOBILE_LIFECYCLE_NAV_IDS).toEqual([
      "mission",
      "pipeline",
      "delivery",
      "mywork",
    ]);
  });
});
