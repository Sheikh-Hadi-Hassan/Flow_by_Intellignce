"use client";

import Link from "next/link";

import { AuthShell } from "../../components/shell/AppShell";
import { InlineAlert } from "../../components/ui/Display";
import styles from "../../components/shell/shell.module.css";

export default function VerifyEmailPage() {
  return (
    <AuthShell title="Verify your email">
      <InlineAlert>
        Prototype state only. In production, Flow will send a verification link
        to your email address.
      </InlineAlert>
      <p style={{ margin: "var(--space-4) 0", fontSize: "var(--text-sm)" }}>
        Check your inbox for a verification link, or continue onboarding if you
        are in the prototype flow.
      </p>
      <div className={styles.formActions}>
        <Link
          href="/sign-in"
          className="flow-btn flow-btn--secondary flow-btn--block"
        >
          Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}
