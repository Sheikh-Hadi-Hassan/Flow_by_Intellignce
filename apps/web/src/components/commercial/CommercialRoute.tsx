"use client";

import type { ReactNode } from "react";
import { useParams } from "next/navigation";

import { FounderShell } from "../shell/AppShell";
import { WorkspaceGate } from "../shell/WorkspaceGate";
import { useWorkspaceSessionActions } from "../../lib/workspace/session-actions";

export function CommercialRoute({ children }: { children: ReactNode }) {
  const workspace = useParams().workspace as string;
  return (
    <WorkspaceGate workspace={workspace} requireTwin variant="founder">
      <CommercialShell>{children}</CommercialShell>
    </WorkspaceGate>
  );
}

function CommercialShell({ children }: { children: ReactNode }) {
  const workspace = useParams().workspace as string;
  const { session } = useWorkspaceSessionActions(workspace);
  if (!session) return null;
  return (
    <FounderShell workspace={workspace} session={session}>
      {children}
    </FounderShell>
  );
}
