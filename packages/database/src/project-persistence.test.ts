import { describe, expect, it } from "vitest";

import { InMemoryProjectEngineRepository } from "./project-persistence.js";

describe("project persistence", () => {
  it("creates project with plan and enforces workspace isolation", async () => {
    const repo = new InMemoryProjectEngineRepository();
    const project = await repo.createProjectWithPlan({
      project: {
        id: "proj-1",
        workspaceId: "w1",
        opportunityId: "opp-1",
        contractVersionId: "cv-1",
        name: "Acme plan",
        status: "draft",
        currency: "USD",
        revision: 1,
      },
      phases: [
        {
          phaseKey: "discovery",
          name: "Discovery",
          sortOrder: 0,
          status: "planned",
        },
      ],
      milestones: [
        {
          phaseKey: "discovery",
          milestoneKey: "ms-1",
          name: "Kickoff",
          dueOffsetDays: 7,
          sortOrder: 0,
          status: "pending",
        },
      ],
      deliverables: [
        {
          deliverableKey: "del-1",
          phaseKey: "discovery",
          name: "Brief",
          description: "Scope",
          sortOrder: 0,
        },
      ],
      tasks: [
        {
          deliverableKey: "del-1",
          taskKey: "task-1",
          name: "Plan brief",
          status: "todo",
          estimatedMinutes: 120,
          sortOrder: 0,
        },
      ],
      dependencies: [],
      roleRequirements: [
        {
          taskKey: "task-1",
          roleKey: "strategist",
          estimatedMinutes: 120,
          requiredCount: 1,
        },
      ],
      recommendationDrafts: [
        {
          taskKey: "task-1",
          roleKey: "strategist",
          suggestedAssigneeLabel: "Jordan Ellis",
          confidenceBps: 8500,
          rationale: "Capacity match",
          status: "draft",
        },
      ],
    });
    expect(project.tasks).toHaveLength(1);
    expect(project.recommendationDrafts).toHaveLength(1);
    expect(
      await repo.getProject("w2", "proj-1"),
    ).toBeUndefined();
    await repo.updateProjectStatus("w1", "proj-1", "approved", {
      approvedAt: new Date().toISOString(),
    });
    const updated = await repo.getProject("w1", "proj-1");
    expect(updated?.status).toBe("approved");
  });

  it("supports idempotent assignment upsert semantics in memory", async () => {
    const repo = new InMemoryProjectEngineRepository();
    await repo.createProjectWithPlan({
      project: {
        id: "proj-2",
        workspaceId: "w1",
        opportunityId: "opp-2",
        contractVersionId: "cv-2",
        name: "Plan",
        status: "active",
        currency: "USD",
        revision: 1,
      },
      phases: [
        {
          phaseKey: "launch",
          name: "Launch",
          sortOrder: 0,
          status: "active",
        },
      ],
      milestones: [],
      deliverables: [
        {
          deliverableKey: "del-1",
          phaseKey: "launch",
          name: "Assets",
          description: "",
          sortOrder: 0,
        },
      ],
      tasks: [
        {
          deliverableKey: "del-1",
          taskKey: "task-1",
          name: "Build",
          status: "todo",
          estimatedMinutes: 60,
          sortOrder: 0,
        },
      ],
      dependencies: [],
      roleRequirements: [],
      recommendationDrafts: [],
    });
    const taskId = "proj-2-task-0";
    await repo.createAssignment({
      id: "a1",
      workspaceId: "w1",
      projectId: "proj-2",
      taskId,
      roleKey: "creative_lead",
      assigneeLabel: "Alex Kim",
    });
    const detail = await repo.getProject("w1", "proj-2");
    expect(detail?.assignments).toHaveLength(1);
  });
});
