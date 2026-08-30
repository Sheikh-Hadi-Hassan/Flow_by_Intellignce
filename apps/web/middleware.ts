import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  getPublicSupabasePublishableKey,
  getPublicSupabaseUrl,
  isDevOrTestWeb,
  isSupabaseConfigured,
} from "./src/lib/auth/config";
import {
  isPublicAuthPath,
  isStaticAssetOrAuthCallback,
  isDemoWorkspaceBypass,
  requiresAuthenticatedWorkspaceAccess,
} from "./src/lib/auth/route-policy";
import { sanitizeInternalRedirect } from "./src/lib/auth/redirects";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticAssetOrAuthCallback(pathname)) {
    return NextResponse.next();
  }

  if (isPublicAuthPath(pathname)) {
    return NextResponse.next();
  }

  if (isDemoWorkspaceBypass(pathname)) {
    return NextResponse.next();
  }

  if (!requiresAuthenticatedWorkspaceAccess(pathname)) {
    return NextResponse.next();
  }

  if (!isSupabaseConfigured()) {
    if (isDevOrTestWeb()) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/sign-in";
      loginUrl.searchParams.set(
        "next",
        sanitizeInternalRedirect(pathname, "/"),
      );
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    getPublicSupabaseUrl()!,
    getPublicSupabasePublishableKey()!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/sign-in";
    loginUrl.searchParams.set("next", sanitizeInternalRedirect(pathname, "/"));
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
