"use client";

import Link from "next/link";
import { useState } from "react";

import { AuthShell } from "../../components/shell/AppShell";
import { Button } from "../../components/ui/Button";
import { FormField, TextInput } from "../../components/ui/FormField";
import { getAppOrigin, isSupabaseConfigured } from "../../lib/auth/config";
import { createBrowserSupabaseClient } from "../../lib/auth/supabase-browser";
import styles from "../../components/shell/shell.module.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!isSupabaseConfigured()) {
      setError("Password recovery requires Supabase configuration.");
      return;
    }

    const supabase = createBrowserSupabaseClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${getAppOrigin()}/reset-password`,
      },
    );

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage(
      "If an account exists for that email, a reset link is on its way.",
    );
  };

  return (
    <AuthShell title="Reset password">
      <form
        className={styles.formStack}
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        noValidate
      >
        <FormField label="Email" htmlFor="reset-email">
          <TextInput
            id="reset-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </FormField>
        {error && (
          <p className="flow-field__error" role="alert">
            {error}
          </p>
        )}
        {message && <p role="status">{message}</p>}
        <Button type="submit" block>
          Send reset link
        </Button>
      </form>
      <p className={styles.linkRow}>
        <Link href="/sign-in">Back to sign in</Link>
      </p>
    </AuthShell>
  );
}
