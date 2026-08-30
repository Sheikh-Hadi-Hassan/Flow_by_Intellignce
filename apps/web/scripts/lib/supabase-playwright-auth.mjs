import { stringToBase64URL } from "@supabase/ssr";

export function getSupabaseAuthCookieName(supabaseUrl) {
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  return `sb-${projectRef}-auth-token`;
}

export function buildSupabaseAuthCookie(session, supabaseUrl, appUrl) {
  const name = getSupabaseAuthCookieName(supabaseUrl);
  const value = `base64-${stringToBase64URL(JSON.stringify(session))}`;
  const origin = new URL(appUrl);
  return {
    name,
    value,
    url: origin.origin,
    sameSite: "Lax",
    httpOnly: false,
    secure: origin.protocol === "https:",
  };
}

export async function prepareAuthenticatedPage(
  page,
  session,
  { supabaseUrl, appUrl, apiBase, apiAuth },
) {
  const cookie = buildSupabaseAuthCookie(session, supabaseUrl, appUrl);
  await page.context().addCookies([cookie]);
  await page.route(`${apiBase}/api/v1/**`, async (route) => {
    const headers = {
      ...route.request().headers(),
      ...apiAuth,
    };
    await route.continue({ headers });
  });
  await page.addInitScript(() => {
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: Promise.resolve(), status: "loaded" },
    });
  });
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
}
