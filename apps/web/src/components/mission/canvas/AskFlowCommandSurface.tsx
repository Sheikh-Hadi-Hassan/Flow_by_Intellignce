"use client";

import {
  ChevronDown,
  LayoutGrid,
  Maximize2,
  Mic,
  Minimize2,
  Sparkles,
} from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import type {
  AskFlowContext,
  AskFlowSuggestion,
} from "../../../lib/mission-control/types";
import { AuthorityNote, ContextReceipt } from "../ContextReceipt";

/** The two prompts the dock shows at rest; both live in the seed with sourced
 * answers, so a chip press produces the same evidence-backed response as
 * typing the question would. */
const CHIP_IDS = ["ask-exposure", "ask-approvals"] as const;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The Ask Flow command dock, rebuilt on the reference: a medium-neutral
 * housing holding two suggestion chips over a near-black command bar with a
 * full-height accent intelligence tile on the left and outlined voice and
 * action controls on the right. The expanded conversation opens upward,
 * stays attached, and keeps the evidence receipts; a full-screen transition
 * is one control away.
 */
export function AskFlowCommandSurface({
  context,
  open,
  onOpenChange,
}: {
  context: AskFlowContext;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [selected, setSelected] = useState<AskFlowSuggestion | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [listening, setListening] = useState(false);
  const panelId = useId();
  const dockRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLButtonElement>(null);
  const originRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  const chips = CHIP_IDS.map((id) =>
    context.suggestions.find((suggestion) => suggestion.id === id),
  ).filter((suggestion): suggestion is AskFlowSuggestion => Boolean(suggestion));

  useEffect(() => {
    if (!open) {
      setFullscreen(false);
      setListening(false);
      if (!wasOpenRef.current) return;
      wasOpenRef.current = false;
      const origin = originRef.current;
      originRef.current = null;
      const frame = window.requestAnimationFrame(() => {
        const target =
          origin?.isConnected && origin !== document.body
            ? origin
            : promptRef.current;
        target?.focus();
      });
      return () => window.cancelAnimationFrame(frame);
    }

    wasOpenRef.current = true;
    if (
      !originRef.current &&
      document.activeElement instanceof HTMLElement &&
      document.activeElement !== document.body
    ) {
      originRef.current = document.activeElement;
    }
    inputRef.current?.focus();

    const root = dockRef.current;
    if (!root) return;

    const focusable = () =>
      [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => {
        const style = getComputedStyle(el);
        return style.visibility !== "hidden" && style.display !== "none";
      });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement;
      if (!root.contains(active)) {
        event.preventDefault();
        first.focus();
        return;
      }
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, onOpenChange]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel || !open) return;
    if (window.matchMedia("(max-width: 720px)").matches) {
      panel.style.height = "";
      panel.style.maxHeight = "";
      return;
    }
    const viewBottom = document.documentElement.clientHeight - 8;
    if (fullscreen) {
      panel.style.height = "";
      panel.style.maxHeight = "";
      return;
    }
    panel.style.height = "";
    const dockTop = dockRef.current?.getBoundingClientRect().top ?? 160;
    const headerBottom =
      document.querySelector(".flow-canvas-head")?.getBoundingClientRect()
        .bottom ?? 48;
    panel.style.maxHeight = `${Math.max(160, Math.floor(Math.min(dockTop - headerBottom - 12, viewBottom - headerBottom)))}px`;
  }, [open, fullscreen, selected]);

  useEffect(() => {
    if (!open || !window.matchMedia("(max-width: 720px)").matches) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const openWith = (suggestion: AskFlowSuggestion, origin: HTMLElement) => {
    originRef.current = origin;
    setSelected(suggestion);
    onOpenChange(true);
  };

  const dockClass = [
    "flow-canvas-dock",
    open ? "flow-canvas-dock--open" : "",
    fullscreen ? "flow-canvas-dock--full" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={dockClass} ref={dockRef}>
      {open ? (
        <div className="flow-canvas-dock__panel" id={panelId} ref={panelRef}>
          <div className="flow-canvas-dock__panel-head">
            <span className="flow-canvas-dock__panel-scope">
              {context.workspaceLabel} · {context.scopeLabel}
            </span>
            <span className="flow-canvas-dock__panel-tools">
              {context.tools.map((tool, index) => (
                <span key={tool.id} className="flow-canvas-dock__tool">
                  {index > 0 ? <span aria-hidden="true"> · </span> : null}
                  {tool.label}
                </span>
              ))}
            </span>
            <button
              type="button"
              className="flow-canvas-dock__panel-control flow-canvas-dock__panel-control--full"
              aria-label={
                fullscreen ? "Exit full screen" : "Open Ask Flow full screen"
              }
              onClick={() => setFullscreen((value) => !value)}
            >
              {fullscreen ? (
                <Minimize2 size={14} aria-hidden />
              ) : (
                <Maximize2 size={14} aria-hidden />
              )}
            </button>
            <button
              type="button"
              className="flow-canvas-dock__panel-control"
              aria-label="Collapse Ask Flow"
              onClick={() => onOpenChange(false)}
            >
              <ChevronDown size={14} aria-hidden />
            </button>
          </div>

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
            <p className="flow-canvas-dock__heading">Try asking</p>
            <ul className="flow-canvas-dock__suggestions">
              {context.suggestions.map((suggestion) => (
                <li key={suggestion.id}>
                  <button
                    type="button"
                    className="flow-canvas-dock__suggestion"
                    onClick={() => setSelected(suggestion)}
                  >
                    <span className="flow-canvas-dock__suggestion-prompt">
                      {suggestion.prompt}
                    </span>
                    <span className="flow-canvas-dock__suggestion-answer">
                      {suggestion.answerPreview}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <AuthorityNote authority={context.authority} />
        </div>
      ) : null}

      <div className="flow-canvas-dock__housing">
        <div className="flow-canvas-dock__chips">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className="flow-canvas-dock__chip"
              onClick={(event) => openWith(chip, event.currentTarget)}
            >
              <span className="flow-canvas-dock__chip-text">{chip.prompt}</span>
              <span className="flow-canvas-dock__chip-mark" aria-hidden>
                →
              </span>
            </button>
          ))}
        </div>

        <div className="flow-canvas-dock__bar">
          <span className="flow-canvas-dock__tile" aria-hidden>
            <Sparkles size={20} />
          </span>

          {open ? (
            <input
              ref={inputRef}
              type="text"
              className="flow-canvas-dock__input"
              placeholder="Ask anything or search"
              aria-label="Ask anything or search"
            />
          ) : (
            <button
              ref={promptRef}
              type="button"
              className="flow-canvas-dock__prompt"
              aria-expanded={false}
              aria-controls={panelId}
              onClick={() => {
                originRef.current = promptRef.current;
                onOpenChange(true);
              }}
            >
              Ask anything or search
            </button>
          )}

          <button
            type="button"
            className={
              listening
                ? "flow-canvas-dock__action flow-canvas-dock__action--live"
                : "flow-canvas-dock__action"
            }
            aria-label={listening ? "Stop listening" : "Ask with voice"}
            aria-pressed={listening}
            onClick={() => setListening((value) => !value)}
          >
            <Mic size={15} aria-hidden />
          </button>
          <button
            type="button"
            className="flow-canvas-dock__action"
            aria-label="Browse available actions"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => onOpenChange(!open)}
          >
            <LayoutGrid size={15} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
