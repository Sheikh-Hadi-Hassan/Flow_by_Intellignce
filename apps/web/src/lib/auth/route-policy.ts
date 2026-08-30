import { DEMO_WORKSPACE_SLUG } from "../workspace/demo";
import { isWorkspaceScopedPath, workspaceSlugFromPath } from "./redirects";

export const PUBLIC_AUTH_PATHS = new Set([
  "/",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
]);

export function isStaticAssetOrAuthCallback(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/auth/")
  );
}

export function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.has(pathname);
}

export function isDemoWorkspaceBypass(pathname: string): boolean {
  const slug = workspaceSlugFromPath(pathname);
  return slug === DEMO_WORKSPACE_SLUG;
}

export function requiresAuthenticatedWorkspaceAccess(
  pathname: string,
): boolean {
  if (isStaticAssetOrAuthCallback(pathname)) return false;
  if (isPublicAuthPath(pathname)) return false;
  if (isDemoWorkspaceBypass(pathname)) return false;
  return isWorkspaceScopedPath(pathname);
}
