import { describe, expect, it } from "vitest";

import {
  BuildingBlockRegistry,
  NORTHSTAR_COMPOSER_PROFILE,
  NORTHSTAR_ORG_ID,
  REGISTRY_BUSINESS_BLOCK_ID,
  composeBuildingBlockRecommendations,
  crmCoreManifest,
  missingRegistrationFields,
  northstarBusinessRegistrySeed,
  northstarDemoClock,
  parseRegistryBusinessConfiguration,
  permissionsForRegistryRole,
  presentBusinessRegistry,
  registryBusinessManifest,
  scanSeedForLiveTaxIds,
} from "../index.js";

describe("Business Registry manifest", () => {
  it("registers as registry.business with owned profile and referenced organisation", () => {
    const registry = new BuildingBlockRegistry([registryBusinessManifest]);
    expect(registry.getManifest(REGISTRY_BUSINESS_BLOCK_ID)?.ownedEntities).toContain(
      "organization.profile",
    );
    expect(
      registry.getManifest(REGISTRY_BUSINESS_BLOCK_ID)?.referencedSharedEntities,
    ).toContain("organization");
    expect(
      registry.getManifest(REGISTRY_BUSINESS_BLOCK_ID)?.supportedUiStates,
    ).toContain("partial");
  });
});

describe("Business Registry composer", () => {
  it("recommends BB-01 for Northstar without replacing CRM Core", () => {
    const rows = composeBuildingBlockRecommendations(NORTHSTAR_COMPOSER_PROFILE, [
      crmCoreManifest,
      registryBusinessManifest,
    ]);
    expect(rows.map((row) => row.blockId)).toEqual([
      "crm.core",
      "registry.business",
    ]);
    expect(rows.every((row) => row.requiresHumanApproval)).toBe(true);
  });
});

describe("Northstar Business Registry seed", () => {
  it("creates exactly one legal entity and two active locations on the demo clock", () => {
    const seed = northstarBusinessRegistrySeed();
    expect(seed.organizationId).toBe(NORTHSTAR_ORG_ID);
    expect(seed.demoKey).toBe("ns-org-northstar");
    expect(seed.legalName).toBe("Northstar Creative LLC");
    expect(seed.tradingName).toBe("Northstar Creative");
    expect(seed.fictionalLabel).toBe("Fictional demonstration company");
    expect(seed.registrationNumber.startsWith("DEMO-")).toBe(true);
    expect(seed.timezone).toBe("America/Chicago");
    expect(seed.currency).toBe("USD");
    expect(seed.locations).toHaveLength(2);
    expect(seed.locations.filter((row) => row.status === "ACTIVE")).toHaveLength(2);
    expect(seed.locations.filter((row) => row.isPrimary)).toHaveLength(1);
    expect(seed.locations.map((row) => row.demoKey).sort()).toEqual([
      "ns-loc-chicago",
      "ns-loc-remote",
    ]);
    expect(northstarDemoClock().toISOString()).toBe(
      new Date("2026-09-03T08:12:00-05:00").toISOString(),
    );
    const urgencies = new Set(seed.documents.map((row) => row.urgency));
    expect(urgencies.has("valid")).toBe(true);
    expect(urgencies.has("due_30")).toBe(true);
    expect(urgencies.has("due_90")).toBe(true);
    expect(urgencies.has("recently_renewed")).toBe(true);
    expect(seed.firmographics.employeeCountTarget.provenance).toBe(
      "declared_target",
    );
    expect(seed.firmographics.employeeCountActual.provenance).toBe(
      "computed_actual",
    );
    expect(String(seed.firmographics.employeeCountActual.value)).not.toBe("24");
  });

  it("is idempotent and rejects production slugs", () => {
    const first = northstarBusinessRegistrySeed();
    const second = northstarBusinessRegistrySeed();
    expect(first.organizationId).toBe(second.organizationId);
    expect(first.locations.map((row) => row.id)).toEqual(
      second.locations.map((row) => row.id),
    );
    expect(() =>
      northstarBusinessRegistrySeed({ workspaceSlug: "acme-production" }),
    ).toThrow("production workspaces");
    const validated = northstarBusinessRegistrySeed({ validateOnly: true });
    expect(validated.organizationId).toBe(NORTHSTAR_ORG_ID);
  });

  it("rejects live EIN-shaped values without DEMO", () => {
    expect(() => scanSeedForLiveTaxIds({ ein: "36-0008417" })).toThrow(
      "EIN-shaped",
    );
    expect(() => scanSeedForLiveTaxIds(northstarBusinessRegistrySeed())).not.toThrow();
    expect(
      northstarBusinessRegistrySeed().documents.every((row) =>
        row.reference.startsWith("DEMO-"),
      ),
    ).toBe(true);
    expect(
      northstarBusinessRegistrySeed().banks.every((row) => row.lastFour.length === 4),
    ).toBe(true);
  });

  it("hides restricted fields from employees", () => {
    const seed = northstarBusinessRegistrySeed();
    const employee = presentBusinessRegistry(
      seed,
      permissionsForRegistryRole("employee"),
    );
    expect(employee.profile.tax).toEqual([]);
    expect(employee.profile.banks).toEqual([]);
    expect(employee.profile.signatories).toEqual([]);
    expect(employee.showRestrictedFinancials).toBe(false);
    const founder = presentBusinessRegistry(
      seed,
      permissionsForRegistryRole("founder"),
    );
    expect(founder.profile.tax.length).toBeGreaterThan(0);
    expect(founder.canEditProfile).toBe(true);
    expect(missingRegistrationFields(null).length).toBeGreaterThan(0);
    expect(missingRegistrationFields(seed)).toEqual([]);
  });

  it("validates configuration", () => {
    expect(() =>
      parseRegistryBusinessConfiguration({ fiscalYearStartMonth: 0 }),
    ).toThrow("Fiscal year");
    expect(parseRegistryBusinessConfiguration({}).currency).toBe("USD");
  });
});
