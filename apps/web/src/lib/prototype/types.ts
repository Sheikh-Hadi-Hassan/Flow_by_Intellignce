/** Phase 1A prototype boundary — replace in Phase 1B with API-backed state. */

export type PrototypeMode = "blank" | "user" | "demo";

export type DataClassification =
  "demo-fixture" | "user-entered" | "system-derived" | "deterministic-mock";

export interface AuthPrototype {
  email: string;
  verified: boolean;
}

export interface BusinessOnboarding {
  businessName: string;
  businessType: string;
  description: string;
  website: string;
  country: string;
  currency: string;
  teamSize: string;
  operatingModel: string;
}

export interface OperationsOnboarding {
  workModels: string[];
  teamLocation: string;
  clientType: string;
  projectDuration: string;
  tools: string[];
  operationalConcern: string;
}

export interface ServiceSelection {
  id: string;
  name: string;
  description: string;
  pricingModel: string;
  selected: boolean;
  custom?: boolean;
}

export interface PoliciesOnboarding {
  proposalApproval: string;
  contractApproval: string;
  projectCreationApproval: string;
  invoiceApproval: string;
  expenseApproval: string;
  clientVisibility: string;
  aiAutonomy: string;
}

export interface TwinSnapshot {
  businessName: string;
  classification: string;
  identity: string;
  operatingModel: string;
  services: string[];
  policies: string[];
  expertisePack: string;
  logicCoverage: string[];
  completeness: number;
  missingInformation: string[];
  lastUpdated: string;
  confidence: "high" | "medium" | "low";
  verification: string;
  provenanceLabel: string;
  freshnessLabel: string;
  sourceClassification: DataClassification;
}

export type ModuleSetupStatus =
  | "essential"
  | "recommended"
  | "optional"
  | "needs_information"
  | "not_configured";

export interface ModuleRecommendation {
  id: string;
  name: string;
  essential: boolean;
  setupStatus: ModuleSetupStatus;
  why: string;
  trigger: string;
  benefit: string;
  proofType: "fact" | "inference" | "recommendation";
}

export interface PrototypeSession {
  mode: PrototypeMode;
  workspaceSlug: string;
  workspaceName: string;
  auth?: AuthPrototype;
  business: BusinessOnboarding;
  operations: OperationsOnboarding;
  services: ServiceSelection[];
  policies: PoliciesOnboarding;
  onboardingComplete: boolean;
  twinCompiled: boolean;
  twin?: TwinSnapshot;
  deferredModuleIds: string[];
  accentColor: string;
  workspaceId?: string;
  founderFirstName?: string;
}

export const ONBOARDING_STEPS = [
  { id: "business", label: "Business", path: "business" },
  { id: "operations", label: "Operations", path: "operations" },
  { id: "services", label: "Services", path: "services" },
  { id: "policies", label: "Policies", path: "policies" },
  { id: "review", label: "Review", path: "review" },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"];

export const COMPILATION_STEPS = [
  "Structuring the business profile",
  "Mapping services",
  "Preparing agency expertise",
  "Applying business logic boundaries",
  "Setting Guard boundaries",
  "Creating the initial Twin",
  "Preparing the workspace",
] as const;

export const FOUNDER_NAV = [
  { href: "", label: "Home" },
  { href: "/twin", label: "Twin" },
  { href: "/setup", label: "Setup" },
  { href: "/settings", label: "Settings" },
] as const;
