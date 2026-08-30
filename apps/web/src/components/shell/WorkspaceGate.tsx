"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { workspacePlaceholder } from "../../lib/prototype/context";
import { isDemoWorkspaceSlug } from "../../lib/workspace/demo";
import { useUnifiedWorkspaceSession } from "../../lib/workspace/context";
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
  const { session, mismatch, isResolving, isApiBacked, error } =
    useUnifiedWorkspaceSession(workspace);

  useEffect(() => {
    if (isResolving) return;
    if (mismatch) return;
    if (!session) {
      if (isDemoWorkspaceSlug(workspace)) {
        return;
      }
      router.replace(isApiBacked || error ? "/sign-in" : "/sign-up");
      return;
    }
    if (requireTwin && !session.twinCompiled) {
      router.replace(`/${workspace}/onboarding/business`);
    }
  }, [
    error,
    isApiBacked,
    isResolving,
    mismatch,
    requireTwin,
    router,
    session,
    workspace,
  ]);

  if (!isResolving && mismatch) {
    return (
      <PublicShell>
        <div style={{ maxWidth: "var(--onboarding-max)", margin: "0 auto" }}>
          <EmptyState>
            This URL does not match your active workspace session for{" "}
            <strong>{workspace}</strong>.
            <br />
            <br />
            <a href="/sign-in">Sign in</a> ·{" "}
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
            {isDemoWorkspaceSlug(workspace) ? (
              <>
                Northstar is an isolated local demo.{" "}
                <a href="/">Start the demo from the home page</a>.
              </>
            ) : error ? (
              <>
                {error}. <a href="/sign-in">Sign in</a> to continue.
              </>
            ) : (
              <>
                <a href="/sign-in">Sign in</a> or{" "}
                <a href="/sign-up">create a workspace</a>.
              </>
            )}
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

  if (!session) return null;

  return <>{children}</>;
}
