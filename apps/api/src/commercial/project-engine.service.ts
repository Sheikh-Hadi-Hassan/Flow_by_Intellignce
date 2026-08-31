import { createHash } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import {
  generateProjectPlan,
  nextProjectStatus,
} from "@flow/commercial";
import type { CommercialRepository } from "@flow/database";
import type { ProjectEngineRepository } from "@flow/database";
import type { ProposalContractRepository } from "@flow/database";
import {
  COMMERCIAL_REPOSITORY,
  PROJECT_ENGINE_REPOSITORY,
  PROPOSAL_CONTRACT_REPOSITORY,
} from "../database/persistence.providers.js";
import type { TrustedExecutionContext } from "../security/flow-auth-context.js";

@Injectable()
export class ProjectEngineService {
  constructor(
    @Inject(COMMERCIAL_REPOSITORY)
    private readonly commercial: CommercialRepository,
    @Inject(PROPOSAL_CONTRACT_REPOSITORY)
    private readonly contracts: ProposalContractRepository,
    @Inject(PROJECT_ENGINE_REPOSITORY)
    private readonly projects: ProjectEngineRepository,
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

  private guardContext(identity: TrustedExecutionContext, planComplete: boolean) {
    return {
      planComplete,
      actorCanApprove: identity.permissionIds.includes("project.approve"),
      actorCanPublish: identity.permissionIds.includes("project.publish"),
      actorCanManage: identity.permissionIds.includes("project.manage"),
    };
  }

  private async executedContractVersion(
    workspaceId: string,
    opportunityId: string,
  ) {
    const contract = await this.contracts.getContractByOpportunity(
      workspaceId,
      opportunityId,
    );
    if (!contract) return undefined;
    const versions = await this.contracts.listContractVersions(
      workspaceId,
      contract.id,
    );
    return versions.find((row) => row.status === "executed");
  }

  async generateProject(
    identity: TrustedExecutionContext,
    opportunityId: string,
  ) {
    this.assert(identity, "project.manage");
    const existing = await this.projects.getProjectByOpportunity(
      identity.workspaceId,
      opportunityId,
    );
    if (existing) {
      throw new ConflictException("Project already exists for opportunity.");
    }
    const opportunity = await this.commercial.getOpportunity(
      identity.workspaceId,
      opportunityId,
    );
    if (!opportunity) throw new NotFoundException("Opportunity not found.");
    const executed = await this.executedContractVersion(
      identity.workspaceId,
      opportunityId,
    );
    if (!executed) {
      throw new BadRequestException("Executed contract required.");
    }
    const client = await this.commercial.getClient(
      identity.workspaceId,
      opportunity.clientId,
    );
    const deliverables = await this.commercial.listDeliverables(
      identity.workspaceId,
      opportunityId,
    );
    const plan = generateProjectPlan({
      opportunityName: opportunity.name,
      clientName: client?.name ?? "Client",
      clauses: executed.clauses.map((row) => ({
        clauseKey: row.clauseKey,
        title: row.title,
        body: row.body,
      })),
      deliverables,
      paymentSchedule: executed.paymentSchedule.map((row) => ({
        label: row.label,
        dueDescription: row.dueDescription,
      })),
    });
    const projectId = crypto.randomUUID();
    const planHash = this.hashPlan(plan);
    const created = await this.projects.createProjectWithPlan({
      project: {
        id: projectId,
        workspaceId: identity.workspaceId,
        opportunityId,
        contractVersionId: executed.id,
        name: plan.name,
        status: "draft",
        currency: opportunity.currency,
        revision: 1,
        planHash,
      },
      phases: plan.phases.map((phase) => ({
        phaseKey: phase.phaseKey,
        name: phase.name,
        sortOrder: phase.sortOrder,
        status: "planned",
      })),
      milestones: plan.milestones.map((row) => ({
        phaseKey: row.phaseKey,
        milestoneKey: row.milestoneKey,
        name: row.name,
        dueOffsetDays: row.dueOffsetDays,
        sortOrder: row.sortOrder,
        status: "pending",
      })),
      deliverables: plan.deliverables.map((row) => ({
        deliverableKey: row.deliverableKey,
        phaseKey: row.phaseKey,
        name: row.name,
        description: row.description,
        sortOrder: row.sortOrder,
      })),
      tasks: plan.tasks.map((row) => ({
        deliverableKey: row.deliverableKey,
        taskKey: row.taskKey,
        name: row.name,
        status: "todo",
        estimatedMinutes: row.estimatedMinutes,
        sortOrder: row.sortOrder,
      })),
      dependencies: plan.dependencies,
      roleRequirements: plan.roleRequirements,
      recommendationDrafts: plan.recommendationDrafts.map((row) => ({
        taskKey: row.taskKey,
        roleKey: row.roleKey,
        suggestedAssigneeLabel: row.suggestedAssigneeLabel,
        confidenceBps: row.confidenceBps,
        rationale: row.rationale,
        status: "draft",
      })),
    });
    await this.commercial.updateOpportunity(
      identity.workspaceId,
      opportunityId,
      opportunity.revision,
      { journeyStatus: "project_in_progress" },
    );
    await this.commercial.recordGuard({
      id: crypto.randomUUID(),
      workspaceId: identity.workspaceId,
      opportunityId,
      action: "project.create",
      outcome: "ALLOW",
      reason: "Deterministic plan generated from executed contract.",
      beforeState: opportunity.journeyStatus,
      afterState: "project_in_progress",
      createdAt: new Date().toISOString(),
    });
    await this.audit(identity, "project.create", "project", projectId, {
      planHash,
      phaseCount: plan.phases.length,
      taskCount: plan.tasks.length,
    });
    return created;
  }

  async getProject(identity: TrustedExecutionContext, projectId: string) {
    const project = await this.projects.getProject(
      identity.workspaceId,
      projectId,
    );
    if (!project) throw new NotFoundException("Project not found.");
    return project;
  }

  async listProjects(
    identity: TrustedExecutionContext,
    opportunityId: string,
  ) {
    const project = await this.projects.getProjectByOpportunity(
      identity.workspaceId,
      opportunityId,
    );
    return project ? [project] : [];
  }

  async submitProject(identity: TrustedExecutionContext, projectId: string) {
    this.assert(identity, "project.manage");
    const project = await this.getProject(identity, projectId);
    const context = this.guardContext(
      identity,
      project.phases.length > 0 &&
        project.milestones.length > 0 &&
        project.deliverables.length > 0 &&
        project.tasks.length > 0,
    );
    const next = nextProjectStatus(project.status, "SUBMIT_FOR_REVIEW", context);
    if (next === project.status) {
      throw new BadRequestException("Project plan is not ready for review.");
    }
    const updated = await this.projects.updateProjectStatus(
      identity.workspaceId,
      projectId,
      next,
    );
    await this.audit(identity, "project.submit", "project", projectId, {
      from: project.status,
      to: next,
    });
    return updated;
  }

  async requestChanges(identity: TrustedExecutionContext, projectId: string) {
    this.assert(identity, "project.approve");
    const project = await this.getProject(identity, projectId);
    const next = nextProjectStatus(
      project.status,
      "REQUEST_CHANGES",
      this.guardContext(identity, true),
    );
    if (next === project.status) {
      throw new BadRequestException("Cannot request changes in current state.");
    }
    return this.projects.updateProjectStatus(
      identity.workspaceId,
      projectId,
      next,
    );
  }

  async approveProject(
    identity: TrustedExecutionContext,
    projectId: string,
    idempotencyKey?: string,
  ) {
    this.assert(identity, "project.approve");
    if (idempotencyKey) {
      const replay = await this.commercial.consumeIdempotency({
        workspaceId: identity.workspaceId,
        key: idempotencyKey,
        requestClass: "project.approve",
        fingerprint: projectId,
      });
      if (replay === "replay") {
        return this.getProject(identity, projectId);
      }
    }
    const project = await this.getProject(identity, projectId);
    const next = nextProjectStatus(
      project.status,
      "APPROVE",
      this.guardContext(identity, true),
    );
    if (next !== "approved") {
      throw new BadRequestException("Project is not ready for approval.");
    }
    const updated = await this.projects.updateProjectStatus(
      identity.workspaceId,
      projectId,
      next,
      { approvedAt: new Date().toISOString() },
    );
    await this.audit(identity, "project.approve", "project", projectId, {
      planHash: project.planHash,
    });
    return updated;
  }

  async publishProject(
    identity: TrustedExecutionContext,
    projectId: string,
    idempotencyKey?: string,
  ) {
    this.assert(identity, "project.publish");
    if (idempotencyKey) {
      const replay = await this.commercial.consumeIdempotency({
        workspaceId: identity.workspaceId,
        key: idempotencyKey,
        requestClass: "project.publish",
        fingerprint: projectId,
      });
      if (replay === "replay") {
        return this.getProject(identity, projectId);
      }
    }
    const project = await this.getProject(identity, projectId);
    const next = nextProjectStatus(
      project.status,
      "PUBLISH",
      this.guardContext(identity, true),
    );
    if (next !== "published") {
      throw new BadRequestException("Project must be approved before publish.");
    }
    const updated = await this.projects.updateProjectStatus(
      identity.workspaceId,
      projectId,
      next,
      { publishedAt: new Date().toISOString() },
    );
    const opportunity = await this.commercial.getOpportunity(
      identity.workspaceId,
      project.opportunityId,
    );
    if (opportunity) {
      await this.commercial.updateOpportunity(
        identity.workspaceId,
        project.opportunityId,
        opportunity.revision,
        { journeyStatus: "project_published" },
      );
    }
    await this.audit(identity, "project.publish", "project", projectId, {});
    return updated;
  }

  async activateProject(
    identity: TrustedExecutionContext,
    projectId: string,
    idempotencyKey?: string,
  ) {
    this.assert(identity, "project.publish");
    if (idempotencyKey) {
      const replay = await this.commercial.consumeIdempotency({
        workspaceId: identity.workspaceId,
        key: idempotencyKey,
        requestClass: "project.activate",
        fingerprint: projectId,
      });
      if (replay === "replay") {
        return this.getProject(identity, projectId);
      }
    }
    const project = await this.getProject(identity, projectId);
    const next = nextProjectStatus(
      project.status,
      "ACTIVATE",
      this.guardContext(identity, true),
    );
    if (next !== "active") {
      throw new BadRequestException("Project must be published before activation.");
    }
    const updated = await this.projects.updateProjectStatus(
      identity.workspaceId,
      projectId,
      next,
      { activatedAt: new Date().toISOString() },
    );
    const opportunity = await this.commercial.getOpportunity(
      identity.workspaceId,
      project.opportunityId,
    );
    if (opportunity) {
      await this.commercial.updateOpportunity(
        identity.workspaceId,
        project.opportunityId,
        opportunity.revision,
        { journeyStatus: "project_active" },
      );
    }
    await this.audit(identity, "project.activate", "project", projectId, {});
    return updated;
  }

  async assignTask(
    identity: TrustedExecutionContext,
    projectId: string,
    input: {
      readonly taskId: string;
      readonly roleKey: string;
      readonly assigneeLabel: string;
    },
    idempotencyKey?: string,
  ) {
    this.assert(identity, "project.assign");
    const fingerprint = `${input.taskId}:${input.roleKey}`;
    if (idempotencyKey) {
      const replay = await this.commercial.consumeIdempotency({
        workspaceId: identity.workspaceId,
        key: idempotencyKey,
        requestClass: "project.assign",
        fingerprint,
      });
      if (replay === "replay") {
        return this.getProject(identity, projectId);
      }
    }
    const project = await this.getProject(identity, projectId);
    if (!["published", "active"].includes(project.status)) {
      throw new BadRequestException(
        "Assignments require a published or active project.",
      );
    }
    const task = project.tasks.find((row) => row.id === input.taskId);
    if (!task) throw new NotFoundException("Task not found.");
    await this.projects.createAssignment({
      id: crypto.randomUUID(),
      workspaceId: identity.workspaceId,
      projectId,
      taskId: input.taskId,
      roleKey: input.roleKey,
      assigneeLabel: input.assigneeLabel,
      assignedBy: identity.userId,
    });
    await this.audit(identity, "project.assign", "project_task", input.taskId, {
      roleKey: input.roleKey,
      assigneeLabel: input.assigneeLabel,
    });
    return this.getProject(identity, projectId);
  }

  async getTimeline(identity: TrustedExecutionContext, projectId: string) {
    const project = await this.getProject(identity, projectId);
    const totalTasks = project.tasks.length;
    const assignedTasks = new Set(project.assignments.map((row) => row.taskId))
      .size;
    const doneTasks = project.tasks.filter((row) => row.status === "done").length;
    return {
      projectId,
      status: project.status,
      phases: project.phases.map((phase) => ({
        ...phase,
        milestones: project.milestones.filter((row) => row.phaseId === phase.id),
      })),
      progress: {
        totalTasks,
        assignedTasks,
        doneTasks,
        percentComplete:
          totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100),
      },
    };
  }

  async getAudit(identity: TrustedExecutionContext, projectId: string) {
    this.assert(identity, "commercial.audit.read");
    const project = await this.getProject(identity, projectId);
    const guards = await this.commercial.listGuard(
      identity.workspaceId,
      project.opportunityId,
    );
    return {
      projectId,
      guards: guards.filter((row) => row.action.startsWith("project.")),
    };
  }
}
