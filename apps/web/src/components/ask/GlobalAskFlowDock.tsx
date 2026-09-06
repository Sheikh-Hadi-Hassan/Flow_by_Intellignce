"use client";

import {
  ArrowUp,
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  LayoutGrid,
  Maximize2,
  Mic,
  Minimize2,
  RefreshCw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { askPlaceholder } from "../../lib/ask-flow/placeholder";
import {
  askPhaseLabel,
  isAskBusy,
  isAskError,
} from "../../lib/ask-flow/ui-state";
import { formatMoney } from "../../lib/mission-control/format";
import {
  playInteractionSoundLazy,
  warmInteractionSound,
} from "../../lib/sound/lazy";
import { ContextReceipt } from "../mission/ContextReceipt";
import { AskResponse } from "./AskResponse";
import { useAskFlow } from "./AskFlowProvider";
import { useAskVoiceSession } from "./use-ask-voice";

const VoiceSurface = dynamic(
  () => import("./VoiceSurface").then((mod) => mod.VoiceSurface),
  { ssr: false },
);

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function GlobalAskFlowDock() {
  const ask = useAskFlow();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [viewedVersion, setViewedVersion] = useState<Record<string, number>>(
    {},
  );
  const showPanel = ask.expanded || ask.fullscreen;
  const last = ask.conversation.turns[ask.conversation.turns.length - 1];
  const latest = last?.versions[last.versions.length - 1];
  const showingSuggestions =
    ask.suggestions.length > 0 && ask.draft.trim().length >= 2;
  const [askMetaReady, setAskMetaReady] = useState(false);
  const hasDraft = ask.draft.trim().length > 0;
  const busy = isAskBusy(ask.phase);
  const statusLabel = askPhaseLabel(ask.phase, ask.activeTool);
  const showStatus = statusLabel !== "" && !hasDraft;
  const pendingQuestion = busy ? ask.pendingQuestion : null;
  const pendingText =
    pendingQuestion !== null && ask.streamingText.length > 0
      ? ask.streamingText
      : null;
  const placeholder = useMemo(
    () => askPlaceholder(ask.context),
    [ask.context.route, ask.context.exposureMinor],
  );

  useEffect(() => {
    setAskMetaReady(true);
  }, []);

  const prevPhaseRef = useRef(ask.phase);
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = ask.phase;
    if (prev === ask.phase) return;
    if (isAskBusy(prev)) {
      if (ask.phase === "answered") {
        playInteractionSoundLazy("success");
      } else if (ask.phase === "asking_clarification") {
        playInteractionSoundLazy("warning");
      } else if (isAskError(ask.phase)) {
        playInteractionSoundLazy("error");
      }
    }
  }, [ask.phase]);

  useEffect(() => {
    const el = ask.composerRef.current;
    if (!el) return;
    const nativeSizing =
      typeof CSS !== "undefined" && CSS.supports("field-sizing", "content");
    if (!showPanel || nativeSizing) {
      el.style.height = "";
      return;
    }
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [ask.draft, showPanel, ask.composerRef]);

  const submitWithSound = (prompt?: string) => {
    if (!isAskBusy(ask.phase)) {
      playInteractionSoundLazy("send");
    }
    ask.submit(prompt);
  };

  const voice = useAskVoiceSession({
    setDraft: ask.setDraft,
    submit: submitWithSound,
  });
  const voiceActive =
    voice.voiceState === "ready" ||
    voice.voiceState === "listening" ||
    voice.voiceState === "processing";
  const getActivity = useCallback(
    () => voice.activityRef.current,
    [voice.activityRef],
  );
  const finishRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.scrollTop = panel.scrollHeight;
  }, [ask.conversation.turns, ask.streamingText, ask.phase]);

  useEffect(() => {
    if (!showPanel && !voiceActive) return;
    const root = rootRef.current;
    if (!root) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (voiceActive) {
          voice.cancel();
          ask.focusComposer();
          return;
        }
        ask.minimise();
        return;
      }
      if (!showPanel) return;
      if (!ask.fullscreen && !ask.expanded) return;
      if (event.key !== "Tab") return;
      const trapRoot = ask.fullscreen ? root : (panelRef.current ?? root);
      const items = [
        ...trapRoot.querySelectorAll<HTMLElement>(FOCUSABLE),
      ].filter((el) => getComputedStyle(el).display !== "none");
      if (items.length === 0) return;
      const first = items[0]!;
      const lastItem = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [
    showPanel,
    voiceActive,
    ask.fullscreen,
    ask.expanded,
    ask.minimise,
    ask.focusComposer,
    voice.cancel,
  ]);

  const prevVoiceActiveRef = useRef(false);
  useEffect(() => {
    const prev = prevVoiceActiveRef.current;
    prevVoiceActiveRef.current = voiceActive;
    if (voiceActive && !prev) {
      finishRef.current?.focus();
    } else if (!voiceActive && prev) {
      ask.focusComposer();
    }
  }, [voiceActive, ask.focusComposer]);

  const onComposerKey = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showingSuggestions && event.key === "ArrowDown") {
      event.preventDefault();
      ask.setSuggestionIndex(
        Math.min(ask.suggestions.length - 1, ask.suggestionIndex + 1),
      );
      return;
    }
    if (showingSuggestions && event.key === "ArrowUp") {
      event.preventDefault();
      ask.setSuggestionIndex(Math.max(0, ask.suggestionIndex - 1));
      return;
    }
    if (event.key === "Enter" && event.shiftKey) {
      if (!ask.expanded && !ask.fullscreen) {
        event.preventDefault();
      }
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      submitWithSound();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      if (showingSuggestions) {
        ask.dismissSuggestions();
        return;
      }
      if (!ask.draft.trim()) {
        ask.composerRef.current?.blur();
      }
      ask.minimise();
    }
  };

  return (
    <div
      ref={rootRef}
      onPointerDownCapture={warmInteractionSound}
      className={[
        "flow-ask-global",
        showPanel ? "flow-ask-global--open" : "",
        ask.fullscreen ? "flow-ask-global--full" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-testid="global-ask-flow"
      data-ask-phase={ask.phase}
      data-ask-route={ask.context.route}
      data-voice-state={voice.voiceState}
      data-ask-state={askMetaReady ? (ask.context.missionStateKind ?? "") : ""}
      data-ask-exposure={
        askMetaReady && ask.context.exposureMinor
          ? formatMoney({
              minor: ask.context.exposureMinor,
              currency: ask.context.currency,
            })
          : ""
      }
      data-ask-decisions={
        askMetaReady ? String(ask.context.decisionCount ?? 0) : ""
      }
    >
      {showPanel ? (
        <div
          ref={panelRef}
          className="flow-ask-global__panel"
          role="log"
          aria-live="polite"
        >
          <div className="flow-ask-global__panel-head">
            <span className="flow-ask-global__scope">
              {ask.context.route} · {ask.context.role}
            </span>
            <button
              type="button"
              className="flow-ask-global__icon"
              aria-label={
                ask.fullscreen
                  ? "Exit full screen"
                  : "Open Ask Flow full screen"
              }
              onClick={() => ask.setFullscreen(!ask.fullscreen)}
            >
              {ask.fullscreen ? (
                <Minimize2 size={14} aria-hidden />
              ) : (
                <Maximize2 size={14} aria-hidden />
              )}
            </button>
            <button
              type="button"
              className="flow-ask-global__icon"
              aria-label="Minimise Ask Flow"
              onClick={ask.minimise}
            >
              <ChevronDown size={14} aria-hidden />
            </button>
          </div>

          {ask.conversation.turns.map((turn) => {
            const latestIndex = turn.versions.length - 1;
            const selectedIndex = viewedVersion[turn.id] ?? latestIndex;
            const current = turn.versions[selectedIndex]!;
            const isLast = turn.id === last?.id;
            return (
              <article
                key={turn.id}
                className="flow-ask-global__turn"
                data-testid="ask-turn"
                data-ask-tool={turn.tool ?? ""}
              >
                <p className="flow-ask-global__question">{current.question}</p>
                {turn.versions.length > 1 ? (
                  <div
                    className="flow-ask-global__versions"
                    role="group"
                    aria-label="Answer versions"
                  >
                    {turn.versions.map((version, index) => (
                      <button
                        key={version.id}
                        type="button"
                        aria-pressed={index === selectedIndex}
                        onClick={() =>
                          setViewedVersion((currentMap) => ({
                            ...currentMap,
                            [turn.id]: index,
                          }))
                        }
                      >
                        Version {index + 1}
                      </button>
                    ))}
                  </div>
                ) : null}
                <p className="flow-ask-global__answer">
                  {current.stale ? (
                    <span className="flow-ask-global__stale">
                      Previous snapshot ·{" "}
                    </span>
                  ) : null}
                  {current.answer}
                </p>
                {current.widgets && current.widgets.length > 0 ? (
                  <AskResponse widgets={current.widgets} />
                ) : null}
                {current.evidence.length > 0 ? (
                  <ContextReceipt
                    evidence={current.evidence}
                    heading="Answered from"
                  />
                ) : null}
                {current.related.length > 0 ? (
                  <div className="flow-ask-global__related">
                    {current.related.map((record) => (
                      <a key={record.id} href={record.href}>
                        {record.label}
                      </a>
                    ))}
                  </div>
                ) : null}
                {current.actions.length > 0 ? (
                  <div className="flow-ask-global__follow">
                    {current.actions.map((action) =>
                      action.href ? (
                        <a key={action.id} href={action.href}>
                          {action.label}
                        </a>
                      ) : (
                        <span key={action.id}>{action.label}</span>
                      ),
                    )}
                  </div>
                ) : null}
                {current.clarification &&
                isLast &&
                ask.phase === "asking_clarification" ? (
                  <div className="flow-ask-global__choices">
                    {current.clarification.choices.map((choice) => (
                      <button
                        key={choice.id}
                        type="button"
                        onClick={() => ask.answerClarification(choice.id)}
                      >
                        {choice.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}

          {ask.failedQuestion ? (
            <div className="flow-ask-global__actions">
              <button type="button" onClick={ask.retry}>
                Retry
              </button>
            </div>
          ) : null}

          {latest ? (
            <div className="flow-ask-global__actions">
              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                  setEditText(latest.question);
                }}
              >
                Edit question
              </button>
              <button
                type="button"
                onClick={ask.regenerate}
                aria-label="Regenerate answer"
              >
                <RefreshCw size={13} aria-hidden />
                Regenerate
              </button>
              <button
                type="button"
                onClick={ask.copyLastAnswer}
                aria-label="Copy answer"
              >
                <Copy size={13} aria-hidden />
                Copy
              </button>
              <button
                type="button"
                aria-label="Helpful"
                aria-pressed={last?.feedback === "up"}
                onClick={() => ask.setFeedback("up")}
              >
                <ThumbsUp size={13} aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Not helpful"
                aria-pressed={last?.feedback === "down"}
                onClick={() => ask.setFeedback("down")}
              >
                <ThumbsDown size={13} aria-hidden />
              </button>
            </div>
          ) : null}

          {pendingQuestion ? (
            <article
              className="flow-ask-global__turn flow-ask-global__turn--pending"
              data-testid="ask-pending-turn"
              aria-busy="true"
            >
              <p className="flow-ask-global__question">{pendingQuestion}</p>
              {pendingText !== null ? (
                <p className="flow-ask-global__answer">
                  {pendingText}
                  <span className="flow-ask-global__caret" aria-hidden />
                </p>
              ) : (
                <div className="flow-ask-global__skeleton" aria-hidden="true">
                  <span className="flow-ask-global__skeleton-line" />
                  <span className="flow-ask-global__skeleton-line" />
                  <span className="flow-ask-global__skeleton-line flow-ask-global__skeleton-line--short" />
                </div>
              )}
            </article>
          ) : null}

          {editing ? (
            <form
              className="flow-ask-global__edit"
              onSubmit={(event) => {
                event.preventDefault();
                ask.editLastQuestion(editText);
                setEditing(false);
              }}
            >
              <label className="sr-only" htmlFor="ask-edit">
                Edit previous question
              </label>
              <input
                id="ask-edit"
                value={editText}
                onChange={(event) => setEditText(event.target.value)}
              />
              <button type="submit">Resubmit</button>
            </form>
          ) : null}
        </div>
      ) : null}

      <ul
        id={listId}
        className="flow-ask-global__suggestions"
        role="listbox"
        aria-label="Suggestions"
        aria-live="polite"
        hidden={!showingSuggestions}
      >
        {ask.suggestions.map((row, index) => (
          <li key={row.id}>
            <button
              type="button"
              role="option"
              aria-selected={index === ask.suggestionIndex}
              className={
                index === ask.suggestionIndex
                  ? "flow-ask-global__suggestion flow-ask-global__suggestion--on"
                  : "flow-ask-global__suggestion"
              }
              tabIndex={-1}
              onClick={() => submitWithSound(row.prompt)}
            >
              {row.prompt}
              {index === ask.suggestionIndex ? (
                <ArrowUpRight
                  className="flow-ask-global__suggestion-arrow"
                  size={14}
                  strokeWidth={1.75}
                  aria-hidden
                />
              ) : null}
            </button>
          </li>
        ))}
      </ul>

      {voice.notice ? (
        <p
          className="flow-ask-global__voice-note"
          role="status"
          data-testid="ask-voice-note"
        >
          {voice.notice}
        </p>
      ) : null}

      <div className="flow-ask-global__dock" data-testid="ask-dock">
        {voiceActive ? (
          <div className="flow-ask-global__voice-row">
            <div className="flow-ask-global__zone flow-ask-global__zone--start">
              <button
                type="button"
                className="flow-ask-global__tool"
                aria-label="Cancel voice input"
                data-tooltip="Cancel voice input"
                data-testid="ask-voice-cancel"
                onClick={() => {
                  voice.cancel();
                  ask.focusComposer();
                }}
              >
                <X size={18} strokeWidth={1.75} aria-hidden />
              </button>
            </div>
            <div className="flow-ask-global__voice-center">
              <VoiceSurface
                state={
                  voice.voiceState === "processing" ? "processing" : "listening"
                }
                getActivity={getActivity}
              />
              <p
                className="flow-ask-global__voice-text"
                data-testid="ask-voice-text"
              >
                {ask.draft}
              </p>
              <p className="flow-ask-global__voice-phase" role="status">
                {voice.voiceState === "processing" ? "Finishing" : "Listening"}
              </p>
            </div>
            <div className="flow-ask-global__zone flow-ask-global__zone--end">
              <button
                ref={finishRef}
                type="button"
                className="flow-ask-global__tile"
                aria-label="Finish voice input"
                data-tooltip="Finish voice input"
                data-testid="ask-voice-finish"
                disabled={!ask.draft.trim()}
                onClick={voice.finish}
              >
                <Check size={20} strokeWidth={2} color="#111111" aria-hidden />
              </button>
            </div>
          </div>
        ) : (
          <div className="flow-ask-global__row">
            {showStatus ? (
              <div
                className="flow-ask-global__status"
                role="status"
                data-testid="ask-status"
              >
                <span className="flow-ask-global__status-dot" aria-hidden />
                {statusLabel}
              </div>
            ) : null}
            <div className="flow-ask-global__zone flow-ask-global__zone--start">
              <button
                type="button"
                className="flow-ask-global__tile"
                aria-label="Ask Flow"
                data-tooltip="Ask Flow"
                onClick={ask.focusComposer}
              >
                <Sparkles
                  size={22}
                  strokeWidth={2}
                  color="#111111"
                  aria-hidden
                />
              </button>
            </div>
            <label className="flow-ask-global__composer">
              <span className="sr-only">Ask anything about your business</span>
              <textarea
                ref={ask.composerRef}
                className="flow-ask-global__input"
                value={ask.draft}
                rows={1}
                placeholder={placeholder}
                role="combobox"
                aria-label="Ask anything about your business"
                aria-autocomplete="list"
                aria-controls={listId}
                aria-expanded={showingSuggestions}
                aria-busy={busy}
                disabled={busy}
                onFocus={ask.markFocused}
                onChange={(event) => ask.setDraft(event.target.value)}
                onKeyDown={onComposerKey}
              />
            </label>
            <div className="flow-ask-global__zone flow-ask-global__zone--end">
              {hasDraft ? (
                <button
                  type="button"
                  className="flow-ask-global__tool"
                  aria-label="Send"
                  data-tooltip="Send"
                  data-testid="ask-send"
                  disabled={busy}
                  onClick={() => submitWithSound()}
                >
                  <ArrowUp size={18} strokeWidth={1.75} aria-hidden />
                </button>
              ) : (
                <button
                  type="button"
                  className="flow-ask-global__tool"
                  aria-label="Voice input"
                  data-tooltip="Voice input"
                  data-state={
                    voice.supported === false
                      ? "unavailable"
                      : voice.voiceState === "error"
                        ? "error"
                        : "idle"
                  }
                  aria-disabled={voice.supported === false}
                  onClick={voice.start}
                >
                  <Mic size={18} strokeWidth={1.75} aria-hidden />
                </button>
              )}
              <button
                type="button"
                className="flow-ask-global__tool"
                aria-label="Actions"
                data-tooltip="Actions"
                data-state={busy ? "loading" : "idle"}
                onClick={() => ask.setFullscreen(true)}
              >
                <LayoutGrid size={18} strokeWidth={1.75} aria-hidden />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
