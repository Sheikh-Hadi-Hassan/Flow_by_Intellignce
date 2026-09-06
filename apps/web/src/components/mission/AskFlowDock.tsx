"use client";

import { ChevronDown, Mic, Sparkles } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import type { AskFlowContext, AskFlowSuggestion } from "../../lib/mission-control/types";
import { IconButton } from "../ui/Button";
import { AuthorityNote, ContextReceipt } from "./ContextReceipt";

/**
 * Docked command bar. Collapsed it states scope and authority; expanded it
 * becomes a conversation surface. Every suggested answer carries its source,
 * so the dock never asserts anything it cannot attribute.
 */
export function AskFlowDock({
  context,
  open,
  onOpenChange,
}: {
  context: AskFlowContext;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [selected, setSelected] = useState<AskFlowSuggestion | null>(null);
  const panelId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  return (
    <div className="flow-mc-dock">
      {open ? (
        <div className="flow-mc-dock__panel" id={panelId}>
          <div className="flow-mc-dock__panel-inner">
            <AuthorityNote authority={context.authority} />

            {selected ? (
              <div className="flow-ask-response">
                <p className="flow-ask-response__answer">{selected.prompt}</p>
                <p className="flow-ask-response__answer">
                  {selected.answerPreview}
                </p>
                <ContextReceipt
                  evidence={[selected.evidence]}
                  heading="Answered from"
                />
              </div>
            ) : null}

            <div>
              <p className="flow-mc-block__title" style={{ marginBottom: "var(--space-2)" }}>
                Try asking
              </p>
              <ul className="flow-mc-dock__suggestions">
                {context.suggestions.map((suggestion) => (
                  <li key={suggestion.id}>
                    <button
                      type="button"
                      className="flow-mc-dock__suggestion"
                      onClick={() => setSelected(suggestion)}
                    >
                      <span className="flow-mc-dock__suggestion-prompt">
                        {suggestion.prompt}
                      </span>
                      <span className="flow-mc-dock__suggestion-answer">
                        {suggestion.answerPreview}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flow-mc-dock__inner">
        {open ? (
          <>
            <Sparkles size={16} aria-hidden style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              className="flow-input"
              placeholder="Ask anything or search"
              aria-label="Ask anything or search"
              style={{ borderRadius: "var(--radius-full)" }}
            />
          </>
        ) : (
          <button
            type="button"
            className="flow-mc-dock__prompt"
            aria-expanded={false}
            aria-controls={panelId}
            onClick={() => onOpenChange(true)}
          >
            <Sparkles size={16} aria-hidden />
            <span className="flow-mc-dock__prompt-text">
              Ask anything or search
            </span>
          </button>
        )}

        <IconButton label="Ask with voice">
          <Mic size={18} aria-hidden />
        </IconButton>

        <div className="flow-mc-dock__context">
          <span>{context.scopeLabel}</span>
          <span className="flow-mc-dock__tools" aria-label="Available tools">
            {context.tools.map((tool) => (
              <span key={tool.id} className="flow-mc-dock__tool">
                {tool.label}
              </span>
            ))}
          </span>
        </div>

        {open ? (
          <IconButton
            label="Collapse Ask Flow"
            onClick={() => onOpenChange(false)}
          >
            <ChevronDown size={18} aria-hidden />
          </IconButton>
        ) : null}
      </div>
    </div>
  );
}
