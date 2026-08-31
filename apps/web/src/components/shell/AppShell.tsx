"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import {
  DEMO_BADGE_LABEL,
  NORTHSTAR_WORKSPACE_NAME,
} from "../../content/demo/northstar";
import type { PrototypeSession } from "../../lib/prototype/types";
import { ThemeControl } from "../ui/ThemeControl";
import { Wordmark, StatusBadge } from "../ui/Display";
import { IconButton } from "../ui/Button";
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
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const base = `/${workspace}/admin`;
  const displayName =
    session.mode === "demo" ? NORTHSTAR_WORKSPACE_NAME : session.workspaceName;

  const nav = [
    { href: base, label: "Home", exact: true },
    { href: `${base}/twin`, label: "Twin" },
    { href: `${base}/setup`, label: "Setup" },
    { href: `${base}/services`, label: "Services" },
    { href: `${base}/clients`, label: "Clients" },
    { href: `${base}/opportunities`, label: "Opportunities" },
    { href: `${base}/team`, label: "Team" },
    { href: `/${workspace}/work`, label: "My work" },
    { href: `${base}/settings`, label: "Settings" },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className={styles.founder}>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header className={styles.founderHeader}>
        <div className={styles.founderHeaderLeft}>
          <IconButton
            label={mobileOpen ? "Close menu" : "Open menu"}
            className={styles.mobileMenuBtn}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </IconButton>
          <div className={styles.workspaceIdentity}>
            <Link href={base}>
              <Wordmark />
            </Link>
            <span className={styles.workspaceDivider} aria-hidden="true" />
            <span className={styles.workspaceName}>{displayName}</span>
            {session.mode === "demo" && (
              <StatusBadge variant="demo">{DEMO_BADGE_LABEL}</StatusBadge>
            )}
          </div>
        </div>
        <div className={styles.founderHeaderRight}>
          <ThemeControl />
        </div>
      </header>
      <div className={styles.founderBody}>
        <nav
          className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ""}`}
          aria-label="Founder navigation"
        >
          <ul className={styles.navList}>
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={
                    isActive(item.href, item.exact)
                      ? styles.navLinkActive
                      : styles.navLink
                  }
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <main id="main-content" className={styles.founderMain}>
          {children}
        </main>
      </div>
      <nav className={styles.mobileBottomNav} aria-label="Mobile navigation">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={
              isActive(item.href, item.exact)
                ? styles.bottomNavActive
                : styles.bottomNavLink
            }
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
