"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  answerAskFlow,
  listSupportedIntents,
  type AskFlowIntent,
  type AskFlowResponse,
} from "../../lib/experience/ask-flow";
import { useCommercialClient } from "../../lib/commercial/use-commercial";
import type { OpportunityRecord } from "../../lib/commercial/api";
import { useWorkspaceSessionActions } from "../../lib/workspace/session-actions";
import { IconButton } from "../ui/Button";
import { ProofLabel, StatusBadge } from "../ui/Display";

const INTENT_LABELS: Record<AskFlowIntent, string> = {
  summarize_opportunity: "Summarize opportunity",
  missing_discovery: "Missing discovery",
  explain_calculation: "Explain calculation",
  summarize_brief: "Summarize brief",
  project_risks: "Project risks",
  capacity_conflict: "Capacity conflict",
  next_action: "Next action",
  twin_summary: "Business Twin",
};

export function AskFlowDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const workspace = useParams().workspace as string;
  const api = useCommercialClient(workspace);
  const { session } = useWorkspaceSessionActions(workspace);
  const [rows, setRows] = useState<OpportunityRecord[]>([]);
  const [intent, setIntent] = useState<AskFlowIntent | null>(null);
  const [response, setResponse] = useState<AskFlowResponse | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!api || !open) return;
    void api.listOpportunities().then(setRows);
  }, [api, open]);

  useEffect(() => {
    if (!open) {
      setIntent(null);
      setResponse(null);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLElement>("button")?.focus();
  }, [open]);

  const runIntent = (next: AskFlowIntent) => {
    setIntent(next);
    const twinSummary = session?.twin
      ? `${session.twin.businessName} — ${session.twin.classification}, ${session.twin.services.length} services, ${session.twin.completeness}% complete.`
      : undefined;
    setResponse(
      answerAskFlow({
        intent: next,
        workspace,
        opportunities: rows,
        ...(twinSummary ? { twinSummary } : {}),
      }),
    );
  };

  if (!open) return null;

  return (
    <div
      className={`flow-ask-drawer flow-ask-drawer--open`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ask-flow-title"
    >
      <button
        type="button"
        className="flow-ask-drawer__backdrop"
        aria-label="Close Ask Flow"
        onClick={onClose}
      />
      <div className="flow-ask-drawer__panel" ref={panelRef}>
        <header className="flow-ask-drawer__header">
          <h2 id="ask-flow-title" className="flow-ask-drawer__title">
            <Sparkles size={16} aria-hidden />
            Ask Flow
          </h2>
          <IconButton label="Close Ask Flow" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </header>
        <div className="flow-ask-drawer__body">
          <p className="flow-muted">
            Governed answers from stored workspace data. Recommendations only —
            no silent changes.
          </p>
          <ul className="flow-ask-intents" aria-label="Supported intents">
            {listSupportedIntents().map((id) => (
              <li key={id}>
                <button
                  type="button"
                  aria-pressed={intent === id}
                  onClick={() => runIntent(id)}
                >
                  {INTENT_LABELS[id]}
                </button>
              </li>
            ))}
          </ul>
          {response ? (
            <article className="flow-ask-response" aria-live="polite">
              <p className="flow-ask-response__answer">{response.answer}</p>
              <p className="flow-ask-response__meta">
                <ProofLabel type="fact">Proof</ProofLabel> {response.proof}
              </p>
              {response.limitation ? (
                <p className="flow-ask-response__meta">
                  Limitation: {response.limitation}
                </p>
              ) : null}
              {response.recommendedAction ? (
                <p className="flow-ask-response__meta">
                  Recommended: {response.recommendedAction}
                </p>
              ) : null}
              {response.guardRequired ? (
                <StatusBadge variant="warning">Guard approval required</StatusBadge>
              ) : null}
              {response.records.length > 0 ? (
                <div className="flow-ask-response__records">
                  {response.records.map((rec) => (
                    <Link
                      key={rec.href}
                      href={rec.href}
                      className="flow-btn flow-btn--secondary flow-btn--sm"
                      onClick={onClose}
                    >
                      {rec.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </article>
          ) : (
            <p className="flow-muted">Choose an intent to get an evidence-backed answer.</p>
          )}
        </div>
      </div>
    </div>
  );
}
