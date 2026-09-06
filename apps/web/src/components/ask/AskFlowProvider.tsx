"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  streamAskAssistant,
  versionFromParts,
} from "../../lib/ask-flow/assistant/client";
import {
  ASK_TOOL_NAMES,
  type AskHistoryTurn,
  type AskStreamPart,
} from "../../lib/ask-flow/assistant/types";
import { resolveAskSuggestions } from "../../lib/ask-flow/suggestions";
import { isAskBusy, type AskToolProgress } from "../../lib/ask-flow/ui-state";
import type {
  AskApplicationContext,
  AskConversation,
  AskPhase,
  AskSuggestion,
  AskTurn,
} from "../../lib/ask-flow/types";
import { snapshotForState } from "../../lib/mission-control/ask-snapshot";
import { missionViewer } from "../../lib/mission-control/seed";
import { isMissionStateKind } from "../../lib/mission-control/states";
import {
  loadMissionDemoState,
  subscribeMissionDemo,
} from "../../lib/mission-control/store";
import type { MissionStateKind } from "../../lib/mission-control/types";
import {
  CRM_CORE_BLOCK_ID,
  isCrmCoreActive,
  subscribeBuildingBlocks,
} from "../../lib/building-blocks/store";
import {
  isBusinessRegistryActive,
  readBusinessRegistryState,
  subscribeBusinessRegistry,
} from "../../lib/business-registry/store";
import { permissionsForRegistryRole } from "@flow/contracts";
import type { BusinessRegistryRole } from "@flow/contracts";
import { NORTHSTAR_ORG_ID } from "@flow/contracts";

const clearSuggestions =
  () =>
  (current: readonly AskSuggestion[]): readonly AskSuggestion[] =>
    current.length === 0 ? current : [];

interface AskFlowContextValue {
  readonly context: AskApplicationContext;
  readonly conversation: AskConversation;
  readonly phase: AskPhase;
  readonly draft: string;
  readonly suggestions: readonly AskSuggestion[];
  readonly suggestionIndex: number;
  readonly expanded: boolean;
  readonly fullscreen: boolean;
  readonly streamingText: string;
  readonly pendingQuestion: string | null;
  readonly composerRef: React.RefObject<HTMLTextAreaElement | null>;
  readonly setDraft: (value: string) => void;
  readonly setSuggestionIndex: (index: number) => void;
  readonly dismissSuggestions: () => void;
  readonly focusComposer: () => void;
  readonly markFocused: () => void;
  readonly submit: (text?: string) => void;
  readonly minimise: () => void;
  readonly setFullscreen: (value: boolean) => void;
  readonly editLastQuestion: (text: string) => void;
  readonly regenerate: () => void;
  readonly copyLastAnswer: () => void;
  readonly setFeedback: (value: "up" | "down") => void;
  readonly answerClarification: (choiceId: string) => void;
  readonly retry: () => void;
  readonly failedQuestion: string | null;
  readonly activeTool: AskToolProgress | null;
}

const AskFlowState = createContext<AskFlowContextValue | null>(null);

function newConversationId(): string {
  return `ask-${Math.random().toString(36).slice(2, 10)}`;
}

function parseVisibleIds(pathname: string): {
  visibleRecordIds: string[];
  selectedClientId?: string;
  selectedProjectId?: string;
  selectedContractId?: string;
} {
  const parts = pathname.split("/").filter(Boolean);
  const visibleRecordIds: string[] = [];
  const take = (key: string) => {
    const index = parts.indexOf(key);
    const id = index >= 0 ? parts[index + 1] : undefined;
    if (id && !["new", "missing", "questionnaire", "discovery"].includes(id)) {
      visibleRecordIds.push(id);
      return id;
    }
    return undefined;
  };
  const selectedClientId = take("clients");
  const selectedProjectId = take("projects") ?? take("project");
  const selectedContractId = take("contracts");
  return {
    visibleRecordIds,
    ...(selectedClientId ? { selectedClientId } : {}),
    ...(selectedProjectId ? { selectedProjectId } : {}),
    ...(selectedContractId ? { selectedContractId } : {}),
  };
}

export function AskFlowProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const requestedState = searchParams.get("state");
  const conversationIdRef = useRef(newConversationId());
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const originRef = useRef<HTMLElement | null>(null);
  const streamTimer = useRef<number | null>(null);
  const runningRef = useRef(false);

  const [conversation, setConversation] = useState<AskConversation>({
    id: conversationIdRef.current,
    turns: [],
  });
  const [phase, setPhase] = useState<AskPhase>("idle");
  const [draft, setDraftState] = useState("");
  const [suggestions, setSuggestions] = useState<readonly AskSuggestion[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(true);
  const [failedQuestion, setFailedQuestion] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<AskToolProgress | null>(null);
  const [storeKind, setStoreKind] = useState<MissionStateKind>(() => {
    if (typeof window === "undefined") return "populated";
    const requested = new URLSearchParams(window.location.search).get("state");
    if (isMissionStateKind(requested)) return requested;
    return loadMissionDemoState().stateKind;
  });
  const missionStateKind = isMissionStateKind(requestedState)
    ? requestedState
    : storeKind;

  useEffect(() => {
    if (isMissionStateKind(requestedState)) {
      setStoreKind(requestedState);
      return;
    }
    setStoreKind(loadMissionDemoState().stateKind);
  }, [pathname, requestedState]);

  useEffect(() => {
    return subscribeMissionDemo(() => {
      setStoreKind(loadMissionDemoState().stateKind);
    });
  }, []);

  const crmCoreActive = useSyncExternalStore(
    subscribeBuildingBlocks,
    isCrmCoreActive,
    () => false,
  );
  const registryActive = useSyncExternalStore(
    subscribeBusinessRegistry,
    isBusinessRegistryActive,
    () => true,
  );
  const registryState = useSyncExternalStore(
    subscribeBusinessRegistry,
    readBusinessRegistryState,
    readBusinessRegistryState,
  );
  const onRegistryRoute = pathname.includes("/admin/settings/business");
  const stateParam = searchParams.get("state");
  const roleParam = searchParams.get("role");
  const registryDemoState =
    onRegistryRoute && (roleParam === "employee" || stateParam === "restricted")
      ? "restricted"
      : onRegistryRoute && stateParam
        ? stateParam
        : onRegistryRoute
          ? registryState.ui === "partial" ||
            registryState.ui === "empty" ||
            registryState.ui === "error" ||
            registryState.ui === "loading" ||
            registryState.ui === "restricted"
            ? registryState.ui
            : "populated"
          : "populated";
  const registryRole: BusinessRegistryRole =
    roleParam === "employee" ||
    roleParam === "finance" ||
    roleParam === "operations" ||
    roleParam === "founder" ||
    roleParam === "admin"
      ? roleParam
      : registryState.role;
  const registryPermissions = useMemo(
    () => permissionsForRegistryRole(registryRole),
    [registryRole],
  );
  const snapshotId = onRegistryRoute
    ? `registry:${registryState.seed?.organizationId ?? NORTHSTAR_ORG_ID}:${registryDemoState}:${registryRole}`
    : `mission:${missionStateKind}`;
  const parsed = useMemo(() => parseVisibleIds(pathname), [pathname]);
  const snapshot = useMemo(
    () => snapshotForState(missionStateKind),
    [missionStateKind],
  );
  const context = useMemo<AskApplicationContext>(
    () => ({
      workspaceId: pathname.split("/").filter(Boolean)[0] ?? "",
      userId: missionViewer.person.id,
      role: onRegistryRoute
        ? registryRole === "founder"
          ? "Founder"
          : registryRole === "employee"
            ? "Employee"
            : registryRole
        : missionViewer.person.role,
      permissions: onRegistryRoute
        ? registryPermissions
        : missionViewer.permissions,
      route: pathname,
      ...(parsed.selectedClientId
        ? { selectedClientId: parsed.selectedClientId }
        : {}),
      ...(parsed.selectedProjectId
        ? { selectedProjectId: parsed.selectedProjectId }
        : {}),
      ...(parsed.selectedContractId
        ? { selectedContractId: parsed.selectedContractId }
        : {}),
      visibleRecordIds:
        snapshot.recordIds.length > 0
          ? snapshot.recordIds
          : parsed.visibleRecordIds,
      locale: "en-US",
      currency: "USD",
      timezone: "America/Chicago",
      conversationId: conversationIdRef.current,
      missionStateKind,
      ...(snapshot.exposure ? { exposureMinor: snapshot.exposure.minor } : {}),
      decisionCount: snapshot.decisionCount,
      ...(crmCoreActive || registryActive
        ? {
            activeBuildingBlocks: [
              ...(crmCoreActive ? [CRM_CORE_BLOCK_ID] : []),
              ...(registryActive ? ["registry.business"] : []),
            ],
          }
        : {}),
      ...(registryState.seed ? { businessRegistry: registryState.seed } : {}),
      organizationId: registryState.seed?.organizationId ?? NORTHSTAR_ORG_ID,
      demoState: registryDemoState,
      snapshotId,
      visibleRecordPermissions: onRegistryRoute
        ? registryPermissions
        : missionViewer.permissions,
    }),
    [
      pathname,
      parsed,
      missionStateKind,
      snapshot,
      crmCoreActive,
      registryActive,
      registryState.seed,
      registryDemoState,
      registryRole,
      registryPermissions,
      onRegistryRoute,
      snapshotId,
    ],
  );

  const snapshotKeyRef = useRef(snapshotId);
  const workspaceRef = useRef(context.workspaceId);

  useEffect(() => {
    if (workspaceRef.current !== context.workspaceId) {
      workspaceRef.current = context.workspaceId;
      conversationIdRef.current = `ask-${Date.now()}`;
      setConversation({ id: conversationIdRef.current, turns: [] });
      setSuggestions(clearSuggestions());
      setPhase("idle");
      setStreamingText("");
      return;
    }
    if (snapshotKeyRef.current === snapshotId) return;
    snapshotKeyRef.current = snapshotId;
    setSuggestions(clearSuggestions());
    setSuggestOpen(true);
    setConversation((current) => ({
      ...current,
      turns: current.turns.map((turn) => ({
        ...turn,
        versions: turn.versions.map((version) => ({
          ...version,
          stale: version.snapshotId !== snapshotId,
        })),
      })),
    }));
  }, [context.workspaceId, snapshotId]);

  useEffect(() => {
    setSuggestions(clearSuggestions());
    setSuggestOpen(true);
  }, [missionStateKind]);

  useEffect(() => {
    return () => {
      if (streamTimer.current) window.clearInterval(streamTimer.current);
    };
  }, []);

  useEffect(() => {
    if (draft.trim().length < 2) {
      setSuggestions(clearSuggestions());
      return;
    }
    if (!suggestOpen) return;
    const handle = window.setTimeout(() => {
      setSuggestions(resolveAskSuggestions(draft, context, snapshot));
      setSuggestionIndex(0);
      setPhase((current) =>
        isAskBusy(current) || current === "asking_clarification"
          ? current
          : "suggesting",
      );
    }, 250);
    return () => window.clearTimeout(handle);
  }, [draft, context, suggestOpen, snapshot]);

  const setDraft = useCallback((value: string) => {
    setDraftState(value);
    setSuggestions(clearSuggestions());
    setSuggestOpen(true);
    if (value.trim().length === 0) {
      setPhase((current) =>
        isAskBusy(current) ||
        current === "answered" ||
        current === "asking_clarification"
          ? current
          : "focused",
      );
      return;
    }
    setPhase((current) =>
      isAskBusy(current) || current === "asking_clarification"
        ? current
        : "typing",
    );
  }, []);

  const dismissSuggestions = useCallback(() => {
    setSuggestOpen(false);
    setSuggestions([]);
  }, []);

  const markFocused = useCallback(() => {
    setPhase((current) => (current === "idle" ? "focused" : current));
  }, []);

  const focusComposer = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      originRef.current = document.activeElement;
    }
    composerRef.current?.focus();
    setPhase((current) => (current === "idle" ? "focused" : current));
  }, []);

  const minimise = useCallback(() => {
    setFullscreen(false);
    setExpanded(false);
    setPhase((current) =>
      conversation.turns.length > 0
        ? current === "asking_clarification"
          ? "asking_clarification"
          : "answered"
        : "idle",
    );
    const origin = originRef.current;
    originRef.current = null;
    window.requestAnimationFrame(() => {
      if (origin?.isConnected) origin.focus();
      else composerRef.current?.focus();
    });
  }, [conversation.turns.length]);

  const historyOf = useCallback(
    (turns: readonly AskTurn[]): AskHistoryTurn[] =>
      turns.flatMap((turn) => {
        const latest = turn.versions[turn.versions.length - 1];
        if (!latest) return [];
        const namedTool = ASK_TOOL_NAMES.find((name) => name === turn.tool);
        const assistant: AskHistoryTurn = namedTool
          ? { role: "assistant", text: latest.answer, tool: namedTool }
          : { role: "assistant", text: latest.answer };
        return [{ role: "user", text: latest.question }, assistant];
      }),
    [],
  );

  const applyParts = useCallback(
    (
      question: string,
      parts: AskStreamPart[],
      replaceLast: boolean,
      tool?: string,
    ) => {
      const collected = versionFromParts(question, parts);
      const version = {
        ...collected.version,
        ...(context.snapshotId ? { snapshotId: context.snapshotId } : {}),
      };
      const nextTool = collected.tool ?? tool;
      setConversation((current) => {
        const turn: AskTurn = {
          id: replaceLast
            ? (current.turns[current.turns.length - 1]?.id ??
              `turn-${version.createdAt}`)
            : `turn-${version.createdAt}`,
          versions: replaceLast
            ? [
                ...(current.turns[current.turns.length - 1]?.versions ?? []),
                version,
              ]
            : [version],
          ...(nextTool ? { tool: nextTool } : {}),
        };
        if (replaceLast && current.turns.length > 0) {
          const last = current.turns[current.turns.length - 1]!;
          return {
            ...current,
            turns: [
              ...current.turns.slice(0, -1),
              {
                ...last,
                versions: [...last.versions, version],
                ...(nextTool ? { tool: nextTool } : {}),
              },
            ],
          };
        }
        return { ...current, turns: [...current.turns, turn] };
      });
      if (collected.errorCode === "model_unavailable") {
        setFailedQuestion(question);
        setDraftState(question);
      } else {
        setFailedQuestion(null);
      }
      if (version.clarification) setPhase("asking_clarification");
      else if (collected.errorCode) setPhase("error");
      else setPhase("answered");
      setActiveTool(null);
      setPendingQuestion(null);
    },
    [context.snapshotId],
  );

  const runAssistant = useCallback(
    async (question: string, replaceLast = false) => {
      if (runningRef.current) return;
      runningRef.current = true;
      const parts: AskStreamPart[] = [];
      setStreamingText("");
      setActiveTool(null);
      setPendingQuestion(question);
      setFailedQuestion(null);
      setPhase("submitted");
      try {
        for await (const part of streamAskAssistant({
          context,
          message: question,
          history: historyOf(conversation.turns),
        })) {
          parts.push(part);
          if (part.type === "tool_status") {
            setActiveTool({ tool: part.tool, state: part.state });
          }
          if (part.type === "status" && part.phase === "retrieving") {
            setPhase("retrieving");
          }
          if (part.type === "status" && part.phase === "generating") {
            setPhase("generating");
          }
          if (part.type === "status" && part.phase === "streaming") {
            setPhase("streaming");
          }
          if (part.type === "text") {
            setStreamingText((current) => current + part.delta);
          }
          if (part.type === "error") {
            const code = part.code;
            setPhase(
              code === "permission_denied"
                ? "permission_denied"
                : code === "model_unavailable"
                  ? "model_unavailable"
                  : code === "tool_unavailable" ||
                      code === "capability_unavailable"
                    ? "tool_failure"
                    : "error",
            );
          }
        }
        applyParts(question, parts, replaceLast);
      } catch {
        setFailedQuestion(question);
        setDraftState(question);
        setPhase("model_unavailable");
        applyParts(
          question,
          [
            {
              type: "error",
              code: "model_unavailable",
              message:
                "The assistant API did not respond. Your question was kept — retry.",
            },
          ],
          replaceLast,
        );
      } finally {
        runningRef.current = false;
      }
    },
    [applyParts, context, conversation.turns, historyOf],
  );

  const submit = useCallback(
    (text?: string) => {
      const question = (text ?? draft).trim();
      if (!question) return;
      if (runningRef.current) return;
      setDraftState("");
      setSuggestions([]);
      setSuggestOpen(false);
      setExpanded(true);
      if (window.matchMedia("(max-width: 720px)").matches) {
        setFullscreen(true);
      }
      void runAssistant(question);
    },
    [draft, runAssistant],
  );

  const editLastQuestion = useCallback(
    (text: string) => {
      const question = text.trim();
      if (!question) return;
      if (runningRef.current) return;
      setDraftState("");
      setExpanded(true);
      void runAssistant(question, true);
    },
    [runAssistant],
  );

  const regenerate = useCallback(() => {
    const last = conversation.turns[conversation.turns.length - 1];
    const latest = last?.versions[last.versions.length - 1];
    if (!latest) return;
    editLastQuestion(latest.question);
  }, [conversation.turns, editLastQuestion]);

  const copyLastAnswer = useCallback(() => {
    const last = conversation.turns[conversation.turns.length - 1];
    const latest = last?.versions[last.versions.length - 1];
    if (!latest) return;
    void navigator.clipboard.writeText(latest.answer);
  }, [conversation.turns]);

  const setFeedback = useCallback((value: "up" | "down") => {
    setConversation((current) => {
      const last = current.turns[current.turns.length - 1];
      if (!last) return current;
      return {
        ...current,
        turns: [...current.turns.slice(0, -1), { ...last, feedback: value }],
      };
    });
  }, []);

  const answerClarification = useCallback(
    (choiceId: string) => {
      const phrases: Record<string, string> = {
        active: "list active projects",
        risk: "list at-risk projects",
        all: "list all projects",
        deadline: "Protect the deadline when moving this project",
        margin: "Protect margin when moving this project",
      };
      void runAssistant(phrases[choiceId] ?? choiceId.replaceAll("_", " "));
    },
    [runAssistant],
  );

  const retry = useCallback(() => {
    if (!failedQuestion) return;
    void runAssistant(failedQuestion);
  }, [failedQuestion, runAssistant]);

  const value = useMemo<AskFlowContextValue>(
    () => ({
      context,
      conversation,
      phase,
      draft,
      suggestions,
      suggestionIndex,
      expanded,
      fullscreen,
      streamingText,
      pendingQuestion,
      composerRef,
      setDraft,
      setSuggestionIndex,
      dismissSuggestions,
      focusComposer,
      markFocused,
      submit,
      minimise,
      setFullscreen,
      editLastQuestion,
      regenerate,
      copyLastAnswer,
      setFeedback,
      answerClarification,
      retry,
      failedQuestion,
      activeTool,
    }),
    [
      answerClarification,
      failedQuestion,
      activeTool,
      retry,
      context,
      conversation,
      copyLastAnswer,
      dismissSuggestions,
      draft,
      editLastQuestion,
      expanded,
      focusComposer,
      fullscreen,
      markFocused,
      minimise,
      phase,
      pendingQuestion,
      regenerate,
      setDraft,
      streamingText,
      submit,
      suggestionIndex,
      suggestions,
    ],
  );

  return (
    <AskFlowState.Provider value={value}>{children}</AskFlowState.Provider>
  );
}

export function useAskFlow(): AskFlowContextValue {
  const ctx = useContext(AskFlowState);
  if (!ctx) throw new Error("useAskFlow must be used within AskFlowProvider");
  return ctx;
}

/** Back-compat for the old header button. */
export function useAskFlowOpen() {
  const ask = useAskFlow();
  return {
    open: ask.phase !== "idle" && ask.phase !== "focused",
    openAskFlow: ask.focusComposer,
    closeAskFlow: ask.minimise,
  };
}
