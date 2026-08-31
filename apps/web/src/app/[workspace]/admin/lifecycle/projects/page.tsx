"use client";

import { CommercialRoute } from "../../../../../components/commercial/CommercialRoute";
import { LifecycleHub } from "../../../../../components/os/LifecycleHub";

export default function ProjectsHubPage() {
  return (
    <CommercialRoute>
      <LifecycleHub
        lifecycle="Projects"
        title="Active delivery"
        why="Executed contracts become projects with phases, milestones, and tasks."
        decision="Pick which project needs your attention today."
        next="Track progress and surface risks before they become blockers."
        stage="project"
        linkSuffix="/project"
        emptyMessage="No active projects. Execute a contract to begin delivery."
        copilot={{
          changed: "Projects appear after contract execution.",
          recommended: "Focus on projects with upcoming milestones.",
          risk: "Unmonitored milestones slip client trust.",
        }}
      />
    </CommercialRoute>
  );
}
