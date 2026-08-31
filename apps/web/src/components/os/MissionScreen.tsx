"use client";

import type { ReactNode } from "react";

import { CopilotHints, type CopilotHintsProps } from "./CopilotHints";

export interface MissionScreenProps {
  readonly lifecycle: string;
  readonly title: string;
  readonly why: string;
  readonly decision: string;
  readonly next: string;
  readonly primaryAction?: ReactNode;
  readonly secondaryActions?: ReactNode;
  readonly copilot?: CopilotHintsProps;
  readonly children?: ReactNode;
}

export function MissionScreen({
  lifecycle,
  title,
  why,
  decision,
  next,
  primaryAction,
  secondaryActions,
  copilot,
  children,
}: MissionScreenProps) {
  return (
    <div className="flow-mission">
      <header className="flow-mission__header">
        <p className="flow-mission__lifecycle">{lifecycle}</p>
        <h1 className="flow-mission__title">{title}</h1>
        <div
          className="flow-mission__context"
          role="group"
          aria-label="Screen context"
        >
          <p>
            <span className="flow-mission__label">Why you&apos;re here</span>
            {why}
          </p>
          <p>
            <span className="flow-mission__label">Decision now</span>
            {decision}
          </p>
          <p>
            <span className="flow-mission__label">What happens next</span>
            {next}
          </p>
        </div>
        {primaryAction || secondaryActions ? (
          <div className="flow-mission__actions">
            {primaryAction ? (
              <div className="flow-mission__primary">{primaryAction}</div>
            ) : null}
            {secondaryActions ? (
              <div className="flow-mission__secondary">{secondaryActions}</div>
            ) : null}
          </div>
        ) : null}
      </header>

      {copilot ? <CopilotHints {...copilot} /> : null}

      {children ? <div className="flow-mission__body">{children}</div> : null}
    </div>
  );
}
