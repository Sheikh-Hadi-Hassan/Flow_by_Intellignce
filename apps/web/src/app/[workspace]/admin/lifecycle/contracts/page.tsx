"use client";

import { CommercialRoute } from "../../../../../components/commercial/CommercialRoute";
import { LifecycleHub } from "../../../../../components/os/LifecycleHub";

export default function ContractsHubPage() {
  return (
    <CommercialRoute>
      <LifecycleHub
        lifecycle="Contract"
        title="Contracts awaiting execution"
        why="Move accepted proposals into binding agreements before delivery starts."
        decision="Select which engagement needs contract drafting or client signature."
        next="After execution, activate the project and staffing plan."
        stage="contract"
        linkSuffix="/contract"
        emptyMessage="No contracts in progress. Share and accept a proposal first."
        copilot={{
          changed: "Contracts appear after proposal client acceptance.",
          recommended: "Review Guard boundaries before sending for signature.",
          risk: "Starting delivery before execution exposes scope and payment risk.",
        }}
      />
    </CommercialRoute>
  );
}
