"use client";

import { useParams } from "next/navigation";

import { FounderShell } from "../../../../components/shell/AppShell";
import { WorkspaceGate } from "../../../../components/shell/WorkspaceGate";
import { TwinView } from "../../../../components/twin/TwinView";
import { useWorkspaceSession } from "../../../../lib/prototype/context";

function TwinPage() {
  const params = useParams();
  const workspace = params.workspace as string;
  const { session } = useWorkspaceSession(workspace);
  if (!session?.twin) return null;

  return (
    <FounderShell workspace={workspace} session={session}>
      <TwinView twin={session.twin} />
    </FounderShell>
  );
}

export default function AdminTwinPage() {
  const workspace = useParams().workspace as string;
  return (
    <WorkspaceGate workspace={workspace} requireTwin variant="founder">
      <TwinPage />
    </WorkspaceGate>
  );
}
