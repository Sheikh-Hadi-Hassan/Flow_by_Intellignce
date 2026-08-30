import {
  DISCOVERY_EXTRACTION_CATEGORIES,
  DISCOVERY_EXTRACTION_SCHEMA_VERSION,
} from "./categories.js";

export const discoveryExtractionOutputSchemaV1 = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: `flow://${DISCOVERY_EXTRACTION_SCHEMA_VERSION}`,
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "candidates", "contradictions"],
  properties: {
    schemaVersion: {
      type: "string",
      const: DISCOVERY_EXTRACTION_SCHEMA_VERSION,
    },
    candidates: {
      type: "array",
      maxItems: 64,
      items: { $ref: "#/$defs/candidate" },
    },
    contradictions: {
      type: "array",
      maxItems: 32,
      items: { $ref: "#/$defs/contradiction" },
    },
  },
  $defs: {
    candidate: {
      type: "object",
      additionalProperties: false,
      required: [
        "candidateId",
        "category",
        "normalizedValue",
        "sourceExcerpt",
        "sourceId",
        "characterStart",
        "characterEnd",
        "confidenceBps",
        "status",
      ],
      properties: {
        candidateId: { type: "string", minLength: 1, maxLength: 64 },
        category: { type: "string", enum: [...DISCOVERY_EXTRACTION_CATEGORIES] },
        normalizedValue: { type: "string", minLength: 1, maxLength: 2000 },
        sourceExcerpt: { type: "string", minLength: 1, maxLength: 500 },
        sourceId: { type: "string", minLength: 1, maxLength: 64 },
        characterStart: { type: "integer", minimum: 0 },
        characterEnd: { type: "integer", minimum: 0 },
        timecode: { type: "string", maxLength: 32 },
        confidenceBps: { type: "integer", minimum: 0, maximum: 10000 },
        status: { type: "string", const: "draft" },
        relatedCandidateId: { type: "string", maxLength: 64 },
        contradictionRef: { type: "string", maxLength: 64 },
      },
    },
    contradiction: {
      type: "object",
      additionalProperties: false,
      required: ["contradictionId", "candidateIds", "summary"],
      properties: {
        contradictionId: { type: "string", minLength: 1, maxLength: 64 },
        candidateIds: {
          type: "array",
          minItems: 2,
          maxItems: 8,
          items: { type: "string", maxLength: 64 },
        },
        summary: { type: "string", minLength: 1, maxLength: 500 },
      },
    },
  },
} as const;

export interface DiscoveryExtractionCandidateV1 {
  readonly candidateId: string;
  readonly category: string;
  readonly normalizedValue: string;
  readonly sourceExcerpt: string;
  readonly sourceId: string;
  readonly characterStart: number;
  readonly characterEnd: number;
  readonly timecode?: string;
  readonly confidenceBps: number;
  readonly status: "draft";
  readonly relatedCandidateId?: string;
  readonly contradictionRef?: string;
}

export interface DiscoveryExtractionOutputV1 {
  readonly schemaVersion: typeof DISCOVERY_EXTRACTION_SCHEMA_VERSION;
  readonly candidates: readonly DiscoveryExtractionCandidateV1[];
  readonly contradictions: readonly {
    readonly contradictionId: string;
    readonly candidateIds: readonly string[];
    readonly summary: string;
  }[];
}
