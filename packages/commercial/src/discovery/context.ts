export interface MinimalTwinSummary {
  readonly businessName: string;
  readonly classification: string;
  readonly services: readonly string[];
}

export function buildMinimalTwinSummary(input: {
  readonly businessName: string;
  readonly classification: string;
  readonly services: readonly string[];
}): MinimalTwinSummary {
  return {
    businessName: input.businessName.slice(0, 120),
    classification: input.classification.slice(0, 120),
    services: input.services.slice(0, 8).map((row) => row.slice(0, 80)),
  };
}
