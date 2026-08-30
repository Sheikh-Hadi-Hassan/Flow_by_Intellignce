export function isDevOrTestWeb(): boolean {
  return (
    process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test"
  );
}

export function getPublicSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || undefined;
}

export function getPublicSupabasePublishableKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || undefined;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getPublicSupabaseUrl() && getPublicSupabasePublishableKey());
}

export function getAppOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
}
