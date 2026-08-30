import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  getPublicSupabasePublishableKey,
  getPublicSupabaseUrl,
  isSupabaseConfigured,
} from "./config";

export async function createServerSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured for this environment.");
  }

  const cookieStore = await cookies();
  return createServerClient(
    getPublicSupabaseUrl()!,
    getPublicSupabasePublishableKey()!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components may not be able to set cookies.
          }
        },
      },
    },
  );
}
