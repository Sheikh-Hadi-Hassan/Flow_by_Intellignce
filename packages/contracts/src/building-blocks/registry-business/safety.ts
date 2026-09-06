const EIN_SHAPED = /\b\d{2}-\d{7}\b|\b(?<![A-Z0-9-])\d{9}(?![A-Z0-9-])\b/;
const ROUTING_SHAPED = /\b\d{9}\b/;
const REAL_LOOKING_TAX = /\b\d{2}-\d{7}\b/;

export const RECOGNISED_DEMO_WORKSPACE_SLUGS = new Set(["northstar-creative"]);

export function isRecognisedDemoWorkspaceSlug(slug: string): boolean {
  return RECOGNISED_DEMO_WORKSPACE_SLUGS.has(slug) || slug.startsWith("demo-");
}

export function assertDemoSeedAllowed(workspaceSlug: string): void {
  if (!isRecognisedDemoWorkspaceSlug(workspaceSlug)) {
    throw new Error(
      "Business Registry demo seed is rejected for production workspaces.",
    );
  }
}

export function assertDemoPrefixed(value: string, label: string): void {
  if (!value.startsWith("DEMO-")) {
    throw new Error(`${label} must be a fictional identifier prefixed DEMO-.`);
  }
}

export function assertNoLiveFinancialIdentifier(
  value: string,
  label: string,
): void {
  if (/routing|account number|ein\b/i.test(label) && /^\d+$/.test(value)) {
    throw new Error(`${label} cannot store a functional numeric identifier.`);
  }
  if (REAL_LOOKING_TAX.test(value) && !value.includes("DEMO")) {
    throw new Error(`${label} looks like a live tax identifier.`);
  }
}

export function collectStrings(value: unknown, into: string[] = []): string[] {
  if (typeof value === "string") {
    into.push(value);
    return into;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, into);
    return into;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectStrings(item, into);
  }
  return into;
}

export function assertFictionalIdentifiers(payload: unknown): void {
  for (const value of collectStrings(payload)) {
    if (EIN_SHAPED.test(value) && !value.includes("DEMO")) {
      throw new Error(
        `Non-demo EIN-shaped identifier is not allowed: ${value}`,
      );
    }
    if (ROUTING_SHAPED.test(value) && !value.includes("DEMO") && /^\d{9}$/.test(value)) {
      throw new Error(`Functional routing-shaped number is not allowed: ${value}`);
    }
  }
}

export function scanSeedForLiveTaxIds(payload: unknown): void {
  assertFictionalIdentifiers(payload);
}
