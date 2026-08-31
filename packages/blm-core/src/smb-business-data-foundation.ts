import {
  businessDataHierarchyV1,
  logicId,
  publicTrainingEligibility,
  smbSemanticId,
  toSemanticId,
  workspacePrivateEligibility,
  type CanonicalBusinessRecord,
  type DataQualityScore,
  type ERPBusinessLogicCapability,
  type ERPRecordMapping,
  type ExternalERPAdapter,
  type ExplicitImportMapping,
  type HybridSyntheticBusinessWorkspace,
  type LocalBusinessLogicRuntimeCapability,
  type LocalSMBOnboardingManifest,
  type LocalSMBSourceType,
  type PrivacyConfidentialityProfile,
  type PublicDataAdapter,
  type PublicSourceSnapshot,
  type SourceGovernanceManifest,
  type SyntheticBusinessWorkspace,
  type WorkspaceImportSession,
} from "@flow/blm-contracts";

import { stableFingerprint } from "./knowledge-acquisition.js";

const defaultQuality: DataQualityScore = {
  completeness: 0.92,
  consistency: 0.94,
  referentialIntegrity: 1,
  temporalConsistency: 0.96,
  semanticMappingConfidence: 0.9,
  sourceTrust: 0.95,
  licenseConfidence: 1,
};

const privateProfile: PrivacyConfidentialityProfile = {
  containsPII: true,
  containsFinancialData: true,
  containsEmployeeData: true,
  containsCustomerData: true,
  containsConfidentialBusinessData: true,
  redactionRequired: true,
  anonymizationRequired: true,
  trainingConsentRequired: true,
};

const syntheticGovernance: SourceGovernanceManifest = {
  sourceId: "flow.synthetic.smb-lab.v1",
  sourceName: "Flow deterministic SMB synthetic lab",
  publisher: "Flow by Intellignce",
  sourceUrl: "flow://synthetic/smb-lab/v1",
  retrievedAt: "2026-08-11T00:00:00.000Z",
  license: "Flow internal synthetic fixture",
  licenseUrl: "flow://licenses/synthetic-fixture",
  attributionRequirement: "None",
  commercialUseAllowed: true,
  derivativeUseAllowed: true,
  trainingUseStatus: "TRAINING_REQUIRES_REVIEW",
  evaluationUseStatus: "ALLOWED",
  contextUseStatus: "ALLOWED",
  redistributionStatus: "PROHIBITED",
  privacyRisk: "LOW",
  PIIRisk: "LOW",
  sourceTrustLevel: "HIGH",
  snapshotFingerprint: "flow-synthetic-smb-lab-v1",
};

export const publicSourceGovernanceFixturesV1: readonly SourceGovernanceManifest[] =
  [
    {
      sourceId: "public.retail-transactions.fixture.v1",
      sourceName: "Retail transaction public snapshot fixture",
      publisher: "Public dataset family fixture",
      sourceUrl: "https://archive.ics.uci.edu/",
      retrievedAt: "2026-08-11T00:00:00.000Z",
      license: "Fixture only; real source requires review before use",
      licenseUrl: "https://archive.ics.uci.edu/",
      attributionRequirement: "Retain publisher attribution",
      commercialUseAllowed: false,
      derivativeUseAllowed: true,
      trainingUseStatus: "UNKNOWN",
      evaluationUseStatus: "REQUIRES_REVIEW",
      contextUseStatus: "REQUIRES_REVIEW",
      redistributionStatus: "REQUIRES_REVIEW",
      privacyRisk: "MEDIUM",
      PIIRisk: "MEDIUM",
      sourceTrustLevel: "MEDIUM",
      snapshotFingerprint: "public-retail-fixture-v1",
    },
    {
      sourceId: "public.marketing-crm.fixture.v1",
      sourceName: "Marketing customer response public snapshot fixture",
      publisher: "Public dataset family fixture",
      sourceUrl: "https://archive.ics.uci.edu/",
      retrievedAt: "2026-08-11T00:00:00.000Z",
      license: "Fixture only; real source requires review before use",
      licenseUrl: "https://archive.ics.uci.edu/",
      attributionRequirement: "Retain publisher attribution",
      commercialUseAllowed: false,
      derivativeUseAllowed: true,
      trainingUseStatus: "UNKNOWN",
      evaluationUseStatus: "REQUIRES_REVIEW",
      contextUseStatus: "REQUIRES_REVIEW",
      redistributionStatus: "REQUIRES_REVIEW",
      privacyRisk: "MEDIUM",
      PIIRisk: "MEDIUM",
      sourceTrustLevel: "MEDIUM",
      snapshotFingerprint: "public-marketing-fixture-v1",
    },
    {
      sourceId: "public.xbrl-financial.fixture.v1",
      sourceName: "Corporate financial XBRL public snapshot fixture",
      publisher: "Public filing dataset family fixture",
      sourceUrl: "https://www.sec.gov/edgar",
      retrievedAt: "2026-08-11T00:00:00.000Z",
      license:
        "Public factual filing fixture; real downstream use requires governance review",
      licenseUrl: "https://www.sec.gov/os/accessing-edgar-data",
      attributionRequirement: "Retain filing source attribution",
      commercialUseAllowed: true,
      derivativeUseAllowed: true,
      trainingUseStatus: "TRAINING_REQUIRES_REVIEW",
      evaluationUseStatus: "ALLOWED",
      contextUseStatus: "ALLOWED",
      redistributionStatus: "REQUIRES_REVIEW",
      privacyRisk: "LOW",
      PIIRisk: "LOW",
      sourceTrustLevel: "HIGH",
      snapshotFingerprint: "public-xbrl-fixture-v1",
    },
  ];

const businessTemplates = [
  [
    "grocery-neighborhood-retail",
    "Grocery / neighborhood retail",
    "Retail",
    ["pos", "inventory", "suppliers", "returns"],
  ],
  [
    "digital-marketing-agency",
    "Digital marketing agency",
    "Services",
    ["customers", "leads", "projects", "invoices"],
  ],
  [
    "consulting",
    "Professional services / consulting",
    "Services",
    ["customers", "projects", "timesheets", "invoices"],
  ],
  [
    "b2b-saas",
    "B2B SaaS",
    "Recurring Revenue",
    ["subscriptions", "customers", "churn", "support"],
  ],
  [
    "ecommerce",
    "E-commerce",
    "Retail",
    ["orders", "returns", "inventory", "marketing"],
  ],
  [
    "rental-assets",
    "Rental / asset business",
    "Asset Businesses",
    ["assets", "maintenance", "bookings", "invoices"],
  ],
  [
    "wholesale-distribution",
    "Wholesale / distribution",
    "Supply Chain",
    ["inventory", "purchase-orders", "orders", "payments"],
  ],
  [
    "restaurant-food",
    "Restaurant / food business",
    "Food",
    ["pos", "suppliers", "employees", "expenses"],
  ],
  [
    "construction-field-service",
    "Construction / field service",
    "Services",
    ["jobs", "quotes", "purchase-orders", "timesheets"],
  ],
  [
    "small-manufacturing",
    "Small manufacturing",
    "Supply Chain",
    ["bom", "work-orders", "inventory", "purchase-orders"],
  ],
] as const;

export function generateDeterministicSMBBusinesses(): readonly SyntheticBusinessWorkspace[] {
  return businessTemplates.map(([id, businessType, industry, modules], index) =>
    syntheticBusiness(id, businessType, industry, modules, index + 1),
  );
}

export function createHybridSyntheticBusinessWorkspace(): HybridSyntheticBusinessWorkspace {
  const base = syntheticBusiness(
    "hybrid-grocery-retail",
    "Hybrid grocery store",
    "Retail",
    ["pos", "inventory", "suppliers", "policies"],
    99,
  );
  return {
    ...base,
    records: base.records.map((record, index) => ({
      ...record,
      fieldProvenance: Object.fromEntries(
        Object.keys(record.fields).map((key) => [
          key,
          index === 0 ? "REAL_SOURCE" : "SYNTHETIC_CREATED",
        ]),
      ),
    })),
    hybridSources: [
      {
        sourceId: "public.retail-transactions.fixture.v1",
        sourceKind: "REAL_SOURCE",
        description:
          "Retail transaction distribution only; no real organization facts.",
      },
      {
        sourceId: "flow.synthetic.smb-lab.v1",
        sourceKind: "SYNTHETIC_CREATED",
        description:
          "Synthetic organization, policies, employees, and suppliers.",
      },
    ],
  };
}

export function createWorkspaceImportSession(input: {
  readonly importSessionId: string;
  readonly workspaceId: string;
  readonly sourceType: LocalSMBSourceType;
  readonly mappings?: readonly ExplicitImportMapping[];
}): WorkspaceImportSession {
  return {
    importSessionId: input.importSessionId,
    workspaceId: input.workspaceId,
    sourceType: input.sourceType,
    dataUseClassification: "WORKSPACE_ONLY",
    privacyProfile: privateProfile,
    mappings: input.mappings ?? [],
  };
}

export function createLocalSMBOnboardingManifest(input: {
  readonly businessId: string;
  readonly workspaceId: string;
  readonly businessType: string;
  readonly industry: string;
  readonly country: string;
  readonly currency: string;
  readonly sourceSystems: readonly LocalSMBSourceType[];
}): LocalSMBOnboardingManifest {
  return {
    businessId: input.businessId,
    workspaceId: input.workspaceId,
    businessType: input.businessType,
    industry: input.industry,
    country: input.country,
    currency: input.currency,
    locations: ["Primary location"],
    sourceSystems: input.sourceSystems,
    availableModules: [],
    importMappings: [],
    dataQualityScore: {
      ...defaultQuality,
      completeness: 0,
      semanticMappingConfidence: 0,
    },
    missingDomains: ["Explicit source mappings", "Consent review"],
    consentProfile: privateProfile,
    trainingEligibility: workspacePrivateEligibility(),
  };
}

export function validateSourceGovernance(
  source: SourceGovernanceManifest,
): readonly string[] {
  const issues: string[] = [];
  if (source.trainingUseStatus === "UNKNOWN") {
    issues.push("UNKNOWN_LICENSE_NOT_TRAINING_APPROVED");
  }
  if (source.trainingUseStatus === "TRAINING_PROHIBITED") {
    issues.push("TRAINING_PROHIBITED_SOURCE_REJECTED");
  }
  if (
    source.trainingUseStatus === "TRAINING_ALLOWED" &&
    (!source.commercialUseAllowed || !source.derivativeUseAllowed)
  ) {
    issues.push("LICENSE_GATE_REJECTED_TRAINING_USE");
  }
  if (source.PIIRisk === "HIGH" || source.privacyRisk === "HIGH") {
    issues.push("PRIVACY_GATE_REQUIRES_REVIEW");
  }
  return issues;
}

export const publicDataAdaptersV1: readonly PublicDataAdapter[] = [
  {
    adapterId: "adapter.public.retail-transaction.fixture.v1",
    sourceFamily: "RETAIL_TRANSACTION",
    normalize(snapshot: PublicSourceSnapshot) {
      return snapshot.rawRows.map((row, index) =>
        canonicalPublicRecord(snapshot, index, "invoice", "commerce", {
          invoiceNumber: String(row.invoiceNo ?? `INV-${index + 1}`),
          productCode: String(row.stockCode ?? "SKU"),
          quantity: Number(row.quantity ?? 0),
          netAmount: Number(row.amount ?? 0),
        }),
      );
    },
  },
  {
    adapterId: "adapter.public.marketing-crm.fixture.v1",
    sourceFamily: "MARKETING_CRM",
    normalize(snapshot: PublicSourceSnapshot) {
      return snapshot.rawRows.map((row, index) =>
        canonicalPublicRecord(
          snapshot,
          index,
          "campaign-response",
          "marketing",
          {
            campaignId: String(row.campaign ?? `campaign-${index + 1}`),
            channel: String(row.channel ?? "unknown"),
            response: Boolean(row.response ?? false),
          },
        ),
      );
    },
  },
  {
    adapterId: "adapter.public.xbrl-financial.fixture.v1",
    sourceFamily: "CORPORATE_FINANCIAL_XBRL",
    normalize(snapshot: PublicSourceSnapshot) {
      return snapshot.rawRows.map((row, index) =>
        canonicalPublicRecord(snapshot, index, "accounting-fact", "finance", {
          metric: String(row.metric ?? "Revenue"),
          period: String(row.period ?? "FY"),
          value: Number(row.value ?? 0),
        }),
      );
    },
  },
];

export const erpFutureCompatibilityBoundaryV1 = {
  adapters: [
    erpAdapter("erp.sap-like.interface", "SAP_LIKE"),
    erpAdapter("erp.oracle-like.interface", "ORACLE_LIKE"),
    erpAdapter("erp.dynamics-like.interface", "DYNAMICS_LIKE"),
    erpAdapter("erp.odoo-like.interface", "ODOO_LIKE"),
    erpAdapter("erp.erpnext-like.interface", "ERPNEXT_LIKE"),
    erpAdapter("erp.custom.interface", "CUSTOM_ERP"),
  ],
  mappings: [
    erpMapping("Customer", "flow.concept.crm.customer"),
    erpMapping("Invoice", "flow.concept.finance.invoice"),
    erpMapping("InventoryItem", "flow.concept.inventory.stock-on-hand"),
  ],
  runtimeCapabilities: [
    {
      runtimeId: "flow.local-business-logic-runtime.interface",
      supportedLogicPackIds: [
        toSemanticId("flow.contract.logic-pack.smb-starter@1.0.0"),
      ],
      signedReleaseRequired: true,
    } satisfies LocalBusinessLogicRuntimeCapability,
  ],
  businessLogicCapabilities: [
    {
      capabilityId: toSemanticId("flow.capability.erp.local-logic-runtime"),
      supportedLogicIds: [
        logicId("finance", "gross-margin", 1),
        logicId("inventory", "available-inventory", 1),
      ],
      executionLocation: "ERP_LOCAL",
    } satisfies ERPBusinessLogicCapability,
  ],
} as const;

export { businessDataHierarchyV1, publicTrainingEligibility };

function syntheticBusiness(
  id: string,
  businessType: string,
  industry: string,
  modules: readonly string[],
  seed: number,
): SyntheticBusinessWorkspace {
  const workspaceId = `workspace.synthetic.${id}`;
  const records = [
    record(workspaceId, id, "customer", "crm", seed, {
      name: `Synthetic Customer ${seed}`,
      status: "active",
    }),
    record(workspaceId, id, "invoice", "finance", seed, {
      amount: 1000 + seed * 17,
      status: seed % 2 === 0 ? "paid" : "unpaid",
    }),
    record(workspaceId, id, "product", "universal", seed, {
      sku: `SKU-${seed}`,
      price: 25 + seed,
    }),
    ...(modules.includes("inventory")
      ? [
          record(workspaceId, id, "stock-on-hand", "inventory", seed, {
            onHand: 100 + seed,
            reserved: 20 + seed,
          }),
        ]
      : []),
    ...(modules.includes("projects") || modules.includes("jobs")
      ? [
          record(workspaceId, id, "project-margin", "project", seed, {
            projectRevenue: 5000 + seed * 100,
            projectCost: 3900 + seed * 80,
          }),
        ]
      : []),
  ];
  return {
    businessId: id,
    workspaceId,
    businessType,
    industry,
    country: "US",
    currency: "USD",
    modules,
    records,
    qualityScore: defaultQuality,
    requiredLogicIds: requiredLogicFor(modules),
  };
}

function record(
  workspaceId: string,
  businessId: string,
  entityType: string,
  domain: string,
  seed: number,
  fields: Readonly<Record<string, string | number | boolean>>,
): CanonicalBusinessRecord {
  return {
    recordId: `${businessId}.${entityType}.${seed}`,
    workspaceId,
    semanticId: smbSemanticId(domain, entityType),
    entityType,
    fields,
    sourceRecordId: `${businessId}:${entityType}:${seed}`,
    corpusClassification: "SYNTHETIC_CORPUS",
    dataUseClassification: "EVALUATION_ALLOWED",
    fieldProvenance: Object.fromEntries(
      Object.keys(fields).map((key) => [key, "SYNTHETIC_CREATED"]),
    ),
    sourceGovernanceId: syntheticGovernance.sourceId,
  };
}

function requiredLogicFor(modules: readonly string[]) {
  const ids = new Set([
    logicId("finance", "gross-margin", 1),
    logicId("finance", "net-revenue", 1),
  ]);
  if (modules.includes("inventory")) {
    ids.add(logicId("inventory", "available-inventory", 1));
  }
  if (modules.includes("projects") || modules.includes("jobs")) {
    ids.add(logicId("projects", "project-margin", 1));
    ids.add(logicId("projects", "employee-utilization", 1));
  }
  if (modules.includes("leads"))
    ids.add(logicId("crm", "lead-conversion-rate", 1));
  return [...ids];
}

function canonicalPublicRecord(
  snapshot: PublicSourceSnapshot,
  index: number,
  entityType: string,
  domain: string,
  fields: Readonly<Record<string, string | number | boolean>>,
): CanonicalBusinessRecord {
  return {
    recordId: `${snapshot.source.sourceId}.${entityType}.${index + 1}`,
    workspaceId: `public-corpus.${snapshot.source.sourceId}`,
    semanticId: smbSemanticId(domain, entityType),
    entityType,
    fields,
    sourceRecordId: `${index + 1}`,
    corpusClassification: "PUBLIC_REAL_CORPUS",
    dataUseClassification: "EVALUATION_ALLOWED",
    fieldProvenance: Object.fromEntries(
      Object.keys(fields).map((key) => [key, "REAL_SOURCE"]),
    ),
    sourceGovernanceId: snapshot.source.sourceId,
  };
}

function erpAdapter(
  adapterId: string,
  vendorFamily: ExternalERPAdapter["vendorFamily"],
): ExternalERPAdapter {
  return { adapterId, vendorFamily, boundary: "INTERFACE_ONLY" };
}

function erpMapping(
  externalEntityName: string,
  semanticId: string,
): ERPRecordMapping {
  return {
    externalEntityName,
    canonicalSemanticId: toSemanticId(semanticId),
    mappingRequired: true,
  };
}

export function deterministicDataReleaseFingerprint(value: unknown): string {
  return stableFingerprint(value);
}
