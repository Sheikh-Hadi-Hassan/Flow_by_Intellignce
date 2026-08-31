"use client";

import { Sparkles } from "lucide-react";

export interface CopilotHintsProps {
  readonly changed?: string;
  readonly recommended?: string;
  readonly risk?: string;
}

export function CopilotHints({ changed, recommended, risk }: CopilotHintsProps) {
  if (!changed && !recommended && !risk) return null;

  return (
    <aside className="flow-copilot" aria-label="Flow copilot context">
      <div className="flow-copilot__header">
        <Sparkles size={14} aria-hidden />
        <span>Ask Flow</span>
      </div>
      <dl className="flow-copilot__list">
        {changed ? (
          <div className="flow-copilot__item">
            <dt>What changed</dt>
            <dd>{changed}</dd>
          </div>
        ) : null}
        {recommended ? (
          <div className="flow-copilot__item">
            <dt>Why recommended</dt>
            <dd>{recommended}</dd>
          </div>
        ) : null}
        {risk ? (
          <div className="flow-copilot__item flow-copilot__item--risk">
            <dt>What&apos;s the risk</dt>
            <dd>{risk}</dd>
          </div>
        ) : null}
      </dl>
    </aside>
  );
}
