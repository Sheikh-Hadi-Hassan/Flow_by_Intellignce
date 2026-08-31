import { getNextSnapshot, setup, type SnapshotFrom } from "xstate";

export type ResourcePlanStatus =
  | "draft"
  | "recommendations_ready"
  | "founder_review"
  | "changes_requested"
  | "approved"
  | "published";

export interface ResourcePlanGuardInput {
  readonly projectActive: boolean;
  readonly hasRequirements: boolean;
  readonly hasDraftAssignments: boolean;
  readonly roleCoverageComplete: boolean;
  readonly guardAllowsPublish: boolean;
  readonly actorCanManage: boolean;
  readonly actorCanApprove: boolean;
  readonly actorCanPublish: boolean;
}

export const resourcePlanLifecycleMachine = setup({
  types: {
    context: {} as ResourcePlanGuardInput,
    events: {} as
      | { type: "GENERATE_RECOMMENDATIONS" }
      | { type: "SUBMIT_FOR_REVIEW" }
      | { type: "REQUEST_CHANGES" }
      | { type: "APPROVE" }
      | { type: "PUBLISH" }
      | { type: "REVISE" },
  },
  guards: {
    canGenerate: ({ context }) =>
      context.projectActive && context.hasRequirements && context.actorCanManage,
    canSubmit: ({ context }) =>
      context.hasDraftAssignments && context.actorCanManage,
    canApprove: ({ context }) =>
      context.roleCoverageComplete &&
      context.guardAllowsPublish &&
      context.actorCanApprove,
    canPublish: ({ context }) => context.actorCanPublish,
    canRevise: ({ context }) => context.actorCanManage,
  },
}).createMachine({
  id: "resourcePlanLifecycle",
  initial: "draft",
  context: {
    projectActive: false,
    hasRequirements: false,
    hasDraftAssignments: false,
    roleCoverageComplete: false,
    guardAllowsPublish: false,
    actorCanManage: false,
    actorCanApprove: false,
    actorCanPublish: false,
  },
  states: {
    draft: {
      on: {
        GENERATE_RECOMMENDATIONS: {
          guard: "canGenerate",
          target: "recommendations_ready",
        },
      },
    },
    recommendations_ready: {
      on: {
        SUBMIT_FOR_REVIEW: { guard: "canSubmit", target: "founder_review" },
        GENERATE_RECOMMENDATIONS: {
          guard: "canGenerate",
          target: "recommendations_ready",
        },
      },
    },
    founder_review: {
      on: {
        REQUEST_CHANGES: "changes_requested",
        APPROVE: { guard: "canApprove", target: "approved" },
      },
    },
    changes_requested: {
      on: {
        GENERATE_RECOMMENDATIONS: {
          guard: "canGenerate",
          target: "recommendations_ready",
        },
        SUBMIT_FOR_REVIEW: { guard: "canSubmit", target: "founder_review" },
      },
    },
    approved: {
      on: {
        PUBLISH: { guard: "canPublish", target: "published" },
      },
    },
    published: {
      on: {
        REVISE: { guard: "canRevise", target: "draft" },
      },
    },
  },
});

export type ResourcePlanSnapshot = SnapshotFrom<
  typeof resourcePlanLifecycleMachine
>;

export function nextResourcePlanStatus(
  from: ResourcePlanStatus,
  event:
    | "GENERATE_RECOMMENDATIONS"
    | "SUBMIT_FOR_REVIEW"
    | "REQUEST_CHANGES"
    | "APPROVE"
    | "PUBLISH"
    | "REVISE",
  context: ResourcePlanGuardInput,
): ResourcePlanStatus {
  const snapshot = resourcePlanLifecycleMachine.resolveState({
    value: from,
    context,
  });
  const next = getNextSnapshot(resourcePlanLifecycleMachine, snapshot, {
    type: event,
  });
  const value = next.value;
  return typeof value === "string" ? value : from;
}
