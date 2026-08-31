"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CommercialRoute } from "../../../../../../../components/commercial/CommercialRoute";
import { OpportunityNav } from "../../../../../../../components/commercial/Status";
import { Button } from "../../../../../../../components/ui/Button";
import { SectionHeader, StatusBadge } from "../../../../../../../components/ui/Display";
import { useCommercialClient } from "../../../../../../../lib/commercial/use-commercial";
import type {
  ProjectDetailRecord,
  ResourcePlanRecord,
} from "../../../../../../../lib/commercial/api";

function CapacityPage() {
  const workspace = useParams().workspace as string;
  const opportunityId = useParams().id as string;
  const api = useCommercialClient(workspace);
  const [project, setProject] = useState<ProjectDetailRecord | null>(null);
  const [plan, setPlan] = useState<ResourcePlanRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!api) return;
    void api.listProjects(opportunityId).then((rows: ProjectDetailRecord[]) => {
      const latest = rows.at(-1) ?? null;
      setProject(latest);
      if (latest?.status === "active" && api.getResourcePlan) {
        void api.getResourcePlan(latest.id).then(setPlan);
      }
    });
  }, [api, opportunityId]);

  async function refresh() {
    if (!api || !project) return;
    if (api.getResourcePlan) {
      setPlan(await api.getResourcePlan(project.id));
    }
  }

  async function generateRecommendations() {
    if (!api?.generateResourceRecommendations || !project) return;
    try {
      const result = await api.generateResourceRecommendations(project.id);
      setPlan(result.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate.");
    }
  }

  async function draftFromTopRecommendation() {
    if (!api?.upsertResourceAssignment || !project || !plan) return;
    const tops = plan.recommendations.filter(
      (r: ResourcePlanRecord["recommendations"][number]) =>
        r.rank === 1 && !r.excludedReason && r.resourceProfileId,
    );
    for (const top of tops) {
      const req = project.tasks.find((t: ProjectDetailRecord["tasks"][number]) => t.id === top.taskId);
      await api.upsertResourceAssignment(project.id, {
        taskId: top.taskId,
        roleKey: top.roleKey,
        resourceProfileId: top.resourceProfileId!,
        allocationMinutes: req?.estimatedMinutes ?? 480,
      });
    }
    await refresh();
  }

  async function coverAllRoleRequirements() {
    if (!api?.upsertResourceAssignment || !project) return;
    const resources = await api.listResources?.();
    const resource = resources?.[0];
    if (!resource) return;
    const full = await api.getProject(project.id);
    const requirements = (
      full as ProjectDetailRecord & {
        roleRequirements?: { taskId: string; roleKey: string; estimatedMinutes: number }[];
      }
    ).roleRequirements;
    if (!requirements?.length) return;
    for (const req of requirements) {
      await api.upsertResourceAssignment(project.id, {
        taskId: req.taskId,
        roleKey: req.roleKey,
        resourceProfileId: resource.id,
        allocationMinutes: req.estimatedMinutes || 60,
      });
    }
    await refresh();
  }

  async function submitPlan() {
    if (!api?.submitResourcePlan || !project) return;
    setPlan(await api.submitResourcePlan(project.id));
  }

  async function approvePlan() {
    if (!api?.approveResourcePlan || !project) return;
    setPlan(await api.approveResourcePlan(project.id));
  }

  async function publishPlan() {
    if (!api?.publishResourcePlan || !project) return;
    await api.publishResourcePlan(project.id);
    await refresh();
  }

  return (
    <>
      <SectionHeader
        eyebrow="Capacity"
        title="Staffing plan"
        description="Deterministic recommendations remain drafts until founder approval and publication."
      />
      <OpportunityNav workspace={workspace} opportunityId={opportunityId} />
      {error && <p role="alert">{error}</p>}
      {project?.status !== "active" && (
        <p role="status">Activate the project before resource planning.</p>
      )}
      {plan && (
        <div className="flow-panel" data-testid="resource-plan-panel">
          <StatusBadge variant="essential">{plan.status.replaceAll("_", " ")}</StatusBadge>
          <h4>Recommendations</h4>
          <ul data-testid="recommendation-list">
            {plan.recommendations
              .filter((r: ResourcePlanRecord["recommendations"][number]) => r.rank > 0)
              .slice(0, 5)
              .map((rec: ResourcePlanRecord["recommendations"][number]) => (
                <li key={`${rec.taskId}-${rec.rank}`}>
                  Rank {rec.rank}: task {rec.taskId.slice(0, 8)}… —{" "}
                  {rec.confidenceBps / 100}% confidence
                  {rec.excludedReason ? ` (excluded: ${rec.excludedReason})` : ""}
                </li>
              ))}
          </ul>
          {plan.recommendations.some((r: ResourcePlanRecord["recommendations"][number]) => r.excludedReason === "skill_gap") && (
            <p data-testid="skill-gap-warning" role="status">
              Skill gap detected for one or more roles.
            </p>
          )}
          {plan.recommendations.some((r: ResourcePlanRecord["recommendations"][number]) =>
            (r.evidence as { factors?: { key: string }[] })?.factors?.some(
              (f) => f.key === "over_allocation",
            ),
          ) && (
            <p data-testid="over-allocation-warning" role="status">
              Over-allocation conflict detected.
            </p>
          )}
          <h4>Draft assignments</h4>
          <ul data-testid="draft-assignment-list">
            {plan.assignmentDrafts.map((d: ResourcePlanRecord["assignmentDrafts"][number]) => (
              <li key={d.id}>
                {d.resourceProfileId.slice(0, 8)}… — {d.allocationMinutes} min
              </li>
            ))}
          </ul>
          {plan.versions.length > 0 && (
            <p data-testid="published-plan">
              Published version {plan.versions.at(-1)?.versionNumber}
            </p>
          )}
        </div>
      )}
      {project?.status === "active" && (
        <div className="flow-action-row">
          <Button data-testid="generate-recommendations" onClick={() => void generateRecommendations()}>
            Generate recommendations
          </Button>
          <Button onClick={() => void draftFromTopRecommendation()}>
            Draft top recommendations
          </Button>
          <Button
            data-testid="cover-role-requirements"
            onClick={() => void coverAllRoleRequirements()}
          >
            Cover role requirements
          </Button>
          {plan?.status === "recommendations_ready" && (
            <Button onClick={() => void submitPlan()}>Submit for review</Button>
          )}
          {plan?.status === "founder_review" && (
            <Button data-testid="approve-resource-plan" onClick={() => void approvePlan()}>
              Approve staffing plan
            </Button>
          )}
          {plan?.status === "approved" && (
            <Button data-testid="publish-resource-plan" onClick={() => void publishPlan()}>
              Publish workload
            </Button>
          )}
        </div>
      )}
    </>
  );
}

export default function Page() {
  return (
    <CommercialRoute>
      <CapacityPage />
    </CommercialRoute>
  );
}
