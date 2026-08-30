"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { AuthShell } from "../../components/shell/AppShell";
import styles from "../../components/shell/shell.module.css";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={<AuthShell title="Verify your email">Loading…</AuthShell>}
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  return (
    <AuthShell title="Verify your email">
      <p>
        {email
          ? `We sent a verification link to ${email}.`
          : "Check your inbox for a verification link."}
      </p>
      <p style={{ margin: "var(--space-4) 0", fontSize: "var(--text-sm)" }}>
        After confirming, Flow provisions your workspace and opens onboarding.
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
