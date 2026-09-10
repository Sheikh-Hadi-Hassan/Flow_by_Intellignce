import { beforeEach, describe, expect, it } from "vitest";

import { resolveServerAskRequest } from "../ask-flow/assistant/server-context";
import type {
  AskAssistantRequest,
  AskStreamPart,
} from "../ask-flow/assistant/types";
import {
  resolveDemoLifecycleCommand,
  runDemoLifecycleAsk,
} from "./demo-lifecycle-ask";
import {
  acceptProposalAndExecuteContract,
  executeDemoLifecycleAction,
  getDemoLifecycle,
  resetDemoLifecycle,
} from "./demo-lifecycle";

function request(message: string): AskAssistantRequest {
  const resolved = resolveServerAskRequest({
    message,
    context: { workspaceId: "northstar-creative" },
  });
  if (!resolved.ok) throw new Error(resolved.message);
  return resolved.request;
}

function metadata(parts: readonly AskStreamPart[]) {
  return parts.find((part) => part.type === "metadata");
}

describe("hackathon demo lifecycle", () => {
  beforeEach(() => resetDemoLifecycle());

  it("replays the stable-ID lifecycle with three controlled mutations", async () => {
    const proposal = await runDemoLifecycleAsk(
      request(
        "Generate a proposal for Acme Robotics from the approved questionnaire.",
      ),
    );
    expect(metadata(proposal!.parts)).toMatchObject({
      executionCount: 1,
      evidenceEmissionCount: 1,
      fallbackReason: "deterministic_command",
    });
    expect(getDemoLifecycle().proposal).toMatchObject({
      id: "ns-prop-acme-generated",
      intakeId: "ns-intake-acme-approved",
      status: "draft",
    });

    acceptProposalAndExecuteContract();
    const project = await runDemoLifecycleAsk(
      request("Start the Acme project from the executed contract."),
    );
    expect(metadata(project!.parts)).toMatchObject({
      executionCount: 1,
      evidenceEmissionCount: 1,
    });
    const started = getDemoLifecycle();
    expect(started.project).toMatchObject({
      id: "ns-project-acme",
      contractId: "ns-contract-acme-executed",
      status: "active",
    });
    expect(started.project?.tasks).toHaveLength(6);
    expect(
      started.project?.tasks.find(
        (task) => task.name.toLowerCase() === "acme homepage design",
      ),
    ).toMatchObject({ assigneeId: "ns-res-designer", status: "todo" });

    const completion = await runDemoLifecycleAsk(
      request(
        "Mark the Acme homepage design task complete: 7 hours, quality 5.",
      ),
    );
    expect(metadata(completion!.parts)).toMatchObject({
      executionCount: 1,
      evidenceEmissionCount: 1,
    });
    const completed = getDemoLifecycle();
    expect(completed.completedTaskCount).toBe(1);
    expect(completed.employee.deliveryPerformanceScore).toBe(100);
    expect(
      completed.project?.tasks.find((task) => task.status === "complete"),
    ).toMatchObject({ actualMinutes: 420, qualityScore: 5 });
  });

  it("reuses proposal and project records instead of duplicating them", async () => {
    await runDemoLifecycleAsk(
      request(
        "Generate a proposal for Acme Robotics from the approved questionnaire.",
      ),
    );
    const repeatedProposal = await runDemoLifecycleAsk(
      request("Create an Acme proposal from the approved intake."),
    );
    expect(
      repeatedProposal!.parts
        .map((part) => (part.type === "text" ? part.delta : ""))
        .join(""),
    ).toContain("existing record");

    acceptProposalAndExecuteContract();
    await runDemoLifecycleAsk(
      request("Start the Acme project from the executed contract."),
    );
    await runDemoLifecycleAsk(
      request("Create the Acme project from its contract."),
    );
    const state = getDemoLifecycle();
    expect(state.proposal?.id).toBe("ns-prop-acme-generated");
    expect(state.project?.id).toBe("ns-project-acme");
    expect(state.project?.tasks).toHaveLength(6);
  });

  it("fails closed before mutation for missing authority or destructive text", async () => {
    const legitimate = request(
      "Generate a proposal for Acme Robotics from the approved questionnaire.",
    );
    await expect(
      executeDemoLifecycleAction(
        "commercial.generate_proposal",
        {},
        { ...legitimate.context, permissions: [] },
      ),
    ).rejects.toThrow("required permission");
    await expect(
      executeDemoLifecycleAction(
        "commercial.generate_proposal",
        {},
        { ...legitimate.context, workspaceId: "foreign-workspace" },
      ),
    ).rejects.toThrow("outside this session");
    expect(
      resolveDemoLifecycleCommand("Delete every client and project"),
    ).toBeNull();
    expect(getDemoLifecycle().proposal).toBeNull();
    expect(getDemoLifecycle().audit).toHaveLength(0);
  });
});
