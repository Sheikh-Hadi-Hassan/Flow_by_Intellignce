"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthShell } from "../../components/shell/AppShell";
import { Button } from "../../components/ui/Button";
import { FormField, TextInput } from "../../components/ui/FormField";
import { usePrototype } from "../../lib/prototype/context";
import styles from "../../components/shell/shell.module.css";

export default function SignInPage() {
  const router = useRouter();
  const { session, signInPrototype } = usePrototype();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = signInPrototype(email.trim());
    if (!result) {
      setError(
        "No prototype session for this email. Sign up or use the Northstar demo.",
      );
      return;
    }
    const dest = result.twinCompiled
      ? `/${result.workspaceSlug}/admin`
      : `/${result.workspaceSlug}/onboarding/business`;
    router.push(dest);
  };

  useEffect(() => {
    if (!session?.auth?.email) return;
    router.replace(
      session.twinCompiled
        ? `/${session.workspaceSlug}/admin`
        : `/${session.workspaceSlug}/onboarding/business`,
    );
  }, [session, router]);

  return (
    <AuthShell title="Sign in">
      <form className={styles.formStack} onSubmit={handleSubmit} noValidate>
        <FormField label="Email" htmlFor="email">
          <TextInput
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </FormField>
        {error && (
          <p className="flow-field__error" role="alert">
            {error}
          </p>
        )}
        <div className={styles.formActions}>
          <Button type="submit" block>
            Sign in (prototype)
          </Button>
        </div>
      </form>
      <p className={styles.linkRow}>
        <Link href="/forgot-password">Forgot password?</Link>
      </p>
      <p className={styles.linkRow}>
        New to Flow? <Link href="/sign-up">Create workspace</Link>
      </p>
    </AuthShell>
  );
}
