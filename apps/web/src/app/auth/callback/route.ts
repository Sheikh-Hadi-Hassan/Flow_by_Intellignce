import { NextResponse } from "next/server";

import { getAppOrigin } from "../../../lib/auth/config";
import { createServerSupabaseClient } from "../../../lib/auth/supabase-server";
import { sanitizeInternalRedirect } from "../../../lib/auth/redirects";
import { provisionWorkspace } from "../../../lib/api/workspace";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeInternalRedirect(
    requestUrl.searchParams.get("next"),
    "/",
  );

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const verifyUrl = new URL("/verify-email", getAppOrigin());
      verifyUrl.searchParams.set("error", "verification_failed");
      return NextResponse.redirect(verifyUrl);
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      const metadata = session.user.user_metadata ?? {};
      const firstName =
        typeof metadata.first_name === "string"
          ? metadata.first_name
          : "Founder";
      const workspaceName =
        typeof metadata.workspace_name === "string"
          ? metadata.workspace_name
          : "My Workspace";
      const email =
        typeof session.user.email === "string" ? session.user.email : undefined;

      try {
        const provisioned = await provisionWorkspace({
          token: session.access_token,
          firstName,
          workspaceName,
          ...(email ? { email } : {}),
        });
        const destination = `/${provisioned.slug}/onboarding/business`;
        return NextResponse.redirect(new URL(destination, getAppOrigin()));
      } catch {
        const signInUrl = new URL("/sign-in", getAppOrigin());
        signInUrl.searchParams.set("error", "provision_failed");
        return NextResponse.redirect(signInUrl);
      }
    }
  }

  return NextResponse.redirect(new URL(next, getAppOrigin()));
}
