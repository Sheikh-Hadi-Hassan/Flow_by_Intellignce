export function isDevOrTestRuntime(): boolean {
  const nodeEnv = process.env.NODE_ENV?.trim();
  return (
    nodeEnv === "development" ||
    nodeEnv === "test" ||
    process.env.VITEST === "true"
  );
}

export function getDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.DATABASE_POOLER_URL?.trim() ||
    undefined
  );
}

export function getSupabaseUrl(): string | undefined {
  return (
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    undefined
  );
}

export function getSupabasePublishableKey(): string | undefined {
  return (
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    undefined
  );
}

export function assertProductionRuntimeConfig(): void {
  if (isDevOrTestRuntime()) {
    return;
  }

  const missing: string[] = [];
  if (!getDatabaseUrl()) {
    missing.push("DATABASE_URL or DATABASE_POOLER_URL");
  }
  if (!getSupabaseUrl()) {
    missing.push("SUPABASE_URL");
  }
  if (!getSupabasePublishableKey()) {
    missing.push("SUPABASE_PUBLISHABLE_KEY");
  }

  if (missing.length > 0) {
    throw new Error(
      `Production startup blocked: missing required configuration (${missing.join(", ")}).`,
    );
  }
}
