import type { AskApplicationContext } from "./types";

export const DEFAULT_ASK_PLACEHOLDER = "Ask anything about your business";

export function askPlaceholder(context: AskApplicationContext): string {
  if (context.exposureMinor) {
    return "Ask why exposure is climbing";
  }
  const segments = context.route.split("/").filter(Boolean);
  const adminIndex = segments.indexOf("admin");
  if (adminIndex < 0) return DEFAULT_ASK_PLACEHOLDER;
  const section = segments[adminIndex + 1] ?? "";
  const detail = segments[adminIndex + 2];
  if (section === "team") return "Ask about team capacity or workload";
  if (section === "opportunities") return "Ask about pipeline health";
  if (section === "lifecycle" && detail === "projects") {
    return "Ask what's at risk this week";
  }
  if (section === "clients" && detail) {
    return "Ask anything about this client";
  }
  return DEFAULT_ASK_PLACEHOLDER;
}
