import { FixtureDiscoveryExtractionProvider } from "./fixture-provider.js";
import {
  DISCOVERY_EXTRACTION_PROMPT_VERSION,
  DISCOVERY_EXTRACTION_SCHEMA_VERSION,
} from "./categories.js";
import {
  buildDiscoveryExtractionSystemPrompt,
  buildDiscoveryExtractionUserPayload,
} from "./prompt-v1.js";
import {
  DiscoveryExtractionError,
  type DiscoveryExtractionContext,
  type DiscoveryExtractionProvider,
  type DiscoveryExtractionProviderResult,
} from "./provider.js";
import { validateEvidenceAnchors, validateExtractionOutput } from "./validate.js";

export interface OpenAiCompatibleDiscoveryConfig {
  readonly providerId?: string;
  readonly baseUrl: string;
  readonly apiKey?: string;
  readonly model: string;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class OpenAiCompatibleDiscoveryProvider
  implements DiscoveryExtractionProvider
{
  readonly providerId: string;

  constructor(private readonly config: OpenAiCompatibleDiscoveryConfig) {
    this.providerId = config.providerId ?? "openai-compatible";
  }

  async extract(
    context: DiscoveryExtractionContext,
    signal?: AbortSignal,
  ): Promise<DiscoveryExtractionProviderResult> {
    const started = Date.now();
    const maxRetries = this.config.maxRetries ?? 2;
    const timeoutMs = this.config.timeoutMs ?? 30_000;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const mergedSignal = signal
        ? AbortSignal.any([signal, controller.signal])
        : controller.signal;
      try {
        const response = await fetch(
          `${this.config.baseUrl.replace(/\/$/, "")}/chat/completions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(this.config.apiKey
                ? { Authorization: `Bearer ${this.config.apiKey}` }
                : {}),
            },
            body: JSON.stringify({
              model: this.config.model,
              temperature: 0,
              response_format: { type: "json_object" },
              messages: [
                {
                  role: "system",
                  content: buildDiscoveryExtractionSystemPrompt(),
                },
                {
                  role: "user",
                  content: buildDiscoveryExtractionUserPayload({
                    sourceId: context.sourceId,
                    sourceText: context.sourceText,
                    ...(context.twinSummary
                      ? { twinSummary: { ...context.twinSummary } }
                      : {}),
                    ...(context.serviceSummary
                      ? { serviceSummary: { ...context.serviceSummary } }
                      : {}),
                    ...(context.opportunitySummary
                      ? {
                          opportunitySummary: { ...context.opportunitySummary },
                        }
                      : {}),
                  }),
                },
              ],
            }),
            signal: mergedSignal,
          },
        );
        if (!response.ok) {
          const retryable = response.status >= 500 || response.status === 429;
          throw new DiscoveryExtractionError(
            `provider_http_${response.status}`,
            `Provider returned HTTP ${response.status}.`,
            retryable,
          );
        }
        const payload = (await response.json()) as {
          choices?: { message?: { content?: string } }[];
          usage?: {
            prompt_tokens?: number;
            completion_tokens?: number;
            total_tokens?: number;
          };
        };
        const content = payload.choices?.[0]?.message?.content;
        if (!content) {
          throw new DiscoveryExtractionError(
            "provider_empty",
            "Provider returned empty content.",
            true,
          );
        }
        const parsed = validateExtractionOutput(JSON.parse(content));
        validateEvidenceAnchors(
          context.sourceText,
          parsed,
          context.sourceId,
        );
        const usage = payload.usage;
        return {
          output: parsed,
          provider: this.providerId,
          model: this.config.model,
          promptVersion: DISCOVERY_EXTRACTION_PROMPT_VERSION,
          schemaVersion: DISCOVERY_EXTRACTION_SCHEMA_VERSION,
          latencyMs: Date.now() - started,
          ...(usage
            ? {
                usage: {
                  ...(usage.prompt_tokens != null
                    ? { inputTokens: usage.prompt_tokens }
                    : {}),
                  ...(usage.completion_tokens != null
                    ? { outputTokens: usage.completion_tokens }
                    : {}),
                  ...(usage.total_tokens != null
                    ? { totalTokens: usage.total_tokens }
                    : {}),
                },
              }
            : {}),
        };
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error(String(error));
        const retryable =
          error instanceof DiscoveryExtractionError
            ? error.retryable
            : error instanceof Error && error.name === "AbortError";
        if (!retryable || attempt === maxRetries) break;
        await sleep(250 * (attempt + 1));
      } finally {
        clearTimeout(timer);
      }
    }
    throw (
      lastError ??
      new DiscoveryExtractionError("provider_failed", "Extraction failed.", true)
    );
  }
}

export function createDiscoveryProviderFromEnv(): DiscoveryExtractionProvider {
  const provider = process.env.BLM_PROVIDER?.trim() || "fixture";
  if (provider === "fixture") {
    return new FixtureDiscoveryExtractionProvider();
  }
  const baseUrl =
    process.env.BLM_BASE_URL?.trim() || "https://api.openai.com/v1";
  const model = process.env.BLM_MODEL?.trim();
  if (!model) {
    throw new DiscoveryExtractionError(
      "provider_misconfigured",
      "BLM_MODEL is required for non-fixture providers.",
      false,
    );
  }
  return new OpenAiCompatibleDiscoveryProvider({
    providerId: provider,
    baseUrl,
    model,
    ...(process.env.BLM_API_KEY?.trim()
      ? { apiKey: process.env.BLM_API_KEY.trim() }
      : {}),
    timeoutMs: Number(process.env.BLM_TIMEOUT_MS ?? 30_000),
    maxRetries: Number(process.env.BLM_MAX_RETRIES ?? 2),
  });
}
