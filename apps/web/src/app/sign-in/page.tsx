"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { AuthShell } from "../../components/shell/AppShell";
import { Button } from "../../components/ui/Button";
import { FormField, TextInput } from "../../components/ui/FormField";
import { isSupabaseConfigured } from "../../lib/auth/config";
import { sanitizeInternalRedirect } from "../../lib/auth/redirects";
import { createBrowserSupabaseClient } from "../../lib/auth/supabase-browser";
import { useWorkspaceApi } from "../../lib/workspace/context";
import styles from "../../components/shell/shell.module.css";

export default function SignInPage() {
  return (
    <Suspense fallback={<AuthShell title="Sign in">Loading…</AuthShell>}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ensureProvisioned } = useWorkspaceApi();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!isSupabaseConfigured()) {
      setError(
        "Supabase is not configured. Use the Northstar demo from the home page in local development.",
      );
      return;
    }

    const supabase = createBrowserSupabaseClient();
    const { error: signInError } = await supabase.auth.signInWithPassword(
      {
        email: email.trim(),
        password,
      },
    );
    setPassword("");

    if (signInError) {
      setError(signInError.message);
      return;
    }

    const {
      data: { session: activeSession },
    } = await supabase.auth.getSession();
    if (!activeSession) {
      setError("Unable to establish session.");
      return;
    }

    const metadata = activeSession.user.user_metadata ?? {};
    const firstName =
      typeof metadata.first_name === "string" ? metadata.first_name : "Founder";
    const workspaceName =
      typeof metadata.workspace_name === "string"
        ? metadata.workspace_name
        : "My Workspace";

    const session = await ensureProvisioned({
      firstName,
      workspaceName,
      email: email.trim(),
    });

    if (!session) {
      setError("Signed in, but Flow could not load your workspace.");
      return;
    }

    router.refresh();
    const next = sanitizeInternalRedirect(
      searchParams.get("next"),
      session.twinCompiled
        ? `/${session.workspaceSlug}/admin`
        : `/${session.workspaceSlug}/onboarding/business`,
    );
    router.replace(next);
  };

  return (
    <AuthShell title="Sign in">
      <form
        className={styles.formStack}
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        noValidate
      >
        <FormField label="Email" htmlFor="email">
          <TextInput
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </FormField>
        <FormField label="Password" htmlFor="password">
          <TextInput
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </FormField>
        {(error || searchParams.get("error")) && (
          <p className="flow-field__error" role="alert">
            {error || "Unable to sign in."}
          </p>
        )}
        <div className={styles.formActions}>
          <Button type="submit" block>
            Sign in
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
