"use client";

import type { ReactNode } from "react";
import { useParams } from "next/navigation";

import { isDemoWorkspaceSlug } from "../../lib/workspace/demo";
import { useCommercialClient } from "../../lib/commercial/use-commercial";
import { useUnifiedWorkspaceSession } from "../../lib/workspace/context";

export function CommercialDataGate({ children }: { children: ReactNode }) {
  const workspace = useParams().workspace as string;
  const client = useCommercialClient(workspace);
  const { isResolving, isApiBacked } = useUnifiedWorkspaceSession(workspace);

  if (isDemoWorkspaceSlug(workspace)) {
    return <>{children}</>;
  }

  if (isResolving || (isApiBacked && !client)) {
    return (
      <div
        className="flow-route-pending"
        aria-busy="true"
        aria-live="polite"
        data-testid="commercial-data-pending"
      />
    );
  }

  return <>{children}</>;
}
