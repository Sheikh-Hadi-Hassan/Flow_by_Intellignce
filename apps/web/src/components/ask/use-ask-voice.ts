"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { SpeechSession } from "../../lib/ask-flow/speech-recognition";
import { playInteractionSoundLazy } from "../../lib/sound/lazy";

export type AskVoiceState = "off" | "ready" | "listening" | "processing" | "error";

export interface AskVoiceSessionOptions {
  readonly setDraft: (value: string) => void;
  readonly submit: (text?: string) => void;
}

export interface AskVoiceSession {
  readonly voiceState: AskVoiceState;
  /** null until the speech module has loaded client-side. */
  readonly supported: boolean | null;
  readonly activityRef: React.RefObject<number>;
  readonly start: () => void;
  readonly cancel: () => void;
  readonly finish: () => void;
  readonly notice: string | null;
  readonly clearError: () => void;
}

const ACTIVITY_BASELINE = 0.15;
const NOTICE_CLEAR_MS = 4_000;

export function useAskVoiceSession({
  setDraft,
  submit,
}: AskVoiceSessionOptions): AskVoiceSession {
  const [voiceState, setVoiceState] = useState<AskVoiceState>("off");
  const [supported, setSupported] = useState<boolean | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const activityRef = useRef<number>(ACTIVITY_BASELINE);
  const sessionRef = useRef<SpeechSession | null>(null);
  const transcriptRef = useRef("");
  const finishingRef = useRef(false);
  const noticeTimerRef = useRef<number | null>(null);
  const setDraftRef = useRef(setDraft);
  setDraftRef.current = setDraft;
  const submitRef = useRef(submit);
  submitRef.current = submit;

  useEffect(() => {
    let alive = true;
    void import("../../lib/ask-flow/speech-recognition").then((module) => {
      if (alive) setSupported(module.isSpeechRecognitionSupported());
    });
    return () => {
      alive = false;
    };
  }, []);

  const clearNotice = useCallback(() => {
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }
    setNotice(null);
  }, []);

  const showNotice = useCallback((message: string) => {
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }
    setNotice(message);
    noticeTimerRef.current = window.setTimeout(() => {
      noticeTimerRef.current = null;
      setNotice(null);
      setVoiceState((current) => (current === "error" ? "off" : current));
    }, NOTICE_CLEAR_MS);
  }, []);

  const clearError = useCallback(() => {
    clearNotice();
    setVoiceState((current) => (current === "error" ? "off" : current));
  }, [clearNotice]);

  const releaseSession = useCallback((session: SpeechSession | null) => {
    sessionRef.current = null;
    session?.dispose();
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current !== null) {
        window.clearTimeout(noticeTimerRef.current);
      }
      releaseSession(sessionRef.current);
    };
  }, [releaseSession]);

  const start = useCallback(() => {
    if (voiceState !== "off") return;
    if (notice !== null) clearNotice();
    setVoiceState((current) =>
      current === "error" ? "off" : current,
    );
    void import("../../lib/ask-flow/speech-recognition")
      .then((module) => {
        if (!module.isSpeechRecognitionSupported()) {
          setSupported(false);
          showNotice("Voice input isn't available in this browser");
          return;
        }
        setSupported(true);
        transcriptRef.current = "";
        finishingRef.current = false;
        activityRef.current = ACTIVITY_BASELINE;
        setVoiceState("ready");
        playInteractionSoundLazy("listen_start");
        const session = module.createSpeechSession(
          typeof navigator === "undefined" ? "en-US" : navigator.language,
          {
            onInterim: (text) => {
              transcriptRef.current = text;
              activityRef.current = 0.5 + Math.random() * 0.4;
              setDraftRef.current(text);
              setVoiceState((current) =>
                current === "ready" ? "listening" : current,
              );
            },
            onFinal: (text) => {
              if (!text.trim()) return;
              transcriptRef.current = text;
              activityRef.current = 0.5 + Math.random() * 0.4;
              setDraftRef.current(text);
            },
            onError: (code) => {
              if (code === "not-allowed") {
                showNotice(
                  "Microphone access was blocked. Allow microphone access and try again.",
                );
              } else if (code === "network") {
                showNotice("Voice input needs a network connection");
              } else {
                showNotice("Voice input hit a problem. Try again.");
              }
              setVoiceState("error");
            },
            onEnd: () => {
              releaseSession(sessionRef.current);
              if (finishingRef.current) {
                finishingRef.current = false;
                const text = transcriptRef.current;
                if (text.trim()) {
                  setDraftRef.current(text);
                  submitRef.current(text);
                }
                setVoiceState("off");
                return;
              }
              setVoiceState((current) =>
                current === "error" ? current : "off",
              );
            },
          },
        );
        if (!session) {
          showNotice("Voice input isn't available in this browser");
          setVoiceState("off");
          return;
        }
        sessionRef.current = session;
        session.start();
      })
      .catch(() => {
        showNotice("Voice input hit a problem. Try again.");
        setVoiceState("off");
      });
  }, [voiceState, notice, clearNotice, showNotice]);

  const cancel = useCallback(() => {
    if (voiceState === "off") return;
    playInteractionSoundLazy("listen_stop");
    finishingRef.current = false;
    releaseSession(sessionRef.current);
    setVoiceState("off");
  }, [voiceState, releaseSession]);

  const finish = useCallback(() => {
    if (voiceState === "off") return;
    const text = transcriptRef.current;
    if (!text.trim()) {
      finishingRef.current = false;
      releaseSession(sessionRef.current);
      setVoiceState("off");
      return;
    }
    const session = sessionRef.current;
    if (!session) {
      setDraftRef.current(text);
      submitRef.current(text);
      setVoiceState("off");
      return;
    }
    finishingRef.current = true;
    setVoiceState("processing");
    session.stop();
  }, [voiceState, releaseSession]);

  return {
    voiceState,
    supported,
    activityRef,
    start,
    cancel,
    finish,
    notice,
    clearError,
  };
}
