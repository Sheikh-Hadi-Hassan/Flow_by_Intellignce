import {
  generateProjectPlan,
  generateProposalSections,
} from "@flow/commercial";
import {
  StaticActionWall,
  type ActorContext,
  type CorrelationId,
  type MembershipId,
  type UserId,
  type WorkspaceContext,
  type WorkspaceId,
} from "@flow/contracts";

import type { AskApplicationContext } from "../ask-flow/types";

export const DEMO_WORKSPACE_ID = "northstar-creative";
export const DEMO_OPPORTUNITY_ID = "ns-opp-acme-brand";
export const DEMO_INTAKE_ID = "ns-intake-acme-approved";
export const DEMO_PROPOSAL_ID = "ns-prop-acme-generated";
export const DEMO_CONTRACT_ID = "ns-contract-acme-executed";
export const DEMO_PROJECT_ID = "ns-project-acme";
export const DEMO_EMPLOYEE_ID = "ns-res-designer";

export const DEMO_LIFECYCLE_ACTIONS = [
  "commercial.generate_proposal",
  "delivery.create_project_from_contract",
  "delivery.complete_task",
] as const;

export type DemoLifecycleAction = (typeof DEMO_LIFECYCLE_ACTIONS)[number];

export interface DemoTask {
  readonly id: string;
  readonly name: string;
  readonly status: "todo" | "complete";
  readonly estimatedMinutes: number;
  readonly assigneeId?: string;
  readonly assigneeName?: string;
  readonly actualMinutes?: number;
  readonly qualityScore?: number;
}

export interface DemoLifecycleSnapshot {
  readonly workspaceId: string;
  readonly client: { readonly id: string; readonly name: string };
  readonly intake: {
    readonly id: string;
    readonly status: "approved";
    readonly questionnaireId: string;
  };
  readonly proposal: null | {
    readonly id: string;
    readonly intakeId: string;
    readonly clientId: string;
    readonly status: "draft" | "accepted";
  };
  readonly contract: null | {
    readonly id: string;
    readonly proposalId: string;
    readonly status: "executed";
  };
  readonly project: null | {
    readonly id: string;
    readonly contractId: string;
    readonly name: string;
    readonly status: "active";
    readonly tasks: readonly DemoTask[];
  };
  readonly employee: {
    readonly id: string;
    readonly name: string;
    readonly deliveryPerformanceScore: number | null;
  };
  readonly completedTaskCount: number;
  readonly audit: readonly {
    readonly id: string;
    readonly action: string;
    readonly recordId: string;
    readonly outcome: "EXECUTED" | "IDEMPOTENT";
    readonly at: string;
  }[];
}

type MutableState = {
  workspaceId: string;
  client: { id: string; name: string };
  intake: { id: string; status: "approved"; questionnaireId: string };
  proposal: DemoLifecycleSnapshot["proposal"];
  contract: DemoLifecycleSnapshot["contract"];
  project: DemoLifecycleSnapshot["project"];
  employee: {
    id: string;
    name: string;
    deliveryPerformanceScore: number | null;
  };
  completedTaskCount: number;
  audit: DemoLifecycleSnapshot["audit"];
};

const STATE_KEY = Symbol.for("flow.hackathon.demo-lifecycle.v1");
const globalState = globalThis as typeof globalThis & {
  [STATE_KEY]?: MutableState;
};

function initialState(): MutableState {
  return {
    workspaceId: DEMO_WORKSPACE_ID,
    client: { id: "ns-client-acme", name: "Acme Robotics" },
    intake: {
      id: DEMO_INTAKE_ID,
      status: "approved",
      questionnaireId: "ns-q-1",
    },
    proposal: null,
    contract: null,
    project: null,
    employee: {
      id: DEMO_EMPLOYEE_ID,
      name: "Sam Rivera (Designer)",
      deliveryPerformanceScore: null,
    },
    completedTaskCount: 0,
    audit: [],
  };
}

function state(): MutableState {
  globalState[STATE_KEY] ??= initialState();
  return globalState[STATE_KEY];
}

function snapshot(value = state()): DemoLifecycleSnapshot {
  return structuredClone(value);
}

function audit(
  value: MutableState,
  action: string,
  recordId: string,
  outcome: "EXECUTED" | "IDEMPOTENT",
) {
  value.audit = [
    ...value.audit,
    {
      id: `demo-audit-${value.audit.length + 1}`,
      action,
      recordId,
      outcome,
      at: new Date().toISOString(),
    },
  ];
}

export function getDemoLifecycle(): DemoLifecycleSnapshot {
  return snapshot();
}

export function resetDemoLifecycle(): DemoLifecycleSnapshot {
  globalState[STATE_KEY] = initialState();
  return snapshot(globalState[STATE_KEY]);
}

export function acceptProposalAndExecuteContract(): DemoLifecycleSnapshot {
  const value = state();
  if (!value.proposal) throw new Error("Generate the Acme proposal first.");
  value.proposal = { ...value.proposal, status: "accepted" };
  value.contract ??= {
    id: DEMO_CONTRACT_ID,
    proposalId: value.proposal.id,
    status: "executed",
  };
  audit(value, "contract.execute", value.contract.id, "EXECUTED");
  return snapshot(value);
}

function generateProposal(value: MutableState) {
  if (value.proposal) {
    audit(
      value,
      "commercial.generate_proposal",
      value.proposal.id,
      "IDEMPOTENT",
    );
    return { recordId: value.proposal.id, idempotent: true };
  }
  generateProposalSections({
    clientName: value.client.name,
    opportunityName: "Acme Q4 Product Launch Campaign",
    currency: "USD",
    briefSections: [
      {
        key: "scope",
        title: "Scope",
        body: "Brand strategy, homepage design, identity system, and launch narrative.",
      },
    ],
    deliverables: [
      { name: "Homepage design" },
      { name: "Channel asset package" },
    ],
    recommendedPriceMinor: "8500000",
    pricingModel: "project",
  });
  value.proposal = {
    id: DEMO_PROPOSAL_ID,
    intakeId: value.intake.id,
    clientId: value.client.id,
    status: "draft",
  };
  audit(value, "commercial.generate_proposal", value.proposal.id, "EXECUTED");
  return { recordId: value.proposal.id, idempotent: false };
}

function createProject(value: MutableState) {
  if (value.project) {
    audit(
      value,
      "delivery.create_project_from_contract",
      value.project.id,
      "IDEMPOTENT",
    );
    return { recordId: value.project.id, idempotent: true };
  }
  if (!value.contract || value.contract.status !== "executed") {
    throw new Error(
      "An executed Acme contract is required before project creation.",
    );
  }
  const plan = generateProjectPlan({
    opportunityName: "Acme Q4 Product Launch Campaign",
    clientName: value.client.name,
    clauses: [
      {
        clauseKey: "scope",
        title: "Scope of work",
        body: "90-day brand launch engagement for Acme Robotics.",
      },
    ],
    deliverables: [
      { name: "Homepage design" },
      { name: "Channel asset package" },
    ],
    paymentSchedule: [{ label: "Kickoff", dueDescription: "On execution" }],
    timelineDays: 90,
  });
  const tasks = plan.tasks.map((task, index): DemoTask => {
    const isHomepageDesign = task.name === "Execute Homepage design";
    return {
      id: `ns-task-${index + 1}`,
      name: isHomepageDesign ? "Acme homepage design" : task.name,
      status: "todo",
      estimatedMinutes: task.estimatedMinutes,
      ...(isHomepageDesign
        ? {
            assigneeId: value.employee.id,
            assigneeName: value.employee.name,
          }
        : {}),
    };
  });
  value.project = {
    id: DEMO_PROJECT_ID,
    contractId: value.contract.id,
    name: "Acme Q4 Product Launch Campaign - delivery plan",
    status: "active",
    tasks,
  };
  audit(
    value,
    "delivery.create_project_from_contract",
    value.project.id,
    "EXECUTED",
  );
  return { recordId: value.project.id, idempotent: false };
}

function completeTask(
  value: MutableState,
  input: { readonly actualHours: number; readonly qualityScore: number },
) {
  if (!value.project) throw new Error("Create the Acme project first.");
  if (
    !Number.isInteger(input.actualHours) ||
    input.actualHours < 1 ||
    input.actualHours > 24
  ) {
    throw new Error("Actual hours must be a whole number from 1 to 24.");
  }
  if (
    !Number.isInteger(input.qualityScore) ||
    input.qualityScore < 1 ||
    input.qualityScore > 5
  ) {
    throw new Error("Quality score must be a whole number from 1 to 5.");
  }
  const task = value.project.tasks.find(
    (row) => row.name.toLowerCase() === "acme homepage design",
  );
  if (!task) throw new Error("The Acme homepage design task was not found.");
  if (task.status === "complete") {
    if (
      task.actualMinutes !== input.actualHours * 60 ||
      task.qualityScore !== input.qualityScore
    ) {
      throw new Error(
        "The task is already complete with different recorded values.",
      );
    }
    audit(value, "delivery.complete_task", task.id, "IDEMPOTENT");
    return { recordId: task.id, idempotent: true };
  }
  const actualMinutes = input.actualHours * 60;
  const qualityComponent = Math.round((input.qualityScore / 5) * 60);
  const efficiencyComponent = Math.round(
    Math.min(task.estimatedMinutes / actualMinutes, 1) * 40,
  );
  const completed = {
    ...task,
    status: "complete" as const,
    actualMinutes,
    qualityScore: input.qualityScore,
  };
  value.project = {
    ...value.project,
    tasks: value.project.tasks.map((row) =>
      row.id === task.id ? completed : row,
    ),
  };
  value.completedTaskCount = value.project.tasks.filter(
    (row) => row.status === "complete",
  ).length;
  value.employee.deliveryPerformanceScore = Math.min(
    100,
    qualityComponent + efficiencyComponent,
  );
  audit(value, "delivery.complete_task", task.id, "EXECUTED");
  return { recordId: task.id, idempotent: false };
}

export interface DemoLifecycleExecution {
  readonly action: DemoLifecycleAction;
  readonly recordId: string;
  readonly idempotent: boolean;
  readonly snapshot: DemoLifecycleSnapshot;
}

export async function executeDemoLifecycleAction(
  action: DemoLifecycleAction,
  input: Readonly<Record<string, unknown>>,
  context: AskApplicationContext,
): Promise<DemoLifecycleExecution> {
  if (context.workspaceId !== DEMO_WORKSPACE_ID) {
    throw new Error("The requested workspace is outside this session.");
  }
  const correlationId = `demo-${crypto.randomUUID()}` as CorrelationId;
  const workspace: WorkspaceContext = {
    workspaceId: context.workspaceId as WorkspaceId,
    slug: context.workspaceId,
  };
  const actor: ActorContext = {
    actorId: context.userId as UserId,
    userId: context.userId as UserId,
    membershipId: "northstar-demo-membership" as MembershipId,
    actorKind: "user",
    workspace,
    roleIds: [context.role],
    permissionIds: context.permissions,
    requestSource: "AI",
    correlationId,
  };
  const decision = await new StaticActionWall().authorize({
    action,
    requestedToolId: action,
    actor,
    workspace,
    resource: {
      resourceType: action.includes("proposal")
        ? "proposal"
        : action.includes("project")
          ? "project"
          : "task",
      workspaceId: context.workspaceId,
    },
    input,
    riskLevel: "MEDIUM",
    evidence: [],
    correlationId,
  });
  if (decision.outcome !== "ALLOW") throw new Error(decision.reason);

  const value = state();
  const result =
    action === "commercial.generate_proposal"
      ? generateProposal(value)
      : action === "delivery.create_project_from_contract"
        ? createProject(value)
        : completeTask(value, {
            actualHours: Number(input.actualHours),
            qualityScore: Number(input.qualityScore),
          });
  return { action, ...result, snapshot: snapshot(value) };
}
