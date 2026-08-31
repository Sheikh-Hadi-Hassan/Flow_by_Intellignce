import { createHash } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import {
  calculateResourceCapacity,
  forecastLabourCostMinor,
  generateAssignmentRecommendations,
  nextResourcePlanStatus,
} from "@flow/commercial";
import type { CommercialRepository } from "@flow/database";
import type { ProjectEngineRepository } from "@flow/database";
import type { ResourceCapacityRepository } from "@flow/database";
import {
  COMMERCIAL_REPOSITORY,
  PROJECT_ENGINE_REPOSITORY,
  RESOURCE_CAPACITY_REPOSITORY,
} from "../database/persistence.providers.js";
import type { TrustedExecutionContext } from "../security/flow-auth-context.js";

@Injectable()
export class ResourceCapacityService {
  constructor(
    @Inject(COMMERCIAL_REPOSITORY)
    private readonly commercial: CommercialRepository,
    @Inject(PROJECT_ENGINE_REPOSITORY)
    private readonly projects: ProjectEngineRepository,
    @Inject(RESOURCE_CAPACITY_REPOSITORY)
    private readonly resources: ResourceCapacityRepository,
  ) {}

  private assert(identity: TrustedExecutionContext, permission: string) {
    if (!identity.permissionIds.includes(permission)) {
      throw new ForbiddenException("Missing required permission.");
    }
  }

  private hashPlan(payload: unknown): string {
    return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  }

  private async audit(
    identity: TrustedExecutionContext,
    eventType: string,
    targetType: string,
    targetId: string,
    metadata: Record<string, unknown>,
  ) {
    await this.commercial.recordAudit({
      eventId: crypto.randomUUID(),
      workspaceId: identity.workspaceId,
      actorId: identity.userId,
      eventType,
      targetType,
      targetId,
      metadata,
    });
  }

  private guardContext(
    identity: TrustedExecutionContext,
    projectActive: boolean,
    hasRequirements: boolean,
    hasDraftAssignments: boolean,
    roleCoverageComplete: boolean,
    guardAllowsPublish: boolean,
  ) {
    return {
      projectActive,
      hasRequirements,
      hasDraftAssignments,
      roleCoverageComplete,
      guardAllowsPublish,
      actorCanManage: identity.permissionIds.includes("resource.plan.manage"),
      actorCanApprove: identity.permissionIds.includes("resource.plan.approve"),
      actorCanPublish: identity.permissionIds.includes("resource.plan.publish"),
    };
  }

  async listResources(identity: TrustedExecutionContext) {
    this.assert(identity, "resource.read");
    return this.resources.listResources(identity.workspaceId);
  }

  async getResource(identity: TrustedExecutionContext, resourceId: string) {
    this.assert(identity, "resource.read");
    const includeRates =
      identity.permissionIds.includes("resource.cost.read") ||
      identity.permissionIds.includes("resource.manage");
    const row = await this.resources.getResource(
      identity.workspaceId,
      resourceId,
      includeRates,
    );
    if (!row) throw new NotFoundException("Resource not found.");
    return row;
  }

  async createResource(
    identity: TrustedExecutionContext,
    input: {
      displayName: string;
      resourceType: "employee" | "contractor";
      roleKeys: string[];
      timezone: string;
      workspaceMembershipId?: string;
      internalRateMinor?: string;
      currency?: string;
    },
  ) {
    this.assert(identity, "resource.manage");
    const id = crypto.randomUUID();
    const created = await this.resources.createResource({
      id,
      workspaceId: identity.workspaceId,
      displayName: input.displayName,
      resourceType: input.resourceType,
      roleKeys: input.roleKeys,
      timezone: input.timezone,
      ...(input.workspaceMembershipId
        ? { workspaceMembershipId: input.workspaceMembershipId }
        : {}),
      ...(input.internalRateMinor
        ? { internalRateMinor: input.internalRateMinor }
        : {}),
      ...(input.currency ? { currency: input.currency } : {}),
      status: "active",
      revision: 1,
    });
    await this.audit(identity, "resource.created", "resource_profile", id, {
      displayName: input.displayName,
    });
    return created;
  }

  async getResourcePlan(identity: TrustedExecutionContext, projectId: string) {
    this.assert(identity, "resource.read");
    const project = await this.projects.getProject(identity.workspaceId, projectId);
    if (!project) throw new NotFoundException("Project not found.");
    if (project.status !== "active") {
      throw new BadRequestException("Project must be active for resource planning.");
    }
    return this.resources.getOrCreateResourcePlan(identity.workspaceId, projectId);
  }

  async generateRecommendations(
    identity: TrustedExecutionContext,
    projectId: string,
  ) {
    this.assert(identity, "resource.plan.manage");
    const project = await this.projects.getProject(identity.workspaceId, projectId);
    if (!project) throw new NotFoundException("Project not found.");
    if (project.status !== "active") {
      throw new BadRequestException("Project must be active.");
    }
    const plan = await this.resources.getOrCreateResourcePlan(
      identity.workspaceId,
      projectId,
    );
    const profiles = await this.resources.listResources(identity.workspaceId);
    const taskSkills = await this.resources.listTaskSkillRequirements(
      identity.workspaceId,
      projectId,
    );
    const rangeStartMs = Date.now();
    const rangeEndMs = rangeStartMs + 90 * 86_400_000;

    const recommendable = await Promise.all(
      profiles.map(async (p) => {
        const detail = await this.resources.getResource(
          identity.workspaceId,
          p.id,
          identity.permissionIds.includes("resource.cost.read"),
        );
        return {
          id: p.id,
          displayName: p.displayName,
          roleKeys: [...p.roleKeys],
          skills: [...(detail?.skills ?? [])],
          timezone: p.timezone,
          schedules: [...(detail?.schedules ?? [])],
          exceptions: (detail?.exceptions ?? []).map((e) => ({
            startsAtMs: Date.parse(e.startsAt),
            endsAtMs: Date.parse(e.endsAt),
          })),
          ...(p.internalRateMinor
            ? { internalRateMinor: BigInt(p.internalRateMinor) }
            : {}),
          resourceType:
            p.resourceType === "contractor" ? "contractor" as const : "employee" as const,
        };
      }),
    );

    const tasks = project.roleRequirements.map((req) => {
      const task = project.tasks.find((t) => t.id === req.taskId);
      return {
        taskId: req.taskId,
        taskKey: task?.taskKey ?? req.taskId,
        roleKey: req.roleKey,
        estimatedMinutes: req.estimatedMinutes,
        skillRequirements: taskSkills
          .filter((s) => s.taskId === req.taskId)
          .map((s) => ({
            skillKey: s.skillKey,
            minProficiencyBps: s.minProficiencyBps,
          })),
        rangeStartMs,
        rangeEndMs,
      };
    });

    const result = generateAssignmentRecommendations({
      resources: recommendable,
      tasks,
      existingAssignments: [],
    });

    await this.resources.replaceRecommendations(
      identity.workspaceId,
      plan.id,
      projectId,
      result.recommendations.map((r) => ({
        taskId: r.taskId,
        roleKey: r.roleKey,
        resourceProfileId: r.resourceId,
        rank: r.rank,
        confidenceBps: r.confidenceBps,
        evidence: { factors: r.factors },
        ...(r.excludedReason ? { excludedReason: r.excludedReason } : {}),
      })),
    );

    const nextStatus = nextResourcePlanStatus(
      plan.status,
      "GENERATE_RECOMMENDATIONS",
      this.guardContext(identity, true, tasks.length > 0, false, false, true),
    );
    const updated = await this.resources.updateResourcePlanStatus(
      identity.workspaceId,
      plan.id,
      nextStatus,
    );

    await this.resources.recordGuardDecision({
      id: crypto.randomUUID(),
      workspaceId: identity.workspaceId,
      planId: plan.id,
      projectId,
      action: "resource_plan.generate_recommendations",
      outcome: result.noSafeRecommendation ? "WARN" : "ALLOW",
      reason: result.noSafeRecommendation
        ? "No safe recommendation for all tasks."
        : "Recommendations generated.",
      evidence: { skillGaps: result.skillGaps },
    });

    await this.audit(
      identity,
      "resource_plan.recommendations_generated",
      "project_resource_plan",
      plan.id,
      { count: result.recommendations.length },
    );

    return { plan: updated, ...result };
  }

  async upsertAssignment(
    identity: TrustedExecutionContext,
    projectId: string,
    input: {
      taskId: string;
      roleKey: string;
      resourceProfileId: string;
      allocationMinutes: number;
    },
  ) {
    this.assert(identity, "resource.plan.manage");
    const plan = await this.resources.getOrCreateResourcePlan(
      identity.workspaceId,
      projectId,
    );
    const draft = await this.resources.upsertAssignmentDraft({
      id: crypto.randomUUID(),
      workspaceId: identity.workspaceId,
      planId: plan.id,
      projectId,
      taskId: input.taskId,
      roleKey: input.roleKey,
      resourceProfileId: input.resourceProfileId,
      allocationMinutes: input.allocationMinutes,
    });
    await this.audit(identity, "resource_plan.assignment_drafted", "project_resource_plan", plan.id, {
      taskId: input.taskId,
    });
    return draft;
  }

  async submitPlan(identity: TrustedExecutionContext, projectId: string) {
    this.assert(identity, "resource.plan.manage");
    const plan = await this.resources.getOrCreateResourcePlan(
      identity.workspaceId,
      projectId,
    );
    const nextStatus = nextResourcePlanStatus(
      plan.status,
      "SUBMIT_FOR_REVIEW",
      this.guardContext(
        identity,
        true,
        true,
        plan.assignmentDrafts.length > 0,
        false,
        true,
      ),
    );
    return this.resources.updateResourcePlanStatus(
      identity.workspaceId,
      plan.id,
      nextStatus,
    );
  }

  async approvePlan(identity: TrustedExecutionContext, projectId: string) {
    this.assert(identity, "resource.plan.approve");
    const project = await this.projects.getProject(identity.workspaceId, projectId);
    if (!project) throw new NotFoundException("Project not found.");
    const plan = await this.resources.getOrCreateResourcePlan(
      identity.workspaceId,
      projectId,
    );
    const coveredRoles = new Set(
      plan.assignmentDrafts.map((d) => `${d.taskId}:${d.roleKey}`),
    );
    const roleCoverageComplete = project.roleRequirements.every((req) =>
      coveredRoles.has(`${req.taskId}:${req.roleKey}`),
    );
    if (!roleCoverageComplete) {
      await this.resources.recordGuardDecision({
        id: crypto.randomUUID(),
        workspaceId: identity.workspaceId,
        planId: plan.id,
        projectId,
        action: "resource_plan.approve",
        outcome: "BLOCK",
        reason: "Missing role coverage.",
        evidence: {},
      });
      throw new BadRequestException("Role coverage incomplete.");
    }
    const nextStatus = nextResourcePlanStatus(
      plan.status,
      "APPROVE",
      this.guardContext(identity, true, true, true, true, true),
    );
    return this.resources.updateResourcePlanStatus(
      identity.workspaceId,
      plan.id,
      nextStatus,
      { approvedAt: new Date().toISOString() },
    );
  }

  async publishPlan(identity: TrustedExecutionContext, projectId: string) {
    this.assert(identity, "resource.plan.publish");
    const project = await this.projects.getProject(identity.workspaceId, projectId);
    if (!project) throw new NotFoundException("Project not found.");
    const plan = await this.resources.getOrCreateResourcePlan(
      identity.workspaceId,
      projectId,
    );
    if (plan.status !== "approved") {
      throw new BadRequestException("Resource plan must be approved before publish.");
    }
    const profiles = await this.resources.listResources(identity.workspaceId);
    const profileMap = new Map(profiles.map((p) => [p.id, p.displayName]));
    const assignments = plan.assignmentDrafts.map((d) => ({
      taskId: d.taskId,
      roleKey: d.roleKey,
      resourceProfileId: d.resourceProfileId,
      assigneeLabel: profileMap.get(d.resourceProfileId) ?? "Assigned resource",
      allocationMinutes: d.allocationMinutes,
    }));
    const snapshot = { assignments, planId: plan.id, revision: plan.revision };
    const versionId = crypto.randomUUID();
    const version = await this.resources.publishResourcePlan({
      versionId,
      workspaceId: identity.workspaceId,
      planId: plan.id,
      projectId,
      versionNumber: plan.versions.length + 1,
      planHash: this.hashPlan(snapshot),
      snapshot,
      publishedBy: identity.userId,
      assignments,
    });
    await this.audit(identity, "resource_plan.published", "project_resource_plan", plan.id, {
      versionId,
    });
    return version;
  }

  async getCapacity(identity: TrustedExecutionContext, projectId: string) {
    void projectId;
    this.assert(identity, "resource.read");
    const profiles = await this.resources.listResources(identity.workspaceId);
    const rangeStartMs = Date.now();
    const rangeEndMs = rangeStartMs + 30 * 86_400_000;
    const results = await Promise.all(
      profiles.map(async (p) => {
        const detail = await this.resources.getResource(
          identity.workspaceId,
          p.id,
          false,
        );
        return calculateResourceCapacity({
          resourceId: p.id,
          timezone: p.timezone,
          schedules: detail?.schedules ?? [],
          exceptions: (detail?.exceptions ?? []).map((e) => ({
            startsAtMs: Date.parse(e.startsAt),
            endsAtMs: Date.parse(e.endsAt),
          })),
          assignments: [],
          rangeStartMs,
          rangeEndMs,
        });
      }),
    );
    return results;
  }

  async getCostForecast(identity: TrustedExecutionContext, projectId: string) {
    this.assert(identity, "resource.cost.read");
    const plan = await this.resources.getOrCreateResourcePlan(
      identity.workspaceId,
      projectId,
    );
    let totalMinor = 0n;
    for (const draft of plan.assignmentDrafts) {
      const resource = await this.resources.getResource(
        identity.workspaceId,
        draft.resourceProfileId,
        true,
      );
      if (resource?.internalRateMinor) {
        totalMinor += forecastLabourCostMinor(
          draft.allocationMinutes,
          BigInt(resource.internalRateMinor),
        );
      }
    }
    return { projectId, forecastMinor: totalMinor.toString(), currency: "USD" };
  }

  async getMyWork(identity: TrustedExecutionContext) {
    this.assert(identity, "resource.work.read");
    return this.resources.listMyWork(
      identity.workspaceId,
      identity.membershipId,
    );
  }
}
