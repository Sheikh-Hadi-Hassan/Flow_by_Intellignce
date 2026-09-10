"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CommercialRoute } from "../../../../../../components/commercial/CommercialRoute";
import { DemoLifecycleStatus } from "../../../../../../components/commercial/DemoLifecycleStatus";
import {
  OpportunityNav,
  projectBadge,
} from "../../../../../../components/commercial/Status";
import { Button } from "../../../../../../components/ui/Button";
import {
  SectionHeader,
  StatusBadge,
} from "../../../../../../components/ui/Display";
import { useCommercialClient } from "../../../../../../lib/commercial/use-commercial";
import type { ProjectDetailRecord } from "../../../../../../lib/commercial/api";

function ProjectPage() {
  const workspace = useParams().workspace as string;
  const opportunityId = useParams().id as string;
  const api = useCommercialClient(workspace);
  const [project, setProject] = useState<ProjectDetailRecord | null>(null);
  const [timeline, setTimeline] = useState<{
    status: string;
    progress: {
      totalTasks: number;
      assignedTasks: number;
      percentComplete: number;
    };
  } | null>(null);
  const [auditCount, setAuditCount] = useState(0);
  const [demoProjectExists, setDemoProjectExists] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!api) return;
    void api.listProjects(opportunityId).then((rows) => {
      const latest = rows.at(-1) ?? null;
      setProject(latest);
      if (latest) {
        void api.getTimeline(latest.id).then(setTimeline);
        void api.getAudit(latest.id).then((audit) => {
          setAuditCount(audit.guards.length);
        });
      }
    });
  }, [api, opportunityId]);

  async function refresh(projectId: string) {
    if (!api) return;
    const rows = await api.listProjects(opportunityId);
    const latest =
      rows.find((row) => row.id === projectId) ?? rows.at(-1) ?? null;
    setProject(latest);
    if (latest) {
      setTimeline(await api.getTimeline(latest.id));
      const audit = await api.getAudit(latest.id);
      setAuditCount(audit.guards.length);
    }
  }

  async function createProject() {
    if (!api) return;
    try {
      const created = await api.generateProject(opportunityId);
      setProject(created);
      await refresh(created.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create project.",
      );
    }
  }

  async function submitForReview() {
    if (!api || !project) return;
    await api.submitProject(project.id);
    await refresh(project.id);
  }

  async function approvePlan() {
    if (!api || !project) return;
    await api.approveProject(project.id);
    await refresh(project.id);
  }

  async function publishPlan() {
    if (!api || !project) return;
    await api.publishProject(project.id);
    await refresh(project.id);
  }

  async function activatePlan() {
    if (!api || !project) return;
    await api.activateProject(project.id);
    await refresh(project.id);
  }

  async function assignFirstRecommendation() {
    if (!api || !project) return;
    const draft = project.recommendationDrafts[0];
    const task = project.tasks.find((row) => row.id === draft?.taskId);
    if (!draft || !task) return;
    await api.assignTask(project.id, {
      taskId: task.id,
      roleKey: draft.roleKey,
      assigneeLabel: draft.suggestedAssigneeLabel,
    });
    await refresh(project.id);
  }

  return (
    <>
      <SectionHeader
        eyebrow="Project"
        title="Delivery plan"
        description="Generated from an executed contract. Recommendations are drafts only — assign manually."
      />
      <OpportunityNav workspace={workspace} opportunityId={opportunityId} />
      {workspace === "northstar-creative" && (
        <DemoLifecycleStatus onProjectExists={setDemoProjectExists} />
      )}
      {error && <p role="alert">{error}</p>}
      {project && (
        <>
          <StatusBadge variant={projectBadge(project.status)}>
            {project.status.replaceAll("_", " ")}
          </StatusBadge>
          <div className="flow-panel">
            <h3>{project.name}</h3>
            <p>
              {project.phases.length} phases · {project.milestones.length}{" "}
              milestones · {project.tasks.length} tasks
            </p>
            {timeline && (
              <p data-testid="project-progress">
                Progress: {timeline.progress.assignedTasks}/
                {timeline.progress.totalTasks} tasks assigned
              </p>
            )}
            <p data-testid="project-audit-count">Audit events: {auditCount}</p>
            <h4>Recommendation drafts (not auto-assigned)</h4>
            <ul>
              {project.recommendationDrafts.slice(0, 3).map((draft) => (
                <li key={draft.id}>
                  {draft.suggestedAssigneeLabel} — {draft.rationale}
                </li>
              ))}
            </ul>
            {project.assignments.length > 0 && (
              <>
                <h4>Assignments</h4>
                <ul>
                  {project.assignments.map((row) => (
                    <li key={row.id}>
                      {row.assigneeLabel} ({row.roleKey})
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </>
      )}
      <div className="flow-action-row">
        {!demoProjectExists && (
          <Button
            disabled={!api || Boolean(project)}
            onClick={() => void createProject()}
          >
            Create project
          </Button>
        )}
        {project?.status === "draft" && (
          <Button onClick={() => void submitForReview()}>
            Submit for review
          </Button>
        )}
        {project?.status === "in_review" && (
          <Button onClick={() => void approvePlan()}>Approve plan</Button>
        )}
        {project?.status === "approved" && (
          <Button onClick={() => void publishPlan()}>Publish plan</Button>
        )}
        {project?.status === "published" && (
          <Button onClick={() => void activatePlan()}>Activate project</Button>
        )}
        {project &&
          ["published", "active"].includes(project.status) &&
          project.assignments.length === 0 && (
            <Button onClick={() => void assignFirstRecommendation()}>
              Assign recommended resource
            </Button>
          )}
      </div>
    </>
  );
}

export default function Page() {
  return (
    <CommercialRoute>
      <ProjectPage />
    </CommercialRoute>
  );
}
