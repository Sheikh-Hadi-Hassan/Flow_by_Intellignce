import type { SqlExecutor } from "./sql-executor.js";

export type ResourcePlanStatus =
  | "draft"
  | "recommendations_ready"
  | "founder_review"
  | "changes_requested"
  | "approved"
  | "published";

export interface ResourceProfileRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly displayName: string;
  readonly resourceType: "employee" | "contractor" | "vendor_linked";
  readonly roleKeys: readonly string[];
  readonly timezone: string;
  readonly workspaceMembershipId?: string;
  readonly internalRateMinor?: string;
  readonly currency?: string;
  readonly status: string;
  readonly revision: number;
}

export interface ResourceSkillRecord {
  readonly skillKey: string;
  readonly proficiencyBps: number;
}

export interface WorkingScheduleRecord {
  readonly dayOfWeek: number;
  readonly startMinute: number;
  readonly endMinute: number;
}

export interface AvailabilityExceptionRecord {
  readonly id: string;
  readonly exceptionType: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly reason: string;
}

export interface ResourceProfileDetail extends ResourceProfileRecord {
  readonly skills: readonly ResourceSkillRecord[];
  readonly schedules: readonly WorkingScheduleRecord[];
  readonly exceptions: readonly AvailabilityExceptionRecord[];
}

export interface TaskSkillRequirementRecord {
  readonly id: string;
  readonly taskId: string;
  readonly skillKey: string;
  readonly minProficiencyBps: number;
}

export interface ResourcePlanRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly projectId: string;
  readonly status: ResourcePlanStatus;
  readonly revision: number;
  readonly approvedAt?: string;
  readonly publishedAt?: string;
}

export interface ResourcePlanRecommendationRecord {
  readonly id: string;
  readonly taskId: string;
  readonly roleKey: string;
  readonly resourceProfileId?: string;
  readonly rank: number;
  readonly confidenceBps: number;
  readonly evidence: Record<string, unknown>;
  readonly excludedReason?: string;
}

export interface ResourcePlanAssignmentDraftRecord {
  readonly id: string;
  readonly taskId: string;
  readonly roleKey: string;
  readonly resourceProfileId: string;
  readonly allocationMinutes: number;
  readonly status: string;
}

export interface ResourcePlanVersionRecord {
  readonly id: string;
  readonly versionNumber: number;
  readonly planHash: string;
  readonly publishedAt: string;
}

export interface ResourcePlanDetail extends ResourcePlanRecord {
  readonly recommendations: readonly ResourcePlanRecommendationRecord[];
  readonly assignmentDrafts: readonly ResourcePlanAssignmentDraftRecord[];
  readonly versions: readonly ResourcePlanVersionRecord[];
}

export interface ResourceCapacityRepository {
  listResources(workspaceId: string): Promise<readonly ResourceProfileRecord[]>;
  getResource(
    workspaceId: string,
    resourceId: string,
    includeRates?: boolean,
  ): Promise<ResourceProfileDetail | undefined>;
  createResource(input: ResourceProfileRecord): Promise<ResourceProfileRecord>;
  upsertResourceSkills(
    workspaceId: string,
    resourceId: string,
    skills: readonly ResourceSkillRecord[],
  ): Promise<void>;
  replaceSchedules(
    workspaceId: string,
    resourceId: string,
    schedules: readonly WorkingScheduleRecord[],
  ): Promise<void>;
  addException(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly resourceId: string;
    readonly exceptionType: string;
    readonly startsAt: string;
    readonly endsAt: string;
    readonly reason: string;
  }): Promise<AvailabilityExceptionRecord>;
  listTaskSkillRequirements(
    workspaceId: string,
    projectId: string,
  ): Promise<readonly TaskSkillRequirementRecord[]>;
  upsertTaskSkillRequirement(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly projectId: string;
    readonly taskId: string;
    readonly skillKey: string;
    readonly minProficiencyBps: number;
  }): Promise<TaskSkillRequirementRecord>;
  getOrCreateResourcePlan(
    workspaceId: string,
    projectId: string,
  ): Promise<ResourcePlanDetail>;
  updateResourcePlanStatus(
    workspaceId: string,
    planId: string,
    status: ResourcePlanStatus,
    patch?: { readonly approvedAt?: string; readonly publishedAt?: string },
  ): Promise<ResourcePlanDetail>;
  replaceRecommendations(
    workspaceId: string,
    planId: string,
    projectId: string,
    rows: readonly Omit<ResourcePlanRecommendationRecord, "id">[],
  ): Promise<void>;
  upsertAssignmentDraft(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly planId: string;
    readonly projectId: string;
    readonly taskId: string;
    readonly roleKey: string;
    readonly resourceProfileId: string;
    readonly allocationMinutes: number;
  }): Promise<ResourcePlanAssignmentDraftRecord>;
  publishResourcePlan(input: {
    readonly versionId: string;
    readonly workspaceId: string;
    readonly planId: string;
    readonly projectId: string;
    readonly versionNumber: number;
    readonly planHash: string;
    readonly snapshot: Record<string, unknown>;
    readonly publishedBy?: string;
    readonly assignments: readonly {
      readonly taskId: string;
      readonly roleKey: string;
      readonly resourceProfileId: string;
      readonly assigneeLabel: string;
      readonly allocationMinutes: number;
    }[];
  }): Promise<ResourcePlanVersionRecord>;
  listMyWork(
    workspaceId: string,
    membershipId: string,
  ): Promise<
    readonly {
      readonly projectId: string;
      readonly taskId: string;
      readonly roleKey: string;
      readonly allocationMinutes: number;
    }[]
  >;
  recordGuardDecision(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly planId: string;
    readonly projectId: string;
    readonly action: string;
    readonly outcome: "ALLOW" | "WARN" | "BLOCK";
    readonly reason: string;
    readonly evidence: Record<string, unknown>;
  }): Promise<void>;
}

function redactRates(
  profile: ResourceProfileDetail,
  includeRates: boolean,
): ResourceProfileDetail {
  if (includeRates) return profile;
  const { internalRateMinor, currency, ...rest } = profile;
  void internalRateMinor;
  void currency;
  return rest;
}

/* eslint-disable @typescript-eslint/require-await -- in-memory store matches async contract */
export class InMemoryResourceCapacityRepository implements ResourceCapacityRepository {
  private readonly resources = new Map<string, ResourceProfileDetail>();
  private readonly taskSkills = new Map<string, TaskSkillRequirementRecord>();
  private readonly plans = new Map<string, ResourcePlanDetail>();
  private readonly myWork = new Map<string, { projectId: string; taskId: string; roleKey: string; allocationMinutes: number }[]>();
  private readonly guards: unknown[] = [];

  async listResources(workspaceId: string) {
    return [...this.resources.values()].filter(
      (r) => r.workspaceId === workspaceId,
    );
  }

  async getResource(workspaceId: string, resourceId: string, includeRates = false) {
    const row = this.resources.get(resourceId);
    if (!row || row.workspaceId !== workspaceId) return undefined;
    return redactRates(row, includeRates);
  }

  async createResource(input: ResourceProfileRecord) {
    const detail: ResourceProfileDetail = {
      ...input,
      skills: [],
      schedules: [],
      exceptions: [],
    };
    this.resources.set(input.id, detail);
    return input;
  }

  async upsertResourceSkills(
    workspaceId: string,
    resourceId: string,
    skills: readonly ResourceSkillRecord[],
  ) {
    const row = this.resources.get(resourceId);
    if (!row || row.workspaceId !== workspaceId) throw new Error("Resource not found.");
    this.resources.set(resourceId, { ...row, skills: [...skills] });
  }

  async replaceSchedules(
    workspaceId: string,
    resourceId: string,
    schedules: readonly WorkingScheduleRecord[],
  ) {
    const row = this.resources.get(resourceId);
    if (!row || row.workspaceId !== workspaceId) throw new Error("Resource not found.");
    this.resources.set(resourceId, { ...row, schedules: [...schedules] });
  }

  async addException(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly resourceId: string;
    readonly exceptionType: string;
    readonly startsAt: string;
    readonly endsAt: string;
    readonly reason: string;
  }) {
    const row = this.resources.get(input.resourceId);
    if (!row || row.workspaceId !== input.workspaceId) {
      throw new Error("Resource not found.");
    }
    const exception: AvailabilityExceptionRecord = {
      id: input.id,
      exceptionType: input.exceptionType,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      reason: input.reason,
    };
    this.resources.set(input.resourceId, {
      ...row,
      exceptions: [...row.exceptions, exception],
    });
    return exception;
  }

  async listTaskSkillRequirements(workspaceId: string, projectId: string) {
    return [...this.taskSkills.values()].filter(
      (r) => r.id.startsWith(`${workspaceId}:${projectId}:`) || true,
    );
  }

  async upsertTaskSkillRequirement(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly projectId: string;
    readonly taskId: string;
    readonly skillKey: string;
    readonly minProficiencyBps: number;
  }) {
    const record: TaskSkillRequirementRecord = {
      id: input.id,
      taskId: input.taskId,
      skillKey: input.skillKey,
      minProficiencyBps: input.minProficiencyBps,
    };
    this.taskSkills.set(input.id, record);
    return record;
  }

  async getOrCreateResourcePlan(workspaceId: string, projectId: string) {
    const key = `${workspaceId}:${projectId}`;
    const existing = this.plans.get(key);
    if (existing) return existing;
    const plan: ResourcePlanDetail = {
      id: crypto.randomUUID(),
      workspaceId,
      projectId,
      status: "draft",
      revision: 1,
      recommendations: [],
      assignmentDrafts: [],
      versions: [],
    };
    this.plans.set(key, plan);
    return plan;
  }

  async updateResourcePlanStatus(
    workspaceId: string,
    planId: string,
    status: ResourcePlanStatus,
    patch?: { readonly approvedAt?: string; readonly publishedAt?: string },
  ) {
    const plan = [...this.plans.values()].find(
      (p) => p.id === planId && p.workspaceId === workspaceId,
    );
    if (!plan) throw new Error("Resource plan not found.");
    const next = {
      ...plan,
      status,
      ...(patch?.approvedAt ? { approvedAt: patch.approvedAt } : {}),
      ...(patch?.publishedAt ? { publishedAt: patch.publishedAt } : {}),
    };
    this.plans.set(`${workspaceId}:${plan.projectId}`, next);
    return next;
  }

  async replaceRecommendations(
    workspaceId: string,
    planId: string,
    _projectId: string,
    rows: readonly Omit<ResourcePlanRecommendationRecord, "id">[],
  ) {
    const plan = [...this.plans.values()].find(
      (p) => p.id === planId && p.workspaceId === workspaceId,
    );
    if (!plan) throw new Error("Resource plan not found.");
    this.plans.set(`${workspaceId}:${plan.projectId}`, {
      ...plan,
      recommendations: rows.map((row, index) => ({
        id: `${planId}-rec-${index}`,
        ...row,
      })),
    });
  }

  async upsertAssignmentDraft(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly planId: string;
    readonly projectId: string;
    readonly taskId: string;
    readonly roleKey: string;
    readonly resourceProfileId: string;
    readonly allocationMinutes: number;
  }) {
    const plan = [...this.plans.values()].find(
      (p) => p.id === input.planId && p.workspaceId === input.workspaceId,
    );
    if (!plan) throw new Error("Resource plan not found.");
    const draft: ResourcePlanAssignmentDraftRecord = {
      id: input.id,
      taskId: input.taskId,
      roleKey: input.roleKey,
      resourceProfileId: input.resourceProfileId,
      allocationMinutes: input.allocationMinutes,
      status: "draft",
    };
    const others = plan.assignmentDrafts.filter(
      (d) => !(d.taskId === input.taskId && d.roleKey === input.roleKey),
    );
    this.plans.set(`${input.workspaceId}:${input.projectId}`, {
      ...plan,
      assignmentDrafts: [...others, draft],
    });
    return draft;
  }

  async publishResourcePlan(input: {
    readonly versionId: string;
    readonly workspaceId: string;
    readonly planId: string;
    readonly projectId: string;
    readonly versionNumber: number;
    readonly planHash: string;
    readonly snapshot: Record<string, unknown>;
    readonly publishedBy?: string;
    readonly assignments: readonly {
      readonly taskId: string;
      readonly roleKey: string;
      readonly resourceProfileId: string;
      readonly assigneeLabel: string;
      readonly allocationMinutes: number;
    }[];
  }) {
    const plan = [...this.plans.values()].find(
      (p) => p.id === input.planId && p.workspaceId === input.workspaceId,
    );
    if (!plan) throw new Error("Resource plan not found.");
    const version: ResourcePlanVersionRecord = {
      id: input.versionId,
      versionNumber: input.versionNumber,
      planHash: input.planHash,
      publishedAt: new Date().toISOString(),
    };
    this.plans.set(`${input.workspaceId}:${input.projectId}`, {
      ...plan,
      status: "published",
      publishedAt: version.publishedAt,
      versions: [...plan.versions, version],
    });
    for (const assignment of input.assignments) {
      const resource = this.resources.get(assignment.resourceProfileId);
      if (resource?.workspaceMembershipId) {
        const key = resource.workspaceMembershipId;
        const list = this.myWork.get(key) ?? [];
        list.push({
          projectId: input.projectId,
          taskId: assignment.taskId,
          roleKey: assignment.roleKey,
          allocationMinutes: assignment.allocationMinutes,
        });
        this.myWork.set(key, list);
      }
    }
    return version;
  }

  async listMyWork(workspaceId: string, membershipId: string) {
    const resource = [...this.resources.values()].find(
      (r) =>
        r.workspaceId === workspaceId &&
        r.workspaceMembershipId === membershipId,
    );
    if (!resource) return [];
    return this.myWork.get(membershipId) ?? [];
  }

  async recordGuardDecision(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly planId: string;
    readonly projectId: string;
    readonly action: string;
    readonly outcome: "ALLOW" | "WARN" | "BLOCK";
    readonly reason: string;
    readonly evidence: Record<string, unknown>;
  }) {
    this.guards.push(input);
  }
}

export class PostgresResourceCapacityRepository implements ResourceCapacityRepository {
  constructor(private readonly db: SqlExecutor) {}

  async listResources(workspaceId: string) {
    const result = await this.db.query<ResourceProfileRecord>(
      `select id::text, workspace_id::text as "workspaceId", display_name as "displayName",
              resource_type as "resourceType", role_keys as "roleKeys", timezone,
              workspace_membership_id::text as "workspaceMembershipId",
              internal_rate_minor::text as "internalRateMinor", currency, status, revision
       from public.resource_profiles
       where workspace_id = $1 and status = 'active'
       order by display_name`,
      [workspaceId],
    );
    return result.rows;
  }

  async getResource(workspaceId: string, resourceId: string, includeRates = false) {
    const result = await this.db.query<ResourceProfileRecord>(
      `select id::text, workspace_id::text as "workspaceId", display_name as "displayName",
              resource_type as "resourceType", role_keys as "roleKeys", timezone,
              workspace_membership_id::text as "workspaceMembershipId",
              ${includeRates ? "internal_rate_minor::text as \"internalRateMinor\", currency," : ""}
              status, revision
       from public.resource_profiles
       where workspace_id = $1 and id = $2`,
      [workspaceId, resourceId],
    );
    const base = result.rows[0];
    if (!base) return undefined;
    const skills = await this.db.query<ResourceSkillRecord>(
      `select skill_key as "skillKey", proficiency_bps as "proficiencyBps"
       from public.resource_profile_skills where workspace_id = $1 and resource_profile_id = $2`,
      [workspaceId, resourceId],
    );
    const schedules = await this.db.query<WorkingScheduleRecord>(
      `select day_of_week as "dayOfWeek", start_minute as "startMinute", end_minute as "endMinute"
       from public.resource_working_schedules where workspace_id = $1 and resource_profile_id = $2`,
      [workspaceId, resourceId],
    );
    const exceptions = await this.db.query<AvailabilityExceptionRecord>(
      `select id::text, exception_type as "exceptionType", starts_at as "startsAt",
              ends_at as "endsAt", reason
       from public.resource_availability_exceptions
       where workspace_id = $1 and resource_profile_id = $2`,
      [workspaceId, resourceId],
    );
    return {
      ...base,
      skills: skills.rows,
      schedules: schedules.rows,
      exceptions: exceptions.rows,
    };
  }

  async createResource(input: ResourceProfileRecord) {
    await this.db.query(
      `insert into public.resource_profiles
        (id, workspace_id, display_name, resource_type, role_keys, timezone,
         workspace_membership_id, internal_rate_minor, currency, status, revision)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        input.id,
        input.workspaceId,
        input.displayName,
        input.resourceType,
        input.roleKeys,
        input.timezone,
        input.workspaceMembershipId ?? null,
        input.internalRateMinor ?? null,
        input.currency ?? null,
        input.status,
        input.revision,
      ],
    );
    return input;
  }

  async upsertResourceSkills(
    workspaceId: string,
    resourceId: string,
    skills: readonly ResourceSkillRecord[],
  ) {
    await this.db.query(
      `delete from public.resource_profile_skills where workspace_id = $1 and resource_profile_id = $2`,
      [workspaceId, resourceId],
    );
    for (const skill of skills) {
      await this.db.query(
        `insert into public.resource_profile_skills
          (id, workspace_id, resource_profile_id, skill_key, proficiency_bps)
         values (gen_random_uuid(), $1, $2, $3, $4)`,
        [workspaceId, resourceId, skill.skillKey, skill.proficiencyBps],
      );
    }
  }

  async replaceSchedules(
    workspaceId: string,
    resourceId: string,
    schedules: readonly WorkingScheduleRecord[],
  ) {
    await this.db.query(
      `delete from public.resource_working_schedules where workspace_id = $1 and resource_profile_id = $2`,
      [workspaceId, resourceId],
    );
    for (const slot of schedules) {
      await this.db.query(
        `insert into public.resource_working_schedules
          (id, workspace_id, resource_profile_id, day_of_week, start_minute, end_minute)
         values (gen_random_uuid(), $1, $2, $3, $4, $5)`,
        [workspaceId, resourceId, slot.dayOfWeek, slot.startMinute, slot.endMinute],
      );
    }
  }

  async addException(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly resourceId: string;
    readonly exceptionType: string;
    readonly startsAt: string;
    readonly endsAt: string;
    readonly reason: string;
  }) {
    await this.db.query(
      `insert into public.resource_availability_exceptions
        (id, workspace_id, resource_profile_id, exception_type, starts_at, ends_at, reason)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [
        input.id,
        input.workspaceId,
        input.resourceId,
        input.exceptionType,
        input.startsAt,
        input.endsAt,
        input.reason,
      ],
    );
    return {
      id: input.id,
      exceptionType: input.exceptionType,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      reason: input.reason,
    };
  }

  async listTaskSkillRequirements(workspaceId: string, projectId: string) {
    const result = await this.db.query<TaskSkillRequirementRecord>(
      `select id::text, task_id::text as "taskId", skill_key as "skillKey",
              min_proficiency_bps as "minProficiencyBps"
       from public.project_task_skill_requirements
       where workspace_id = $1 and project_id = $2`,
      [workspaceId, projectId],
    );
    return result.rows;
  }

  async upsertTaskSkillRequirement(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly projectId: string;
    readonly taskId: string;
    readonly skillKey: string;
    readonly minProficiencyBps: number;
  }) {
    await this.db.query(
      `insert into public.project_task_skill_requirements
        (id, workspace_id, project_id, task_id, skill_key, min_proficiency_bps)
       values ($1,$2,$3,$4,$5,$6)
       on conflict (task_id, skill_key) do update set min_proficiency_bps = excluded.min_proficiency_bps`,
      [
        input.id,
        input.workspaceId,
        input.projectId,
        input.taskId,
        input.skillKey,
        input.minProficiencyBps,
      ],
    );
    return {
      id: input.id,
      taskId: input.taskId,
      skillKey: input.skillKey,
      minProficiencyBps: input.minProficiencyBps,
    };
  }

  async getOrCreateResourcePlan(workspaceId: string, projectId: string) {
    const existing = await this.db.query<{ id: string }>(
      `select id::text from public.project_resource_plans
       where workspace_id = $1 and project_id = $2
       order by revision desc limit 1`,
      [workspaceId, projectId],
    );
    let planId = existing.rows[0]?.id;
    if (!planId) {
      const created = await this.db.query<{ id: string }>(
        `insert into public.project_resource_plans (id, workspace_id, project_id, revision)
         values (gen_random_uuid(), $1, $2, 1)
         on conflict (project_id, revision) do nothing
         returning id::text as id`,
        [workspaceId, projectId],
      );
      planId = created.rows[0]?.id;
      if (!planId) {
        const retry = await this.db.query<{ id: string }>(
          `select id::text from public.project_resource_plans
           where workspace_id = $1 and project_id = $2
           order by revision desc limit 1`,
          [workspaceId, projectId],
        );
        planId = retry.rows[0]?.id;
      }
    }
    if (!planId) {
      throw new Error("Unable to load resource plan.");
    }
    return this.loadPlan(workspaceId, planId);
  }

  private async loadPlan(
    workspaceId: string,
    planId: string,
  ): Promise<ResourcePlanDetail> {
    const plan = await this.db.query<ResourcePlanRecord>(
      `select id::text, workspace_id::text as "workspaceId", project_id::text as "projectId",
              status, revision, approved_at as "approvedAt", published_at as "publishedAt"
       from public.project_resource_plans where workspace_id = $1 and id = $2`,
      [workspaceId, planId],
    );
    const base = plan.rows[0];
    if (!base) throw new Error("Resource plan not found.");
    const recs = await this.db.query<ResourcePlanRecommendationRecord>(
      `select id::text, task_id::text as "taskId", role_key as "roleKey",
              resource_profile_id::text as "resourceProfileId", rank,
              confidence_bps as "confidenceBps", evidence,
              excluded_reason as "excludedReason"
       from public.resource_plan_recommendations
       where workspace_id = $1 and resource_plan_id = $2`,
      [workspaceId, planId],
    );
    const drafts = await this.db.query<ResourcePlanAssignmentDraftRecord>(
      `select id::text, task_id::text as "taskId", role_key as "roleKey",
              resource_profile_id::text as "resourceProfileId",
              allocation_minutes as "allocationMinutes", status
       from public.resource_plan_assignment_drafts
       where workspace_id = $1 and resource_plan_id = $2`,
      [workspaceId, planId],
    );
    const versions = await this.db.query<ResourcePlanVersionRecord>(
      `select id::text, version_number as "versionNumber", plan_hash as "planHash",
              published_at as "publishedAt"
       from public.resource_plan_versions
       where workspace_id = $1 and resource_plan_id = $2`,
      [workspaceId, planId],
    );
    return {
      ...base,
      recommendations: recs.rows,
      assignmentDrafts: drafts.rows,
      versions: versions.rows,
    };
  }

  async updateResourcePlanStatus(
    workspaceId: string,
    planId: string,
    status: ResourcePlanStatus,
    patch?: { readonly approvedAt?: string; readonly publishedAt?: string },
  ) {
    await this.db.query(
      `update public.project_resource_plans
       set status = $3, approved_at = coalesce($4, approved_at),
           published_at = coalesce($5, published_at), updated_at = now()
       where workspace_id = $1 and id = $2`,
      [workspaceId, planId, status, patch?.approvedAt ?? null, patch?.publishedAt ?? null],
    );
    return this.loadPlan(workspaceId, planId);
  }

  async replaceRecommendations(
    workspaceId: string,
    planId: string,
    projectId: string,
    rows: readonly Omit<ResourcePlanRecommendationRecord, "id">[],
  ) {
    await this.db.query(
      `delete from public.resource_plan_recommendations
       where workspace_id = $1 and resource_plan_id = $2`,
      [workspaceId, planId],
    );
    for (const row of rows) {
      await this.db.query(
        `insert into public.resource_plan_recommendations
          (id, workspace_id, resource_plan_id, project_id, task_id, role_key,
           resource_profile_id, rank, confidence_bps, evidence, excluded_reason)
         values (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          workspaceId,
          planId,
          projectId,
          row.taskId,
          row.roleKey,
          row.resourceProfileId ?? null,
          row.rank,
          row.confidenceBps,
          JSON.stringify(row.evidence),
          row.excludedReason ?? null,
        ],
      );
    }
  }

  async upsertAssignmentDraft(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly planId: string;
    readonly projectId: string;
    readonly taskId: string;
    readonly roleKey: string;
    readonly resourceProfileId: string;
    readonly allocationMinutes: number;
  }) {
    await this.db.query(
      `insert into public.resource_plan_assignment_drafts
        (id, workspace_id, resource_plan_id, project_id, task_id, role_key,
         resource_profile_id, allocation_minutes)
       values ($1,$2,$3,$4,$5,$6,$7,$8)
       on conflict (resource_plan_id, task_id, role_key) do update
         set resource_profile_id = excluded.resource_profile_id,
             allocation_minutes = excluded.allocation_minutes`,
      [
        input.id,
        input.workspaceId,
        input.planId,
        input.projectId,
        input.taskId,
        input.roleKey,
        input.resourceProfileId,
        input.allocationMinutes,
      ],
    );
    return {
      id: input.id,
      taskId: input.taskId,
      roleKey: input.roleKey,
      resourceProfileId: input.resourceProfileId,
      allocationMinutes: input.allocationMinutes,
      status: "draft",
    };
  }

  async publishResourcePlan(input: {
    readonly versionId: string;
    readonly workspaceId: string;
    readonly planId: string;
    readonly projectId: string;
    readonly versionNumber: number;
    readonly planHash: string;
    readonly snapshot: Record<string, unknown>;
    readonly publishedBy?: string;
    readonly assignments: readonly {
      readonly taskId: string;
      readonly roleKey: string;
      readonly resourceProfileId: string;
      readonly assigneeLabel: string;
      readonly allocationMinutes: number;
    }[];
  }) {
    await this.db.query(
      `insert into public.resource_plan_versions
        (id, workspace_id, resource_plan_id, project_id, version_number, plan_hash, snapshot, published_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        input.versionId,
        input.workspaceId,
        input.planId,
        input.projectId,
        input.versionNumber,
        input.planHash,
        JSON.stringify(input.snapshot),
        input.publishedBy ?? null,
      ],
    );
    for (const row of input.assignments) {
      await this.db.query(
        `insert into public.project_assignments
          (id, workspace_id, project_id, task_id, role_key, assignee_label,
           resource_profile_id, allocation_minutes, resource_plan_version_id)
         values (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)
         on conflict (task_id, role_key) do update
           set assignee_label = excluded.assignee_label,
               resource_profile_id = excluded.resource_profile_id,
               allocation_minutes = excluded.allocation_minutes,
               resource_plan_version_id = excluded.resource_plan_version_id`,
        [
          input.workspaceId,
          input.projectId,
          row.taskId,
          row.roleKey,
          row.assigneeLabel,
          row.resourceProfileId,
          row.allocationMinutes,
          input.versionId,
        ],
      );
    }
    await this.updateResourcePlanStatus(input.workspaceId, input.planId, "published", {
      publishedAt: new Date().toISOString(),
    });
    return {
      id: input.versionId,
      versionNumber: input.versionNumber,
      planHash: input.planHash,
      publishedAt: new Date().toISOString(),
    };
  }

  async listMyWork(workspaceId: string, membershipId: string) {
    const result = await this.db.query<{
      projectId: string;
      taskId: string;
      roleKey: string;
      allocationMinutes: number;
    }>(
      `select pa.project_id::text as "projectId", pa.task_id::text as "taskId",
              pa.role_key as "roleKey", pa.allocation_minutes as "allocationMinutes"
       from public.project_assignments pa
       join public.resource_profiles rp on rp.id = pa.resource_profile_id
         and rp.workspace_id = pa.workspace_id
       where pa.workspace_id = $1 and rp.workspace_membership_id = $2`,
      [workspaceId, membershipId],
    );
    return result.rows;
  }

  async recordGuardDecision(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly planId: string;
    readonly projectId: string;
    readonly action: string;
    readonly outcome: "ALLOW" | "WARN" | "BLOCK";
    readonly reason: string;
    readonly evidence: Record<string, unknown>;
  }) {
    await this.db.query(
      `insert into public.resource_plan_guard_decisions
        (id, workspace_id, resource_plan_id, project_id, action, outcome, reason, evidence)
       values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        input.id,
        input.workspaceId,
        input.planId,
        input.projectId,
        input.action,
        input.outcome,
        input.reason,
        JSON.stringify(input.evidence),
      ],
    );
  }
}
