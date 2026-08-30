import type { PrototypeSession } from "../prototype/types";

export function mergeSessionPatch(
  session: PrototypeSession,
  patch:
    | Partial<PrototypeSession>
    | ((session: PrototypeSession) => PrototypeSession),
): PrototypeSession {
  return typeof patch === "function"
    ? patch(session)
    : { ...session, ...patch };
}

export function inferOnboardingStep(
  session: PrototypeSession,
): "business" | "operations" | "services" | "policies" | "review" | "complete" {
  if (session.onboardingComplete) return "complete";
  if (session.policies.proposalApproval) return "review";
  if (session.services.some((service) => service.selected)) return "policies";
  if (session.operations.workModels.length > 0) return "services";
  if (session.business.businessName) return "operations";
  return "business";
}

export function buildOnboardingSavePatch(
  session: PrototypeSession,
): Record<string, unknown> {
  return {
    currentStep: inferOnboardingStep(session),
    business: session.business,
    operations: session.operations,
    services: session.services,
    policies: session.policies,
  };
}
