import { stringToBase64URL } from "@supabase/ssr";
import type { Session } from "@supabase/supabase-js";
import type { BrowserContext, Page } from "@playwright/test";

export function getSupabaseAuthCookieName(supabaseUrl: string): string {
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0]!;
  return `sb-${projectRef}-auth-token`;
}

export function buildSupabaseAuthCookie(
  session: Session,
  supabaseUrl: string,
  appUrl: string,
) {
  const name = getSupabaseAuthCookieName(supabaseUrl);
  const value = `base64-${stringToBase64URL(JSON.stringify(session))}`;
  const origin = new URL(appUrl);
  return {
    name,
    value,
    url: origin.origin,
    sameSite: "Lax" as const,
    httpOnly: false,
    secure: origin.protocol === "https:",
  };
}

export async function seedSupabaseAuthCookies(
  context: BrowserContext,
  session: Session,
  supabaseUrl: string,
  appUrl: string,
) {
  const cookie = buildSupabaseAuthCookie(session, supabaseUrl, appUrl);
  await context.setExtraHTTPHeaders({
    Cookie: `${cookie.name}=${cookie.value}`,
  });
}

export async function prepareAuthenticatedPage(
  page: Page,
  session: Session,
  input: {
    supabaseUrl: string;
    appUrl: string;
    apiBase: string;
    apiAuth: Record<string, string>;
  },
) {
  const cookie = buildSupabaseAuthCookie(
    session,
    input.supabaseUrl,
    input.appUrl,
  );
  await page.context().setExtraHTTPHeaders({
    Cookie: `${cookie.name}=${cookie.value}`,
  });
  await page.route(`${input.apiBase}/api/v1/**`, async (route) => {
    await route.continue({
      headers: {
        ...route.request().headers(),
        ...input.apiAuth,
      },
    });
  });
  await page.addInitScript(() => {
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: Promise.resolve(), status: "loaded" },
    });
  });
}
