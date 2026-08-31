import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { NORTHSTAR_COMMERCIAL_STORAGE_KEY } from "../../content/demo/northstar-commercial";
import { createNorthstarCommercialApi } from "./northstar-store";

function installSessionStorage() {
  const data = new Map<string, string>();
  const sessionStorage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
  Object.defineProperty(globalThis, "window", {
    value: { sessionStorage },
    configurable: true,
  });
}

describe("Northstar commercial golden path", () => {
  beforeEach(() => {
    installSessionStorage();
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  it("ships with executed contract and completes project lifecycle", async () => {
    const api = createNorthstarCommercialApi();
    const opportunityId = "ns-opp-acme-brand";
    const bundle = await api.getOpportunity(opportunityId);
    expect(bundle.opportunity.journeyStatus).toBe("contract_executed");
    expect(bundle.briefs.some((row) => row.status === "approved")).toBe(true);
    expect((await api.listContracts(opportunityId))[0]?.status).toBe("executed");

    const project = await api.generateProject(opportunityId);
    expect(project.status).toBe("draft");
    expect(project.tasks.length).toBeGreaterThan(0);
    expect(project.recommendationDrafts.length).toBeGreaterThan(0);
    expect(project.assignments).toHaveLength(0);

    await api.submitProject(project.id);
    await api.approveProject(project.id);
    await api.publishProject(project.id);
    const active = await api.activateProject(project.id);
    expect(active.status).toBe("active");

    const draft = active.recommendationDrafts[0]!;
    const assigned = await api.assignTask(active.id, {
      taskId: draft.taskId,
      roleKey: draft.roleKey,
      assigneeLabel: draft.suggestedAssigneeLabel,
    });
    expect(assigned.assignments).toHaveLength(1);

    const timeline = await api.getTimeline(active.id);
    expect(timeline.progress.assignedTasks).toBe(1);

    const audit = await api.getAudit(active.id);
    expect(audit.guards.some((row) => row.action === "project.create")).toBe(
      true,
    );
  });

  it("never writes Northstar state into API session keys", () => {
    expect(NORTHSTAR_COMMERCIAL_STORAGE_KEY).toBe(
      "flow-northstar-commercial-v1",
    );
  });
});
