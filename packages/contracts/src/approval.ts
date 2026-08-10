export type ApprovalMode =
  "not-required" | "allow-once" | "always-ask" | "scoped-allow";

export type ApprovalDecision = "NO_APPROVAL_REQUIRED" | "APPROVAL_REQUIRED";

export interface ApprovalScope {
  readonly workspaceId: string;
  readonly userId?: string;
  readonly roleId?: string;
  readonly module?: string;
  readonly resourceType?: string;
  readonly resourceId?: string;
  readonly action?: string;
  readonly workflowId?: string;
}

export interface ApprovalRequirement {
  readonly mode: ApprovalMode;
  readonly reason: string;
  readonly scope?: ApprovalScope;
}

export interface ApprovalGrant {
  readonly approved: boolean;
  readonly approvedBy: string;
  readonly scope: ApprovalScope;
  readonly reason: string;
}

export interface ApprovalPolicyResult {
  readonly decision: ApprovalDecision;
  readonly reason: string;
  readonly requirement: ApprovalRequirement;
}

export interface ApprovalPolicyEvaluator {
  evaluate(input: {
    readonly requirement: ApprovalRequirement;
    readonly grant?: ApprovalGrant;
  }): ApprovalPolicyResult;
}

export class DefaultApprovalPolicyEvaluator implements ApprovalPolicyEvaluator {
  evaluate(input: {
    readonly requirement: ApprovalRequirement;
    readonly grant?: ApprovalGrant;
  }): ApprovalPolicyResult {
    if (input.requirement.mode === "not-required") {
      return {
        decision: "NO_APPROVAL_REQUIRED",
        reason: "Tool approval policy does not require approval.",
        requirement: input.requirement,
      };
    }

    if (input.grant?.approved === true) {
      return {
        decision: "NO_APPROVAL_REQUIRED",
        reason: "A scoped approval grant was supplied.",
        requirement: input.requirement,
      };
    }

    return {
      decision: "APPROVAL_REQUIRED",
      reason: "Approval is required before execution.",
      requirement: input.requirement,
    };
  }
}
