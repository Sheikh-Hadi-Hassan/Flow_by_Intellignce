"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, MoreHorizontal, Sparkles, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import {
  DEMO_BADGE_LABEL,
  NORTHSTAR_WORKSPACE_NAME,
} from "../../content/demo/northstar";
import type { PrototypeSession } from "../../lib/prototype/types";
import {
  founderLifecycleNav,
  founderUtilityNav,
  isLifecycleNavActive,
  MOBILE_LIFECYCLE_NAV_IDS,
} from "../../lib/navigation/lifecycle-nav";
import { useAskFlow } from "../ask/AskFlowProvider";
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

function FounderUtilityMenu({ workspace }: { workspace: string }) {
  const [open, setOpen] = useState(false);
  const items = founderUtilityNav(workspace);

  return (
    <div className={styles.utilityMenu}>
      <IconButton
        label="Workspace utilities"
        onClick={() => setOpen(!open)}
        className={styles.utilityMenuBtn}
      >
        <MoreHorizontal size={18} />
      </IconButton>
      {open ? (
        <div className={styles.utilityDropdown} role="menu">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={styles.utilityLink}
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AskFlowButton() {
  const { openAskFlow } = useAskFlow();
  return (
    <button
      type="button"
      className="flow-ask-bar"
      onClick={openAskFlow}
      aria-label="Open Ask Flow"
    >
      <Sparkles size={14} aria-hidden />
      <span>Ask Flow</span>
    </button>
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
  const nav = founderLifecycleNav(workspace);
  const displayName =
    session.mode === "demo" ? NORTHSTAR_WORKSPACE_NAME : session.workspaceName;

  const mobileNav = nav.filter((item) =>
    (MOBILE_LIFECYCLE_NAV_IDS as readonly string[]).includes(item.id),
  );

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
            <Link href={`/${workspace}/admin`}>
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
          <AskFlowButton />
          <FounderUtilityMenu workspace={workspace} />
          <ThemeControl />
        </div>
      </header>
      <div className={styles.founderBody}>
        <nav
          className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ""}`}
          aria-label="Business lifecycle"
        >
          <ul className={styles.navList}>
            {nav.map((item) => {
              const Icon = item.icon;
              const active = isLifecycleNavActive(pathname, item);
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={active ? styles.navLinkActive : styles.navLink}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon size={16} aria-hidden className={styles.navIcon} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <main id="main-content" className={styles.founderMain}>
          {children}
        </main>
      </div>
      <nav className={styles.mobileBottomNav} aria-label="Mobile lifecycle">
        {mobileNav.map((item) => {
          const active = isLifecycleNavActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={active ? styles.bottomNavActive : styles.bottomNavLink}
            >
              <Icon size={16} aria-hidden />
              <span>{item.shortLabel ?? item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          className={styles.bottomNavLink}
          onClick={() => setMobileOpen(true)}
          aria-label="More navigation"
        >
          <MoreHorizontal size={16} aria-hidden />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
