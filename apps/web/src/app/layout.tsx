import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppProviders } from "../components/providers/AppProviders";
import { PREFERENCE_INIT_SCRIPT } from "../lib/prototype/preference-init-script";

export const metadata: Metadata = {
  title: "Flow by Intellignce",
  description: "AI-native Business Operating Intelligence platform",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFERENCE_INIT_SCRIPT }} />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
