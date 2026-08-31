export interface ContractClauseInput {
  readonly clauseKey: string;
  readonly title: string;
  readonly body: string;
}

export interface ContractDeliverableInput {
  readonly name: string;
  readonly description?: string;
}

export interface PaymentMilestoneInput {
  readonly label: string;
  readonly dueDescription: string;
}

export interface ProjectPlanGenerationInput {
  readonly opportunityName: string;
  readonly clientName: string;
  readonly clauses: readonly ContractClauseInput[];
  readonly deliverables: readonly ContractDeliverableInput[];
  readonly paymentSchedule: readonly PaymentMilestoneInput[];
  readonly timelineDays?: number;
}

export interface GeneratedPhase {
  readonly phaseKey: string;
  readonly name: string;
  readonly sortOrder: number;
}

export interface GeneratedMilestone {
  readonly milestoneKey: string;
  readonly phaseKey: string;
  readonly name: string;
  readonly dueOffsetDays: number;
  readonly sortOrder: number;
}

export interface GeneratedDeliverable {
  readonly deliverableKey: string;
  readonly phaseKey: string;
  readonly name: string;
  readonly description: string;
  readonly sortOrder: number;
}

export interface GeneratedTask {
  readonly taskKey: string;
  readonly deliverableKey: string;
  readonly name: string;
  readonly estimatedMinutes: number;
  readonly sortOrder: number;
}

export interface GeneratedDependency {
  readonly taskKey: string;
  readonly dependsOnTaskKey: string;
}

export interface GeneratedRoleRequirement {
  readonly taskKey: string;
  readonly roleKey: string;
  readonly estimatedMinutes: number;
  readonly requiredCount: number;
}

export interface GeneratedRecommendationDraft {
  readonly taskKey: string;
  readonly roleKey: string;
  readonly suggestedAssigneeLabel: string;
  readonly confidenceBps: number;
  readonly rationale: string;
}

export interface GeneratedProjectPlan {
  readonly name: string;
  readonly phases: readonly GeneratedPhase[];
  readonly milestones: readonly GeneratedMilestone[];
  readonly deliverables: readonly GeneratedDeliverable[];
  readonly tasks: readonly GeneratedTask[];
  readonly dependencies: readonly GeneratedDependency[];
  readonly roleRequirements: readonly GeneratedRoleRequirement[];
  readonly recommendationDrafts: readonly GeneratedRecommendationDraft[];
}

const DEFAULT_PHASES: readonly GeneratedPhase[] = [
  { phaseKey: "discovery", name: "Discovery & alignment", sortOrder: 0 },
  { phaseKey: "design", name: "Creative development", sortOrder: 1 },
  { phaseKey: "production", name: "Production & build", sortOrder: 2 },
  { phaseKey: "launch", name: "Launch & handoff", sortOrder: 3 },
];

const ROLE_RECOMMENDATIONS: Record<
  string,
  { readonly label: string; readonly confidenceBps: number }
> = {
  strategist: { label: "Jordan Ellis (Account Director)", confidenceBps: 8500 },
  creative_lead: { label: "Alex Kim (Senior Designer)", confidenceBps: 9000 },
  project_manager: { label: "Priya Patel (Project Manager)", confidenceBps: 8800 },
  copywriter: { label: "Sam Rivera (Operations Lead)", confidenceBps: 7500 },
};

function timelineDaysFromInput(input: ProjectPlanGenerationInput): number {
  if (input.timelineDays && input.timelineDays > 0) return input.timelineDays;
  const scopeClause = input.clauses.find((c) => c.clauseKey === "scope");
  const match = scopeClause?.body.match(/(\d+)\s*days?/i);
  return match ? Number.parseInt(match[1]!, 10) : 90;
}

function taskTemplatesForDeliverable(
  deliverableKey: string,
  name: string,
  sortBase: number,
): readonly GeneratedTask[] {
  const slug = deliverableKey;
  return [
    {
      taskKey: `${slug}-plan`,
      deliverableKey,
      name: `Plan ${name}`,
      estimatedMinutes: 240,
      sortOrder: sortBase,
    },
    {
      taskKey: `${slug}-execute`,
      deliverableKey,
      name: `Execute ${name}`,
      estimatedMinutes: 960,
      sortOrder: sortBase + 1,
    },
    {
      taskKey: `${slug}-review`,
      deliverableKey,
      name: `Review ${name}`,
      estimatedMinutes: 180,
      sortOrder: sortBase + 2,
    },
  ];
}

export function generateProjectPlan(
  input: ProjectPlanGenerationInput,
): GeneratedProjectPlan {
  const timelineDays = timelineDaysFromInput(input);
  const phaseSpan = Math.max(7, Math.floor(timelineDays / DEFAULT_PHASES.length));

  const milestones: GeneratedMilestone[] = DEFAULT_PHASES.map(
    (phase, index) => ({
      milestoneKey: `${phase.phaseKey}-gate`,
      phaseKey: phase.phaseKey,
      name: `${phase.name} complete`,
      dueOffsetDays: phaseSpan * (index + 1),
      sortOrder: index,
    }),
  );

  const sourceDeliverables =
    input.deliverables.length > 0
      ? input.deliverables
      : [{ name: "Core engagement deliverables", description: input.opportunityName }];

  const deliverables: GeneratedDeliverable[] = sourceDeliverables.map(
    (row, index) => {
      const phase = DEFAULT_PHASES[index % DEFAULT_PHASES.length]!;
      return {
        deliverableKey: `del-${index + 1}`,
        phaseKey: phase.phaseKey,
        name: row.name,
        description: row.description ?? "",
        sortOrder: index,
      };
    },
  );

  const tasks: GeneratedTask[] = [];
  deliverables.forEach((deliverable, delIndex) => {
    tasks.push(
      ...taskTemplatesForDeliverable(
        deliverable.deliverableKey,
        deliverable.name,
        delIndex * 10,
      ),
    );
  });

  const dependencies: GeneratedDependency[] = [];
  for (let i = 1; i < tasks.length; i += 3) {
    const execute = tasks[i];
    const plan = tasks[i - 1];
    const review = tasks[i + 1];
    if (execute && plan) {
      dependencies.push({
        taskKey: execute.taskKey,
        dependsOnTaskKey: plan.taskKey,
      });
    }
    if (review && execute) {
      dependencies.push({
        taskKey: review.taskKey,
        dependsOnTaskKey: execute.taskKey,
      });
    }
  }

  const roleRequirements: GeneratedRoleRequirement[] = tasks.map((task) => {
    const roleKey = task.taskKey.endsWith("-review")
      ? "project_manager"
      : task.taskKey.endsWith("-execute")
        ? "creative_lead"
        : "strategist";
    return {
      taskKey: task.taskKey,
      roleKey,
      estimatedMinutes: task.estimatedMinutes,
      requiredCount: 1,
    };
  });

  const recommendationDrafts: GeneratedRecommendationDraft[] =
    roleRequirements.map((req) => {
      const rec = ROLE_RECOMMENDATIONS[req.roleKey] ?? {
        label: "Unassigned",
        confidenceBps: 5000,
      };
      return {
        taskKey: req.taskKey,
        roleKey: req.roleKey,
        suggestedAssigneeLabel: rec.label,
        confidenceBps: rec.confidenceBps,
        rationale: `Recommended based on ${req.roleKey} capacity for ${input.clientName}.`,
      };
    });

  if (input.paymentSchedule.length > 0 && milestones[0]) {
    milestones[0] = {
      ...milestones[0],
      name: `Kickoff — ${input.paymentSchedule[0]!.label}`,
    };
  }

  return {
    name: `${input.opportunityName} — delivery plan`,
    phases: DEFAULT_PHASES,
    milestones,
    deliverables,
    tasks,
    dependencies,
    roleRequirements,
    recommendationDrafts,
  };
}

export function isProjectPlanComplete(
  plan: Pick<
    GeneratedProjectPlan,
    "phases" | "milestones" | "tasks" | "deliverables"
  >,
): boolean {
  return (
    plan.phases.length > 0 &&
    plan.milestones.length > 0 &&
    plan.deliverables.length > 0 &&
    plan.tasks.length > 0
  );
}
