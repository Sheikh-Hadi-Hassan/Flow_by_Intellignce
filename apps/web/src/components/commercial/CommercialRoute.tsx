"use client";

import type { ReactNode } from "react";
import { useParams } from "next/navigation";

import { WorkspaceGate } from "../shell/WorkspaceGate";
import { CommercialDataGate } from "./CommercialDataGate";

export function CommercialRoute({ children }: { children: ReactNode }) {
  const workspace = useParams().workspace as string;
  return (
    <WorkspaceGate workspace={workspace} requireTwin variant="founder">
      <CommercialDataGate>{children}</CommercialDataGate>
    </WorkspaceGate>
  );
}
