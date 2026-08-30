import type { DiscoveryExtractionOutputV1 } from "./schema-v1.js";

export interface DiscoveryExtractionContext {
  readonly workspaceId: string;
  readonly opportunityId: string;
  readonly sourceId: string;
  readonly sourceText: string;
  readonly extractionRunId: string;
  readonly correlationId?: string;
  readonly twinSummary?: {
    readonly businessName?: string;
    readonly classification?: string;
    readonly services?: readonly string[];
    readonly policies?: readonly string[];
  };
  readonly serviceSummary?: {
    readonly name?: string;
    readonly pricingModel?: string;
  };
  readonly opportunitySummary?: {
    readonly name?: string;
    readonly journeyStatus?: string;
  };
}

export interface DiscoveryExtractionProviderResult {
  readonly output: DiscoveryExtractionOutputV1;
  readonly provider: string;
  readonly model: string;
  readonly promptVersion: string;
  readonly schemaVersion: string;
  readonly latencyMs: number;
  readonly usage?: {
    readonly inputTokens?: number;
    readonly outputTokens?: number;
    readonly totalTokens?: number;
  };
}

export interface DiscoveryExtractionProvider {
  readonly providerId: string;
  extract(
    context: DiscoveryExtractionContext,
    signal?: AbortSignal,
  ): Promise<DiscoveryExtractionProviderResult>;
}

export class DiscoveryExtractionError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "DiscoveryExtractionError";
  }
}
