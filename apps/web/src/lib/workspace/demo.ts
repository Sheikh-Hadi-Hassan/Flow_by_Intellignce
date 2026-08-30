import { NORTHSTAR_SLUG } from "../prototype/defaults";

export const DEMO_WORKSPACE_SLUG = NORTHSTAR_SLUG;

export function isDemoWorkspaceSlug(slug: string): boolean {
  return slug === DEMO_WORKSPACE_SLUG;
}

export function isDemoSessionMode(mode: string | undefined): boolean {
  return mode === "demo";
}
