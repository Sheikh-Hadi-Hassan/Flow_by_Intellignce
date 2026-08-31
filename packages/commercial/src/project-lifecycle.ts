import { getNextSnapshot, setup, type SnapshotFrom } from "xstate";

export type ProjectStatus =
  | "draft"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "published"
  | "active"
  | "on_hold"
  | "completed"
  | "archived";

export interface ProjectGuardInput {
  readonly planComplete: boolean;
  readonly actorCanApprove: boolean;
  readonly actorCanPublish: boolean;
  readonly actorCanManage: boolean;
}

export const projectLifecycleMachine = setup({
  types: {
    context: {} as ProjectGuardInput,
    events: {} as
      | { type: "SUBMIT_FOR_REVIEW" }
      | { type: "REQUEST_CHANGES" }
      | { type: "APPROVE" }
      | { type: "PUBLISH" }
      | { type: "ACTIVATE" }
      | { type: "HOLD" }
      | { type: "RESUME" }
      | { type: "COMPLETE" }
      | { type: "ARCHIVE" },
  },
  guards: {
    canSubmit: ({ context }) => context.planComplete,
    canApprove: ({ context }) =>
      context.planComplete && context.actorCanApprove,
    canPublish: ({ context }) => context.actorCanPublish,
    canManage: ({ context }) => context.actorCanManage,
  },
}).createMachine({
  id: "projectLifecycle",
  initial: "draft",
  context: {
    planComplete: false,
    actorCanApprove: false,
    actorCanPublish: false,
    actorCanManage: false,
  },
  states: {
    draft: {
      on: {
        SUBMIT_FOR_REVIEW: { guard: "canSubmit", target: "in_review" },
      },
    },
    in_review: {
      on: {
        REQUEST_CHANGES: "changes_requested",
        APPROVE: { guard: "canApprove", target: "approved" },
      },
    },
    changes_requested: {
      on: {
        SUBMIT_FOR_REVIEW: { guard: "canSubmit", target: "in_review" },
      },
    },
    approved: {
      on: {
        PUBLISH: { guard: "canPublish", target: "published" },
      },
    },
    published: {
      on: {
        ACTIVATE: { guard: "canPublish", target: "active" },
      },
    },
    active: {
      on: {
        HOLD: { guard: "canManage", target: "on_hold" },
        COMPLETE: { guard: "canManage", target: "completed" },
      },
    },
    on_hold: {
      on: {
        RESUME: { guard: "canManage", target: "active" },
      },
    },
    completed: {
      on: {
        ARCHIVE: { guard: "canManage", target: "archived" },
      },
    },
    archived: { type: "final" },
  },
});

export type ProjectSnapshot = SnapshotFrom<typeof projectLifecycleMachine>;

export function nextProjectStatus(
  from: ProjectStatus,
  event:
    | "SUBMIT_FOR_REVIEW"
    | "REQUEST_CHANGES"
    | "APPROVE"
    | "PUBLISH"
    | "ACTIVATE"
    | "HOLD"
    | "RESUME"
    | "COMPLETE"
    | "ARCHIVE",
  context: ProjectGuardInput,
): ProjectStatus {
  const snapshot = projectLifecycleMachine.resolveState({
    value: from,
    context,
  });
  const next = getNextSnapshot(projectLifecycleMachine, snapshot, {
    type: event,
  });
  const value = next.value;
  return typeof value === "string" ? value : from;
}

export function isProjectPlanImmutable(status: ProjectStatus): boolean {
  return ["published", "active", "on_hold", "completed", "archived"].includes(
    status,
  );
}
