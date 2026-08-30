"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { OnboardingShell } from "../../../../components/shell/AppShell";
import { WorkspaceGate } from "../../../../components/shell/WorkspaceGate";
import { ModuleRecommendationList } from "../../../../components/founder/ModuleRecommendationList";
import { SectionHeader } from "../../../../components/ui/Display";
import { Button } from "../../../../components/ui/Button";
import { useWorkspaceSessionActions } from "../../../../lib/workspace/session-actions";
import { compileTwin } from "../../../../lib/prototype/twin-compile";
import styles from "../../../../components/shell/shell.module.css";

function ReviewStep() {
  const params = useParams();
  const workspace = params.workspace as string;
  const router = useRouter();
  const { moduleRecommendations, session } =
    useWorkspaceSessionActions(workspace);
  if (!session) return null;

  const twinPreview = compileTwin(session);

  return (
    <OnboardingShell workspace={workspace} stepIndex={4} session={session}>
      <SectionHeader
        eyebrow="Review"
        title="Confirm what Flow understands"
        description="Edit any section before Flow creates your Twin."
      />
      <section className="flow-detail-group">
        <h2>Business</h2>
        <dl>
          <div className="flow-summary-row">
            <dt>Name</dt>
            <dd>{session.business.businessName}</dd>
          </div>
          <div className="flow-summary-row">
            <dt>Team</dt>
            <dd>{session.business.teamSize || "—"}</dd>
          </div>
        </dl>
        <Link
          href={`/${workspace}/onboarding/business`}
          className="flow-btn flow-btn--ghost flow-btn--sm"
        >
          Edit business
        </Link>
      </section>
      <section className="flow-detail-group">
        <h2>Services</h2>
        <ul>
          {session.services
            .filter((s) => s.selected)
            .map((s) => (
              <li key={s.id}>{s.name}</li>
            ))}
        </ul>
        <Link
          href={`/${workspace}/onboarding/services`}
          className="flow-btn flow-btn--ghost flow-btn--sm"
        >
          Edit services
        </Link>
      </section>
      <section className="flow-detail-group">
        <h2>Recommended capabilities</h2>
        <ModuleRecommendationList
          modules={moduleRecommendations.slice(0, 4)}
          deferredIds={session.deferredModuleIds}
          showExpand={false}
        />
      </section>
      {twinPreview.missingInformation.length > 0 && (
        <section className="flow-detail-group">
          <h2>Missing information</h2>
          <ul>
            {twinPreview.missingInformation.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </section>
      )}
      <section className="flow-detail-group">
        <h2>What Flow will prepare</h2>
        <ul>
          <li>Initial Business Twin from your answers</li>
          <li>Agency expertise pack alignment</li>
          <li>Guard policy preview from your approval settings</li>
          <li>Setup plan with recommended modules (review only)</li>
        </ul>
      </section>
      <div className={styles.onboardingActions}>
        <Button
          variant="secondary"
          onClick={() => router.push(`/${workspace}/onboarding/policies`)}
        >
          Back
        </Button>
        <Button
          onClick={() => router.push(`/${workspace}/onboarding/complete`)}
        >
          Create Twin
        </Button>
      </div>
    </OnboardingShell>
  );
}

export default function ReviewPage() {
  const workspace = useParams().workspace as string;
  return (
    <WorkspaceGate workspace={workspace}>
      <ReviewStep />
    </WorkspaceGate>
  );
}
