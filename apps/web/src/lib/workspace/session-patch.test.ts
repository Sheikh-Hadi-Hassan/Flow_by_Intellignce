import { describe, expect, it } from "vitest";

import { emptySession } from "../prototype/defaults";
import {
  buildOnboardingSavePatch,
  inferOnboardingStep,
  mergeSessionPatch,
} from "./session-patch";

describe("session patch helpers", () => {
  it("merges partial onboarding fields into the current session", () => {
    const session = emptySession("acme", "Acme");
    const next = mergeSessionPatch(session, {
      business: { ...session.business, businessName: "Acme Studio" },
    });
    expect(next.business.businessName).toBe("Acme Studio");
  });

  it("infers onboarding step from business progress", () => {
    const session = {
      ...emptySession("acme", "Acme"),
      policies: {
        proposalApproval: "",
        contractApproval: "",
        projectCreationApproval: "",
        invoiceApproval: "",
        expenseApproval: "",
        clientVisibility: "",
        aiAutonomy: "",
      },
    };
    expect(inferOnboardingStep(session)).toBe("business");
    const withBusiness = mergeSessionPatch(session, {
      business: { ...session.business, businessName: "Acme Studio" },
    });
    expect(inferOnboardingStep(withBusiness)).toBe("operations");
  });

  it("builds a save payload from the optimistic session", () => {
    const session = {
      ...emptySession("acme", "Acme"),
      policies: {
        proposalApproval: "",
        contractApproval: "",
        projectCreationApproval: "",
        invoiceApproval: "",
        expenseApproval: "",
        clientVisibility: "",
        aiAutonomy: "",
      },
    };
    const next = mergeSessionPatch(session, {
      business: {
        ...session.business,
        businessName: "Acme Studio",
        description: "Agency",
      },
    });
    expect(buildOnboardingSavePatch(next)).toMatchObject({
      currentStep: "operations",
      business: {
        businessName: "Acme Studio",
        description: "Agency",
      },
    });
  });
});
