"use client";

import { useParams } from "next/navigation";

import { FounderShell } from "../../../../components/shell/AppShell";
import { WorkspaceGate } from "../../../../components/shell/WorkspaceGate";
import { ModuleRecommendationList } from "../../../../components/founder/ModuleRecommendationList";
import { SectionHeader, ProgressBar } from "../../../../components/ui/Display";
import { getSetupProgress } from "../../../../lib/prototype/recommendations";
import { getSetupChecklist } from "../../../../lib/prototype/setup-checklist";
import { useWorkspaceSessionActions } from "../../../../lib/workspace/session-actions";
import styles from "../../../../components/shell/shell.module.css";

function SetupPage() {
  const params = useParams();
  const workspace = params.workspace as string;
  const { moduleRecommendations, toggleDeferredModule, session } =
    useWorkspaceSessionActions(workspace);
  if (!session) return null;

  const progress = getSetupProgress(session);
  const checklist = getSetupChecklist(session);

  return (
    <FounderShell workspace={workspace} session={session}>
      <SectionHeader
        eyebrow="Setup"
        title="Workspace setup plan"
        description="Review recommended capabilities and what still needs configuration."
      />
      <ProgressBar
        value={progress}
        label="Foundation progress"
        help="How much of your initial workspace foundation is in place."
      />
      <section className="flow-detail-group">
        <h2>Completed foundations</h2>
        <ul className={styles.checklist}>
          {checklist
            .filter((item) => item.status === "Ready")
            .map((item) => (
              <li key={item.label} className={styles.checklistItem}>
                <span>{item.label}</span>
              </li>
            ))}
        </ul>
      </section>
      <section className="flow-detail-group">
        <h2>Recommended capabilities</h2>
        <ModuleRecommendationList
          modules={moduleRecommendations}
          deferredIds={session.deferredModuleIds}
          onToggleDeferred={toggleDeferredModule}
        />
      </section>
      <section className="flow-detail-group">
        <h2>Information still needed</h2>
        <ul className="flow-compact-list">
          {(session.twin?.missingInformation ?? []).map((m: string) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </section>
    </FounderShell>
  );
}

export default function AdminSetupPage() {
  const workspace = useParams().workspace as string;
  return (
    <WorkspaceGate workspace={workspace} requireTwin variant="founder">
      <SetupPage />
    </WorkspaceGate>
  );
}
