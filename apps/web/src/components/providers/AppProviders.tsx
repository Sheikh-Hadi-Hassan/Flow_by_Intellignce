"use client";

import { Suspense, type ReactNode } from "react";

import { PrototypeProvider } from "../../lib/prototype/context";
import { ThemeProvider } from "../../lib/theme/context";
import { WorkspaceApiProvider } from "../../lib/workspace/context";
import { AskFlowProvider } from "../ask/AskFlowProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <PrototypeProvider>
        <WorkspaceApiProvider>
          <Suspense fallback={null}>
            <AskFlowProvider>{children}</AskFlowProvider>
          </Suspense>
        </WorkspaceApiProvider>
      </PrototypeProvider>
    </ThemeProvider>
  );
}
