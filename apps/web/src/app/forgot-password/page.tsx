"use client";

import Link from "next/link";

import { AuthShell } from "../../components/shell/AppShell";
import { InlineAlert } from "../../components/ui/Display";
import { FormField, TextInput } from "../../components/ui/FormField";
import { Button } from "../../components/ui/Button";
import styles from "../../components/shell/shell.module.css";

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset password">
      <InlineAlert>
        Password recovery is not available in this prototype. Sign in with your
        prototype credentials or start a new workspace.
      </InlineAlert>
      <form
        className={styles.formStack}
        style={{ marginTop: "var(--space-4)" }}
      >
        <FormField label="Email" htmlFor="reset-email">
          <TextInput id="reset-email" type="email" autoComplete="email" />
        </FormField>
        <Button type="button" disabled block>
          Send reset link
        </Button>
      </form>
      <p className={styles.linkRow}>
        <Link href="/sign-in">Back to sign in</Link>
      </p>
    </AuthShell>
  );
}
