import type { AskToolName } from "./types";
import { humanToolChoiceLabel } from "./ask-tool-labels";
import { tPhrase } from "./phrases";
import type {
  IntentCandidate,
  IntentClarification,
  IntentClassifierContext,
  IntentResult,
  ReasonCode,
} from "./intent-types";
import {
  CANDIDATE_CAP,
  CLARIFY_THRESHOLD,
  CONFIDENT_THRESHOLD,
  WINNER_MARGIN,
  canonBusinessObject,
  detectMultiIntentClauses,
  findMentionedEntity,
  generateCandidates,
  hasAnaphoraPhrase,
  hasFollowUpToken,
  isActionVerb,
  isBusinessObject,
  isCommonWord,
  isConversationalWord,
  isGreetingWord,
  isStopword,
  splitClauses,
  tokenize,
} from "./intent-signals";

// ---------- Structural detectors ----------

function isGreetingMessage(tokens: readonly string[]): boolean {
  if (tokens.length === 0) return false;
  if (tokens.length > 4) return false;
  return tokens.every((t) => isGreetingWord(t) || isConversationalWord(t));
}

function isConversationalOnly(tokens: readonly string[]): boolean {
  if (tokens.length === 0) return false;
  if (tokens.length > 5) return false;
  return tokens.every(
    (t) =>
      !isActionVerb(t) &&
      !isBusinessObject(t) &&
      (isGreetingWord(t) ||
        isConversationalWord(t) ||
        isCommonWord(t) ||
        isStopword(t)),
  );
}

interface CommandShape {
  actionVerbs: readonly string[];
  businessObjects: readonly string[];
  hasAnyContent: boolean;
}

function commandShape(tokens: readonly string[]): CommandShape {
  const actionVerbs: string[] = [];
  const businessObjects: string[] = [];
  for (const token of tokens) {
    if (isActionVerb(token)) actionVerbs.push(token);
    if (isBusinessObject(token)) businessObjects.push(token);
  }
  const hasAnyContent =
    actionVerbs.length > 0 ||
    businessObjects.length > 0 ||
    tokens.some(
      (t) => !isCommonWord(t) && !isStopword(t) && !isGreetingWord(t),
    );
  return { actionVerbs, businessObjects, hasAnyContent };
}

function isIncompleteCommand(shape: CommandShape): boolean {
  const hasVerb = shape.actionVerbs.length > 0;
  const hasObject = shape.businessObjects.length > 0;
  if (!hasVerb && !hasObject) return shape.hasAnyContent;
  if (hasVerb && !hasObject) return true;
  if (!hasVerb && hasObject) return true;
  return false;
}

// ---------- Follow-up validation ----------

interface FollowUpValidation {
  valid: boolean;
  reason?: ReasonCode;
}

function validateFollowUp(
  rawMessage: string,
  tokens: readonly string[],
  topCandidate: IntentCandidate | undefined,
  ctx: IntentClassifierContext,
): FollowUpValidation {
  const prev = ctx.lastConfirmedTool ?? null;
  const lastConfirmed = ctx.lastConfirmed !== false;
  if (!prev || !lastConfirmed) return { valid: false };

  const hasAnaphora = hasAnaphoraPhrase(rawMessage);
  const hasFollowUp = hasFollowUpToken(tokens);
  const entity = findMentionedEntity(rawMessage, ctx.authorizedEntities);
  const trigger = hasAnaphora || hasFollowUp || entity !== null;
  if (!trigger) return { valid: false };

  // Conflicting business object — message is about a different domain.
  const prevDomain = domainOfTool(prev);
  if (prevDomain) {
    for (const token of tokens) {
      const o = canonBusinessObject(token);
      if (
        o.canonical &&
        domainOfObject(o.canonical) &&
        domainOfObject(o.canonical) !== prevDomain
      ) {
        return { valid: false };
      }
    }
  }

  // If the new message has its own strong candidate, defer to that.
  if (topCandidate && topCandidate.confidence >= CONFIDENT_THRESHOLD) {
    return { valid: false };
  }

  return { valid: true, reason: "follow_up" };
}

function domainOfTool(tool: AskToolName): string | null {
  if (
    tool === "list_clients" ||
    tool.startsWith("list_client_") ||
    tool.startsWith("get_client_") ||
    tool.startsWith("search_clients") ||
    tool.startsWith("summarize_client_") ||
    tool.startsWith("explain_client_") ||
    tool.startsWith("find_duplicate_") ||
    tool.startsWith("list_inactive_") ||
    tool.startsWith("list_clients_") ||
    tool.startsWith("analyze_client_") ||
    tool.startsWith("propose_client_") ||
    tool.startsWith("propose_duplicate_")
  ) {
    return "client";
  }
  if (tool.startsWith("list_projects") || tool.startsWith("get_project_"))
    return "project";
  if (tool.startsWith("list_overdue_invoices")) return "invoice";
  if (tool.startsWith("get_pipeline_")) return "pipeline";
  if (tool.startsWith("list_pending_approvals")) return "approval";
  if (tool.startsWith("get_team_capacity")) return "capacity";
  if (tool.startsWith("explain_open_exposure")) return "exposure";
  if (tool.startsWith("get_today_sales_update")) return "sales";
  if (tool.startsWith("get_workspace_")) return "workspace";
  if (
    tool.startsWith("get_business_") ||
    tool.startsWith("list_business_") ||
    tool.startsWith("list_authorised_") ||
    tool.startsWith("list_expiring_") ||
    tool.startsWith("list_compliance_") ||
    tool.startsWith("explain_business_") ||
    tool.startsWith("propose_business_") ||
    tool.startsWith("propose_location_")
  ) {
    return "business";
  }
  return null;
}

function domainOfObject(obj: string): string | null {
  if (
    [
      "client",
      "customer",
      "segment",
      "duplicate",
      "inactive",
      "dormant",
      "health",
    ].includes(obj)
  ) {
    return "client";
  }
  if (["project"].includes(obj)) return "project";
  if (["invoice", "overdue", "receivable"].includes(obj)) return "invoice";
  if (["pipeline", "opportunity"].includes(obj)) return "pipeline";
  if (["approval"].includes(obj)) return "approval";
  if (["capacity", "team", "workload"].includes(obj)) return "capacity";
  if (["exposure", "exposed", "risk"].includes(obj)) return "exposure";
  if (["sales", "revenue"].includes(obj)) return "sales";
  if (["workspace", "summary", "status"].includes(obj)) return "workspace";
  if (
    [
      "registration",
      "location",
      "signatory",
      "document",
      "compliance",
      "firmographic",
      "structure",
      "company",
      "profile",
      "office",
    ].includes(obj)
  ) {
    return "business";
  }
  return null;
}

// ---------- Result builders ----------

function buildResult(args: {
  outcome: IntentResult["outcome"];
  selectedTool: AskToolName | null;
  candidates: readonly IntentCandidate[];
  reasonCodes: readonly ReasonCode[];
  clarification?: IntentClarification | null;
  followUpFrom?: AskToolName | null;
}): IntentResult {
  const permitted = args.candidates.filter((c) => c.permitted);
  const top = permitted[0] ?? args.candidates[0] ?? null;
  const runner = permitted[1] ?? args.candidates[1] ?? null;
  const winnerMargin =
    top && runner ? top.score - runner.score : (top?.score ?? 0);
  const confidence = args.selectedTool
    ? (args.candidates.find((c) => c.tool === args.selectedTool)?.confidence ??
      top?.confidence ??
      0)
    : (top?.confidence ?? 0);
  const band =
    confidence >= 80
      ? "high"
      : confidence >= 50
        ? "medium"
        : confidence >= 20
          ? "low"
          : "none";
  const resultCandidates = (
    args.candidates.filter((c) => c.permitted).length > 0
      ? args.candidates.filter((c) => c.permitted)
      : args.candidates
  ).slice(0, CANDIDATE_CAP);
  return {
    outcome: args.outcome,
    selectedTool: args.selectedTool,
    confidence,
    band,
    candidates: resultCandidates,
    winnerMargin,
    reasonCodes: args.reasonCodes,
    clarification: args.clarification ?? null,
    followUpFrom: args.followUpFrom ?? null,
  };
}

function clarificationFromCandidates(
  candidates: readonly IntentCandidate[],
  question: string,
): IntentClarification {
  const top = candidates.filter((c) => c.permitted).slice(0, CANDIDATE_CAP);
  const choices = top.map((c) => ({
    id: c.tool,
    label: humanToolChoiceLabel(c.tool),
    tool: c.tool,
  }));
  return { question, choices };
}

// ---------- Main classifier ----------

export function classifyIntent(
  rawMessage: string,
  ctx: IntentClassifierContext = {},
): IntentResult {
  const tokens = tokenize(rawMessage);
  const language = ctx.answerLanguage ?? "en";

  // 1. Empty
  if (tokens.length === 0) {
    return buildResult({
      outcome: "out_of_domain",
      selectedTool: null,
      candidates: [],
      reasonCodes: ["empty"],
    });
  }

  // 2. Greeting
  if (isGreetingMessage(tokens)) {
    return buildResult({
      outcome: "out_of_domain",
      selectedTool: null,
      candidates: [],
      reasonCodes: ["greeting"],
    });
  }

  // 3. Conversational only ("help me", "thanks", "ok")
  if (isConversationalOnly(tokens)) {
    return buildResult({
      outcome: "out_of_domain",
      selectedTool: null,
      candidates: [],
      reasonCodes: ["conversational"],
    });
  }

  // 4. Multi-intent detection via explicit conjunctions/clauses.
  const clauses = splitClauses(rawMessage);
  if (detectMultiIntentClauses(clauses)) {
    const set = generateCandidates(tokens, rawMessage, ctx);
    return buildResult({
      outcome: "multiple_intents",
      selectedTool: null,
      candidates: set.candidates,
      reasonCodes: ["multi_intent"],
      clarification: clarificationFromCandidates(
        set.candidates,
        tPhrase("clarify.multiIntent", language),
      ),
    });
  }

  // 5. Generate + score candidates.
  const set = generateCandidates(tokens, rawMessage, ctx);
  const shape = commandShape(tokens);
  const permitted = set.candidates.filter((c) => c.permitted);
  const top = permitted[0];
  const runner = permitted[1];

  // 6. Adversarial input collapses to unsupported regardless of score.
  const anyAdversarial = set.candidates.some((c) =>
    (set.signalsByTool.get(c.tool) ?? []).includes("adversarial"),
  );
  if (anyAdversarial) {
    return buildResult({
      outcome: "unsupported",
      selectedTool: null,
      candidates: set.candidates,
      reasonCodes: ["adversarial", "no_candidate"],
    });
  }

  // 7. Follow-up validation — must run before incomplete-command so that
  //    "What about Meridian?" is rescued even though it looks incomplete.
  const followUp = validateFollowUp(rawMessage, tokens, top, ctx);

  // 8. Incomplete-command short-circuit — must NOT auto-select a tool
  //    unless the top candidate is already confident on its own merits.
  //    Skipped when the query is a valid follow-up (entity/anaphora rescue).
  if (!followUp.valid && isIncompleteCommand(shape)) {
    const hasRealRunner = runner && runner.score > 0;
    const rawMargin =
      hasRealRunner && top ? top.score - runner.score : (top?.score ?? 0);
    const marginPasses = hasRealRunner
      ? rawMargin >= WINNER_MARGIN
      : tokens.length > 1;
    const isConfident =
      top &&
      top.confidence >= CONFIDENT_THRESHOLD &&
      marginPasses &&
      (!top.writeRisk || top.confidence >= 80);
    if (!isConfident) {
      const reasons: ReasonCode[] = ["incomplete_command"];
      if (shape.actionVerbs.length > 0 && shape.businessObjects.length === 0) {
        reasons.push("no_business_object");
      }
      if (shape.businessObjects.length > 0 && shape.actionVerbs.length === 0) {
        reasons.push("no_action_verb");
      }

      // Verb without object — always clarify (clear user intent).
      if (shape.actionVerbs.length > 0 && shape.businessObjects.length === 0) {
        const verb = shape.actionVerbs[0] ?? "";
        return buildResult({
          outcome: "clarification_required",
          selectedTool: null,
          candidates: set.candidates,
          reasonCodes: reasons,
          clarification: clarificationFromCandidates(
            set.candidates,
            tPhrase("clarify.verbObject", language, { verb }),
          ),
        });
      }

      // Object without verb — clarify only when candidates are meaningful.
      if (
        permitted.length === 0 ||
        (top && top.confidence < CLARIFY_THRESHOLD)
      ) {
        return buildResult({
          outcome: "unsupported",
          selectedTool: null,
          candidates: set.candidates,
          reasonCodes: [...reasons, "no_candidate"],
        });
      }

      const obj = shape.businessObjects[0] ?? "";
      return buildResult({
        outcome: "clarification_required",
        selectedTool: null,
        candidates: set.candidates,
        reasonCodes: reasons,
        clarification: clarificationFromCandidates(
          set.candidates,
          tPhrase("clarify.objectOnly", language, { obj }),
        ),
      });
    }
  }

  // 9. No meaningful content (all stopwords) but not caught above.
  if (!shape.hasAnyContent) {
    return buildResult({
      outcome: "out_of_domain",
      selectedTool: null,
      candidates: [],
      reasonCodes: ["conversational"],
    });
  }

  // 10. No permitted candidates.
  if (!top) {
    const reasons: ReasonCode[] =
      set.candidates.length > 0 && set.candidates.some((c) => !c.permitted)
        ? ["perm_denied"]
        : ["no_candidate"];
    return buildResult({
      outcome: "unsupported",
      selectedTool: null,
      candidates: set.candidates,
      reasonCodes: reasons,
    });
  }

  // 11. Follow-up rescue: low-confidence new message + genuine follow-up.
  if (
    followUp.valid &&
    ctx.lastConfirmedTool &&
    top.confidence < CONFIDENT_THRESHOLD
  ) {
    return buildResult({
      outcome: "confident_match",
      selectedTool: ctx.lastConfirmedTool,
      candidates: set.candidates,
      reasonCodes: [
        ...(set.reasonsByTool.get(ctx.lastConfirmedTool) ?? []),
        "follow_up",
      ],
      followUpFrom: ctx.lastConfirmedTool,
    });
  }

  // 12. Margin + threshold check — use raw scores for margin to avoid
  //     normalization capping hiding real score differences.
  const rawMargin = runner ? top.score - runner.score : top.score;
  const meetsThreshold = top.confidence >= CONFIDENT_THRESHOLD;
  const meetsMargin = rawMargin >= WINNER_MARGIN;
  const meetsWriteRisk = !top.writeRisk || top.confidence >= 80;

  if (meetsThreshold && meetsMargin && meetsWriteRisk) {
    return buildResult({
      outcome: "confident_match",
      selectedTool: top.tool,
      candidates: set.candidates,
      reasonCodes: set.reasonsByTool.get(top.tool) ?? [],
    });
  }

  // 13. Write-risk without sufficient confidence → clarification.
  if (
    top.writeRisk &&
    top.confidence < 80 &&
    top.confidence >= CLARIFY_THRESHOLD
  ) {
    return buildResult({
      outcome: "clarification_required",
      selectedTool: null,
      candidates: set.candidates,
      reasonCodes: [...(set.reasonsByTool.get(top.tool) ?? []), "write_risk"],
      clarification: clarificationFromCandidates(
        set.candidates,
        tPhrase("clarify.writeRisk", language),
      ),
    });
  }

  // 14. Below threshold or tight margin → clarification.
  if (top.confidence >= CLARIFY_THRESHOLD) {
    const reasons: ReasonCode[] = [...(set.reasonsByTool.get(top.tool) ?? [])];
    if (!meetsMargin) reasons.push("margin");
    return buildResult({
      outcome: "clarification_required",
      selectedTool: null,
      candidates: set.candidates,
      reasonCodes: reasons,
      clarification: clarificationFromCandidates(
        set.candidates,
        tPhrase("clarify.foundFew", language),
      ),
    });
  }

  // 15. Below clarify threshold — unsupported.
  return buildResult({
    outcome: "unsupported",
    selectedTool: null,
    candidates: set.candidates,
    reasonCodes: ["no_candidate"],
  });
}
