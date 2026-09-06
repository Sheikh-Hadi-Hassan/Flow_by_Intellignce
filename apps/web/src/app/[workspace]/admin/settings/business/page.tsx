"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";

import { BusinessRegistryScreen } from "../../../../../components/business-registry/BusinessRegistryScreen";
import { WorkspaceGate } from "../../../../../components/shell/WorkspaceGate";

function Screen() {
  const workspace = useParams().workspace as string;
  return <BusinessRegistryScreen workspace={workspace} />;
}

export default function BusinessRegistryPage() {
  const workspace = useParams().workspace as string;
  return (
    <WorkspaceGate workspace={workspace} requireTwin variant="founder">
      <Suspense fallback={<p>Loading the business registry…</p>}>
        <Screen />
      </Suspense>
    </WorkspaceGate>
  );
}
