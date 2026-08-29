"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";

import { OnboardingShell } from "../../../../components/shell/AppShell";
import { WorkspaceGate } from "../../../../components/shell/WorkspaceGate";
import { TwinCompilationSequence } from "../../../../components/onboarding/CompilationSequence";
import {
  usePrototype,
  useWorkspaceSession,
} from "../../../../lib/prototype/context";
import { compileTwin } from "../../../../lib/prototype/twin-compile";

function CompleteStep() {
  const params = useParams();
  const workspace = params.workspace as string;
  const { updateSession } = usePrototype();
  const { session } = useWorkspaceSession(workspace);

  const handleComplete = useCallback(() => {
    updateSession((s) => {
      const twin = compileTwin(s);
      return {
        ...s,
        twin,
        twinCompiled: true,
        onboardingComplete: true,
      };
    });
  }, [updateSession]);

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
