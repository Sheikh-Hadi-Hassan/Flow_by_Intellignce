export type ScopeWrite =
  | {
      readonly kind: "requirement";
      readonly key: string;
      readonly statement: string;
    }
  | {
      readonly kind: "deliverable";
      readonly name: string;
      readonly description: string;
    }
  | {
      readonly kind: "budget";
      readonly minMinor?: string;
      readonly maxMinor?: string;
    }
  | {
      readonly kind: "timeline";
      readonly notes: string;
      readonly days?: number;
    }
  | {
      readonly kind: "risk";
      readonly statement: string;
      readonly blocking: boolean;
      readonly handled: boolean;
    };

function dollarsMentionedToMinor(text: string): string | undefined {
  const match = /(?:budget[^\d]*)?(\d[\d,]*)/i.exec(text);
  if (!match?.[1]) return undefined;
  const major = BigInt(match[1].replaceAll(",", ""));
  return (major * 100n).toString();
}

export function timelineDaysFromText(text: string): number | undefined {
  const match = /(\d+)\s*days/i.exec(text);
  if (!match?.[1]) return undefined;
  return Number(match[1]);
}

export function scopeWritesFromVerifiedFact(fact: {
  readonly category: string;
  readonly candidateFact: string;
}): readonly ScopeWrite[] {
  switch (fact.category) {
    case "audience":
      return [
        {
          kind: "requirement",
          key: "audience",
          statement: fact.candidateFact,
        },
      ];
    case "budget": {
      const minor = dollarsMentionedToMinor(fact.candidateFact);
      return [
        {
          kind: "requirement",
          key: "budget",
          statement: fact.candidateFact,
        },
        {
          kind: "budget",
          ...(minor
            ? {
                minMinor: minor,
                maxMinor: (BigInt(minor) + 1_000_000n).toString(),
              }
            : {}),
        },
      ];
    }
    case "timeline": {
      const days = timelineDaysFromText(fact.candidateFact);
      return [
        {
          kind: "requirement",
          key: "timeline",
          statement: fact.candidateFact,
        },
        {
          kind: "timeline",
          notes: fact.candidateFact,
          ...(days !== undefined ? { days } : {}),
        },
      ];
    }
    case "risk":
      return [
        {
          kind: "risk",
          statement: fact.candidateFact,
          blocking: /blocking|must|cannot proceed/i.test(fact.candidateFact),
          handled: !/blocking|must|cannot proceed/i.test(fact.candidateFact),
        },
      ];
    case "deliverable":
      return [
        {
          kind: "deliverable",
          name: fact.candidateFact.slice(0, 80),
          description: fact.candidateFact,
        },
      ];
    default:
      return [
        {
          kind: "requirement",
          key: fact.category,
          statement: fact.candidateFact,
        },
      ];
  }
}
