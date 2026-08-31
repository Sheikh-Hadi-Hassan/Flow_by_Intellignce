"use client";

import { useParams } from "next/navigation";

import { MissionControl } from "../../../components/os/MissionControl";
import { FounderShell } from "../../../components/shell/AppShell";
import { WorkspaceGate } from "../../../components/shell/WorkspaceGate";
import { useWorkspaceSessionActions } from "../../../lib/workspace/session-actions";

function FounderHome() {
  const workspace = useParams().workspace as string;
  const { session } = useWorkspaceSessionActions(workspace);

  if (!session || !session.twin) return null;

  return (
    <FounderShell workspace={workspace} session={session}>
      <MissionControl session={session} />
    </FounderShell>
  );
}

export default function AdminHomePage() {
  const workspace = useParams().workspace as string;
  return (
    <WorkspaceGate workspace={workspace} requireTwin variant="founder">
      <FounderHome />
    </WorkspaceGate>
  );
}
