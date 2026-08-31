import { describe, expect, it } from "vitest";

import {
  BusinessExpertiseRegistry,
  blmDomainPackIdsV1,
  blmSourceManifestV1,
  type BusinessKnowledgeSource,
} from "@flow/blm-contracts";
import {
  ComponentRegistry,
  customerManagementComponentId,
} from "@flow/blm-contracts";
import { toSemanticId } from "@flow/blm-contracts";

import {
  GistProofSourceAdapter,
  KnowledgeAcquisitionPipeline,
  MantleProofSourceAdapter,
  UblProofSourceAdapter,
  blmKnowledgeAcquisitionMappingsV1,
  createBlmKnowledgeAcquisitionPipelineV1,
  createKnowledgeRelease,
  createSourceSnapshot,
  deriveSourceTrustState,
  diffKnowledgeReleases,
  getDomainPackForConcept,
  getSourcesForConcept,
  runBlmKnowledgeAcquisitionProofV1,
  stableFingerprint,
  type ExternalSemanticMapping,
} from "./knowledge-acquisition.js";

function source(id: string): BusinessKnowledgeSource {
  const found = blmSourceManifestV1.find((candidate) => candidate.id === id);
  if (!found) {
    throw new Error(`Missing test source: ${id}`);
  }
  return found;
}

describe("BLM Knowledge Acquisition Pipeline v1", () => {
  it("allows only approved sources to enter controlled ingestion", () => {
    expect(deriveSourceTrustState(source("moqui.mantle-udm"))).toBe("APPROVED");
    expect(deriveSourceTrustState(source("semanticarts.gist"))).toBe(
      "APPROVED",
    );
    expect(deriveSourceTrustState(source("oasis.ubl-2.4"))).toBe("APPROVED");
  });

  it("blocks review-required and reference-only sources from publication", () => {
    const pipeline = createBlmKnowledgeAcquisitionPipelineV1();
    const reviewRequired = pipeline.run({
      sourceIds: ["xbrl.global-ledger"],
      mappingVersion: "test",
      releaseId: "review-required",
      releaseVersion: "0.0.0",
      createdAt: "2026-08-11",
    });
    const referenceOnly = pipeline.run({
      sourceIds: ["apache.ofbiz-framework"],
      mappingVersion: "test",
      releaseId: "reference-only",
      releaseVersion: "0.0.0",
      createdAt: "2026-08-11",
    });

    expect(reviewRequired.report.licenseBlocks).toHaveLength(1);
    expect(reviewRequired.publishedItems).toHaveLength(0);
    expect(referenceOnly.report.issues).toContainEqual(
      expect.objectContaining({ code: "SOURCE_REFERENCE_ONLY" }),
    );
    expect(referenceOnly.publishedItems).toHaveLength(0);
  });

  it("blocks rejected or unknown sources before adapter execution", () => {
    const rejectedSource: BusinessKnowledgeSource = {
      ...source("moqui.mantle-udm"),
      id: "flow.test.rejected-source",
      decision: "REJECT",
      licenseStatus: "RESTRICTED",
      importPolicy: "NO_INGESTION",
    };
    const pipeline = new KnowledgeAcquisitionPipeline({
      sources: [rejectedSource],
      adapters: [new MantleProofSourceAdapter()],
      mappings: [],
    });
    const rejected = pipeline.run({
      sourceIds: ["flow.test.rejected-source"],
      mappingVersion: "test",
      releaseId: "rejected",
      releaseVersion: "0.0.0",
      createdAt: "2026-08-11",
    });
    const unknown = pipeline.run({
      sourceIds: ["missing.source"],
      mappingVersion: "test",
      releaseId: "unknown",
      releaseVersion: "0.0.0",
      createdAt: "2026-08-11",
    });

    expect(rejected.report.issues).toContainEqual(
      expect.objectContaining({ code: "SOURCE_REJECTED" }),
    );
    expect(unknown.report.issues).toContainEqual(
      expect.objectContaining({ code: "UNKNOWN_SOURCE" }),
    );
  });

  it("captures reproducible source snapshot version identity", () => {
    const snapshot = createSourceSnapshot(source("moqui.mantle-udm"));
    const repeated = createSourceSnapshot(source("moqui.mantle-udm"));

    expect(snapshot).toMatchObject({
      sourceId: "moqui.mantle-udm",
      commitSha: "f53aba96a14fc97c6b42918300ee880fa0eb03a1",
      ingestionPolicy: "APPROVED",
    });
    expect(repeated.contentFingerprint).toBe(snapshot.contentFingerprint);
  });

  it("keeps source adapter extraction isolated by source", () => {
    const mantle = new MantleProofSourceAdapter().extract(
      createSourceSnapshot(source("moqui.mantle-udm")),
    );
    const gist = new GistProofSourceAdapter().extract(
      createSourceSnapshot(source("semanticarts.gist")),
    );
    const ubl = new UblProofSourceAdapter().extract(
      createSourceSnapshot(source("oasis.ubl-2.4")),
    );

    expect(
      mantle.nativeItems.every((item) => item.sourceId === "moqui.mantle-udm"),
    ).toBe(true);
    expect(
      gist.nativeItems.every((item) => item.sourceId === "semanticarts.gist"),
    ).toBe(true);
    expect(
      ubl.nativeItems.every((item) => item.sourceId === "oasis.ubl-2.4"),
    ).toBe(true);
  });

  it("extracts the controlled Mantle proof subset", () => {
    const extraction = new MantleProofSourceAdapter().extract(
      createSourceSnapshot(source("moqui.mantle-udm")),
    );

    expect(extraction.nativeItems.map((item) => item.sourceConceptId)).toEqual(
      expect.arrayContaining([
        "mantle.party.Party",
        "mantle.party.Person",
        "mantle.party.Organization",
        "mantle.product.Product",
        "mantle.order.OrderHeader",
        "mantle.account.invoice.Invoice",
        "mantle.account.payment.Payment",
      ]),
    );
    expect(extraction.nativeItems).toHaveLength(10);
  });

  it("normalizes knowledge into a source-independent representation", () => {
    const result = runBlmKnowledgeAcquisitionProofV1();
    const invoice = result.normalizedItems.find(
      (item) =>
        item.canonicalCandidateId ===
        toSemanticId("flow.concept.finance.invoice"),
    );

    expect(invoice).toMatchObject({
      conceptType: "FINANCE",
      reviewStatus: "APPROVED",
      publicationStage: "MAPPED",
      scope: "GLOBAL",
    });
    expect(invoice?.sourceReferences[0]?.contentFingerprint).toBeTruthy();
  });

  it("uses explicit mappings and never auto-merges unknown concepts", () => {
    const pipeline = new KnowledgeAcquisitionPipeline({
      sources: [source("moqui.mantle-udm")],
      adapters: [
        {
          sourceId: "moqui.mantle-udm",
          extract: (snapshot) => ({
            snapshot,
            nativeItems: [
              {
                sourceId: "moqui.mantle-udm",
                sourceConceptId: "mantle.unknown.CustomerLikeThing",
                nativeKind: "ENTITY",
                name: "CustomerLikeThing",
                description: "Unknown source item.",
                aliases: ["Customer"],
                nativeRelationships: [],
              },
            ],
          }),
        },
      ],
      mappings: [],
    });
    const result = pipeline.run({
      sourceIds: ["moqui.mantle-udm"],
      mappingVersion: "test",
      releaseId: "unknown-mapping",
      releaseVersion: "0.0.0",
      createdAt: "2026-08-11",
    });

    expect(result.normalizedItems[0]).toMatchObject({
      reviewStatus: "REVIEW_REQUIRED",
      publicationStage: "REVIEW_REQUIRED",
    });
    expect(result.report.issues).toContainEqual(
      expect.objectContaining({ code: "UNKNOWN_MAPPING" }),
    );
    expect(result.publishedItems).toHaveLength(0);
  });

  it("marks ambiguous explicit mappings as review-required failures", () => {
    const duplicateMapping: ExternalSemanticMapping = {
      ...blmKnowledgeAcquisitionMappingsV1[0]!,
      mappingId: "ambiguous",
      canonicalSemanticId: toSemanticId("flow.concept.crm.customer"),
    };
    const pipeline = new KnowledgeAcquisitionPipeline({
      sources: [source("moqui.mantle-udm")],
      adapters: [new MantleProofSourceAdapter()],
      mappings: [blmKnowledgeAcquisitionMappingsV1[0]!, duplicateMapping],
    });
    const result = pipeline.run({
      sourceIds: ["moqui.mantle-udm"],
      mappingVersion: "test",
      releaseId: "ambiguous",
      releaseVersion: "0.0.0",
      createdAt: "2026-08-11",
    });

    expect(result.report.issues).toContainEqual(
      expect.objectContaining({ code: "AMBIGUOUS_MAPPING" }),
    );
    expect(result.conflicts).toContainEqual(
      expect.objectContaining({ category: "INCOMPATIBLE_EXACT_MAPPING" }),
    );
  });

  it("detects duplicate mappings and semantic conflicts", () => {
    const duplicate = {
      ...blmKnowledgeAcquisitionMappingsV1[0]!,
      mappingId: "duplicate",
    };
    const pipeline = new KnowledgeAcquisitionPipeline({
      sources: [source("moqui.mantle-udm")],
      adapters: [new MantleProofSourceAdapter()],
      mappings: [blmKnowledgeAcquisitionMappingsV1[0]!, duplicate],
    });
    const result = pipeline.run({
      sourceIds: ["moqui.mantle-udm"],
      mappingVersion: "test",
      releaseId: "duplicate",
      releaseVersion: "0.0.0",
      createdAt: "2026-08-11",
    });

    expect(result.conflicts).toContainEqual(
      expect.objectContaining({ category: "DUPLICATE_EXTERNAL_MAPPING" }),
    );
  });

  it("preserves complete provenance chains and Flow-curated provenance separately", () => {
    const result = runBlmKnowledgeAcquisitionProofV1();
    const invoice = result.publishedItems.find(
      (item) =>
        item.canonicalSemanticId ===
        toSemanticId("flow.concept.finance.invoice"),
    );
    const curated = result.enrichedDomainPacks
      .flatMap((pack) => pack.concepts)
      .find(
        (concept) =>
          concept.semanticId === toSemanticId("flow.concept.crm.lead"),
      );

    expect(invoice?.provenance.sourceIds).toContain("moqui.mantle-udm");
    expect(typeof invoice?.externalMappings[0]?.sourceVersion).toBe("string");
    expect(invoice?.externalMappings[0]?.mappingVersion).toBe(
      "blm-knowledge-acquisition-v1",
    );
    expect(curated?.provenance.use).toBe("FLOW_NATIVE");
  });

  it("publishes approved mapped knowledge into the Business Expertise Registry", () => {
    const result = runBlmKnowledgeAcquisitionProofV1();

    expect(result.publishedItems.length).toBeGreaterThanOrEqual(21);
    expect(
      getSourcesForConcept(
        result.registry,
        toSemanticId("flow.concept.universal.organization"),
      ),
    ).toEqual(
      expect.arrayContaining(["moqui.mantle-udm", "semanticarts.gist"]),
    );
    expect(
      result.registry.getExternalMappingsForConcept(
        toSemanticId("flow.concept.finance.invoice"),
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceId: "oasis.ubl-2.4",
          externalId: "UBL-2.4:Invoice",
        }),
      ]),
    );
  });

  it("does not let raw discovered knowledge enter the active registry", () => {
    const pipeline = new KnowledgeAcquisitionPipeline({
      sources: [source("moqui.mantle-udm")],
      adapters: [
        {
          sourceId: "moqui.mantle-udm",
          extract: (snapshot) => ({
            snapshot,
            nativeItems: [
              {
                sourceId: "moqui.mantle-udm",
                sourceConceptId: "mantle.raw.Unmapped",
                nativeKind: "ENTITY",
                name: "Unmapped",
                description: "Raw unmapped item.",
                aliases: [],
                nativeRelationships: [],
              },
            ],
          }),
        },
      ],
      mappings: [],
    });
    const result = pipeline.run({
      sourceIds: ["moqui.mantle-udm"],
      mappingVersion: "test",
      releaseId: "raw",
      releaseVersion: "0.0.0",
      createdAt: "2026-08-11",
    });

    expect(
      result.registry.getExternalMappingsForConcept(
        toSemanticId("flow.concept.crm.customer"),
      ),
    ).toEqual([]);
  });

  it("preserves global knowledge and tenant boundaries", () => {
    const result = runBlmKnowledgeAcquisitionProofV1();

    expect(
      result.normalizedItems.every(
        (item) =>
          (item as { readonly workspaceId?: string }).workspaceId === undefined,
      ),
    ).toBe(true);

    const registry = new BusinessExpertiseRegistry({
      sources: blmSourceManifestV1,
      domainPacks: result.enrichedDomainPacks,
    });
    registry.setTenantOverlay({
      workspaceId: "workspace-alpha",
      enabledDomainPackIds: [blmDomainPackIdsV1.crmSales],
      terminologyAliases: { customer: "client" },
      policies: {},
      thresholds: {},
    });

    expect(registry.getTenantOverlay("workspace-alpha")).toBeDefined();
    expect(registry.getTenantOverlay("workspace-beta")).toBeUndefined();
  });

  it("enriches the four existing proof packs only", () => {
    const result = runBlmKnowledgeAcquisitionProofV1();

    expect(
      result.enrichedDomainPacks.map((pack) => pack.domainPack.semanticId),
    ).toEqual([
      blmDomainPackIdsV1.universalCore,
      blmDomainPackIdsV1.crmSales,
      blmDomainPackIdsV1.financeAccounting,
      blmDomainPackIdsV1.inventoryProcurement,
    ]);
    expect(
      result.enrichedDomainPacks
        .flatMap((pack) => pack.concepts)
        .find(
          (concept) =>
            concept.semanticId === toSemanticId("flow.concept.finance.invoice"),
        )
        ?.externalMappings.map((mapping) => mapping.sourceId),
    ).toEqual(expect.arrayContaining(["moqui.mantle-udm", "oasis.ubl-2.4"]));
  });

  it("keeps semantic IDs stable and resolves proof questions deterministically", () => {
    const result = runBlmKnowledgeAcquisitionProofV1();

    expect(() => toSemanticId("flow.concept.finance.invoice")).not.toThrow();
    expect(
      getDomainPackForConcept(toSemanticId("flow.concept.finance.invoice")),
    ).toBe(blmDomainPackIdsV1.financeAccounting);
    expect(
      result.publishedItems.find(
        (item) =>
          item.canonicalSemanticId ===
          toSemanticId("flow.concept.crm.customer"),
      ),
    ).toBeUndefined();
  });

  it("creates deterministic item, mapping, and release fingerprints", () => {
    const first = runBlmKnowledgeAcquisitionProofV1();
    const second = runBlmKnowledgeAcquisitionProofV1();

    expect(first.normalizedItems[0]?.fingerprint).toBe(
      second.normalizedItems[0]?.fingerprint,
    );
    expect(stableFingerprint(blmKnowledgeAcquisitionMappingsV1)).toBe(
      stableFingerprint([...blmKnowledgeAcquisitionMappingsV1]),
    );
    expect(first.release.fingerprint).toBe(second.release.fingerprint);
  });

  it("creates knowledge releases and detects release diffs", () => {
    const proof = runBlmKnowledgeAcquisitionProofV1();
    const changedRelease = createKnowledgeRelease({
      ...proof.release,
      releaseId: "flow.blm.knowledge-release.2",
      version: "1.0.1",
      publishedItems: proof.release.publishedItems.slice(1),
    });
    const diff = diffKnowledgeReleases(proof.release, changedRelease);

    expect(proof.release).toMatchObject({
      releaseId: "flow.blm.knowledge-release.1",
      mappingVersion: "blm-knowledge-acquisition-v1",
    });
    expect(diff.changes).toContainEqual(
      expect.objectContaining({ type: "REMOVED" }),
    );
  });

  it("produces a structured import report", () => {
    const result = runBlmKnowledgeAcquisitionProofV1();

    expect(result.report).toMatchObject({
      itemsDiscovered: 21,
      itemsNormalized: 21,
      itemsMapped: 21,
      itemsApproved: 21,
      itemsRejected: 0,
      itemsNeedingReview: 0,
      publishedItems: 21,
      conflicts: [],
      licenseBlocks: [],
    });
  });

  it("does not leak Semantica, LLM providers, or runtime internet dependencies into core", async () => {
    const sourceText = await import("node:fs/promises").then((fs) =>
      fs.readFile(
        new URL("./knowledge-acquisition.ts", import.meta.url),
        "utf8",
      ),
    );

    expect(sourceText).not.toContain('from "semantica"');
    expect(sourceText).not.toContain("ContextGraph");
    expect(sourceText).not.toContain("OpenAI");
    expect(sourceText).not.toContain("Anthropic");
    expect(sourceText).not.toContain("fetch(");
    expect(sourceText).not.toContain("https.get");
  });

  it("preserves Component Registry behavior and Business Brain foundation registry", () => {
    const componentRegistry = new ComponentRegistry({
      trustedModules: [],
      knownCapabilityIds: [
        toSemanticId("flow.capability.crm.customer-management"),
      ],
      components: [
        {
          semanticId: customerManagementComponentId,
          version: "1.0.0",
          displayName: "Customer Management",
          description: "Semantic customer component.",
          lifecycleStatus: "ACTIVE",
          providesCapabilityIds: [
            toSemanticId("flow.capability.crm.customer-management"),
          ],
          requiresCapabilityIds: [],
          dependsOnComponentIds: [],
          optionalDependencyIds: [],
          conflictsWithComponentIds: [],
          implementation: { availability: "SEMANTIC_ONLY", moduleBindings: [] },
          usesEntityTypeKeys: [],
          exposesActions: [],
          producesEvents: [],
          consumesEvents: [],
          scope: "GLOBAL",
        },
      ],
    });
    const proof = runBlmKnowledgeAcquisitionProofV1();

    expect(
      componentRegistry.isTrustedComponent(customerManagementComponentId),
    ).toBe(true);
    expect(proof.registry.listDomainPacks()).toHaveLength(4);
  });
});
