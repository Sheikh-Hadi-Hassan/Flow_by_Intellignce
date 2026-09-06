"use client";

import { useParams } from "next/navigation";

import { BuildingBlockRegistryScreen } from "../../../../components/building-blocks/BuildingBlockRegistry";
import { WorkspaceGate } from "../../../../components/shell/WorkspaceGate";

export default function BuildingBlocksPage() {
  const workspace = useParams().workspace as string;
  return (
    <WorkspaceGate workspace={workspace} requireTwin variant="founder">
      <BuildingBlockRegistryScreen workspace={workspace} />
    </WorkspaceGate>
  );
}
