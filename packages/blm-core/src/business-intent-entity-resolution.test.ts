import { describe, expect, it } from "vitest";

import type {
  BusinessContextFrame,
  BusinessEntityType,
  BusinessRecordRef,
} from "@flow/blm-contracts";

import {
  BusinessLanguageRegistry,
  businessLanguageCoreConceptIds,
} from "./business-language-foundation.js";
import {
  EntityResolverRegistry,
  GroundedBusinessRequestCompiler,
  InMemoryBusinessEntityLookupProvider,
  type BusinessEntityLookupRecord,
} from "./business-intent-entity-resolution.js";

const fixedNow = "2026-08-13T12:00:00.000Z";

const workspaceA = "workspace-a";
const workspaceB = "workspace-b";

const refs = {
  northstarA: ref(workspaceA, "CLIENT", "client-a-northstar", "Northstar"),
  northstarB: ref(workspaceB, "CLIENT", "client-b-northstar", "Northstar"),
  ryanClient: ref(workspaceA, "CLIENT", "client-a-ryan-llc", "Ryan LLC"),
  ryanContact: ref(
    workspaceA,
    "CONTACT",
    "contact-a-ryan-hassan",
    "Ryan Hassan",
  ),
  ryanEmployee: ref(
    workspaceA,
    "EMPLOYEE",
    "employee-a-ryan-khan",
    "Ryan Khan",
  ),
  projectNorthstar: ref(
    workspaceA,
    "PROJECT",
    "project-a-northstar",
    "Northstar Redesign",
    businessLanguageCoreConceptIds.project,
  ),
  invoice104: ref(
    workspaceA,
    "INVOICE",
    "invoice-a-104",
    "Invoice INV-104",
    businessLanguageCoreConceptIds.invoice,
  ),
  restrictedClient: ref(
    workspaceA,
    "CLIENT",
    "client-a-restricted",
    "Restricted Client",
  ),
} as const;

const records: readonly BusinessEntityLookupRecord[] = [
  record(refs.northstarA, "client.read", ["Northstar"], ["northstar-a"]),
  record(refs.northstarB, "client.read", ["Northstar"], ["northstar-b"]),
  record(refs.ryanClient, "client.read", ["Ryan", "Big Ryan"]),
  record(refs.ryanContact, "contact.read", ["Ryan"]),
  record(refs.ryanEmployee, "employee.read", ["Ryan"]),
  record(
    refs.projectNorthstar,
    "project.read",
    ["Northstar Project"],
    ["NS-REDESIGN"],
  ),
  record(refs.invoice104, "invoice.read", ["INV-104"], ["INV-104"]),
  record(refs.restrictedClient, "client.restricted.read", ["Client A2"]),
];

describe("business intent and entity resolution", () => {
  it("resolves an exact unique client without executing anything", () => {
    const result = compile("Show Northstar.", frameA());

    expect(result.intent.intentClass).toBe("READ");
    expect(result.resolutionStatus).toBe("RESOLVED");
    expect(result.resolvedEntities[0]?.selectedEntity?.recordRef).toMatchObject(
      {
        workspaceId: workspaceA,
        recordId: "client-a-northstar",
      },
    );
    expect(result.executionPerformed).toBe(false);
  });

  it("does not let same-name records in another tenant affect candidates", () => {
    const alpha = compile("Show Northstar.", frameA());
    const beta = compile("Show Northstar.", frameB());

    expect(alpha.resolvedEntities[0]?.candidates).toHaveLength(1);
    expect(alpha.resolvedEntities[0]?.candidates[0]?.recordRef.recordId).toBe(
      "client-a-northstar",
    );
    expect(beta.resolvedEntities[0]?.candidates).toHaveLength(1);
    expect(beta.resolvedEntities[0]?.candidates[0]?.recordRef.recordId).toBe(
      "client-b-northstar",
    );
  });

  it("keeps same-name same-workspace entities ambiguous", () => {
    const result = compile("What's happening with Ryan?", frameA());

    expect(result.resolutionStatus).toBe("AMBIGUOUS");
    expect(
      result.resolvedEntities[0]?.candidates.map(
        (candidate) => candidate.recordRef.recordId,
      ),
    ).toEqual(
      expect.arrayContaining([
        "client-a-ryan-llc",
        "contact-a-ryan-hassan",
        "employee-a-ryan-khan",
      ]),
    );
  });

  it("uses explicit type context to narrow entity candidates", () => {
    const result = compile("Show client Ryan.", frameA());

    expect(result.resolutionStatus).toBe("RESOLVED");
    expect(result.resolvedEntities[0]?.selectedEntity?.recordRef.recordId).toBe(
      "client-a-ryan-llc",
    );
  });

  it("uses current project context for margin language", () => {
    const result = compile(
      "What's the margin?",
      frameA({ activeProjectRef: refs.projectNorthstar }),
    );

    expect(result.intent.intentClass).toBe("READ");
    expect(result.concepts).toContain(
      businessLanguageCoreConceptIds.projectMargin,
    );
    expect(result.resolvedEntities[0]?.selectedEntity?.recordRef.recordId).toBe(
      "project-a-northstar",
    );
    expect(result.executionPerformed).toBe(false);
  });

  it("uses current client context for overdue invoice query semantics", () => {
    const result = compile(
      "Show overdue invoices.",
      frameA({ activeClientRef: refs.northstarA }),
    );

    expect(result.intent.intentClass).toBe("READ");
    expect(result.queryIntent?.targetRefs[0]?.recordId).toBe(
      "client-a-northstar",
    );
    expect(result.filters).toContainEqual(
      expect.objectContaining({ operator: "IS_OVERDUE", value: true }),
    );
  });

  it("grounds a safe pronoun target for send but performs no execution", () => {
    const result = compile(
      "Send it.",
      frameA({
        recentResolvedRefs: [
          { recordRef: refs.invoice104, semanticRole: "target", recency: 0 },
        ],
      }),
    );

    expect(result.intent.intentClass).toBe("PROPOSE_ACTION");
    expect(result.actionProposalIntent).toMatchObject({
      action: "SEND",
      executionPerformed: false,
    });
    expect(result.actionProposalIntent?.targetRefs[0]?.recordId).toBe(
      "invoice-a-104",
    );
    expect(result.missingInformation.map((item) => item.code)).toContain(
      "MISSING_RECIPIENT",
    );
    expect(result.resolutionStatus).toBe("PARTIALLY_RESOLVED");
  });

  it("does not guess a missing target for close it", () => {
    const result = compile("Close it.", frameA());

    expect(result.actionProposalIntent?.action).toBe("CLOSE");
    expect(result.actionProposalIntent?.targetRefs).toHaveLength(0);
    expect(result.missingInformation.map((item) => item.code)).toContain(
      "MISSING_TARGET_OBJECT",
    );
    expect(result.executionPerformed).toBe(false);
  });

  it("grounds Roman Urdu payment language without inventing an invoice", () => {
    const result = compile("Client ka paisa abhi tak nahi aya.", frameA());

    expect(result.concepts).toEqual(
      expect.arrayContaining([
        businessLanguageCoreConceptIds.client,
        businessLanguageCoreConceptIds.receivable,
        businessLanguageCoreConceptIds.payment,
      ]),
    );
    expect(result.resolvedEntities).toHaveLength(0);
    expect(result.missingInformation.map((item) => item.code)).toContain(
      "MISSING_ENTITY_IDENTITY",
    );
    expect(result.userAssertions[0]?.status).toBe("USER_ASSERTION");
  });

  it("grounds Roman Urdu availability with fixed next-week dates", () => {
    const result = compile("Kaun free hai next week?", frameA());

    expect(result.intent.intentClass).toBe("READ");
    expect(result.intent.targetEntityTypes).toEqual(["EMPLOYEE", "TEAM"]);
    expect(result.concepts).toEqual(
      expect.arrayContaining([
        businessLanguageCoreConceptIds.availability,
        businessLanguageCoreConceptIds.capacity,
      ]),
    );
    expect(result.timeRange).toMatchObject({
      expression: "next week",
      start: "2026-08-17",
      end: "2026-08-23",
      timezone: "Asia/Karachi",
      resolutionStatus: "RESOLVED",
    });
  });

  it("separates user premise from verified business fact", () => {
    const result = compile("Why is Northstar unprofitable?", frameA());

    expect(result.intent.intentClass).toBe("DIAGNOSE");
    expect(result.resolvedEntities[0]?.selectedEntity?.recordRef.recordId).toBe(
      "client-a-northstar",
    );
    expect(result.userAssertions[0]).toMatchObject({
      status: "USER_ASSERTION",
    });
    expect(result.userAssertions).not.toContainEqual(
      expect.objectContaining({ status: "VERIFIED_RECORD_FACT" }),
    );
  });

  it("structures quantitative thresholds and surfaces missing currency", () => {
    const result = compile("Show clients owing more than 10k.", frameA());

    expect(result.quantities[0]).toMatchObject({
      value: 10000,
    });
    expect(result.filters).toContainEqual(
      expect.objectContaining({
        operator: "GREATER_THAN",
        value: 10000,
      }),
    );
    expect(result.missingInformation.map((item) => item.code)).toContain(
      "MISSING_CURRENCY",
    );
  });

  it("resolves deterministic invoice due next week time range", () => {
    const result = compile("Show invoices due next week.", frameA());

    expect(result.timeRange).toMatchObject({
      expression: "next week",
      start: "2026-08-17",
      end: "2026-08-23",
      timezone: "Asia/Karachi",
    });
    expect(result.filters).toContainEqual(
      expect.objectContaining({ operator: "BETWEEN" }),
    );
  });

  it("keeps approval language as unresolved approval semantics, not mutation", () => {
    const result = compile("I approved it.", frameA());

    expect(result.intent.intentClass).toBe("REQUEST_APPROVAL");
    expect(result.actionProposalIntent?.action).toBe("APPROVE");
    expect(result.missingInformation.map((item) => item.code)).toContain(
      "MISSING_APPROVAL_OBJECT",
    );
    expect(result.executionPerformed).toBe(false);
  });

  it("rejects unauthorized context injection and recent references", () => {
    const injectedCurrent = compile(
      "Show overdue invoices.",
      frameA({ activeClientRef: refs.northstarB }),
    );
    const injectedRecent = compile(
      "Send it.",
      frameA({
        recentResolvedRefs: [
          { recordRef: refs.northstarB, semanticRole: "target", recency: 0 },
        ],
      }),
    );

    expect(injectedCurrent.resolvedEntities[0]?.resolutionStatus).toBe(
      "INACCESSIBLE",
    );
    expect(injectedRecent.resolvedEntities[0]?.resolutionStatus).toBe(
      "INACCESSIBLE",
    );
  });

  it("validates model-proposed records against authorized repository results", () => {
    const result = compile("Show Northstar.", frameA(), [
      {
        recordRef: refs.northstarB,
        rationale: "Wrong tenant proposal.",
      },
      {
        recordRef: ref(workspaceA, "CLIENT", "client_fake_999", "Fake Client"),
        rationale: "Unknown proposal.",
      },
    ]);

    expect(result.modelRecordValidation?.acceptedRefs).toHaveLength(0);
    expect(
      result.modelRecordValidation?.rejectedRefs.map((item) => item.reason),
    ).toEqual([
      "MODEL_PROPOSED_WRONG_WORKSPACE",
      "MODEL_PROPOSED_UNKNOWN_ENTITY",
    ]);
  });

  it("does not leak restricted records through exact IDs or external identifiers", () => {
    const registry = entityRegistry();
    const provider = registry.getProvider("CLIENT");
    expect(provider).toBeDefined();

    const candidates = provider!.findCandidates({
      context: {
        workspaceId: workspaceA,
        permissionIds: ["client.read"],
        roleRefs: ["member"],
      },
      entityType: "CLIENT",
      rawText: "Client A2",
      normalizedText: "client a2",
    });

    expect(candidates).toHaveLength(0);
  });

  it("keeps Task 002 semantic behavior intact", () => {
    const registry = BusinessLanguageRegistry.universal();

    expect(registry.resolveConcept("AR").selectedConcept?.conceptId).toBe(
      businessLanguageCoreConceptIds.receivable,
    );
    expect(
      registry.resolveConcept("project margin").selectedConcept?.conceptId,
    ).toBe(businessLanguageCoreConceptIds.projectMargin);
    expect(registry.resolveConcept("margin").resolutionStatus).toBe(
      "AMBIGUOUS",
    );
    expect(registry.resolveConcept("cash").selectedConcept?.conceptId).not.toBe(
      registry.resolveConcept("revenue").selectedConcept?.conceptId,
    );
    expect(
      registry.resolveConcept("proposal").selectedConcept?.conceptId,
    ).not.toBe(registry.resolveConcept("contract").selectedConcept?.conceptId);
    expect(
      registry.resolveConcept("approved").selectedConcept?.conceptId,
    ).not.toBe(registry.resolveConcept("execute").selectedConcept?.conceptId);
  });
});

function compile(
  utterance: string,
  contextFrame: BusinessContextFrame,
  modelRecordProposals: Parameters<
    GroundedBusinessRequestCompiler["compile"]
  >[0]["modelRecordProposals"] = undefined,
) {
  return new GroundedBusinessRequestCompiler({
    entityRegistry: entityRegistry(),
  }).compile({
    utterance,
    contextFrame,
    relativeTo: fixedNow,
    ...(modelRecordProposals ? { modelRecordProposals } : {}),
  });
}

function entityRegistry(): EntityResolverRegistry {
  const registry = new EntityResolverRegistry();
  for (const entityType of [
    "CLIENT",
    "CUSTOMER",
    "CONTACT",
    "PROJECT",
    "EMPLOYEE",
    "INVOICE",
    "DOCUMENT",
  ] satisfies readonly BusinessEntityType[]) {
    registry.register(
      new InMemoryBusinessEntityLookupProvider(entityType, records),
    );
  }
  return registry;
}

function frameA(
  overrides: Partial<BusinessContextFrame> = {},
): BusinessContextFrame {
  return frame(workspaceA, {
    permissionIds: [
      "client.read",
      "contact.read",
      "employee.read",
      "project.read",
      "invoice.read",
    ],
    ...overrides,
  });
}

function frameB(
  overrides: Partial<BusinessContextFrame> = {},
): BusinessContextFrame {
  return frame(workspaceB, {
    permissionIds: ["client.read"],
    ...overrides,
  });
}

function frame(
  workspaceId: string,
  overrides: Partial<BusinessContextFrame>,
): BusinessContextFrame {
  return {
    workspaceId,
    userId: `${workspaceId}-user`,
    roleRefs: ["member"],
    permissionIds: [],
    recentResolvedRefs: [],
    recentIntentRefs: [],
    locale: "en",
    timezone: "Asia/Karachi",
    availableDomains: ["finance", "commercial", "operations"],
    ...overrides,
  };
}

function ref(
  workspaceId: string,
  entityType: BusinessEntityType,
  recordId: string,
  displayLabel: string,
  canonicalTypeRef?: BusinessRecordRef["canonicalTypeRef"],
): BusinessRecordRef {
  return {
    workspaceId,
    entityType,
    recordId,
    displayLabel,
    ...(canonicalTypeRef ? { canonicalTypeRef } : {}),
  };
}

function record(
  recordRef: BusinessRecordRef,
  permission: string,
  aliases: readonly string[] = [],
  externalIds: readonly string[] = [],
): BusinessEntityLookupRecord {
  return {
    recordRef,
    displayLabel: recordRef.displayLabel ?? recordRef.recordId,
    searchableText: [recordRef.displayLabel ?? recordRef.recordId],
    aliases,
    externalIds,
    requiredPermissions: [permission],
  };
}
