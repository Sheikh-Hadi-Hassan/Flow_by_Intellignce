"use client";

import type { ReactNode } from "react";

import { PrototypeProvider } from "../../lib/prototype/context";
import { ThemeProvider } from "../../lib/theme/context";
import { WorkspaceApiProvider } from "../../lib/workspace/context";
import { AskFlowProvider } from "../ask/AskFlowProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <PrototypeProvider>
        <WorkspaceApiProvider>
          <AskFlowProvider>{children}</AskFlowProvider>
        </WorkspaceApiProvider>
      </PrototypeProvider>
    </ThemeProvider>
  );
}
