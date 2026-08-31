import type { ProjectStatus } from "@flow/commercial";
import type { SqlExecutor } from "./sql-executor.js";

export interface ProjectRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly opportunityId: string;
  readonly contractVersionId: string;
  readonly name: string;
  readonly status: ProjectStatus;
  readonly currency: string;
  readonly revision: number;
  readonly planHash?: string;
  readonly approvedAt?: string;
  readonly publishedAt?: string;
  readonly activatedAt?: string;
}

export interface ProjectPhaseRecord {
  readonly id: string;
  readonly phaseKey: string;
  readonly name: string;
  readonly sortOrder: number;
  readonly status: string;
}

export interface ProjectMilestoneRecord {
  readonly id: string;
  readonly phaseId: string;
  readonly milestoneKey: string;
  readonly name: string;
  readonly dueOffsetDays: number;
  readonly sortOrder: number;
  readonly status: string;
}

export interface ProjectDeliverableRecord {
  readonly id: string;
  readonly phaseId: string;
  readonly name: string;
  readonly description: string;
  readonly sortOrder: number;
}

export interface ProjectTaskRecord {
  readonly id: string;
  readonly deliverableId: string;
  readonly taskKey: string;
  readonly name: string;
  readonly status: string;
  readonly estimatedMinutes: number;
  readonly sortOrder: number;
}

export interface ProjectDependencyRecord {
  readonly id: string;
  readonly taskId: string;
  readonly dependsOnTaskId: string;
}

export interface ProjectRoleRequirementRecord {
  readonly id: string;
  readonly taskId: string;
  readonly roleKey: string;
  readonly estimatedMinutes: number;
  readonly requiredCount: number;
}

export interface ProjectAssignmentRecord {
  readonly id: string;
  readonly taskId: string;
  readonly roleKey: string;
  readonly assigneeLabel: string;
  readonly assignedAt: string;
}

export interface ProjectRecommendationDraftRecord {
  readonly id: string;
  readonly taskId: string;
  readonly roleKey: string;
  readonly suggestedAssigneeLabel: string;
  readonly confidenceBps: number;
  readonly rationale: string;
  readonly status: string;
}

export interface ProjectDetailRecord extends ProjectRecord {
  readonly phases: readonly ProjectPhaseRecord[];
  readonly milestones: readonly ProjectMilestoneRecord[];
  readonly deliverables: readonly ProjectDeliverableRecord[];
  readonly tasks: readonly ProjectTaskRecord[];
  readonly dependencies: readonly ProjectDependencyRecord[];
  readonly roleRequirements: readonly ProjectRoleRequirementRecord[];
  readonly assignments: readonly ProjectAssignmentRecord[];
  readonly recommendationDrafts: readonly ProjectRecommendationDraftRecord[];
}

export interface CreateProjectPlanInput {
  readonly project: ProjectRecord;
  readonly phases: readonly Omit<ProjectPhaseRecord, "id">[];
  readonly milestones: readonly (Omit<ProjectMilestoneRecord, "id" | "phaseId"> & {
    readonly phaseKey: string;
  })[];
  readonly deliverables: readonly (Omit<ProjectDeliverableRecord, "id" | "phaseId"> & {
    readonly phaseKey: string;
    readonly deliverableKey: string;
  })[];
  readonly tasks: readonly (Omit<ProjectTaskRecord, "id" | "deliverableId"> & {
    readonly deliverableKey: string;
  })[];
  readonly dependencies: readonly {
    readonly taskKey: string;
    readonly dependsOnTaskKey: string;
  }[];
  readonly roleRequirements: readonly (Omit<ProjectRoleRequirementRecord, "id" | "taskId"> & {
    readonly taskKey: string;
  })[];
  readonly recommendationDrafts: readonly (Omit<
    ProjectRecommendationDraftRecord,
    "id" | "taskId"
  > & { readonly taskKey: string })[];
}

export interface ProjectEngineRepository {
  createProjectWithPlan(input: CreateProjectPlanInput): Promise<ProjectDetailRecord>;
  getProjectByOpportunity(
    workspaceId: string,
    opportunityId: string,
  ): Promise<ProjectDetailRecord | undefined>;
  getProject(
    workspaceId: string,
    projectId: string,
  ): Promise<ProjectDetailRecord | undefined>;
  updateProjectStatus(
    workspaceId: string,
    projectId: string,
    status: ProjectStatus,
    patch?: {
      readonly planHash?: string;
      readonly approvedAt?: string;
      readonly publishedAt?: string;
      readonly activatedAt?: string;
    },
  ): Promise<ProjectDetailRecord>;
  createAssignment(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly projectId: string;
    readonly taskId: string;
    readonly roleKey: string;
    readonly assigneeLabel: string;
    readonly assignedBy?: string;
  }): Promise<ProjectAssignmentRecord>;
}

/* eslint-disable @typescript-eslint/require-await -- in-memory store matches async contract */
export class InMemoryProjectEngineRepository implements ProjectEngineRepository {
  private readonly projects = new Map<string, ProjectDetailRecord>();

  async createProjectWithPlan(input: CreateProjectPlanInput) {
    const phaseIds = new Map<string, string>();
    const phases: ProjectPhaseRecord[] = input.phases.map((phase, index) => {
      const id = `${input.project.id}-phase-${index}`;
      phaseIds.set(phase.phaseKey, id);
      return { id, ...phase };
    });
    const deliverableIds = new Map<string, string>();
    const deliverables: ProjectDeliverableRecord[] = input.deliverables.map(
      (row, index) => {
        const id = `${input.project.id}-del-${index}`;
        deliverableIds.set(row.deliverableKey, id);
        return {
          id,
          phaseId: phaseIds.get(row.phaseKey)!,
          name: row.name,
          description: row.description,
          sortOrder: row.sortOrder,
        };
      },
    );
    const taskIds = new Map<string, string>();
    const tasks: ProjectTaskRecord[] = input.tasks.map((task, index) => {
      const id = `${input.project.id}-task-${index}`;
      taskIds.set(task.taskKey, id);
      return {
        id,
        deliverableId: deliverableIds.get(task.deliverableKey)!,
        taskKey: task.taskKey,
        name: task.name,
        status: task.status,
        estimatedMinutes: task.estimatedMinutes,
        sortOrder: task.sortOrder,
      };
    });
    const detail: ProjectDetailRecord = {
      ...input.project,
      phases,
      milestones: input.milestones.map((row, index) => ({
        id: `${input.project.id}-ms-${index}`,
        phaseId: phaseIds.get(row.phaseKey)!,
        milestoneKey: row.milestoneKey,
        name: row.name,
        dueOffsetDays: row.dueOffsetDays,
        sortOrder: row.sortOrder,
        status: row.status,
      })),
      deliverables,
      tasks,
      dependencies: input.dependencies.map((row, index) => ({
        id: `${input.project.id}-dep-${index}`,
        taskId: taskIds.get(row.taskKey)!,
        dependsOnTaskId: taskIds.get(row.dependsOnTaskKey)!,
      })),
      roleRequirements: input.roleRequirements.map((row, index) => ({
        id: `${input.project.id}-role-${index}`,
        taskId: taskIds.get(row.taskKey)!,
        roleKey: row.roleKey,
        estimatedMinutes: row.estimatedMinutes,
        requiredCount: row.requiredCount,
      })),
      recommendationDrafts: input.recommendationDrafts.map((row, index) => ({
        id: `${input.project.id}-rec-${index}`,
        taskId: taskIds.get(row.taskKey)!,
        roleKey: row.roleKey,
        suggestedAssigneeLabel: row.suggestedAssigneeLabel,
        confidenceBps: row.confidenceBps,
        rationale: row.rationale,
        status: row.status,
      })),
      assignments: [],
    };
    this.projects.set(input.project.id, detail);
    return detail;
  }

  async getProjectByOpportunity(workspaceId: string, opportunityId: string) {
    return [...this.projects.values()].find(
      (row) =>
        row.workspaceId === workspaceId && row.opportunityId === opportunityId,
    );
  }

  async getProject(workspaceId: string, projectId: string) {
    const row = this.projects.get(projectId);
    return row?.workspaceId === workspaceId ? row : undefined;
  }

  async updateProjectStatus(
    workspaceId: string,
    projectId: string,
    status: ProjectStatus,
    patch?: {
      readonly planHash?: string;
      readonly approvedAt?: string;
      readonly publishedAt?: string;
      readonly activatedAt?: string;
    },
  ) {
    const current = await this.getProject(workspaceId, projectId);
    if (!current) throw new Error("Project not found.");
    const next: ProjectDetailRecord = {
      ...current,
      status,
      ...(patch?.planHash ? { planHash: patch.planHash } : {}),
      ...(patch?.approvedAt ? { approvedAt: patch.approvedAt } : {}),
      ...(patch?.publishedAt ? { publishedAt: patch.publishedAt } : {}),
      ...(patch?.activatedAt ? { activatedAt: patch.activatedAt } : {}),
    };
    this.projects.set(projectId, next);
    return next;
  }

  async createAssignment(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly projectId: string;
    readonly taskId: string;
    readonly roleKey: string;
    readonly assigneeLabel: string;
    readonly assignedBy?: string;
  }) {
    const current = await this.getProject(input.workspaceId, input.projectId);
    if (!current) throw new Error("Project not found.");
    const assignment: ProjectAssignmentRecord = {
      id: input.id,
      taskId: input.taskId,
      roleKey: input.roleKey,
      assigneeLabel: input.assigneeLabel,
      assignedAt: new Date().toISOString(),
    };
    const next: ProjectDetailRecord = {
      ...current,
      assignments: [...current.assignments, assignment],
    };
    this.projects.set(input.projectId, next);
    return assignment;
  }
}

export class PostgresProjectEngineRepository implements ProjectEngineRepository {
  constructor(private readonly db: SqlExecutor) {}

  async createProjectWithPlan(input: CreateProjectPlanInput) {
    await this.db.query(
      `insert into public.projects
        (id, workspace_id, opportunity_id, contract_version_id, name, status, currency, revision, plan_hash)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        input.project.id,
        input.project.workspaceId,
        input.project.opportunityId,
        input.project.contractVersionId,
        input.project.name,
        input.project.status,
        input.project.currency,
        input.project.revision,
        input.project.planHash ?? null,
      ],
    );
    const phaseIds = new Map<string, string>();
    for (const phase of input.phases) {
      const result = await this.db.query<{ id: string }>(
        `insert into public.project_phases
          (id, workspace_id, project_id, phase_key, name, sort_order, status)
         values (gen_random_uuid(),$1,$2,$3,$4,$5,$6)
         returning id::text as id`,
        [
          input.project.workspaceId,
          input.project.id,
          phase.phaseKey,
          phase.name,
          phase.sortOrder,
          phase.status,
        ],
      );
      phaseIds.set(phase.phaseKey, result.rows[0]!.id);
    }
    const deliverableIds = new Map<string, string>();
    for (const deliverable of input.deliverables) {
      const result = await this.db.query<{ id: string }>(
        `insert into public.project_deliverables
          (id, workspace_id, project_id, phase_id, name, description, sort_order)
         values (gen_random_uuid(),$1,$2,$3,$4,$5,$6)
         returning id::text as id`,
        [
          input.project.workspaceId,
          input.project.id,
          phaseIds.get(deliverable.phaseKey),
          deliverable.name,
          deliverable.description,
          deliverable.sortOrder,
        ],
      );
      deliverableIds.set(deliverable.deliverableKey, result.rows[0]!.id);
    }
    const taskIds = new Map<string, string>();
    for (const task of input.tasks) {
      const result = await this.db.query<{ id: string }>(
        `insert into public.project_tasks
          (id, workspace_id, project_id, deliverable_id, task_key, name, status, estimated_minutes, sort_order)
         values (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8)
         returning id::text as id`,
        [
          input.project.workspaceId,
          input.project.id,
          deliverableIds.get(task.deliverableKey),
          task.taskKey,
          task.name,
          task.status,
          task.estimatedMinutes,
          task.sortOrder,
        ],
      );
      taskIds.set(task.taskKey, result.rows[0]!.id);
    }
    for (const milestone of input.milestones) {
      await this.db.query(
        `insert into public.project_milestones
          (id, workspace_id, project_id, phase_id, milestone_key, name, due_offset_days, sort_order, status)
         values (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          input.project.workspaceId,
          input.project.id,
          phaseIds.get(milestone.phaseKey),
          milestone.milestoneKey,
          milestone.name,
          milestone.dueOffsetDays,
          milestone.sortOrder,
          milestone.status,
        ],
      );
    }
    for (const dep of input.dependencies) {
      await this.db.query(
        `insert into public.project_task_dependencies
          (id, workspace_id, project_id, task_id, depends_on_task_id)
         values (gen_random_uuid(),$1,$2,$3,$4)`,
        [
          input.project.workspaceId,
          input.project.id,
          taskIds.get(dep.taskKey),
          taskIds.get(dep.dependsOnTaskKey),
        ],
      );
    }
    for (const req of input.roleRequirements) {
      await this.db.query(
        `insert into public.project_role_requirements
          (id, workspace_id, project_id, task_id, role_key, estimated_minutes, required_count)
         values (gen_random_uuid(),$1,$2,$3,$4,$5,$6)`,
        [
          input.project.workspaceId,
          input.project.id,
          taskIds.get(req.taskKey),
          req.roleKey,
          req.estimatedMinutes,
          req.requiredCount,
        ],
      );
    }
    for (const draft of input.recommendationDrafts) {
      await this.db.query(
        `insert into public.project_recommendation_drafts
          (id, workspace_id, project_id, task_id, role_key, suggested_assignee_label, confidence_bps, rationale, status)
         values (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          input.project.workspaceId,
          input.project.id,
          taskIds.get(draft.taskKey),
          draft.roleKey,
          draft.suggestedAssigneeLabel,
          draft.confidenceBps,
          draft.rationale,
          draft.status,
        ],
      );
    }
    return (await this.getProject(input.project.workspaceId, input.project.id))!;
  }

  async getProjectByOpportunity(workspaceId: string, opportunityId: string) {
    const result = await this.db.query<{ id: string }>(
      `select id::text as id from public.projects
        where workspace_id = $1 and opportunity_id = $2
        order by created_at desc limit 1`,
      [workspaceId, opportunityId],
    );
    const row = result.rows[0];
    return row ? this.getProject(workspaceId, row.id) : undefined;
  }

  async getProject(workspaceId: string, projectId: string) {
    const projectResult = await this.db.query<Record<string, unknown>>(
      `select * from public.projects where id = $1 and workspace_id = $2`,
      [projectId, workspaceId],
    );
    const row = projectResult.rows[0];
    if (!row) return undefined;
    const phases = await this.db.query<Record<string, unknown>>(
      `select id::text as id, phase_key, name, sort_order, status
         from public.project_phases where workspace_id = $1 and project_id = $2
         order by sort_order asc`,
      [workspaceId, projectId],
    );
    const milestones = await this.db.query<Record<string, unknown>>(
      `select id::text as id, phase_id::text as phase_id, milestone_key, name,
              due_offset_days, sort_order, status
         from public.project_milestones where workspace_id = $1 and project_id = $2
         order by sort_order asc`,
      [workspaceId, projectId],
    );
    const deliverables = await this.db.query<Record<string, unknown>>(
      `select id::text as id, phase_id::text as phase_id, name, description, sort_order
         from public.project_deliverables where workspace_id = $1 and project_id = $2
         order by sort_order asc`,
      [workspaceId, projectId],
    );
    const tasks = await this.db.query<Record<string, unknown>>(
      `select id::text as id, deliverable_id::text as deliverable_id, task_key, name,
              status, estimated_minutes, sort_order
         from public.project_tasks where workspace_id = $1 and project_id = $2
         order by sort_order asc`,
      [workspaceId, projectId],
    );
    const dependencies = await this.db.query<Record<string, unknown>>(
      `select id::text as id, task_id::text as task_id, depends_on_task_id::text as depends_on_task_id
         from public.project_task_dependencies where workspace_id = $1 and project_id = $2`,
      [workspaceId, projectId],
    );
    const roleRequirements = await this.db.query<Record<string, unknown>>(
      `select id::text as id, task_id::text as task_id, role_key, estimated_minutes, required_count
         from public.project_role_requirements where workspace_id = $1 and project_id = $2`,
      [workspaceId, projectId],
    );
    const assignments = await this.db.query<Record<string, unknown>>(
      `select id::text as id, task_id::text as task_id, role_key, assignee_label, assigned_at
         from public.project_assignments where workspace_id = $1 and project_id = $2`,
      [workspaceId, projectId],
    );
    const recommendationDrafts = await this.db.query<Record<string, unknown>>(
      `select id::text as id, task_id::text as task_id, role_key, suggested_assignee_label,
              confidence_bps, rationale, status
         from public.project_recommendation_drafts where workspace_id = $1 and project_id = $2`,
      [workspaceId, projectId],
    );
    return {
      id: String(row.id),
      workspaceId,
      opportunityId: String(row.opportunity_id),
      contractVersionId: String(row.contract_version_id),
      name: String(row.name),
      status: row.status as ProjectStatus,
      currency: String(row.currency),
      revision: Number(row.revision),
      ...(row.plan_hash ? { planHash: row.plan_hash as string } : {}),
      ...(row.approved_at
        ? { approvedAt: new Date(row.approved_at as string | Date).toISOString() }
        : {}),
      ...(row.published_at
        ? { publishedAt: new Date(row.published_at as string | Date).toISOString() }
        : {}),
      ...(row.activated_at
        ? { activatedAt: new Date(row.activated_at as string | Date).toISOString() }
        : {}),
      phases: phases.rows.map((p) => ({
        id: String(p.id),
        phaseKey: String(p.phase_key),
        name: String(p.name),
        sortOrder: Number(p.sort_order),
        status: String(p.status),
      })),
      milestones: milestones.rows.map((m) => ({
        id: String(m.id),
        phaseId: String(m.phase_id),
        milestoneKey: String(m.milestone_key),
        name: String(m.name),
        dueOffsetDays: Number(m.due_offset_days),
        sortOrder: Number(m.sort_order),
        status: String(m.status),
      })),
      deliverables: deliverables.rows.map((d) => ({
        id: String(d.id),
        phaseId: String(d.phase_id),
        name: String(d.name),
        description: String(d.description),
        sortOrder: Number(d.sort_order),
      })),
      tasks: tasks.rows.map((t) => ({
        id: String(t.id),
        deliverableId: String(t.deliverable_id),
        taskKey: String(t.task_key),
        name: String(t.name),
        status: String(t.status),
        estimatedMinutes: Number(t.estimated_minutes),
        sortOrder: Number(t.sort_order),
      })),
      dependencies: dependencies.rows.map((d) => ({
        id: String(d.id),
        taskId: String(d.task_id),
        dependsOnTaskId: String(d.depends_on_task_id),
      })),
      roleRequirements: roleRequirements.rows.map((r) => ({
        id: String(r.id),
        taskId: String(r.task_id),
        roleKey: String(r.role_key),
        estimatedMinutes: Number(r.estimated_minutes),
        requiredCount: Number(r.required_count),
      })),
      assignments: assignments.rows.map((a) => ({
        id: String(a.id),
        taskId: String(a.task_id),
        roleKey: String(a.role_key),
        assigneeLabel: String(a.assignee_label),
        assignedAt: new Date(String(a.assigned_at)).toISOString(),
      })),
      recommendationDrafts: recommendationDrafts.rows.map((r) => ({
        id: String(r.id),
        taskId: String(r.task_id),
        roleKey: String(r.role_key),
        suggestedAssigneeLabel: String(r.suggested_assignee_label),
        confidenceBps: Number(r.confidence_bps),
        rationale: String(r.rationale),
        status: String(r.status),
      })),
    };
  }

  async updateProjectStatus(
    workspaceId: string,
    projectId: string,
    status: ProjectStatus,
    patch?: {
      readonly planHash?: string;
      readonly approvedAt?: string;
      readonly publishedAt?: string;
      readonly activatedAt?: string;
    },
  ) {
    await this.db.query(
      `update public.projects
          set status = $3,
              plan_hash = coalesce($4, plan_hash),
              approved_at = coalesce($5::timestamptz, approved_at),
              published_at = coalesce($6::timestamptz, published_at),
              activated_at = coalesce($7::timestamptz, activated_at),
              updated_at = now()
        where id = $1 and workspace_id = $2`,
      [
        projectId,
        workspaceId,
        status,
        patch?.planHash ?? null,
        patch?.approvedAt ?? null,
        patch?.publishedAt ?? null,
        patch?.activatedAt ?? null,
      ],
    );
    return (await this.getProject(workspaceId, projectId))!;
  }

  async createAssignment(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly projectId: string;
    readonly taskId: string;
    readonly roleKey: string;
    readonly assigneeLabel: string;
    readonly assignedBy?: string;
  }) {
    await this.db.query(
      `insert into public.project_assignments
        (id, workspace_id, project_id, task_id, role_key, assignee_label, assigned_by)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (task_id, role_key) do update
         set assignee_label = excluded.assignee_label,
             assigned_at = now()`,
      [
        input.id,
        input.workspaceId,
        input.projectId,
        input.taskId,
        input.roleKey,
        input.assigneeLabel,
        input.assignedBy ?? null,
      ],
    );
    const result = await this.db.query<Record<string, unknown>>(
      `select id::text as id, task_id::text as task_id, role_key, assignee_label, assigned_at
         from public.project_assignments where id = $1 and workspace_id = $2`,
      [input.id, input.workspaceId],
    );
    const row = result.rows[0]!;
    return {
      id: String(row.id),
      taskId: String(row.task_id),
      roleKey: String(row.role_key),
      assigneeLabel: String(row.assignee_label),
      assignedAt: new Date(String(row.assigned_at)).toISOString(),
    };
  }
}
