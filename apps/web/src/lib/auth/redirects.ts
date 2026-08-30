const INTERNAL_PATH = /^\/[^/]+\/(admin|onboarding)(\/|$)/;

export function isWorkspaceScopedPath(pathname: string): boolean {
  return INTERNAL_PATH.test(pathname);
}

export function sanitizeInternalRedirect(
  target: string | null | undefined,
  fallback: string,
): string {
  if (!target) return fallback;
  if (!target.startsWith("/") || target.startsWith("//")) {
    return fallback;
  }
  if (target.includes("://")) {
    return fallback;
  }
  return target;
}

export function workspaceSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/([^/]+)/);
  return match?.[1] ?? null;
}
