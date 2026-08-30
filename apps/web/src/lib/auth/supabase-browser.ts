import { createBrowserClient } from "@supabase/ssr";

import {
  getPublicSupabasePublishableKey,
  getPublicSupabaseUrl,
  isSupabaseConfigured,
} from "./config";

export function createBrowserSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured for this environment.");
  }
  return createBrowserClient(
    getPublicSupabaseUrl()!,
    getPublicSupabasePublishableKey()!,
  );
}
