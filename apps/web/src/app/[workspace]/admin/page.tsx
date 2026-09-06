"use client";

import { useParams, useSearchParams } from "next/navigation";

import { MissionControlCanvas } from "../../../components/mission/canvas/MissionControlCanvas";
import { MissionControlScreen } from "../../../components/mission/MissionControlScreen";
import { WorkspaceGate } from "../../../components/shell/WorkspaceGate";
import { isMissionDemoWorkspace } from "../../../lib/mission-control/store";
import { useWorkspaceSessionActions } from "../../../lib/workspace/session-actions";

function FounderHome() {
  const workspace = useParams().workspace as string;
  const { session } = useWorkspaceSessionActions(workspace);
  const searchParams = useSearchParams();
  const variant = searchParams.get("variant");
  const qa = searchParams.get("qa");

  if (!session || !session.twin) return null;

  const legacyQa =
    isMissionDemoWorkspace(workspace) && variant === "legacy" && qa === "1";

  if (legacyQa) {
    return <MissionControlScreen workspace={workspace} />;
  }

  if (isMissionDemoWorkspace(workspace)) {
    return <MissionControlCanvas workspace={workspace} />;
  }

  return <MissionControlScreen workspace={workspace} />;
}

export default function AdminHomePage() {
  const workspace = useParams().workspace as string;
  return (
    <WorkspaceGate workspace={workspace} requireTwin variant="founder">
      <FounderHome />
    </WorkspaceGate>
  );
}
