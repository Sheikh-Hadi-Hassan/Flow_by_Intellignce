"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";

import { OnboardingShell } from "../../../../components/shell/AppShell";
import { WorkspaceGate } from "../../../../components/shell/WorkspaceGate";
import { TwinCompilationSequence } from "../../../../components/onboarding/CompilationSequence";
import { useWorkspaceSessionActions } from "../../../../lib/workspace/session-actions";
import { compileTwin } from "../../../../lib/prototype/twin-compile";

function CompleteStep() {
  const params = useParams();
  const workspace = params.workspace as string;
  const { completeOnboarding, isApiBacked, session, updateSession } =
    useWorkspaceSessionActions(workspace);

  const handleComplete = useCallback(() => {
    if (isApiBacked) {
      void completeOnboarding();
      return;
    }
    updateSession((current) => {
      const twin = compileTwin(current);
      return {
        ...current,
        twin,
        twinCompiled: true,
        onboardingComplete: true,
      };
    });
  }, [completeOnboarding, isApiBacked, updateSession]);

  if (!session) return null;

  return (
    <OnboardingShell workspace={workspace} stepIndex={5} session={session}>
      <TwinCompilationSequence
        workspace={workspace}
        onComplete={handleComplete}
      />
    </OnboardingShell>
  );
}

export default function CompletePage() {
  const workspace = useParams().workspace as string;
  return (
    <WorkspaceGate workspace={workspace}>
      <CompleteStep />
    </WorkspaceGate>
  );
}
