export const REGISTRY_BUSINESS_BLOCK_ID = "registry.business";
export const REGISTRY_BUSINESS_VERSION = "1.0.0";

export const REGISTRY_DISPLAYED_FIELDS = [
  "identity",
  "registration",
  "locations",
  "firmographics",
  "ownership",
  "tax_banking",
  "insurance",
  "policies",
  "renewals",
  "audit",
] as const;

export type RegistryDisplayedField = (typeof REGISTRY_DISPLAYED_FIELDS)[number];

export interface RegistryBusinessConfiguration {
  readonly fiscalYearStartMonth: number;
  readonly currency: string;
  readonly retentionYears: number;
  readonly displayedFields: readonly RegistryDisplayedField[];
}

export const REGISTRY_BUSINESS_DEFAULT_CONFIGURATION: RegistryBusinessConfiguration =
  {
    fiscalYearStartMonth: 1,
    currency: "USD",
    retentionYears: 7,
    displayedFields: [...REGISTRY_DISPLAYED_FIELDS],
  };

export function parseRegistryBusinessConfiguration(
  input: unknown,
): RegistryBusinessConfiguration {
  if (input === undefined || input === null || Object.keys(input as object).length === 0) {
    return { ...REGISTRY_BUSINESS_DEFAULT_CONFIGURATION };
  }
  if (typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Business Registry configuration must be an object.");
  }
  const row = input as Record<string, unknown>;
  const fiscalYearStartMonth =
    typeof row.fiscalYearStartMonth === "number"
      ? row.fiscalYearStartMonth
      : REGISTRY_BUSINESS_DEFAULT_CONFIGURATION.fiscalYearStartMonth;
  if (
    !Number.isInteger(fiscalYearStartMonth) ||
    fiscalYearStartMonth < 1 ||
    fiscalYearStartMonth > 12
  ) {
    throw new Error("Fiscal year start month must be an integer from 1 to 12.");
  }
  const currency =
    typeof row.currency === "string"
      ? row.currency
      : REGISTRY_BUSINESS_DEFAULT_CONFIGURATION.currency;
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("Currency must be a three-letter ISO code.");
  }
  const retentionYears =
    typeof row.retentionYears === "number"
      ? row.retentionYears
      : REGISTRY_BUSINESS_DEFAULT_CONFIGURATION.retentionYears;
  if (!Number.isInteger(retentionYears) || retentionYears < 1 || retentionYears > 25) {
    throw new Error("Retention years must be an integer from 1 to 25.");
  }
  const displayedFields = Array.isArray(row.displayedFields)
    ? row.displayedFields.map(String)
    : REGISTRY_BUSINESS_DEFAULT_CONFIGURATION.displayedFields;
  for (const field of displayedFields) {
    if (
      !REGISTRY_DISPLAYED_FIELDS.includes(field as RegistryDisplayedField)
    ) {
      throw new Error(`Unknown displayed field: ${field}`);
    }
  }
  return {
    fiscalYearStartMonth,
    currency,
    retentionYears,
    displayedFields: displayedFields as RegistryDisplayedField[],
  };
}

export function registryKnownModelVocabulary() {
  return {
    stages: new Set<string>(["active", "archived"]),
    fields: new Set<string>([
      "fiscalYearStartMonth",
      "currency",
      "retentionYears",
      ...REGISTRY_DISPLAYED_FIELDS,
    ]),
    permissions: new Set<string>([
      "organization.read",
      "organization.update_profile",
      "location.read",
      "location.manage",
      "registry.document.manage",
      "registry.tax.manage",
      "registry.signatory.manage",
      "registry.compliance.manage",
    ]),
    integrations: new Set<string>(["ask-flow", "audit", "module-registry"]),
  };
}
