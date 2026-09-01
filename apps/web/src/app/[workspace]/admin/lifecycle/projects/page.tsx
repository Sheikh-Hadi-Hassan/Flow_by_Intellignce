"use client";

import { CommercialRoute } from "../../../../../components/commercial/CommercialRoute";
import { LifecycleHub } from "../../../../../components/os/LifecycleHub";

export default function ProjectsHubPage() {
  return (
    <CommercialRoute>
      <LifecycleHub
        lifecycle="Delivery"
        title="Active projects"
        why="Track execution, staffing, and delivery after contract execution."
        decision="Choose which project to activate, staff, or monitor."
        next="Publish assignments so team members see work in My Work."
        stage="project"
        linkSuffix="/project"
        emptyMessage="No active projects yet. Execute a contract to generate a project."
        copilot={{
          changed: "Projects are created when contracts are executed.",
          recommended: "Review capacity recommendations before publishing assignments.",
          risk: "Over-allocation and skill gaps block safe publishing.",
        }}
      />
    </CommercialRoute>
  );
}
