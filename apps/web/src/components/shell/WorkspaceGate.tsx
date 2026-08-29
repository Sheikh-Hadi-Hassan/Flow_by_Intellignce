"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import {
  useWorkspaceSession,
  workspacePlaceholder,
} from "../../lib/prototype/context";
import { FounderShell, PublicShell } from "./AppShell";
import { EmptyState } from "../ui/Display";

export function WorkspaceGate({
  workspace,
  children,
  requireTwin = false,
  variant = "workspace",
}: {
  workspace: string;
  children: ReactNode;
  requireTwin?: boolean;
  variant?: "workspace" | "founder";
}) {
  const router = useRouter();
  const { session, mismatch, isResolving } = useWorkspaceSession(workspace);

  useEffect(() => {
    if (isResolving) return;
    if (mismatch) return;
    if (!session) {
      router.replace("/sign-up");
      return;
    }
    if (requireTwin && !session.twinCompiled) {
      router.replace(`/${workspace}/onboarding/business`);
    }
  }, [isResolving, mismatch, session, requireTwin, workspace, router]);

  if (!isResolving && mismatch) {
    return (
      <PublicShell>
        <div style={{ maxWidth: "var(--onboarding-max)", margin: "0 auto" }}>
          <EmptyState>
            No prototype session for <strong>{workspace}</strong>. This URL does
            not match your saved workspace.
            <br />
            <br />
            <a href="/sign-up">Create a workspace</a> ·{" "}
            <a href="/">Explore the Northstar demo</a>
          </EmptyState>
        </div>
      </PublicShell>
    );
  }

  if (!isResolving && !session) {
    return (
      <PublicShell>
        <div style={{ maxWidth: "var(--onboarding-max)", margin: "0 auto" }}>
          <EmptyState>
            No prototype session yet. <a href="/sign-up">Create a workspace</a>{" "}
            or <a href="/">explore the Northstar demo</a>.
          </EmptyState>
        </div>
      </PublicShell>
    );
  }

  if (isResolving && variant === "founder") {
    return (
      <FounderShell
        workspace={workspace}
        session={workspacePlaceholder(workspace)}
      >
        <div
          className="flow-route-pending"
          aria-busy="true"
          aria-live="polite"
        />
      </FounderShell>
    );
  }

  return <>{children}</>;
}
