import { describe, expect, it } from "vitest";

import type {
  BusinessContextFrame,
  BusinessDataProviderCapability,
  BusinessDataReadRequest,
  BusinessEntityType,
  BusinessRecordRef,
} from "@flow/blm-contracts";

import { businessLanguageCoreConceptIds } from "./business-language-foundation.js";
import {
  EntityResolverRegistry,
  GroundedBusinessRequestCompiler,
  InMemoryBusinessEntityLookupProvider,
  type BusinessEntityLookupRecord,
} from "./business-intent-entity-resolution.js";
import {
  BusinessDataProviderRegistry,
  BusinessQueryExecutor,
  BusinessQueryPlanner,
  InMemoryBusinessDataProvider,
  type BusinessDataProviderRecord,
} from "./business-query-planning.js";

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
  invoice105: ref(workspaceA, "INVOICE", "invoice-a-105", "Invoice INV-105"),
  invoice106: ref(workspaceA, "INVOICE", "invoice-a-106", "Invoice INV-106"),
  invoiceHidden: ref(
    workspaceA,
    "INVOICE",
    "invoice-a-hidden",
    "Invoice INV-H",
  ),
  invoiceB: ref(workspaceB, "INVOICE", "invoice-b-201", "Invoice INV-B"),
  documentHidden: ref(
    workspaceA,
    "DOCUMENT",
    "document-a-hidden",
    "Hidden document",
  ),
} as const;

const entityRecords: readonly BusinessEntityLookupRecord[] = [
  entityRecord(refs.northstarA, "client.read", ["Northstar"], ["northstar-a"]),
  entityRecord(refs.northstarB, "client.read", ["Northstar"], ["northstar-b"]),
  entityRecord(refs.ryanClient, "client.read", ["Ryan", "Big Ryan"]),
  entityRecord(refs.ryanContact, "contact.read", ["Ryan"]),
  entityRecord(refs.ryanEmployee, "employee.read", ["Ryan"]),
  entityRecord(
    refs.projectNorthstar,
    "project.read",
    ["Northstar Project"],
    ["NS-REDESIGN"],
  ),
  entityRecord(refs.invoice104, "invoice.read", ["INV-104"], ["INV-104"]),
  entityRecord(
    refs.invoiceHidden,
    "finance.invoice.restricted.read",
    ["INV-H"],
    ["INV-H"],
  ),
  entityRecord(
    refs.documentHidden,
    "document.restricted.read",
    ["Secret"],
    ["DOC-H"],
  ),
];

const providerRecords: readonly BusinessDataProviderRecord[] = [
  invoiceRecord(refs.invoice104, 12000, "2026-08-01", ["finance.invoice.read"]),
  invoiceRecord(refs.invoice105, 8000, "2026-08-02", ["finance.invoice.read"]),
  invoiceRecord(refs.invoice106, 3000, "2026-08-03", ["finance.invoice.read"]),
  invoiceRecord(refs.invoiceHidden, 50000, "2026-07-15", [
    "finance.invoice.restricted.read",
  ]),
  {
    recordRef: refs.invoiceB,
    fields: {
      invoiceNumber: "INV-B",
      status: "OPEN",
      dueDate: "2026-08-01",
      openBalance: 99000,
      currency: "USD",
      clientId: refs.northstarB.recordId,
    },
    relationships: [
      { relationship: "CLIENT_INVOICES", targetRef: refs.northstarB },
    ],
    requiredPermissions: ["finance.invoice.read"],
    sourceSystem: "test-accounting",
    systemOfRecordClass: "EXTERNAL_AUTHORITATIVE",
  },
  {
    recordRef: refs.projectNorthstar,
    fields: {
      displayLabel: "Northstar Redesign",
      projectRevenue: 100000,
      projectCost: 76000,
      currency: "USD",
      clientId: refs.northstarA.recordId,
    },
    relationships: [
      { relationship: "CLIENT_PROJECTS", targetRef: refs.northstarA },
    ],
    requiredPermissions: ["project.financials.read"],
    sourceSystem: "test-projects",
    systemOfRecordClass: "EXTERNAL_AUTHORITATIVE",
  },
  {
    recordRef: ref(workspaceA, "EMPLOYEE", "employee-a-1", "Aisha"),
    fields: {
      displayName: "Aisha",
      weeklyCapacityHours: 40,
      allocatedHours: 28,
      leaveHours: 0,
    },
    requiredPermissions: ["hr.capacity.read"],
    sourceSystem: "test-hr",
    systemOfRecordClass: "EXTERNAL_AUTHORITATIVE",
  },
  {
    recordRef: refs.documentHidden,
    fields: { displayLabel: "Hidden document", status: "RESTRICTED" },
    relationships: [
      { relationship: "CLIENT_DOCUMENTS", targetRef: refs.northstarA },
    ],
    requiredPermissions: ["document.restricted.read"],
    sourceSystem: "test-documents",
    systemOfRecordClass: "EXTERNAL_AUTHORITATIVE",
  },
];

describe("business query planning and deterministic retrieval", () => {
  it("plans overdue invoice retrieval as bounded read-only evidence without raw SQL", () => {
    const contextFrame = frameA({ activeClientRef: refs.northstarA });
    const request = compile("Show overdue invoices.", contextFrame);
    const plan = planner().plan({ request, contextFrame });
    const result = executor().execute(plan);

    expect(plan.status).toBe("READY");
    expect(plan.executionPolicy).toBe("READ_ONLY");
    expect(plan.steps[0]).toMatchObject({
      operation: "RELATED_RECORDS",
      targetEntityType: "INVOICE",
      relationshipTraversal: {
        from: "CLIENT",
        to: "INVOICE",
        relationship: "CLIENT_INVOICES",
        bounded: true,
      },
    });
    expect(JSON.stringify(plan).toLowerCase()).not.toContain("sql");
    expect(result.status).toBe("SUCCESS");
    expect(
      result.records.map((recordItem) => recordItem.recordRef.recordId),
    ).toEqual(["invoice-a-104", "invoice-a-105", "invoice-a-106"]);
    expect(result.counts.records).toBe(3);
    expect(result.evidence.every((item) => item.provenance.length > 0)).toBe(
      true,
    );
  });

  it("keeps same-name tenant records out of planning and retrieval", () => {
    const contextFrame = frameB({ activeClientRef: refs.northstarB });
    const request = compile("Show overdue invoices.", contextFrame);
    const plan = planner().plan({ request, contextFrame });
    const result = executor().execute(plan);

    expect(result.records).toHaveLength(1);
    expect(result.records[0]?.recordRef).toMatchObject({
      workspaceId: workspaceB,
      recordId: "invoice-b-201",
    });
    expect(
      result.evidence.every((item) => item.workspaceId === workspaceB),
    ).toBe(true);
  });

  it("halts ambiguous Ryan requests before provider execution", () => {
    const contextFrame = frameA();
    const request = compile("What's happening with Ryan?", contextFrame);
    const plan = planner().plan({ request, contextFrame });
    const result = executor().execute(plan);

    expect(plan.status).toBe("NEEDS_INFORMATION");
    expect(plan.steps).toHaveLength(0);
    expect(plan.executionPolicy).toBe("NO_EXECUTION");
    expect(result.status).toBe("NEEDS_INFORMATION");
  });

  it("routes project margin to deterministic business logic inputs", () => {
    const contextFrame = frameA({ activeProjectRef: refs.projectNorthstar });
    const request = compile("What's the margin?", contextFrame);
    const plan = planner().plan({ request, contextFrame });
    const result = executor().execute(plan);

    expect(plan.status).toBe("READY");
    expect(plan.resultShape).toBe("CALCULATION_INPUTS");
    expect(plan.requiredCalculations[0]).toMatchObject({
      logicId: "flow.decision.logic.projects.project-margin@1.0.0",
      metricId: businessLanguageCoreConceptIds.projectMargin,
    });
    expect(plan.steps[0]?.projection).toEqual([
      "projectRevenue",
      "projectCost",
      "currency",
    ]);
    expect(result.records[0]?.fields).toMatchObject({
      projectRevenue: 100000,
      projectCost: 76000,
    });
    expect(result.records[0]?.fields).not.toHaveProperty("projectMargin");
  });

  it("does not invent an entity for Roman Urdu receivable language", () => {
    const contextFrame = frameA();
    const request = compile("Client ka paisa abhi tak nahi aya.", contextFrame);
    const plan = planner().plan({ request, contextFrame });

    expect(plan.status).toBe("NEEDS_INFORMATION");
    expect(plan.steps).toHaveLength(0);
    expect(plan.unresolvedInputs.map((item) => item.code)).toContain(
      "MISSING_ENTITY_IDENTITY",
    );
  });

  it("surfaces missing capacity semantics before ranking free employees", () => {
    const contextFrame = frameA();
    const request = compile("Kaun free hai next week?", contextFrame);
    const plan = planner().plan({ request, contextFrame });

    expect(plan.status).toBe("PARTIALLY_READY");
    expect(plan.steps[0]).toMatchObject({
      operation: "LIST",
      targetEntityType: "EMPLOYEE",
    });
    expect(plan.timeContext).toMatchObject({
      start: "2026-08-17",
      end: "2026-08-23",
    });
    expect(plan.unresolvedInputs.map((item) => item.code)).toContain(
      "MISSING_METRIC_DEFINITION",
    );
    expect(plan.requiredCalculations).toHaveLength(0);
  });

  it("retrieves evidence for send-it support without executing an action", () => {
    const contextFrame = frameA({
      recentResolvedRefs: [
        { recordRef: refs.invoice104, semanticRole: "target", recency: 0 },
      ],
    });
    const request = compile("Send it.", contextFrame);
    const plan = planner().plan({ request, contextFrame });
    const result = executor().execute(plan);

    expect(request.executionPerformed).toBe(false);
    expect(plan.executionPolicy).toBe("READ_ONLY");
    expect(plan.status).toBe("PARTIALLY_READY");
    expect(result.records[0]?.recordRef.recordId).toBe("invoice-a-104");
    expect(result.records[0]?.fields).toMatchObject({
      status: "OPEN",
      openBalance: 12000,
    });
  });

  it("does not guess a target for close-it requests", () => {
    const contextFrame = frameA();
    const request = compile("Close it.", contextFrame);
    const plan = planner().plan({ request, contextFrame });

    expect(plan.status).toBe("NEEDS_INFORMATION");
    expect(plan.steps).toHaveLength(0);
    expect(plan.executionPolicy).toBe("NO_EXECUTION");
    expect(plan.unresolvedInputs.map((item) => item.code)).toContain(
      "MISSING_TARGET_OBJECT",
    );
  });

  it("treats user profitability claims as assertions requiring verification", () => {
    const contextFrame = frameA();
    const request = compile("Why is Northstar unprofitable?", contextFrame);
    const plan = planner().plan({ request, contextFrame });

    expect(plan.assertionVerificationNeeds).toHaveLength(1);
    expect(plan.assertionVerificationNeeds[0]?.assertion.status).toBe(
      "USER_ASSERTION",
    );
    expect(plan.requiredCalculations[0]?.logicId).toBe(
      "flow.decision.logic.projects.project-margin@1.0.0",
    );
  });

  it("requires currency before planning clients owing more than a threshold", () => {
    const contextFrame = frameA();
    const request = compile("Show clients owing more than 10k.", contextFrame);
    const plan = planner().plan({ request, contextFrame });

    expect(plan.status).toBe("NEEDS_INFORMATION");
    expect(plan.steps).toHaveLength(0);
    expect(plan.unresolvedInputs.map((item) => item.code)).toContain(
      "MISSING_CURRENCY",
    );
  });

  it("filters exact restricted record refs at provider execution", () => {
    const provider = invoiceProvider();
    const request = readRequest({
      contextFrame: frameA(),
      entityType: "INVOICE",
      recordRefs: [refs.invoiceHidden],
      operation: "GET_BY_REF",
    });
    const result = provider.executeRead(request);

    expect(result.status).toBe("SUCCESS");
    expect(result.records).toHaveLength(0);
    expect(result.counts.records).toBe(0);
  });

  it("filters inaccessible records before count sum and exists style reads", () => {
    const provider = invoiceProvider();
    const operations: readonly BusinessDataReadRequest["operation"][] = [
      "COUNT",
      "SUM",
      "EXISTS",
    ];

    for (const operation of operations) {
      const result = provider.executeRead(
        readRequest({
          contextFrame: frameA(),
          entityType: "INVOICE",
          recordRefs: [refs.northstarA],
          operation,
          relationship: "CLIENT_INVOICES",
        }),
      );

      expect(
        result.records.map((recordItem) => recordItem.recordRef.recordId),
      ).toEqual(["invoice-a-104", "invoice-a-105", "invoice-a-106"]);
      expect(result.counts.records).toBe(3);
      expect(JSON.stringify(result)).not.toContain("invoice-a-hidden");
      expect(JSON.stringify(result)).not.toContain("50000");
    }
  });

  it("does not leak restricted related documents through traversal", () => {
    const provider = documentProvider();
    const request = readRequest({
      contextFrame: frameA(),
      entityType: "DOCUMENT",
      recordRefs: [refs.northstarA],
      operation: "RELATED_RECORDS",
      relationship: "CLIENT_DOCUMENTS",
    });
    const result = provider.executeRead(request);

    expect(result.records).toHaveLength(0);
    expect(result.evidence).toHaveLength(0);
  });

  it("rechecks injected wrong-workspace refs at retrieval", () => {
    const provider = invoiceProvider();
    const request = readRequest({
      contextFrame: frameA(),
      entityType: "INVOICE",
      recordRefs: [refs.invoiceB],
      operation: "GET_BY_REF",
    });
    const result = provider.executeRead(request);

    expect(result.records).toHaveLength(0);
    expect(result.evidence).toHaveLength(0);
    expect(result.authorizationSummary.workspaceId).toBe(workspaceA);
  });

  it("produces deterministic plan fingerprints for identical grounded requests", () => {
    const contextFrame = frameA({ activeClientRef: refs.northstarA });
    const first = planner().plan({
      request: compile("Show overdue invoices.", contextFrame),
      contextFrame,
    });
    const second = planner().plan({
      request: compile("Show overdue invoices.", contextFrame),
      contextFrame,
    });

    expect(first.fingerprint).toBe(second.fingerprint);
    expect(first.planId).toBe(second.planId);
  });
});

function compile(utterance: string, contextFrame: BusinessContextFrame) {
  return new GroundedBusinessRequestCompiler({
    entityRegistry: entityRegistry(),
  }).compile({
    utterance,
    contextFrame,
    relativeTo: fixedNow,
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
      new InMemoryBusinessEntityLookupProvider(entityType, entityRecords),
    );
  }
  return registry;
}

function planner(): BusinessQueryPlanner {
  return new BusinessQueryPlanner(providerRegistry());
}

function executor(): BusinessQueryExecutor {
  return new BusinessQueryExecutor(providerRegistry());
}

function providerRegistry(): BusinessDataProviderRegistry {
  const registry = new BusinessDataProviderRegistry();
  registry.register(invoiceProvider());
  registry.register(projectProvider());
  registry.register(hrProvider());
  registry.register(documentProvider());
  return registry;
}

function invoiceProvider(): InMemoryBusinessDataProvider {
  return new InMemoryBusinessDataProvider(
    "test-invoice-provider",
    "test-accounting",
    [
      capability(
        "finance.invoice.read",
        "INVOICE",
        ["GET_BY_REF", "RELATED_RECORDS", "LIST", "COUNT", "SUM", "EXISTS"],
        ["finance.invoice.read"],
      ),
    ],
    providerRecords,
  );
}

function projectProvider(): InMemoryBusinessDataProvider {
  return new InMemoryBusinessDataProvider(
    "test-project-provider",
    "test-projects",
    [
      capability(
        "project.financials.read",
        "PROJECT",
        ["GET_BY_REF", "RELATED_RECORDS", "LIST"],
        ["project.financials.read"],
      ),
    ],
    providerRecords,
  );
}

function hrProvider(): InMemoryBusinessDataProvider {
  return new InMemoryBusinessDataProvider(
    "test-hr-provider",
    "test-hr",
    [
      capability(
        "hr.capacity.read",
        "EMPLOYEE",
        ["LIST"],
        ["hr.capacity.read"],
      ),
    ],
    providerRecords,
  );
}

function documentProvider(): InMemoryBusinessDataProvider {
  return new InMemoryBusinessDataProvider(
    "test-document-provider",
    "test-documents",
    [
      capability(
        "document.read",
        "DOCUMENT",
        ["GET_BY_REF", "RELATED_RECORDS"],
        ["document.read"],
      ),
    ],
    providerRecords,
  );
}

function capability(
  capabilityId: string,
  entityType: BusinessEntityType,
  operations: BusinessDataProviderCapability["operations"],
  requiredPermissions: readonly string[],
): BusinessDataProviderCapability {
  return {
    capabilityId,
    entityType,
    operations,
    providerKind: "TEST_PROVIDER",
    systemOfRecordClass: "EXTERNAL_AUTHORITATIVE",
    requiredPermissions,
  };
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
      "project.financials.read",
      "invoice.read",
      "finance.invoice.read",
      "hr.capacity.read",
      "document.read",
    ],
    ...overrides,
  });
}

function frameB(
  overrides: Partial<BusinessContextFrame> = {},
): BusinessContextFrame {
  return frame(workspaceB, {
    permissionIds: ["client.read", "finance.invoice.read"],
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
    availableDomains: ["finance", "commercial", "operations", "hr"],
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

function entityRecord(
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

function invoiceRecord(
  recordRef: BusinessRecordRef,
  openBalance: number,
  dueDate: string,
  requiredPermissions: readonly string[],
): BusinessDataProviderRecord {
  return {
    recordRef,
    fields: {
      invoiceNumber:
        recordRef.displayLabel?.replace("Invoice ", "") ?? recordRef.recordId,
      status: "OPEN",
      dueDate,
      openBalance,
      currency: "USD",
      clientId: refs.northstarA.recordId,
    },
    relationships: [
      { relationship: "CLIENT_INVOICES", targetRef: refs.northstarA },
    ],
    requiredPermissions,
    sourceSystem: "test-accounting",
    systemOfRecordClass: "EXTERNAL_AUTHORITATIVE",
  };
}

function readRequest(input: {
  readonly contextFrame: BusinessContextFrame;
  readonly entityType: BusinessEntityType;
  readonly operation: BusinessDataReadRequest["operation"];
  readonly recordRefs: readonly BusinessRecordRef[];
  readonly relationship?: string;
}): BusinessDataReadRequest {
  return {
    requestId: "read:test",
    workspaceId: input.contextFrame.workspaceId,
    actorContext: input.contextFrame,
    entityType: input.entityType,
    operation: input.operation,
    recordRefs: input.recordRefs,
    filters: [],
    projection: ["displayLabel", "status", "openBalance", "currency"],
    sort: [],
    limit: 50,
    ...(input.relationship
      ? {
          relationshipTraversal: {
            from: "CLIENT",
            to: input.entityType,
            relationship: input.relationship,
            bounded: true,
          },
        }
      : {}),
    evidenceRequirements: ["displayLabel", "status", "openBalance", "currency"],
    planId: "plan:test",
    queryStepId: "step:test",
  };
}
