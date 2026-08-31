"use client";

import { CommercialRoute } from "../../../../../components/commercial/CommercialRoute";
import { LifecycleHub } from "../../../../../components/os/LifecycleHub";

export default function ContractsHubPage() {
  return (
    <CommercialRoute>
      <LifecycleHub
        lifecycle="Contracts"
        title="Contracts awaiting signature"
        why="Legal agreements lock scope, terms, and delivery boundaries."
        decision="Select which contract to review, send, or execute."
        next="Once executed, delivery moves to Projects."
        stage="contract"
        linkSuffix="/contract"
        emptyMessage="No contracts in flight. Accept a proposal first."
        copilot={{
          changed: "Contracts track from draft through client acceptance.",
          recommended: "Prioritize contracts tied to near-term start dates.",
          risk: "Starting delivery before execution exposes scope creep.",
        }}
      />
    </CommercialRoute>
  );
}
