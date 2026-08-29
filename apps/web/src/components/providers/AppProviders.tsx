"use client";

import type { ReactNode } from "react";

import { PrototypeProvider } from "../../lib/prototype/context";
import { ThemeProvider } from "../../lib/theme/context";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <PrototypeProvider>{children}</PrototypeProvider>
    </ThemeProvider>
  );
}
