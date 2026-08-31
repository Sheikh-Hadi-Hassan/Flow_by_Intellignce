import { describe, expect, it } from "vitest";

import {
  generateProjectPlan,
  isProjectPlanComplete,
} from "./project-plan-generation.js";

describe("project plan generation", () => {
  it("produces deterministic structure from contract scope", () => {
    const plan = generateProjectPlan({
      opportunityName: "Acme Q4 Launch",
      clientName: "Acme Robotics",
      clauses: [
        {
          clauseKey: "scope",
          title: "Scope",
          body: "90-day campaign launch engagement.",
        },
      ],
      deliverables: [
        { name: "Creative concept", description: "Messaging and visuals" },
        { name: "Channel assets", description: "Six channel deliverables" },
      ],
      paymentSchedule: [
        { label: "Kickoff", dueDescription: "On signature" },
        { label: "Launch", dueDescription: "At go-live" },
      ],
      timelineDays: 90,
    });

    expect(plan.phases).toHaveLength(4);
    expect(plan.milestones).toHaveLength(4);
    expect(plan.deliverables).toHaveLength(2);
    expect(plan.tasks).toHaveLength(6);
    expect(plan.dependencies.length).toBeGreaterThan(0);
    expect(plan.roleRequirements).toHaveLength(6);
    expect(plan.recommendationDrafts).toHaveLength(6);
    expect(plan.recommendationDrafts[0]?.suggestedAssigneeLabel).toContain(
      "Jordan",
    );
    expect(isProjectPlanComplete(plan)).toBe(true);
  });

  it("defaults deliverables when none provided", () => {
    const plan = generateProjectPlan({
      opportunityName: "Fallback",
      clientName: "Client",
      clauses: [],
      deliverables: [],
      paymentSchedule: [],
    });
    expect(plan.deliverables).toHaveLength(1);
    expect(plan.tasks).toHaveLength(3);
  });
});
