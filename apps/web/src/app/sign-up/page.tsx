"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useState } from "react";

import { AuthShell } from "../../components/shell/AppShell";
import { Button } from "../../components/ui/Button";
import { FormField, TextInput } from "../../components/ui/FormField";
import { getAppOrigin, isSupabaseConfigured } from "../../lib/auth/config";
import { createBrowserSupabaseClient } from "../../lib/auth/supabase-browser";
import styles from "../../components/shell/shell.module.css";

export default function SignUpPage() {
  return (
    <Suspense
      fallback={<AuthShell title="Create your workspace">Loading…</AuthShell>}
    >
      <SignUpForm />
    </Suspense>
  );
}

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [firstName, setFirstName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (
      !firstName.trim() ||
      !workspaceName.trim() ||
      !email.trim() ||
      password.length < 8
    ) {
      setError(
        "Enter founder first name, workspace name, email, and a password of at least 8 characters.",
      );
      return;
    }

    if (!isSupabaseConfigured()) {
      setError(
        "Supabase is not configured. Use the Northstar demo from the home page in local development.",
      );
      return;
    }

    const supabase = createBrowserSupabaseClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${getAppOrigin()}/auth/callback`,
        data: {
          first_name: firstName.trim(),
          workspace_name: workspaceName.trim(),
        },
      },
    });

    setPassword("");

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setPendingVerification(true);
    const verifyUrl = new URL("/verify-email", getAppOrigin());
    verifyUrl.searchParams.set("email", email.trim());
    router.push(`${verifyUrl.pathname}?${verifyUrl.searchParams.toString()}`);
  };

  if (pendingVerification) {
    return (
      <AuthShell title="Check your email">
        <p>
          We sent a verification link to <strong>{email}</strong>. After
          confirming, Flow will provision your workspace and open onboarding.
        </p>
        <p className={styles.linkRow}>
          <Link href="/sign-in">Back to sign in</Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create your workspace">
      <form
        className={styles.formStack}
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        noValidate
      >
        <FormField label="Founder first name" htmlFor="firstName">
          <TextInput
            id="firstName"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            autoComplete="given-name"
            required
          />
        </FormField>
        <FormField label="Workspace name" htmlFor="workspaceName">
          <TextInput
            id="workspaceName"
            value={workspaceName}
            onChange={(event) => setWorkspaceName(event.target.value)}
            autoComplete="organization"
            required
          />
        </FormField>
        <FormField label="Work email" htmlFor="email">
          <TextInput
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </FormField>
        <FormField
          label="Password"
          htmlFor="password"
          help="Passwords are handled by Supabase Auth and are never stored in Flow."
        >
          <TextInput
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
          />
        </FormField>
        {(error || searchParams.get("error")) && (
          <p className="flow-field__error" role="alert">
            {error || "Unable to create your account."}
          </p>
        )}
        <div className={styles.formActions}>
          <Button type="submit" block>
            Create workspace
          </Button>
        </div>
      </form>
      <p className={styles.linkRow}>
        Already have a workspace? <Link href="/sign-in">Sign in</Link>
      </p>
    </AuthShell>
  );
}
