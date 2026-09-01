"use client";

import { CommercialRoute } from "../../../../../components/commercial/CommercialRoute";
import { LifecycleHub } from "../../../../../components/os/LifecycleHub";

export default function ProposalsHubPage() {
  return (
    <CommercialRoute>
      <LifecycleHub
        lifecycle="Proposal"
        title="Proposals in progress"
        why="Turn approved briefs into client-ready proposals with clear pricing."
        decision="Choose which engagement to draft or send next."
        next="After client acceptance, move to contract generation."
        stage="proposal"
        linkSuffix="/proposal"
        emptyMessage="No proposals ready yet. Complete discovery and brief approval first."
        copilot={{
          changed: "Proposals appear here once a brief is approved.",
          recommended: "Start with the highest-value approved brief.",
          risk: "Sending before brief approval creates rework and scope disputes.",
        }}
      />
    </CommercialRoute>
  );
}
