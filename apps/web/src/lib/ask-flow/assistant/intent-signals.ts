import { ASK_TOOL_NAMES, type AskToolName } from "./types";
import type {
  AuthorizedEntity,
  ConfidenceBand,
  IntentCandidate,
  IntentClassifierContext,
  ReasonCode,
} from "./intent-types";

// ---------- Lexicons ----------

const COMMON_WORDS: readonly string[] = [
  "show",
  "get",
  "find",
  "list",
  "view",
  "check",
  "see",
  "pull",
  "grab",
  "data",
  "business",
  "info",
  "things",
  "stuff",
  "page",
  "help",
];

const GREETING_WORDS: readonly string[] = [
  "hi",
  "hello",
  "hey",
  "yo",
  "morning",
  "afternoon",
  "evening",
  "greetings",
  "howdy",
  // Romanized Urdu/Arabic greetings mirror the same no-tool path.
  "salam",
  "salaam",
  "assalam",
  "alaikum",
  "adaab",
];

const CONVERSATIONAL_WORDS: readonly string[] = [
  "thanks",
  "thank",
  "ok",
  "okay",
  "cool",
  "nice",
  "great",
  "bye",
  "goodbye",
  "sure",
  "yep",
  "yes",
  "no",
  "nope",
  "alright",
  "shukriya",
];

const ACTION_VERBS: readonly string[] = [
  "show",
  "get",
  "find",
  "list",
  "view",
  "update",
  "change",
  "check",
  "see",
  "pull",
  "approve",
  "propose",
  "merge",
  "explain",
  "analyze",
  "summarize",
  "search",
  "sign",
  "look",
];

// Deterministic business-object lexicon. No workspace-specific entity
// names (client names, employee names) — those arrive via
// `IntentClassifierContext.authorizedEntities`.
const BUSINESS_OBJECTS: readonly string[] = [
  "invoice",
  "invoices",
  "overdue",
  "receivable",
  "receivables",
  "client",
  "clients",
  "customer",
  "customers",
  "project",
  "projects",
  "pipeline",
  "opportunity",
  "opportunities",
  "approval",
  "approvals",
  "queue",
  "capacity",
  "team",
  "workload",
  "exposure",
  "exposed",
  "risk",
  "sales",
  "revenue",
  "won",
  "lost",
  "segment",
  "duplicate",
  "duplicates",
  "merge",
  "inactive",
  "dormant",
  "health",
  "registration",
  "registrations",
  "location",
  "locations",
  "office",
  "offices",
  "headquarters",
  "signatory",
  "signatories",
  "document",
  "documents",
  "renewal",
  "renewals",
  "compliance",
  "obligation",
  "obligations",
  "firmographic",
  "firmographics",
  "structure",
  "ownership",
  "workspace",
  "summary",
  "status",
  "contract",
  "contracts",
  "company",
  "profile",
  "record",
  "records",
];

const WRITE_RISK_TOOLS: ReadonlySet<AskToolName> = new Set<AskToolName>([
  "propose_client_update",
  "propose_duplicate_merge",
  "propose_business_profile_update",
  "propose_location_change",
]);

const STOPWORDS: ReadonlySet<string> = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "of",
  "for",
  "to",
  "in",
  "on",
  "at",
  "by",
  "with",
  "from",
  "about",
  "and",
  "or",
  "but",
  "if",
  "then",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "my",
  "your",
  "our",
  "their",
  "there",
  "me",
  "you",
  "we",
  "they",
  "them",
  "us",
  "i",
  "why",
  "what",
  "which",
  "who",
  "how",
  "when",
  "where",
  "do",
  "does",
  "did",
  "can",
  "could",
  "would",
  "should",
  "will",
  "may",
  "might",
  "need",
  "needs",
  "please",
]);

// Each tool's keyword set — source of truth for unique-keyword scoring.
// Includes the tool's domain vocabulary, its associated action verb, and
// plural forms so that natural-language queries score above threshold.
const TOOL_KEYS: Readonly<Record<AskToolName, readonly string[]>> = {
  get_workspace_summary: ["summary", "status", "workspace", "show"],
  get_today_sales_update: [
    "sales",
    "today",
    "won",
    "lost",
    "activity",
    "waiting",
    "revenue",
    "update",
  ],
  list_projects: ["project", "projects", "list", "active"],
  get_project_health: ["health", "urgent", "project", "risk"],
  analyze_client_payment_behavior: [
    "payment",
    "worsening",
    "behavior",
    "behaviour",
    "analyze",
    "client",
  ],
  list_overdue_invoices: ["invoice", "invoices", "overdue", "list"],
  get_pipeline_summary: ["pipeline", "summarize", "deal"],
  list_pending_approvals: ["approval", "approvals", "pending", "list"],
  get_team_capacity: ["capacity", "allocated", "overallocated", "team", "show"],
  explain_open_exposure: ["exposure", "exposed", "explain", "open"],
  list_clients: ["list", "client", "clients"],
  search_clients: ["search", "client", "clients"],
  search_business_records: ["search", "record", "records"],
  get_client_360: ["360", "client", "show", "view"],
  list_clients_by_segment: ["segment", "client", "clients", "list"],
  summarize_client_relationship: ["summarize", "relationship", "client"],
  list_inactive_clients: ["inactive", "dormant", "client", "clients", "list"],
  find_duplicate_clients: [
    "duplicate",
    "duplicates",
    "find",
    "show",
    "look",
    "similar",
  ],
  explain_client_health: ["client", "health", "explain"],
  list_client_opportunities: ["client", "opportunity", "opportunities", "list"],
  list_client_projects: ["client", "project", "projects", "list"],
  list_client_contracts: ["client", "contract", "contracts", "list"],
  list_client_invoices: ["client", "invoice", "invoices", "list"],
  propose_client_update: ["propose", "client", "update", "profile"],
  propose_duplicate_merge: ["merge", "duplicate", "duplicates", "propose"],
  get_business_profile: ["company", "profile", "northstar", "show"],
  get_business_registration: [
    "registration",
    "registered",
    "register",
    "northstar",
    "show",
  ],
  list_business_locations: [
    "location",
    "locations",
    "office",
    "offices",
    "headquarters",
    "list",
  ],
  get_business_firmographics: ["firmographics", "show", "data"],
  list_authorised_signatories: [
    "signatory",
    "signatories",
    "authorised",
    "list",
    "sign",
    "contract",
    "contracts",
  ],
  list_expiring_business_documents: [
    "renewal",
    "document",
    "documents",
    "insurance",
    "expiring",
    "list",
  ],
  list_compliance_obligations: [
    "compliance",
    "obligation",
    "obligations",
    "list",
  ],
  explain_business_structure: ["structure", "ownership", "explain"],
  propose_business_profile_update: ["propose", "profile", "update", "company"],
  propose_location_change: ["propose", "location", "office"],
  "commercial.generate_proposal": [],
  "delivery.create_project_from_contract": [],
  "delivery.complete_task": [],
};

const CANONICAL_PHRASES: Partial<
  Readonly<Record<AskToolName, readonly string[]>>
> = {
  list_clients: ["list client", "list clients", "client list"],
};

// Aliases and typo corrections — mirrors planner.ts so the new
// classifier reads the same canonical forms.
const ALIASES: Readonly<Record<string, string>> = {
  hi: "greet",
  hello: "greet",
  hey: "greet",
  yo: "greet",
  morning: "greet",
  lis: "list",
  lst: "list",
  display: "list",
  projet: "project",
  projct: "project",
  projects: "project",
  behavour: "payment",
  behavior: "payment",
  behaviour: "payment",
  overdue: "overdue",
  invoices: "invoice",
  receivable: "invoice",
  receivables: "invoice",
  sales: "sales",
  crm: "sales",
  today: "today",
  pipeline: "pipeline",
  opportunit: "opportunity",
  approval: "approval",
  approvals: "approval",
  approve: "approval",
  queue: "approval",
  expos: "exposure",
  exposed: "exposure",
  exposure: "exposure",
  impact: "exposure",
  capacity: "capacity",
  team: "capacity",
  allocated: "capacity",
  overallocated: "overallocated",
  client: "client",
  clients: "client",
  customer: "client",
  customers: "client",
  search: "search",
  find: "search",
  record: "record",
  records: "record",
  health: "health",
  urgent: "urgent",
  worst: "urgent",
  riskiest: "urgent",
  worsening: "worsening",
  deteriorated: "worsening",
  waiting: "waiting",
  wait: "waiting",
  questionnaire: "questionnaire",
  activity: "activity",
  operations: "activity",
  timeline: "timeline",
  events: "activity",
  active: "active",
  risk: "risk",
  duplicate: "duplicate",
  duplicates: "duplicate",
  dormant: "dormant",
  inactive: "inactive",
  segment: "segment",
  merge: "merge",
  registered: "registration",
  registration: "registration",
  register: "registration",
  northstar: "northstar",
  documents: "document",
  document: "document",
  renewal: "renewal",
  renewals: "renewal",
  renew: "renewal",
  signatory: "signatory",
  signatories: "signatory",
  sign: "signatory",
  contracts: "contract",
  company: "company",
  firmographics: "firmographics",
  structure: "structure",
};

const CLIENT_LIST_ACTIONS: ReadonlySet<string> = new Set([
  "list",
  "show",
  "give",
  "who",
]);

function isClientListRequest(tokens: readonly string[]): boolean {
  const canonicalTokens = tokens.map((token) => ALIASES[token] ?? token);
  return (
    canonicalTokens.includes("client") &&
    canonicalTokens.some((token) => CLIENT_LIST_ACTIONS.has(token)) &&
    canonicalTokens.every(
      (token) =>
        token === "client" ||
        token === "all" ||
        CLIENT_LIST_ACTIONS.has(token) ||
        STOPWORDS.has(token),
    )
  );
}

// ---------- Tokenisation ----------

export function tokenize(raw: string): readonly string[] {
  return raw
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/^[^a-z0-9$%]+|[^a-z0-9$%]+$/g, ""))
    .filter(Boolean);
}

// ---------- Lexicon predicates ----------

export const isCommonWord = (w: string): boolean => COMMON_WORDS.includes(w);
export const isGreetingWord = (w: string): boolean =>
  GREETING_WORDS.includes(w);
export const isConversationalWord = (w: string): boolean =>
  CONVERSATIONAL_WORDS.includes(w);
export const isActionVerb = (w: string): boolean => ACTION_VERBS.includes(w);
export const isBusinessObject = (w: string): boolean =>
  BUSINESS_OBJECTS.includes(w);
export const isWriteRiskTool = (t: AskToolName): boolean =>
  WRITE_RISK_TOOLS.has(t);
export const isStopword = (w: string): boolean => STOPWORDS.has(w);

// ---------- Typo canonicalization (Levenshtein ≤ 2) ----------

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const g = Array.from({ length: rows }, () => Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i += 1) g[i]![0] = i;
  for (let j = 0; j < cols; j += 1) g[0]![j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      g[i]![j] = Math.min(
        g[i - 1]![j]! + 1,
        g[i]![j - 1]! + 1,
        g[i - 1]![j - 1]! + cost,
      );
    }
  }
  return g[rows - 1]![cols - 1]!;
}

// Words that must never be typo-corrected to a business object — they
// are already known as action verbs or common words with distinct meaning.
const NON_OBJECT_WORDS: ReadonlySet<string> = new Set([
  ...ACTION_VERBS,
  ...COMMON_WORDS,
]);

// Tokens that look like action verbs under Levenshtein but aren't.
const VERB_CANON_BLOCKLIST: ReadonlySet<string> = new Set([
  "help",
  "risk",
  "lost",
  "like",
  "look",
]);

/** Return a canonical business-object form for `token` via alias or
 *  typo correction (Levenshtein ≤ 1 against BUSINESS_OBJECTS). */
export function canonBusinessObject(token: string): {
  canonical: string | null;
  typo: boolean;
} {
  if (isBusinessObject(token)) return { canonical: token, typo: false };
  if (ALIASES[token] && isBusinessObject(ALIASES[token])) {
    return { canonical: ALIASES[token], typo: false };
  }
  if (token.length < 4 || NON_OBJECT_WORDS.has(token)) {
    return { canonical: null, typo: false };
  }
  let best: string | null = null;
  let bestDistance = 2;
  for (const candidate of BUSINESS_OBJECTS) {
    if (candidate.length < 4) continue;
    if (Math.abs(candidate.length - token.length) > 1) continue;
    const d = levenshtein(token, candidate);
    if (d <= 1 && d < bestDistance) {
      best = candidate;
      bestDistance = d;
    }
  }
  return { canonical: best, typo: best !== null };
}

/** Return a canonical action-verb form for `token` via typo correction. */
export function canonActionVerb(token: string): {
  canonical: string | null;
  typo: boolean;
} {
  if (isActionVerb(token)) return { canonical: token, typo: false };
  if (token.length < 4 || VERB_CANON_BLOCKLIST.has(token)) {
    return { canonical: null, typo: false };
  }
  let best: string | null = null;
  let bestDistance = 3;
  for (const candidate of ACTION_VERBS) {
    if (candidate.length < 4) continue;
    if (Math.abs(candidate.length - token.length) > 2) continue;
    const d = levenshtein(token, candidate);
    if (d <= 2 && d < bestDistance) {
      best = candidate;
      bestDistance = d;
    }
  }
  return { canonical: best, typo: best !== null };
}

// ---------- Phrase / structural detectors ----------

const ANAPHORA_PHRASES = [
  "what about",
  "how about",
  "and the",
  "and that",
  "and those",
  "and this",
  "the same",
];

export function hasAnaphoraPhrase(raw: string): boolean {
  const lower = raw.toLowerCase();
  return ANAPHORA_PHRASES.some((p) => lower.includes(p));
}

const FOLLOW_UP_TOKENS = new Set([
  "which",
  "one",
  "that",
  "those",
  "first",
  "last",
  "same",
  "next",
]);

export function hasFollowUpToken(tokens: readonly string[]): boolean {
  return tokens.some((t) => FOLLOW_UP_TOKENS.has(t));
}

export function findMentionedEntity(
  raw: string,
  entities: readonly AuthorizedEntity[] | undefined,
): AuthorizedEntity | null {
  if (!entities || entities.length === 0) return null;
  const lower = raw.toLowerCase();
  for (const e of entities) {
    if (e.label.length < 3) continue;
    if (lower.includes(e.label.toLowerCase())) return e;
  }
  return null;
}

/** Split the raw message into clause strings on explicit conjunctions
 *  or semicolons. Returns [] when no split occurs. */
export function splitClauses(raw: string): readonly string[] {
  const parts = raw
    .split(/\s*[;&]\s*|\s+and\s+|\s+but\s+|\s+also\s+|\s*,\s*and\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length >= 2 ? parts : [];
}

/** Detect explicit multi-intent: two or more clauses each containing
 *  an action verb, with at least one clause also containing a business
 *  object. This catches "Show invoices and update Meridian" even when
 *  the second clause has no recognized entity. */
export function detectMultiIntentClauses(clauses: readonly string[]): boolean {
  if (clauses.length < 2) return false;
  let clausesWithVerb = 0;
  let clausesWithVerbAndObject = 0;
  for (const clause of clauses) {
    const tokens = tokenize(clause);
    const hasVerb = tokens.some((t) => {
      const v = canonActionVerb(t);
      return v.canonical !== null;
    });
    const hasObj = tokens.some((t) => {
      const o = canonBusinessObject(t);
      return o.canonical !== null;
    });
    if (hasVerb) {
      clausesWithVerb += 1;
      if (hasObj) clausesWithVerbAndObject += 1;
    }
  }
  return clausesWithVerb >= 2 && clausesWithVerbAndObject >= 1;
}

// ---------- Candidate scoring ----------

/** Build a score breakdown for one candidate tool against the message
 *  tokens. Returns raw score plus the reason codes that contributed. */
export function scoreCandidate(
  tool: AskToolName,
  tokens: readonly string[],
  rawMessage: string,
): { raw: number; signals: string[]; reasons: ReasonCode[] } {
  const keys = TOOL_KEYS[tool];
  let raw = 0;
  const signals: string[] = [];
  const reasons: ReasonCode[] = [];
  const normalizedMessage = rawMessage
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
  if (
    CANONICAL_PHRASES[tool]?.includes(normalizedMessage) ||
    (tool === "list_clients" && isClientListRequest(tokens))
  ) {
    raw += 20;
    signals.push(`exact_phrase:${normalizedMessage}`);
    reasons.push("exact_phrase");
  }

  // Unique-keyword coverage — exact and fuzzy (Levenshtein ≤ 1) matches.
  let commonHits = 0;
  let uniqueKwHits = 0;
  const kwMatched = new Set<string>();

  for (const token of tokens) {
    if (keys.includes(token)) {
      kwMatched.add(token);
      if (isCommonWord(token)) {
        commonHits += 1;
        if (commonHits <= 3) {
          raw += 2;
          signals.push(`common_kw:${token}`);
        }
      } else if (!isStopword(token)) {
        uniqueKwHits += 1;
        raw += 12;
        signals.push(`unique_kw:${token}`);
        if (!reasons.includes("unique_kw")) reasons.push("unique_kw");
      }
    }
  }

  // Fuzzy keyword match: token ≥ 4 chars within edit-distance 1 of a key.
  if (uniqueKwHits === 0) {
    for (const token of tokens) {
      if (token.length < 4 || kwMatched.has(token)) continue;
      if (isStopword(token)) continue;
      for (const key of keys) {
        if (key.length < 4) continue;
        if (Math.abs(key.length - token.length) > 1) continue;
        if (levenshtein(token, key) <= 1) {
          kwMatched.add(token);
          uniqueKwHits += 1;
          raw += 12;
          signals.push(`fuzzy_kw:${token}→${key}`);
          if (!reasons.includes("unique_kw")) reasons.push("unique_kw");
          break;
        }
      }
    }
  }

  if (commonHits > 0 && !reasons.includes("common_kw")) {
    reasons.push("common_kw");
  }

  const hasKwMatch = uniqueKwHits > 0 || commonHits > 0;

  // Action verb — bonus only when the tool's keywords contain an action
  // verb that also appears in the input tokens (tool-specific, not universal).
  let verbHits = 0;
  for (const token of tokens) {
    const v = canonActionVerb(token);
    if (v.canonical !== null) {
      verbHits += 1;
      if (v.typo) signals.push(`typo_canon:verb:${token}→${v.canonical}`);
    }
  }
  const kwHasVerb =
    hasKwMatch &&
    keys.some((k) => {
      const v = canonActionVerb(k);
      return v.canonical !== null && (tokens.includes(k) || kwMatched.has(k));
    });
  if (verbHits > 0) {
    signals.push("action_verb");
    reasons.push("action_verb");
  }
  if (kwHasVerb) {
    raw += 10;
  }

  // Business object — bonus only when the tool's keywords contain a
  // business object that also appears in the input tokens.
  let objectHits = 0;
  for (const token of tokens) {
    const o = canonBusinessObject(token);
    if (o.canonical !== null) {
      objectHits += 1;
      if (o.typo) signals.push(`typo_canon:obj:${token}→${o.canonical}`);
    }
  }
  const kwHasObj =
    hasKwMatch &&
    keys.some((k) => {
      const o = canonBusinessObject(k);
      return o.canonical !== null && (tokens.includes(k) || kwMatched.has(k));
    });
  if (objectHits > 0) {
    signals.push("business_object");
    reasons.push("business_object");
  }
  if (kwHasObj) {
    raw += 8;
  }

  // Typo-canonicalization of any token (beyond verb/object and fuzzy-kw)
  // against the tool's key set — rewards recovery of corrupted inputs.
  for (const token of tokens) {
    if (token.length < 4) continue;
    if (kwMatched.has(token)) continue;
    if (
      isActionVerb(token) ||
      isBusinessObject(token) ||
      isCommonWord(token) ||
      isStopword(token) ||
      isGreetingWord(token) ||
      isConversationalWord(token) ||
      canonActionVerb(token).canonical !== null ||
      canonBusinessObject(token).canonical !== null
    )
      continue;
    let hit = false;
    for (const key of keys) {
      if (key.length < 4) continue;
      if (key[0] !== token[0]) continue;
      if (Math.abs(key.length - token.length) > 2) continue;
      if (levenshtein(token, key) <= 2) {
        hit = true;
        break;
      }
    }
    if (hit) {
      raw += 7;
      signals.push(`typo_canon:key:${token}`);
      if (!reasons.includes("typo_canon")) reasons.push("typo_canon");
    }
  }

  // Adversarial / jailbreak language — suppresses confidence.
  const lower = rawMessage.toLowerCase();
  if (
    /ignore (your|all|the) (rules|instructions|safety)/.test(lower) ||
    /pretend (you('re| are))?/.test(lower) ||
    /jailbreak|system prompt/.test(lower)
  ) {
    raw = Math.min(raw, 5);
    signals.push("adversarial");
    reasons.push("adversarial");
  }

  return { raw, signals, reasons };
}

// ---------- Policy constants ----------

export const RAW_MAX = 40;
export const CONFIDENT_THRESHOLD = 50;
export const CLARIFY_THRESHOLD = 30;
export const WRITE_RISK_THRESHOLD = 80;
export const WINNER_MARGIN = 8;
export const CANDIDATE_CAP = 3;
export const MIN_CONFIDENT_RAW = 20;

export function normalizeConfidence(raw: number): number {
  if (raw <= 0) return 0;
  return Math.min(100, Math.round((raw / RAW_MAX) * 100));
}

export function bandOf(confidence: number): ConfidenceBand {
  if (confidence >= 80) return "high";
  if (confidence >= 50) return "medium";
  if (confidence >= 20) return "low";
  return "none";
}

// ---------- Candidate generation ----------

export interface CandidateSet {
  readonly candidates: readonly IntentCandidate[];
  readonly reasonsByTool: ReadonlyMap<AskToolName, readonly ReasonCode[]>;
  readonly signalsByTool: ReadonlyMap<AskToolName, readonly string[]>;
}

export function generateCandidates(
  tokens: readonly string[],
  rawMessage: string,
  ctx: IntentClassifierContext,
): CandidateSet {
  const permitted: ReadonlySet<AskToolName> | null = ctx.permittedTools
    ? new Set(ctx.permittedTools)
    : null;

  const reasonsByTool = new Map<AskToolName, readonly ReasonCode[]>();
  const signalsByTool = new Map<AskToolName, readonly string[]>();

  const raw: IntentCandidate[] = ASK_TOOL_NAMES.map((tool) => {
    const {
      raw: score,
      signals,
      reasons,
    } = scoreCandidate(tool, tokens, rawMessage);
    const confidence = normalizeConfidence(score);
    reasonsByTool.set(tool, reasons);
    signalsByTool.set(tool, signals);
    return {
      tool,
      score,
      confidence,
      band: bandOf(confidence),
      signals,
      permitted: permitted ? permitted.has(tool) : true,
      writeRisk: isWriteRiskTool(tool),
    };
  });

  const sorted = [...raw].sort(
    (a, b) => b.confidence - a.confidence || b.score - a.score,
  );
  return {
    candidates: sorted.slice(0, CANDIDATE_CAP * 2),
    reasonsByTool,
    signalsByTool,
  };
}
