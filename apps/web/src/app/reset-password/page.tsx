"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthShell } from "../../components/shell/AppShell";
import { Button } from "../../components/ui/Button";
import { FormField, TextInput } from "../../components/ui/FormField";
import { isSupabaseConfigured } from "../../lib/auth/config";
import { createBrowserSupabaseClient } from "../../lib/auth/supabase-browser";
import styles from "../../components/shell/shell.module.css";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!isSupabaseConfigured()) {
      setError("Password reset requires Supabase configuration.");
      return;
    }

    const supabase = createBrowserSupabaseClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPassword("");
    setConfirmPassword("");

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.replace("/sign-in");
  };

  return (
    <AuthShell title="Choose a new password">
      <form
        className={styles.formStack}
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        noValidate
      >
        <FormField label="New password" htmlFor="password">
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
        <FormField label="Confirm password" htmlFor="confirmPassword">
          <TextInput
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
          />
        </FormField>
        {error && (
          <p className="flow-field__error" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" block>
          Update password
        </Button>
      </form>
      <p className={styles.linkRow}>
        <Link href="/sign-in">Back to sign in</Link>
      </p>
    </AuthShell>
  );
}
