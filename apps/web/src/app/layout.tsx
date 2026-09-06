import "./globals.css";
import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { AppProviders } from "../components/providers/AppProviders";
import { PREFERENCE_INIT_SCRIPT } from "../lib/prototype/preference-init-script";

const flowSans = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-flow-sans",
  display: "swap",
});

const flowMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-flow-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Flow by Intellignce",
  description: "AI-native Business Operating Intelligence platform",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${flowSans.variable} ${flowMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFERENCE_INIT_SCRIPT }} />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
