import { createHash } from "node:crypto";

import { sanitizeSourceText } from "../extraction.js";
import {
  DISCOVERY_EXTRACTION_PROMPT_VERSION,
  DISCOVERY_EXTRACTION_SCHEMA_VERSION,
} from "./categories.js";
import type {
  DiscoveryExtractionContext,
  DiscoveryExtractionProvider,
  DiscoveryExtractionProviderResult,
} from "./provider.js";
import type { DiscoveryExtractionOutputV1 } from "./schema-v1.js";

export function sourceFingerprint(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 32);
}

export class FixtureDiscoveryExtractionProvider
  implements DiscoveryExtractionProvider
{
  readonly providerId = "fixture";

  extract(
    context: DiscoveryExtractionContext,
  ): Promise<DiscoveryExtractionProviderResult> {
    const started = Date.now();
    const text = sanitizeSourceText(context.sourceText);
    const candidates: DiscoveryExtractionOutputV1["candidates"][number][] = [];
    let seq = 0;
    const push = (
      category: string,
      value: string,
      match: RegExpExecArray,
      confidenceBps: number,
    ) => {
      seq += 1;
      candidates.push({
        candidateId: `cand-${seq}`,
        category,
        normalizedValue: value,
        sourceExcerpt: match[0].trim().slice(0, 200),
        sourceId: context.sourceId,
        characterStart: match.index,
        characterEnd: match.index + match[0].length,
        confidenceBps,
        status: "draft",
      });
    };

    const audience = /audience[:\s]+([^.]+)/i.exec(text);
    if (audience?.[1]) {
      push("audience", audience[1].trim(), audience, 8200);
    }
    const budget = /budget[:\s]+\$?([\d,]+)/i.exec(text);
    if (budget?.[1]) {
      push("budget", `Budget: ${budget[1]}`, budget, 7400);
    }
    const timeline = /timeline[^\d]*(\d+)\s*days/i.exec(text);
    if (timeline?.[0]) {
      push("timeline", timeline[0].trim(), timeline, 7000);
    }
    const risk = /legal review[^.]+/i.exec(text);
    if (risk?.[0]) {
      push("risk", risk[0].trim(), risk, 6100);
    }
    if (candidates.length === 0 && text.trim()) {
      candidates.push({
        candidateId: "cand-1",
        category: "note",
        normalizedValue: text.slice(0, 240),
        sourceExcerpt: text.slice(0, 120),
        sourceId: context.sourceId,
        characterStart: 0,
        characterEnd: Math.min(text.length, 120),
        confidenceBps: 4000,
        status: "draft",
      });
    }

    return Promise.resolve({
      output: {
        schemaVersion: DISCOVERY_EXTRACTION_SCHEMA_VERSION,
        candidates,
        contradictions: [],
      },
      provider: this.providerId,
      model: "fixture-v1",
      promptVersion: DISCOVERY_EXTRACTION_PROMPT_VERSION,
      schemaVersion: DISCOVERY_EXTRACTION_SCHEMA_VERSION,
      latencyMs: Date.now() - started,
    });
  }
}
