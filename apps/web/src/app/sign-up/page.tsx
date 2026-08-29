"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthShell } from "../../components/shell/AppShell";
import { Button } from "../../components/ui/Button";
import { FormField, TextInput } from "../../components/ui/FormField";
import { usePrototype } from "../../lib/prototype/context";
import styles from "../../components/shell/shell.module.css";

export default function SignUpPage() {
  const router = useRouter();
  const { startUserSignup } = usePrototype();
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !email.trim() || password.length < 8) {
      setError(
        "Enter business name, email, and a password of at least 8 characters.",
      );
      return;
    }
    const session = startUserSignup(businessName.trim(), email.trim());
    router.push(`/${session.workspaceSlug}/onboarding/business`);
  };

  return (
    <AuthShell title="Create your workspace">
      <form className={styles.formStack} onSubmit={handleSubmit} noValidate>
        <FormField
          label="Business name"
          htmlFor="businessName"
          {...(error ? { error } : {})}
        >
          <TextInput
            id="businessName"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            autoComplete="organization"
            required
          />
        </FormField>
        <FormField label="Work email" htmlFor="email">
          <TextInput
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </FormField>
        <FormField
          label="Password"
          htmlFor="password"
          help="Prototype only — not stored securely."
        >
          <TextInput
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
        <div className={styles.formActions}>
          <Button type="submit" block>
            Continue to onboarding
          </Button>
        </div>
      </form>
      <p className={styles.linkRow}>
        Already have a workspace? <Link href="/sign-in">Sign in</Link>
      </p>
    </AuthShell>
  );
}
