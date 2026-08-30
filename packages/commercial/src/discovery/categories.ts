export const DISCOVERY_EXTRACTION_CATEGORIES = [
  "client",
  "contact",
  "business_problem",
  "objective",
  "requirement",
  "deliverable",
  "budget",
  "currency",
  "timeline",
  "deadline",
  "constraint",
  "assumption",
  "decision",
  "dependency",
  "risk",
  "open_question",
  "selected_service",
  "exclusion",
  "audience",
  "note",
] as const;

export type DiscoveryExtractionCategory =
  (typeof DISCOVERY_EXTRACTION_CATEGORIES)[number];

export const DISCOVERY_EXTRACTION_SCHEMA_VERSION = "discovery-extraction-v1";
export const DISCOVERY_EXTRACTION_PROMPT_VERSION =
  "flow.discovery.extraction-prompt.v1";
