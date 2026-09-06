export type SpeechErrorCode =
  | "not-allowed"
  | "no-speech"
  | "network"
  | "audio-capture"
  | "aborted"
  | "unknown";

export interface SpeechSessionCallbacks {
  /** Full running transcript: committed finals plus the current interim. */
  onInterim(text: string): void;
  /** Committed transcript so far. */
  onFinal(text: string): void;
  onError(code: SpeechErrorCode, raw: string): void;
  /** Session fully ended — no further restarts will be attempted. */
  onEnd(): void;
}

export interface SpeechSession {
  start(): void;
  stop(): void;
  abort(): void;
  dispose(): void;
}

type RecognitionAlternative = { readonly transcript: string };
type RecognitionResult = {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: RecognitionAlternative;
};
type RecognitionEvent = {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    readonly [index: number]: RecognitionResult;
  };
};
type RecognitionErrorEvent = { readonly error: string };

interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type RecognitionCtor = new () => RecognitionLike;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return recognitionCtor() !== null;
}

export function mapSpeechErrorCode(raw: string): SpeechErrorCode {
  switch (raw) {
    case "not-allowed":
    case "service-not-allowed":
      return "not-allowed";
    case "no-speech":
      return "no-speech";
    case "network":
      return "network";
    case "audio-capture":
      return "audio-capture";
    case "aborted":
      return "aborted";
    default:
      return "unknown";
  }
}

const MAX_RESTARTS = 3;
const RESTART_WINDOW_MS = 10_000;

export function createSpeechSession(
  lang: string,
  callbacks: SpeechSessionCallbacks,
): SpeechSession | null {
  const Ctor = recognitionCtor();
  if (!Ctor) return null;

  let recognition: RecognitionLike | null = null;
  let finalText = "";
  let ended = false;
  let userStopped = false;
  let errored = false;
  let disposed = false;
  const restarts: number[] = [];

  const createInstance = (): RecognitionLike => {
    const instance = new Ctor();
    instance.lang = lang;
    instance.continuous = true;
    instance.interimResults = true;
    instance.maxAlternatives = 1;
    instance.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]!;
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalText = (finalText + " " + transcript).trim();
        } else {
          interim += transcript;
        }
      }
      if (interim) callbacks.onInterim((finalText + " " + interim).trim());
      else callbacks.onInterim(finalText);
      callbacks.onFinal(finalText);
    };
    instance.onerror = (event) => {
      const code = mapSpeechErrorCode(event.error);
      if (code === "no-speech" || code === "aborted") return;
      errored = true;
      callbacks.onError(code, event.error);
    };
    instance.onend = () => {
      if (ended || disposed) return;
      if (userStopped || errored) {
        ended = true;
        callbacks.onEnd();
        return;
      }
      const now = Date.now();
      while (restarts.length > 0 && now - restarts[0]! > RESTART_WINDOW_MS) {
        restarts.shift();
      }
      if (restarts.length >= MAX_RESTARTS) {
        ended = true;
        callbacks.onEnd();
        return;
      }
      restarts.push(now);
      recognition = createInstance();
      try {
        recognition.start();
      } catch {
        ended = true;
        callbacks.onEnd();
      }
    };
    return instance;
  };

  return {
    start() {
      if (disposed || ended || recognition) return;
      recognition = createInstance();
      try {
        recognition.start();
      } catch {
        recognition = null;
        ended = true;
        callbacks.onEnd();
      }
    },
    stop() {
      userStopped = true;
      recognition?.stop();
    },
    abort() {
      userStopped = true;
      recognition?.abort();
    },
    dispose() {
      disposed = true;
      const instance = recognition;
      recognition = null;
      if (instance) {
        instance.onresult = null;
        instance.onerror = null;
        instance.onend = null;
        try {
          instance.abort();
        } catch {
          // Instance already stopped.
        }
      }
    },
  };
}
