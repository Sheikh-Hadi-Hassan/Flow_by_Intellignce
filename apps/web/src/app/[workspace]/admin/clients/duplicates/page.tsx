"use client";

import { useParams } from "next/navigation";

import { CrmDuplicates } from "../../../../../components/crm-core/CrmCoreScreens";
import { WorkspaceGate } from "../../../../../components/shell/WorkspaceGate";

export default function Page() {
  const workspace = useParams().workspace as string;
  return (
    <WorkspaceGate workspace={workspace} requireTwin variant="founder">
      <CrmDuplicates workspace={workspace} />
    </WorkspaceGate>
  );
}
