export const CRM_CORE_BLOCK_ID = "crm.core";
export const CRM_CORE_VERSION = "1.0.0";

export const CRM_CLIENT_TYPES = [
  "brand",
  "retainer",
  "project",
  "internal",
] as const;

export const CRM_LIFECYCLE_STAGES = [
  "lead",
  "active",
  "dormant",
  "at_risk",
  "former",
] as const;

export const CRM_REQUIRED_FIELD_KEYS = [
  "name",
  "industry",
  "ownerUserId",
  "lifecycleStage",
] as const;

export const CRM_CUSTOM_FIELD_TYPES = ["STRING", "ENUM", "BOOLEAN"] as const;

export type CrmClientType = (typeof CRM_CLIENT_TYPES)[number];
export type CrmLifecycleStage = (typeof CRM_LIFECYCLE_STAGES)[number];

export interface CrmCustomFieldDefinition {
  readonly key: string;
  readonly label: string;
  readonly type: (typeof CRM_CUSTOM_FIELD_TYPES)[number];
  readonly enumValues?: readonly string[];
}

export interface CrmSegmentRule {
  readonly id: string;
  readonly name: string;
  readonly lifecycleStages?: readonly CrmLifecycleStage[];
  readonly industries?: readonly string[];
  readonly minHealthScore?: number;
  readonly maxDaysSinceInteraction?: number;
}

export interface CrmCoreConfiguration {
  readonly clientTypes: readonly CrmClientType[];
  readonly lifecycleStages: readonly CrmLifecycleStage[];
  readonly requiredFields: readonly string[];
  readonly customFields: readonly CrmCustomFieldDefinition[];
  readonly segmentRules: readonly CrmSegmentRule[];
  readonly ownershipRule: "creator" | "named";
  readonly duplicateThreshold: number;
  readonly relationshipHealthRules: {
    readonly atRiskAfterDays: number;
    readonly dormantAfterDays: number;
  };
  readonly displayedColumns: readonly string[];
  readonly defaultFilters: {
    readonly lifecycleStage?: CrmLifecycleStage;
    readonly segmentId?: string;
  };
  readonly roleVisibility: Readonly<Record<string, readonly string[]>>;
}

export const CRM_CORE_DEFAULT_CONFIGURATION: CrmCoreConfiguration = {
  clientTypes: [...CRM_CLIENT_TYPES],
  lifecycleStages: [...CRM_LIFECYCLE_STAGES],
  requiredFields: [...CRM_REQUIRED_FIELD_KEYS],
  customFields: [
    {
      key: "accountTier",
      label: "Account tier",
      type: "ENUM",
      enumValues: ["flagship", "growth", "hold"],
    },
  ],
  segmentRules: [
    { id: "seg-active", name: "Active retainers", lifecycleStages: ["active"] },
    { id: "seg-risk", name: "At-risk relationships", lifecycleStages: ["at_risk"] },
    { id: "seg-dormant", name: "Dormant", lifecycleStages: ["dormant"] },
    { id: "seg-former", name: "Former clients", lifecycleStages: ["former"] },
  ],
  ownershipRule: "named",
  duplicateThreshold: 80,
  relationshipHealthRules: {
    atRiskAfterDays: 45,
    dormantAfterDays: 90,
  },
  displayedColumns: [
    "name",
    "industry",
    "lifecycleStage",
    "ownerName",
    "lastInteractionLabel",
  ],
  defaultFilters: {},
  roleVisibility: {
    founder: ["client.read", "client.manage", "crm.duplicate.propose"],
    operator: ["client.read"],
  },
};

function isClientType(value: unknown): value is CrmClientType {
  return CRM_CLIENT_TYPES.includes(value as CrmClientType);
}

function isStage(value: unknown): value is CrmLifecycleStage {
  return CRM_LIFECYCLE_STAGES.includes(value as CrmLifecycleStage);
}

export function parseCrmCoreConfiguration(
  input: unknown,
): CrmCoreConfiguration {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("CRM Core configuration must be an object.");
  }
  const row = input as Record<string, unknown>;
  const clientTypes = Array.isArray(row.clientTypes)
    ? row.clientTypes
    : CRM_CORE_DEFAULT_CONFIGURATION.clientTypes;
  if (!clientTypes.every(isClientType)) {
    throw new Error("Unknown CRM client type.");
  }
  const lifecycleStages = Array.isArray(row.lifecycleStages)
    ? row.lifecycleStages
    : CRM_CORE_DEFAULT_CONFIGURATION.lifecycleStages;
  if (!lifecycleStages.every(isStage)) {
    throw new Error("Unknown CRM lifecycle stage.");
  }
  const requiredFields = Array.isArray(row.requiredFields)
    ? row.requiredFields.map(String)
    : CRM_CORE_DEFAULT_CONFIGURATION.requiredFields;
  for (const field of requiredFields) {
    if (
      !CRM_REQUIRED_FIELD_KEYS.includes(
        field as (typeof CRM_REQUIRED_FIELD_KEYS)[number],
      ) &&
      !(Array.isArray(row.customFields)
        ? row.customFields.some(
            (item) =>
              typeof item === "object" &&
              item !== null &&
              (item as { key?: string }).key === field,
          )
        : false)
    ) {
      throw new Error(`Unknown required field: ${field}`);
    }
  }
  const duplicateThreshold =
    typeof row.duplicateThreshold === "number"
      ? row.duplicateThreshold
      : CRM_CORE_DEFAULT_CONFIGURATION.duplicateThreshold;
  if (
    !Number.isInteger(duplicateThreshold) ||
    duplicateThreshold < 50 ||
    duplicateThreshold > 100
  ) {
    throw new Error("Duplicate threshold must be an integer from 50 to 100.");
  }
  const merged: CrmCoreConfiguration = {
    ...CRM_CORE_DEFAULT_CONFIGURATION,
    clientTypes,
    lifecycleStages,
    requiredFields,
    duplicateThreshold,
    customFields: Array.isArray(row.customFields)
      ? (row.customFields as CrmCustomFieldDefinition[])
      : CRM_CORE_DEFAULT_CONFIGURATION.customFields,
    segmentRules: Array.isArray(row.segmentRules)
      ? (row.segmentRules as CrmSegmentRule[])
      : CRM_CORE_DEFAULT_CONFIGURATION.segmentRules,
    ownershipRule: row.ownershipRule === "creator" ? "creator" : "named",
    displayedColumns: Array.isArray(row.displayedColumns)
      ? row.displayedColumns.map(String)
      : CRM_CORE_DEFAULT_CONFIGURATION.displayedColumns,
    defaultFilters:
      typeof row.defaultFilters === "object" && row.defaultFilters !== null
        ? (row.defaultFilters as CrmCoreConfiguration["defaultFilters"])
        : {},
    roleVisibility:
      typeof row.roleVisibility === "object" && row.roleVisibility !== null
        ? (row.roleVisibility as CrmCoreConfiguration["roleVisibility"])
        : CRM_CORE_DEFAULT_CONFIGURATION.roleVisibility,
    relationshipHealthRules:
      typeof row.relationshipHealthRules === "object" &&
      row.relationshipHealthRules !== null
        ? {
            ...CRM_CORE_DEFAULT_CONFIGURATION.relationshipHealthRules,
            ...(row.relationshipHealthRules as Record<string, number>),
          }
        : CRM_CORE_DEFAULT_CONFIGURATION.relationshipHealthRules,
  };
  return merged;
}

export function crmKnownModelVocabulary() {
  return {
    stages: new Set<string>(CRM_LIFECYCLE_STAGES),
    fields: new Set<string>([
      ...CRM_REQUIRED_FIELD_KEYS,
      "accountTier",
      "website",
    ]),
    permissions: new Set<string>([
      "client.read",
      "client.manage",
      "crm.duplicate.propose",
      "crm.duplicate.merge",
    ]),
    integrations: new Set<string>(["ask-flow", "audit", "opportunities"]),
  };
}
