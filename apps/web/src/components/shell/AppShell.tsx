"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

import {
  DEMO_BADGE_LABEL,
} from "../../content/demo/northstar";
import type { PrototypeSession } from "../../lib/prototype/types";
import { ThemeControl } from "../ui/ThemeControl";
import { Wordmark, StatusBadge } from "../ui/Display";
import { GlobalAskFlowDock } from "../ask/GlobalAskFlowDock";
import { WorkspaceHeader } from "./WorkspaceHeader";
import styles from "./shell.module.css";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.public}>
      <header className={styles.publicHeader}>
        <Link href="/">
          <Wordmark />
        </Link>
        <ThemeControl />
      </header>
      <main className={styles.publicMain}>{children}</main>
    </div>
  );
}

export function AuthShell({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <PublicShell>
      <div className={styles.authCard}>
        <p className="eyebrow">Flow OS</p>
        <h1 className={styles.authTitle}>{title}</h1>
        {children}
      </div>
    </PublicShell>
  );
}

export function OnboardingShell({
  stepIndex,
  children,
  session,
}: {
  workspace: string;
  stepIndex: number;
  children: ReactNode;
  session: PrototypeSession;
}) {
  const steps = [
    "Business",
    "Operations",
    "Services",
    "Policies",
    "Review",
    "Complete",
  ];

  return (
    <div className={styles.onboarding}>
      <header className={styles.onboardingHeader}>
        <div className={styles.workspaceIdentity}>
          <Link href="/">
            <Wordmark />
          </Link>
          {session.workspaceName && (
            <>
              <span className={styles.workspaceDivider} aria-hidden="true" />
              <span className={styles.workspaceName}>
                {session.workspaceName}
              </span>
            </>
          )}
          {session.mode === "demo" && (
            <StatusBadge variant="demo">{DEMO_BADGE_LABEL}</StatusBadge>
          )}
        </div>
        <ThemeControl />
      </header>
      <div className={styles.onboardingBody}>
        <nav aria-label="Onboarding progress" className="flow-stepper">
          {steps.slice(0, 5).map((label, i) => (
            <span
              key={label}
              className={`flow-stepper__step ${
                i === stepIndex
                  ? "flow-stepper__step--active"
                  : i < stepIndex
                    ? "flow-stepper__step--done"
                    : ""
              }`}
            >
              {i + 1}. {label}
            </span>
          ))}
        </nav>
        <main className={styles.onboardingMain}>{children}</main>
      </div>
    </div>
  );
}

export function FounderShell({
  workspace,
  session,
  children,
}: {
  workspace: string;
  session: PrototypeSession;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const flush = pathname === `/${workspace}/admin`;

  return (
    <div className={flush ? "flow-shell flow-shell--flush" : "flow-shell"}>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <WorkspaceHeader workspace={workspace} session={session} />
      <main id="main-content" className="flow-shell__main">
        {children}
      </main>
      <GlobalAskFlowDock />
    </div>
  );
}
