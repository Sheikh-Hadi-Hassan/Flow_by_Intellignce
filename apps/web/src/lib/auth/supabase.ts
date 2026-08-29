import { createClient } from "@supabase/supabase-js";

export function getSupabaseConfig():
  | { url: string; publishableKey: string }
  | undefined {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) return undefined;
  return { url, publishableKey };
}

export function createBrowserSupabaseClient() {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase is not configured for this environment.");
  }
  return createClient(config.url, config.publishableKey);
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== undefined;
}
