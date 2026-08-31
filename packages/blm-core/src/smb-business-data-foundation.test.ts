import { describe, expect, it } from "vitest";

import {
  createHybridSyntheticBusinessWorkspace,
  createLocalSMBOnboardingManifest,
  createWorkspaceImportSession,
  deterministicDataReleaseFingerprint,
  generateDeterministicSMBBusinesses,
  publicDataAdaptersV1,
  publicSourceGovernanceFixturesV1,
  validateSourceGovernance,
} from "./smb-business-data-foundation.js";

describe("Flow SMB Business Data Foundation v1", () => {
  it("generates ten deterministic small-business workspaces", () => {
    const first = generateDeterministicSMBBusinesses();
    const second = generateDeterministicSMBBusinesses();

    expect(first).toHaveLength(10);
    expect(first.map((item) => item.businessType)).toEqual(
      expect.arrayContaining([
        "Grocery / neighborhood retail",
        "Digital marketing agency",
        "Professional services / consulting",
        "B2B SaaS",
        "E-commerce",
        "Rental / asset business",
        "Wholesale / distribution",
        "Restaurant / food business",
        "Construction / field service",
        "Small manufacturing",
      ]),
    );
    expect(deterministicDataReleaseFingerprint(first)).toBe(
      deterministicDataReleaseFingerprint(second),
    );
  });

  it("marks all synthetic fields with synthetic provenance", () => {
    const records = generateDeterministicSMBBusinesses().flatMap(
      (business) => business.records,
    );

    expect(records.length).toBeGreaterThan(30);
    expect(
      records.every((record) =>
        Object.values(record.fieldProvenance).every(
          (provenance) => provenance === "SYNTHETIC_CREATED",
        ),
      ),
    ).toBe(true);
  });

  it("normalizes three public source families through governed adapters", () => {
    const snapshots = publicSourceGovernanceFixturesV1.map((source) => ({
      source,
      rawRows: [
        {
          invoiceNo: "INV-1",
          stockCode: "SKU-1",
          quantity: 2,
          amount: 25,
          campaign: "C1",
          response: true,
          metric: "Revenue",
          period: "FY2025",
          value: 1000,
        },
      ],
    }));
    const records = publicDataAdaptersV1.flatMap((adapter, index) =>
      adapter.normalize(snapshots[index]!),
    );

    expect(publicDataAdaptersV1.map((adapter) => adapter.sourceFamily)).toEqual(
      ["RETAIL_TRANSACTION", "MARKETING_CRM", "CORPORATE_FINANCIAL_XBRL"],
    );
    expect(records).toHaveLength(3);
    expect(
      records.every(
        (record) => record.corpusClassification === "PUBLIC_REAL_CORPUS",
      ),
    ).toBe(true);
  });

  it("rejects unknown-license public sources for training", () => {
    const retail = publicSourceGovernanceFixturesV1[0]!;

    expect(validateSourceGovernance(retail)).toContain(
      "UNKNOWN_LICENSE_NOT_TRAINING_APPROVED",
    );
  });

  it("defaults local SMB imports to workspace-only data classification", () => {
    const session = createWorkspaceImportSession({
      importSessionId: "import-1",
      workspaceId: "workspace-local",
      sourceType: "CSV",
    });
    const manifest = createLocalSMBOnboardingManifest({
      businessId: "local-grocery",
      workspaceId: "workspace-local",
      businessType: "Grocery store",
      industry: "Retail",
      country: "US",
      currency: "USD",
      sourceSystems: ["CSV", "POS_EXPORT", "ACCOUNTING_EXPORT"],
    });

    expect(session.dataUseClassification).toBe("WORKSPACE_ONLY");
    expect(manifest.trainingEligibility.allowedForTraining).toBe(false);
    expect(manifest.consentProfile.trainingConsentRequired).toBe(true);
  });

  it("preserves hybrid real and synthetic provenance without relabeling facts", () => {
    const hybrid = createHybridSyntheticBusinessWorkspace();
    const provenanceKinds = new Set(
      hybrid.records.flatMap((record) => Object.values(record.fieldProvenance)),
    );

    expect(provenanceKinds.has("REAL_SOURCE")).toBe(true);
    expect(provenanceKinds.has("SYNTHETIC_CREATED")).toBe(true);
    expect(hybrid.hybridSources.map((source) => source.sourceKind)).toEqual(
      expect.arrayContaining(["REAL_SOURCE", "SYNTHETIC_CREATED"]),
    );
  });
});
