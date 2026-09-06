export const ASK_NORMALIZATION_REASON_CODES = [
  "case_normalized",
  "whitespace_normalized",
  "punctuation_normalized",
  "client_alias_normalized",
  "client_typo_normalized",
] as const;

export type AskNormalizationReasonCode =
  (typeof ASK_NORMALIZATION_REASON_CODES)[number];

export interface NormalizedAskMessage {
  readonly original: string;
  readonly normalized: string;
  readonly reasonCodes: readonly AskNormalizationReasonCode[];
}

const CLIENT_ALIASES: Readonly<Record<string, "client">> = {
  clients: "client",
  customer: "client",
  customers: "client",
};

const CLIENT_TYPOS: Readonly<Record<string, "client">> = {
  clints: "client",
  custmers: "client",
};

export function normalizeAskMessage(original: string): NormalizedAskMessage {
  const reasonCodes: AskNormalizationReasonCode[] = [];
  let normalized = original.toLowerCase();
  if (normalized !== original) reasonCodes.push("case_normalized");

  const withoutPunctuation = normalized.replace(/[.,!?;:()[\]{}"']/g, " ");
  if (withoutPunctuation !== normalized) {
    reasonCodes.push("punctuation_normalized");
  }

  normalized = withoutPunctuation.trim().replace(/\s+/g, " ");
  if (normalized !== withoutPunctuation) {
    reasonCodes.push("whitespace_normalized");
  }

  normalized = normalized
    .split(" ")
    .map((token) => {
      if (CLIENT_ALIASES[token]) {
        if (!reasonCodes.includes("client_alias_normalized")) {
          reasonCodes.push("client_alias_normalized");
        }
        return CLIENT_ALIASES[token];
      }
      if (CLIENT_TYPOS[token]) {
        if (!reasonCodes.includes("client_typo_normalized")) {
          reasonCodes.push("client_typo_normalized");
        }
        return CLIENT_TYPOS[token];
      }
      return token;
    })
    .join(" ");

  return { original, normalized, reasonCodes };
}
