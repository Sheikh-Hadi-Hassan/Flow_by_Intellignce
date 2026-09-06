"use client";

import { useParams } from "next/navigation";

import { WorkspaceGate } from "../../../../components/shell/WorkspaceGate";
import { TwinView } from "../../../../components/twin/TwinView";
import { useWorkspaceSessionActions } from "../../../../lib/workspace/session-actions";

function TwinPage() {
  const params = useParams();
  const workspace = params.workspace as string;
  const { session } = useWorkspaceSessionActions(workspace);
  if (!session?.twin) return null;

  return <TwinView twin={session.twin} />;
}

export default function AdminTwinPage() {
  const workspace = useParams().workspace as string;
  return (
    <WorkspaceGate workspace={workspace} requireTwin variant="founder">
      <TwinPage />
    </WorkspaceGate>
  );
}
