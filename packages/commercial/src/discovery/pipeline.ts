import type { ExtractedFactDraft } from "../types.js";
import { detectDuplicateCandidates, validateEvidenceAnchors, validateExtractionOutput } from "./validate.js";
import type { DiscoveryExtractionProviderResult } from "./provider.js";

export function mapExtractionResultToDrafts(
  result: DiscoveryExtractionProviderResult,
  sourceText: string,
  sourceId: string,
  extractionRunId: string,
): readonly ExtractedFactDraft[] {
  const output = validateExtractionOutput(result.output);
  validateEvidenceAnchors(sourceText, output, sourceId);
  const duplicates = detectDuplicateCandidates(output);
  return output.candidates.map((candidate) => {
    const duplicateOf = duplicates.get(candidate.candidateId);
    const draft: ExtractedFactDraft = {
      candidateFact: candidate.normalizedValue,
      category: candidate.category,
      confidenceBps: candidate.confidenceBps,
      sourceId,
      characterStart: candidate.characterStart,
      characterEnd: candidate.characterEnd,
      extractionRunId,
      status: "draft",
      candidateId: candidate.candidateId,
      ...(candidate.timecode ? { timecode: candidate.timecode } : {}),
      ...(duplicateOf ? { duplicateOfCandidateId: duplicateOf } : {}),
      ...(candidate.contradictionRef
        ? { contradictionRef: candidate.contradictionRef }
        : {}),
    };
    return draft;
  });
}
