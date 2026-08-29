import type {
  BusinessOnboarding,
  OperationsOnboarding,
  PoliciesOnboarding,
  PrototypeSession,
  ServiceSelection,
} from "./types";

export const NORTHSTAR_SLUG = "northstar-creative";

export const emptyBusiness = (): BusinessOnboarding => ({
  businessName: "",
  businessType: "creative_marketing_agency",
  description: "",
  website: "",
  country: "US",
  currency: "USD",
  teamSize: "",
  operatingModel: "",
});

export const emptyOperations = (): OperationsOnboarding => ({
  workModels: [],
  teamLocation: "",
  clientType: "",
  projectDuration: "",
  tools: [],
  operationalConcern: "",
});

export const emptyPolicies = (): PoliciesOnboarding => ({
  proposalApproval: "founder",
  contractApproval: "founder",
  projectCreationApproval: "operations_lead",
  invoiceApproval: "finance",
  expenseApproval: "founder",
  clientVisibility: "deliverables_only",
  aiAutonomy: "recommend_draft",
});

export const emptySession = (slug = "", name = ""): PrototypeSession => ({
  mode: "user",
  workspaceSlug: slug,
  workspaceName: name,
  business: emptyBusiness(),
  operations: emptyOperations(),
  services: [],
  policies: emptyPolicies(),
  onboardingComplete: false,
  twinCompiled: false,
  deferredModuleIds: [],
  accentColor: "#1a56db",
});

export function createUserSession(
  businessName: string,
  email: string,
): PrototypeSession {
  const slug =
    businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "workspace";

  return {
    ...emptySession(slug, businessName),
    mode: "user",
    auth: { email, verified: false },
    business: {
      ...emptyBusiness(),
      businessName,
    },
  };
}

export function workspacePlaceholder(slug: string): PrototypeSession {
  const workspaceName = slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return emptySession(slug, workspaceName || slug);
}

export function mergeServices(
  suggested: ServiceSelection[],
  existing: ServiceSelection[],
): ServiceSelection[] {
  const byId = new Map(existing.map((s) => [s.id, s]));
  return suggested.map((s) => byId.get(s.id) ?? s);
}
