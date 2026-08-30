"use client";

import { useParams } from "next/navigation";

import { FounderShell } from "../../../../../components/shell/AppShell";
import { WorkspaceGate } from "../../../../../components/shell/WorkspaceGate";
import { ModuleRecommendationList } from "../../../../../components/founder/ModuleRecommendationList";
import { SectionHeader } from "../../../../../components/ui/Display";
import { useWorkspaceSessionActions } from "../../../../../lib/workspace/session-actions";

function ModulesPage() {
  const params = useParams();
  const workspace = params.workspace as string;
  const { moduleRecommendations, toggleDeferredModule, session } =
    useWorkspaceSessionActions(workspace);
  if (!session) return null;

  return (
    <FounderShell workspace={workspace} session={session}>
      <SectionHeader
        eyebrow="Settings"
        title="Recommended modules"
        description="Review recommended modules and mark items for later review."
      />
      <ModuleRecommendationList
        modules={moduleRecommendations}
        deferredIds={session.deferredModuleIds}
        onToggleDeferred={toggleDeferredModule}
      />
    </FounderShell>
  );
}

export default function AdminModulesPage() {
  const workspace = useParams().workspace as string;
  return (
    <WorkspaceGate workspace={workspace} requireTwin variant="founder">
      <ModulesPage />
    </WorkspaceGate>
  );
}
