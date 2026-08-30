"use client";

import Link from "next/link";

import { PublicShell } from "../components/shell/AppShell";
import { usePrototype } from "../lib/prototype/context";
import { NORTHSTAR_SLUG } from "../lib/prototype/defaults";
import styles from "../components/shell/shell.module.css";

export default function HomePage() {
  const { startDemo } = usePrototype();

  return (
    <PublicShell>
      <div className={`${styles.hero} editorial-accent`}>
        <p className="eyebrow">Flow OS</p>
        <h1 className={styles.heroTitle}>
          Business Operating Intelligence for service companies
        </h1>
        <p className={styles.heroLead}>
          Flow creates a living Twin of your business, applies governed
          intelligence, and prepares your workspace — with Proof, Guard, and
          Action at every step.
        </p>
        <div className={styles.heroActions}>
          <Link
            href="/sign-up"
            className="flow-btn flow-btn--primary flow-btn--lg"
          >
            Create workspace
          </Link>
          <Link
            href="/sign-in"
            className="flow-btn flow-btn--secondary flow-btn--lg"
          >
            Sign in
          </Link>
          <Link
            href={`/${NORTHSTAR_SLUG}/admin`}
            className="flow-btn flow-btn--ghost flow-btn--lg"
            onClick={() => {
              startDemo();
            }}
          >
            Explore the Northstar demo
          </Link>
        </div>
        <p
          style={{
            marginTop: "var(--space-6)",
            fontSize: "var(--text-sm)",
            color: "var(--color-text-muted)",
          }}
        >
          Northstar Creative is a fictional demo agency ({NORTHSTAR_SLUG}).
        </p>
      </div>
    </PublicShell>
  );
}
