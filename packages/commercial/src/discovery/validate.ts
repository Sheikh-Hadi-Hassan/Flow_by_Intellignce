import AjvImport from "ajv";

import { DISCOVERY_EXTRACTION_SCHEMA_VERSION } from "./categories.js";
import {
  discoveryExtractionOutputSchemaV1,
  type DiscoveryExtractionOutputV1,
} from "./schema-v1.js";
import { DiscoveryExtractionError } from "./provider.js";

type AjvInstance = {
  compile: (schema: object) => ((data: unknown) => boolean) & {
    errors?: { instancePath: string; message?: string }[] | null;
  };
};

const Ajv =
  (AjvImport as unknown as { default?: new (options: object) => AjvInstance })
    .default ?? (AjvImport as unknown as new (options: object) => AjvInstance);

const ajv = new Ajv({ allErrors: true, strict: false });
const schemaForValidation = { ...discoveryExtractionOutputSchemaV1 };
delete (schemaForValidation as { $id?: string }).$id;
delete (schemaForValidation as { $schema?: string }).$schema;
const validateSchema = ajv.compile(schemaForValidation);

export function validateExtractionOutput(
  payload: unknown,
): DiscoveryExtractionOutputV1 {
  if (!validateSchema(payload)) {
    const details =
      validateSchema.errors
        ?.map((row) => `${row.instancePath} ${row.message ?? ""}`.trim())
        .join("; ") ?? "Invalid extraction output.";
    throw new DiscoveryExtractionError("schema_invalid", details, false);
  }
  const output = payload as DiscoveryExtractionOutputV1;
  if (output.schemaVersion !== DISCOVERY_EXTRACTION_SCHEMA_VERSION) {
    throw new DiscoveryExtractionError(
      "schema_version_mismatch",
      "Unexpected schema version.",
      false,
    );
  }
  return output;
}

export function validateEvidenceAnchors(
  sourceText: string,
  output: DiscoveryExtractionOutputV1,
  expectedSourceId: string,
): void {
  for (const candidate of output.candidates) {
    if (candidate.sourceId !== expectedSourceId) {
      throw new DiscoveryExtractionError(
        "invalid_source_id",
        "Candidate references unexpected source id.",
        false,
      );
    }
    if (candidate.status !== "draft") {
      throw new DiscoveryExtractionError(
        "invalid_status",
        "Model cannot set verification status.",
        false,
      );
    }
    const { characterStart, characterEnd } = candidate;
    if (characterEnd <= characterStart) {
      throw new DiscoveryExtractionError(
        "invalid_offsets",
        "Invalid character offsets.",
        false,
      );
    }
    if (characterEnd > sourceText.length) {
      throw new DiscoveryExtractionError(
        "invalid_offsets",
        "Offsets exceed source length.",
        false,
      );
    }
    const slice = sourceText.slice(characterStart, characterEnd);
    if (!slice.includes(candidate.sourceExcerpt.trim().slice(0, 12))) {
      throw new DiscoveryExtractionError(
        "evidence_mismatch",
        "Evidence excerpt does not match source offsets.",
        false,
      );
    }
  }
}

export function detectDuplicateCandidates(
  output: DiscoveryExtractionOutputV1,
): Map<string, string> {
  const seen = new Map<string, string>();
  const duplicates = new Map<string, string>();
  for (const candidate of output.candidates) {
    const key = `${candidate.category}::${candidate.normalizedValue.toLowerCase()}`;
    const prior = seen.get(key);
    if (prior) {
      duplicates.set(candidate.candidateId, prior);
    } else {
      seen.set(key, candidate.candidateId);
    }
  }
  return duplicates;
}
