"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { AskFlowDrawer } from "./AskFlowDrawer";

interface AskFlowContextValue {
  readonly open: boolean;
  readonly openAskFlow: () => void;
  readonly closeAskFlow: () => void;
}

const AskFlowContext = createContext<AskFlowContextValue | null>(null);

export function AskFlowProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openAskFlow = useCallback(() => setOpen(true), []);
  const closeAskFlow = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ open, openAskFlow, closeAskFlow }),
    [open, openAskFlow, closeAskFlow],
  );

  return (
    <AskFlowContext.Provider value={value}>
      {children}
      <AskFlowDrawer open={open} onClose={closeAskFlow} />
    </AskFlowContext.Provider>
  );
}

export function useAskFlow(): AskFlowContextValue {
  const ctx = useContext(AskFlowContext);
  if (!ctx) throw new Error("useAskFlow must be used within AskFlowProvider");
  return ctx;
}
