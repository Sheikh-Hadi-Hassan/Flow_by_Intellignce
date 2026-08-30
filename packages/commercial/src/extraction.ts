import type { ExtractedFactDraft } from "./types.js";

export interface DiscoveryExtractionPort {
  extract(input: {
    readonly sourceId: string;
    readonly sourceText: string;
    readonly extractionRunId: string;
  }): Promise<readonly ExtractedFactDraft[]>;
}

const INJECTION_MARKERS = [
  "ignore previous instructions",
  "system prompt",
  "<script",
];

export function sanitizeSourceText(text: string): string {
  const lower = text.toLowerCase();
  if (INJECTION_MARKERS.some((marker) => lower.includes(marker))) {
    return text.replace(/ignore previous instructions/gi, "[redacted]");
  }
  return text;
}

export class FixtureDiscoveryExtractor implements DiscoveryExtractionPort {
  extract(input: {
    readonly sourceId: string;
    readonly sourceText: string;
    readonly extractionRunId: string;
  }): Promise<readonly ExtractedFactDraft[]> {
    const text = sanitizeSourceText(input.sourceText);
    const facts: ExtractedFactDraft[] = [];
    const audience = /audience[:\s]+([^.]+)/i.exec(text);
    if (audience?.[1]) {
      facts.push({
        candidateFact: audience[1].trim(),
        category: "audience",
        confidenceBps: 8200,
        sourceId: input.sourceId,
        characterStart: audience.index,
        characterEnd: audience.index + audience[0].length,
        extractionRunId: input.extractionRunId,
        status: "draft",
      });
    }
    const budget = /budget[:\s]+\$?([\d,]+)/i.exec(text);
    if (budget?.[1]) {
      facts.push({
        candidateFact: `Budget mentioned: ${budget[1]}`,
        category: "budget",
        confidenceBps: 7400,
        sourceId: input.sourceId,
        characterStart: budget.index,
        characterEnd: budget.index + budget[0].length,
        extractionRunId: input.extractionRunId,
        status: "draft",
      });
    }
    const timeline = /timeline[^\d]*(\d+)\s*days/i.exec(text);
    if (timeline?.[0]) {
      facts.push({
        candidateFact: timeline[0].trim(),
        category: "timeline",
        confidenceBps: 7000,
        sourceId: input.sourceId,
        characterStart: timeline.index,
        characterEnd: timeline.index + timeline[0].length,
        extractionRunId: input.extractionRunId,
        status: "draft",
      });
    }
    const risk = /legal review[^.]+/i.exec(text);
    if (risk?.[0]) {
      facts.push({
        candidateFact: risk[0].trim(),
        category: "risk",
        confidenceBps: 6100,
        sourceId: input.sourceId,
        characterStart: risk.index,
        characterEnd: risk.index + risk[0].length,
        extractionRunId: input.extractionRunId,
        status: "draft",
      });
    }
    if (facts.length === 0) {
      facts.push({
        candidateFact: text.slice(0, 240),
        category: "note",
        confidenceBps: 4000,
        sourceId: input.sourceId,
        extractionRunId: input.extractionRunId,
        status: "draft",
      });
    }
    return Promise.resolve(facts);
  }
}
