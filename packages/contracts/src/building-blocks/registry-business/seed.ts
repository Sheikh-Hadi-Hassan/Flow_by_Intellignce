import {
  demoClockDateOffset,
  northstarDemoClockIso,
  renewalUrgencyFromDates,
  type RenewalUrgency,
} from "../clock.js";
import {
  assertDemoPrefixed,
  assertDemoSeedAllowed,
  assertFictionalIdentifiers,
} from "./safety.js";

export const NORTHSTAR_ORG_ID = "00000000-0000-4000-b001-000000000001";
export const NORTHSTAR_ORG_DEMO_KEY = "ns-org-northstar";
export const NORTHSTAR_CHICAGO_LOCATION_ID =
  "00000000-0000-4000-b001-000000000010";
export const NORTHSTAR_REMOTE_LOCATION_ID =
  "00000000-0000-4000-b001-000000000011";

export const FICTIONAL_COMPANY_LABEL = "Fictional demonstration company";

export type BusinessLocationWorkMode = "hybrid" | "remote_first" | "onsite";
export type BusinessLocationType =
  | "headquarters"
  | "remote_operations"
  | "branch";
export type MetricProvenance = "declared_target" | "computed_actual";

export interface DeclaredMetric {
  readonly value: number | string;
  readonly provenance: MetricProvenance;
  readonly computedWhen?: string;
}

export interface BusinessLocationSeed {
  readonly id: string;
  readonly demoKey: string;
  readonly organizationId: string;
  readonly name: string;
  readonly type: BusinessLocationType;
  readonly status: "ACTIVE" | "ARCHIVED";
  readonly isPrimary: boolean;
  readonly isRegistrationCorrespondence: boolean;
  readonly addressLine1: string;
  readonly addressLine2?: string;
  readonly city: string;
  readonly region: string;
  readonly postalCode: string;
  readonly countryCode: "US";
  readonly timezone: string;
  readonly workMode: BusinessLocationWorkMode;
  readonly operatingHours: string;
  readonly primaryContactName: string;
  readonly primaryContactRole: string;
  readonly departmentsSupported: readonly string[];
  readonly functionNote: string;
  readonly startDate: string;
  readonly isDemo: true;
  readonly isFictionalAddress: true;
}

export interface BusinessOwnershipSeed {
  readonly id: string;
  readonly name: string;
  readonly kind: "person" | "entity";
  readonly percent: number;
  readonly role: string;
  readonly isDemo: true;
}

export interface BusinessSignatorySeed {
  readonly id: string;
  readonly memberId: string;
  readonly name: string;
  readonly title: string;
  readonly canSignContracts: boolean;
  readonly authority: string;
  readonly isDemo: true;
}

export interface BusinessBankSeed {
  readonly id: string;
  readonly displayName: string;
  readonly accountType: "checking" | "savings";
  readonly lastFour: string;
  readonly currency: "USD";
  readonly verificationStatus: "verified" | "unverified";
  readonly billingPurpose: string;
  readonly isDemo: true;
}

export interface BusinessTaxSeed {
  readonly id: string;
  readonly label: string;
  readonly maskedValue: string;
  readonly jurisdiction: string;
  readonly isDemo: true;
  readonly demoLabel: "Fictional demo value";
}

export interface BusinessDocumentSeed {
  readonly id: string;
  readonly demoKey: string;
  readonly type: string;
  readonly title: string;
  readonly status: "valid" | "expiring" | "review_due";
  readonly issuedDate: string;
  readonly effectiveDate: string;
  readonly expiryOrReviewDate?: string;
  readonly reminderDate?: string;
  readonly reference: string;
  readonly ownerName: string;
  readonly ownerMemberId: string;
  readonly version: string;
  readonly evidenceNote: string;
  readonly binaryDeferred: true;
  readonly isDemo: true;
  readonly urgency: RenewalUrgency;
}

export interface BusinessAuditSeed {
  readonly id: string;
  readonly workspaceSlug: string;
  readonly actorId: string;
  readonly actorName: string;
  readonly action: string;
  readonly recordType: string;
  readonly recordId: string;
  readonly occurredAt: string;
  readonly previousValue?: string;
  readonly newValue: string;
  readonly reason: string;
}

export interface BusinessFirmographicsSeed {
  readonly industry: string;
  readonly subIndustry: string;
  readonly naicsCode: string;
  readonly naicsTitle: string;
  readonly businessModel: string;
  readonly companySizeBand: string;
  readonly annualRevenueBand: string;
  readonly employeeCountTarget: DeclaredMetric;
  readonly contractorCountTarget: DeclaredMetric;
  readonly clientCountTarget: DeclaredMetric;
  readonly employeeCountActual: DeclaredMetric;
  readonly contractorCountActual: DeclaredMetric;
  readonly clientCountActual: DeclaredMetric;
  readonly primaryMarket: string;
  readonly operatingRegions: readonly string[];
  readonly serviceMix: readonly { readonly label: string; readonly percent: number }[];
  readonly revenueMix: readonly { readonly label: string; readonly percent: number }[];
  readonly retainerVersusProject: string;
  readonly typicalClientSize: string;
  readonly typicalContractValueBand: string;
  readonly averageProjectDurationBand: string;
  readonly workplaceMix: string;
}

export interface BusinessRegistrySeed {
  readonly organizationId: string;
  readonly demoKey: string;
  readonly workspaceSlug: string;
  readonly tradingName: string;
  readonly legalName: string;
  readonly entityType: string;
  readonly fictionalLabel: typeof FICTIONAL_COMPANY_LABEL;
  readonly registrationNumber: string;
  readonly jurisdictionCountry: "US";
  readonly operatingJurisdiction: string;
  readonly timezone: "America/Chicago";
  readonly currency: "USD";
  readonly fiscalYear: string;
  readonly legalStatus: "ACTIVE";
  readonly formationDate: string;
  readonly website: string;
  readonly industryClassification: string;
  readonly locations: readonly BusinessLocationSeed[];
  readonly firmographics: BusinessFirmographicsSeed;
  readonly ownership: readonly BusinessOwnershipSeed[];
  readonly signatories: readonly BusinessSignatorySeed[];
  readonly banks: readonly BusinessBankSeed[];
  readonly tax: readonly BusinessTaxSeed[];
  readonly documents: readonly BusinessDocumentSeed[];
  readonly audits: readonly BusinessAuditSeed[];
  readonly complianceOwners: readonly {
    readonly area: string;
    readonly ownerName: string;
    readonly ownerMemberId: string;
  }[];
  readonly isDemo: true;
}

export interface NorthstarRegistrySeedOptions {
  readonly workspaceSlug?: string;
  readonly validateOnly?: boolean;
}

function documentSeed(input: {
  readonly id: string;
  readonly demoKey: string;
  readonly type: string;
  readonly title: string;
  readonly issuedDate: string;
  readonly effectiveDate: string;
  readonly expiryOrReviewDate?: string;
  readonly reminderDate?: string;
  readonly reference: string;
  readonly ownerName: string;
  readonly ownerMemberId: string;
  readonly version: string;
  readonly evidenceNote: string;
}): BusinessDocumentSeed {
  assertDemoPrefixed(input.reference, input.title);
  const urgency = renewalUrgencyFromDates({
    effectiveDate: input.effectiveDate,
    ...(input.expiryOrReviewDate
      ? { expiryOrReviewDate: input.expiryOrReviewDate }
      : {}),
  });
  const status =
    urgency === "due_30" || urgency === "due_90" ? "expiring" : "valid";
  return {
    id: input.id,
    demoKey: input.demoKey,
    type: input.type,
    title: input.title,
    issuedDate: input.issuedDate,
    effectiveDate: input.effectiveDate,
    ...(input.expiryOrReviewDate
      ? { expiryOrReviewDate: input.expiryOrReviewDate }
      : {}),
    ...(input.reminderDate ? { reminderDate: input.reminderDate } : {}),
    reference: input.reference,
    ownerName: input.ownerName,
    ownerMemberId: input.ownerMemberId,
    version: input.version,
    evidenceNote: input.evidenceNote,
    status,
    urgency,
    binaryDeferred: true,
    isDemo: true,
  };
}

function unavailableActual(kind: string): DeclaredMetric {
  return {
    value: `Not computed — ${kind} block is not seeded`,
    provenance: "computed_actual",
  };
}

export function northstarBusinessRegistrySeed(
  options: NorthstarRegistrySeedOptions = {},
): BusinessRegistrySeed {
  const workspaceSlug = options.workspaceSlug ?? "northstar-creative";
  assertDemoSeedAllowed(workspaceSlug);
  const clock = northstarDemoClockIso();
  const recentlyRenewed = demoClockDateOffset(-14);
  const due30 = demoClockDateOffset(25);
  const due90 = demoClockDateOffset(73);
  const reminder30 = demoClockDateOffset(10);
  const reminder90 = demoClockDateOffset(43);

  const seed: BusinessRegistrySeed = {
    organizationId: NORTHSTAR_ORG_ID,
    demoKey: NORTHSTAR_ORG_DEMO_KEY,
    workspaceSlug,
    tradingName: "Northstar Creative",
    legalName: "Northstar Creative LLC",
    entityType: "Limited liability company",
    fictionalLabel: FICTIONAL_COMPANY_LABEL,
    registrationNumber: "DEMO-LLC-2021-08417",
    jurisdictionCountry: "US",
    operatingJurisdiction: "Illinois",
    timezone: "America/Chicago",
    currency: "USD",
    fiscalYear: "1 January – 31 December",
    legalStatus: "ACTIVE",
    formationDate: "2018-04-16",
    website: "https://northstar.demo.flow",
    industryClassification: "Creative and marketing agency (NAICS 541810)",
    isDemo: true,
    locations: [
      {
        id: NORTHSTAR_CHICAGO_LOCATION_ID,
        demoKey: "ns-loc-chicago",
        organizationId: NORTHSTAR_ORG_ID,
        name: "Chicago headquarters",
        type: "headquarters",
        status: "ACTIVE",
        isPrimary: true,
        isRegistrationCorrespondence: true,
        addressLine1: "400 Northstar Yard",
        addressLine2: "Suite 12",
        city: "Chicago",
        region: "IL",
        postalCode: "60642-DEMO",
        countryCode: "US",
        timezone: "America/Chicago",
        workMode: "hybrid",
        operatingHours: "Mon–Fri 09:00–17:30 America/Chicago",
        primaryContactName: "Maya Chen",
        primaryContactRole: "Founder",
        departmentsSupported: ["Leadership", "Strategy", "Studio", "Finance"],
        functionNote: "Primary office and registration correspondence location.",
        startDate: "2018-04-16",
        isDemo: true,
        isFictionalAddress: true,
      },
      {
        id: NORTHSTAR_REMOTE_LOCATION_ID,
        demoKey: "ns-loc-remote",
        organizationId: NORTHSTAR_ORG_ID,
        name: "Remote operations",
        type: "remote_operations",
        status: "ACTIVE",
        isPrimary: false,
        isRegistrationCorrespondence: false,
        addressLine1: "11 Fictional Harbor Desk",
        city: "Brooklyn",
        region: "NY",
        postalCode: "11201-DEMO",
        countryCode: "US",
        timezone: "America/New_York",
        workMode: "remote_first",
        operatingHours: "Mon–Fri 09:00–17:30 America/New_York",
        primaryContactName: "Jordan Ellis",
        primaryContactRole: "Operations lead",
        departmentsSupported: ["Client services", "Delivery support"],
        functionNote: "Client and delivery support. Not a second legal entity.",
        startDate: "2022-03-01",
        isDemo: true,
        isFictionalAddress: true,
      },
    ],
    firmographics: {
      industry: "Advertising, public relations, and related services",
      subIndustry: "Creative and brand marketing agency",
      naicsCode: "541810",
      naicsTitle: "Advertising Agencies",
      businessModel: "Project and retainer creative services",
      companySizeBand: "20–49",
      annualRevenueBand: "$2.5M–$5M",
      employeeCountTarget: { value: 24, provenance: "declared_target" },
      contractorCountTarget: { value: 6, provenance: "declared_target" },
      clientCountTarget: { value: 52, provenance: "declared_target" },
      employeeCountActual: unavailableActual("People / BB-09"),
      contractorCountActual: unavailableActual("Vendors / BB-14"),
      clientCountActual: unavailableActual("CRM Core / BB-02"),
      primaryMarket: "US Midwest and national brand / healthcare accounts",
      operatingRegions: ["Illinois", "New York", "National remote delivery"],
      serviceMix: [
        { label: "Brand", percent: 35 },
        { label: "Digital", percent: 30 },
        { label: "Content", percent: 20 },
        { label: "Campaign", percent: 15 },
      ],
      revenueMix: [
        { label: "Retainer", percent: 40 },
        { label: "Project", percent: 60 },
      ],
      retainerVersusProject: "40% retainer / 60% project",
      typicalClientSize: "Mid-market and enterprise brand teams",
      typicalContractValueBand: "$50k–$250k",
      averageProjectDurationBand: "8–16 weeks",
      workplaceMix: "Hybrid headquarters 60% / remote-first 40%",
    },
    ownership: [
      {
        id: "ns-own-maya",
        name: "Maya Chen",
        kind: "person",
        percent: 70,
        role: "Managing member",
        isDemo: true,
      },
      {
        id: "ns-own-ellis",
        name: "Ellis Holdings DEMO",
        kind: "entity",
        percent: 30,
        role: "Member",
        isDemo: true,
      },
    ],
    signatories: [
      {
        id: "ns-sig-maya",
        memberId: "ns-res-maya",
        name: "Maya Chen",
        title: "Managing member",
        canSignContracts: true,
        authority: "All contracts, banking, and tax filings",
        isDemo: true,
      },
      {
        id: "ns-sig-jordan",
        memberId: "ns-res-ops",
        name: "Jordan Ellis",
        title: "Operations lead",
        canSignContracts: true,
        authority: "Delivery statements of work under the founder threshold",
        isDemo: true,
      },
    ],
    banks: [
      {
        id: "ns-bank-operating",
        displayName: "DEMO Bank",
        accountType: "checking",
        lastFour: "0429",
        currency: "USD",
        verificationStatus: "verified",
        billingPurpose: "Operating receipts and vendor payables",
        isDemo: true,
      },
      {
        id: "ns-bank-payroll",
        displayName: "DEMO Bank",
        accountType: "checking",
        lastFour: "1183",
        currency: "USD",
        verificationStatus: "verified",
        billingPurpose: "Payroll",
        isDemo: true,
      },
    ],
    tax: [
      {
        id: "ns-tax-federal",
        label: "Federal tax ID (masked)",
        maskedValue: "DEMO-36-0008417",
        jurisdiction: "United States",
        isDemo: true,
        demoLabel: "Fictional demo value",
      },
      {
        id: "ns-tax-illinois",
        label: "Illinois tax ID (masked)",
        maskedValue: "DEMO-IL-0008417",
        jurisdiction: "Illinois",
        isDemo: true,
        demoLabel: "Fictional demo value",
      },
    ],
    documents: [
      documentSeed({
        id: "ns-doc-formation",
        demoKey: "formation",
        type: "formation",
        title: "Articles of organization",
        issuedDate: "2018-04-16",
        effectiveDate: "2018-04-16",
        reference: "DEMO-ART-2018-0416",
        ownerName: "Maya Chen",
        ownerMemberId: "ns-res-maya",
        version: "1",
        evidenceNote: "Metadata only. Binary upload deferred.",
      }),
      documentSeed({
        id: "ns-doc-registration",
        demoKey: "registration-certificate",
        type: "registration_certificate",
        title: "LLC registration certificate",
        issuedDate: "2021-06-02",
        effectiveDate: "2021-06-02",
        reference: "DEMO-LLC-2021-08417",
        ownerName: "Maya Chen",
        ownerMemberId: "ns-res-maya",
        version: "1",
        evidenceNote: "Metadata only. Binary upload deferred.",
      }),
      documentSeed({
        id: "ns-doc-tax",
        demoKey: "tax-registration",
        type: "tax_registration",
        title: "Illinois tax registration",
        issuedDate: "2018-05-01",
        effectiveDate: "2018-05-01",
        reference: "DEMO-TAX-IL-08417",
        ownerName: "Maya Chen",
        ownerMemberId: "ns-res-maya",
        version: "1",
        evidenceNote: "Metadata only. Binary upload deferred.",
      }),
      documentSeed({
        id: "ns-doc-w9",
        demoKey: "w9",
        type: "w9",
        title: "W-9 status",
        issuedDate: recentlyRenewed,
        effectiveDate: recentlyRenewed,
        expiryOrReviewDate: demoClockDateOffset(351),
        reference: "DEMO-W9-2026-0820",
        ownerName: "Maya Chen",
        ownerMemberId: "ns-res-maya",
        version: "2026.2",
        evidenceNote: "Recently renewed against the demo clock. Metadata only.",
      }),
      documentSeed({
        id: "ns-doc-gl",
        demoKey: "gl-insurance",
        type: "general_liability",
        title: "General liability insurance",
        issuedDate: demoClockDateOffset(-365),
        effectiveDate: demoClockDateOffset(-365),
        expiryOrReviewDate: due30,
        reminderDate: reminder30,
        reference: "DEMO-GL-2088",
        ownerName: "Jordan Ellis",
        ownerMemberId: "ns-res-ops",
        version: "2025.1",
        evidenceNote: "Renewal due within 30 days of the demo clock.",
      }),
      documentSeed({
        id: "ns-doc-pl",
        demoKey: "pl-insurance",
        type: "professional_liability",
        title: "Professional liability insurance",
        issuedDate: demoClockDateOffset(-365),
        effectiveDate: demoClockDateOffset(-365),
        expiryOrReviewDate: due90,
        reminderDate: reminder90,
        reference: "DEMO-PL-4419",
        ownerName: "Jordan Ellis",
        ownerMemberId: "ns-res-ops",
        version: "2025.1",
        evidenceNote: "Policy review due within 90 days of the demo clock.",
      }),
      documentSeed({
        id: "ns-doc-privacy",
        demoKey: "privacy-policy",
        type: "privacy_policy",
        title: "Privacy policy",
        issuedDate: "2026-01-06",
        effectiveDate: "2026-01-06",
        expiryOrReviewDate: "2027-01-06",
        reference: "DEMO-POL-PRIV-3",
        ownerName: "Maya Chen",
        ownerMemberId: "ns-res-maya",
        version: "3",
        evidenceNote: "Published v3. Metadata only.",
      }),
      documentSeed({
        id: "ns-doc-retention",
        demoKey: "data-retention",
        type: "data_retention_policy",
        title: "Data-retention policy",
        issuedDate: "2025-03-01",
        effectiveDate: "2025-03-01",
        expiryOrReviewDate: "2027-03-01",
        reference: "DEMO-POL-RET-2",
        ownerName: "Maya Chen",
        ownerMemberId: "ns-res-maya",
        version: "2",
        evidenceNote: "Client files 7 years after last invoice. Metadata only.",
      }),
      documentSeed({
        id: "ns-doc-security",
        demoKey: "information-security",
        type: "information_security_policy",
        title: "Information-security policy",
        issuedDate: "2026-02-01",
        effectiveDate: "2026-02-01",
        expiryOrReviewDate: "2027-02-01",
        reference: "DEMO-POL-SEC-4",
        ownerName: "Jordan Ellis",
        ownerMemberId: "ns-res-ops",
        version: "4",
        evidenceNote: "Metadata only. Binary upload deferred.",
      }),
      documentSeed({
        id: "ns-doc-fiscal",
        demoKey: "fiscal-year",
        type: "fiscal_year_configuration",
        title: "Fiscal-year configuration",
        issuedDate: "2026-01-01",
        effectiveDate: "2026-01-01",
        expiryOrReviewDate: "2026-12-31",
        reference: "DEMO-FY-2026",
        ownerName: "Maya Chen",
        ownerMemberId: "ns-res-maya",
        version: "2026",
        evidenceNote: "Calendar fiscal year. Metadata only.",
      }),
      documentSeed({
        id: "ns-doc-signatory",
        demoKey: "signatory-record",
        type: "authorised_signatory_record",
        title: "Authorised signatory record",
        issuedDate: "2024-09-12",
        effectiveDate: "2024-09-12",
        expiryOrReviewDate: "2027-09-12",
        reference: "DEMO-SIG-2024-09",
        ownerName: "Maya Chen",
        ownerMemberId: "ns-res-maya",
        version: "2",
        evidenceNote: "Metadata only. Binary upload deferred.",
      }),
    ],
    complianceOwners: [
      {
        area: "Operations and insurance",
        ownerName: "Jordan Ellis",
        ownerMemberId: "ns-res-ops",
      },
      {
        area: "Controller and tax",
        ownerName: "Maya Chen",
        ownerMemberId: "ns-res-maya",
      },
    ],
    audits: [
      {
        id: "ns-audit-bb01-activated",
        workspaceSlug,
        actorId: "system.seed",
        actorName: "System seed",
        action: "building_block.active",
        recordType: "building_block",
        recordId: "registry.business",
        occurredAt: clock,
        newValue: "active",
        reason: "DEMO-02 Northstar Business Registry activation",
      },
      {
        id: "ns-audit-org-created",
        workspaceSlug,
        actorId: "system.seed",
        actorName: "System seed",
        action: "business_profile.created",
        recordType: "organization",
        recordId: NORTHSTAR_ORG_ID,
        occurredAt: clock,
        newValue: "Northstar Creative LLC",
        reason: "Canonical organisation row for the Northstar demo workspace",
      },
      {
        id: "ns-audit-loc-chicago",
        workspaceSlug,
        actorId: "system.seed",
        actorName: "System seed",
        action: "location.created",
        recordType: "organization_location",
        recordId: NORTHSTAR_CHICAGO_LOCATION_ID,
        occurredAt: clock,
        newValue: "Chicago headquarters",
        reason: "Primary office seed",
      },
      {
        id: "ns-audit-loc-remote",
        workspaceSlug,
        actorId: "system.seed",
        actorName: "System seed",
        action: "location.created",
        recordType: "organization_location",
        recordId: NORTHSTAR_REMOTE_LOCATION_ID,
        occurredAt: clock,
        newValue: "Remote operations",
        reason: "Remote operations seed",
      },
    ],
  };

  assertFictionalIdentifiers(seed);
  if (options.validateOnly) return seed;
  return seed;
}

export type BusinessRegistryRole =
  | "founder"
  | "admin"
  | "finance"
  | "operations"
  | "employee";

export interface BusinessRegistryView {
  readonly profile: BusinessRegistrySeed;
  readonly canEditProfile: boolean;
  readonly canManageLocations: boolean;
  readonly canManageRegistration: boolean;
  readonly canManageSignatories: boolean;
  readonly canManageCompliance: boolean;
  readonly canManageTax: boolean;
  readonly showRestrictedFinancials: boolean;
}

const EMPLOYEE_HIDDEN_DOCUMENT_TYPES = new Set([
  "tax_registration",
  "w9",
  "general_liability",
  "professional_liability",
  "authorised_signatory_record",
]);

export function presentBusinessRegistry(
  seed: BusinessRegistrySeed,
  permissions: readonly string[],
): BusinessRegistryView {
  const canEditProfile = permissions.includes("organization.update_profile");
  const canManageLocations = permissions.includes("location.manage");
  const canManageRegistration = permissions.includes("registry.document.manage");
  const canManageSignatories = permissions.includes("registry.signatory.manage");
  const canManageCompliance = permissions.includes("registry.compliance.manage");
  const canManageTax = permissions.includes("registry.tax.manage");
  const showRestrictedFinancials = canManageTax || canEditProfile;
  const employeeOnly =
    permissions.includes("organization.read") &&
    !canEditProfile &&
    !canManageLocations &&
    !canManageTax;

  let profile = seed;
  if (employeeOnly || !showRestrictedFinancials) {
    profile = {
      ...seed,
      tax: showRestrictedFinancials ? seed.tax : [],
      banks: showRestrictedFinancials ? seed.banks : [],
      ownership: employeeOnly ? [] : seed.ownership,
      signatories: employeeOnly ? [] : seed.signatories,
      documents: employeeOnly
        ? seed.documents.filter(
            (row) => !EMPLOYEE_HIDDEN_DOCUMENT_TYPES.has(row.type),
          )
        : seed.documents,
      audits: employeeOnly ? [] : seed.audits,
    };
  }

  return {
    profile,
    canEditProfile,
    canManageLocations,
    canManageRegistration,
    canManageSignatories,
    canManageCompliance,
    canManageTax,
    showRestrictedFinancials,
  };
}

export function permissionsForRegistryRole(
  role: BusinessRegistryRole,
): readonly string[] {
  if (role === "founder" || role === "admin") {
    return [
      "organization.read",
      "organization.update_profile",
      "location.read",
      "location.manage",
      "registry.document.manage",
      "registry.document.read",
      "registry.tax.manage",
      "registry.signatory.manage",
      "registry.signatory.read",
      "registry.compliance.manage",
      "registry.compliance.read",
      "registry.audit.read",
    ];
  }
  if (role === "finance") {
    return [
      "organization.read",
      "location.read",
      "registry.tax.manage",
      "commercial.audit.read",
    ];
  }
  if (role === "operations") {
    return ["organization.read", "location.read", "location.manage"];
  }
  return ["organization.read"];
}

export function missingRegistrationFields(
  seed: BusinessRegistrySeed | null,
): readonly string[] {
  if (!seed) {
    return [
      "Legal name",
      "Registration identifier",
      "Primary location",
      "Formation date",
    ];
  }
  const missing: string[] = [];
  if (!seed.legalName) missing.push("Legal name");
  if (!seed.registrationNumber) missing.push("Registration identifier");
  if (!seed.formationDate) missing.push("Formation date");
  if (!seed.locations.some((row) => row.isPrimary && row.status === "ACTIVE")) {
    missing.push("Primary location");
  }
  return missing;
}
