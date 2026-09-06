"use client";

import Link from "next/link";

import type {
  AuthorityState,
  EvidenceRef,
} from "../../lib/mission-control/types";
import { ProofLabel } from "../ui/Display";

const CLAIM_TO_PROOF = {
  FACT: "fact",
  INFERENCE: "inference",
  RECOMMENDATION: "recommendation",
  ASSUMPTION: "inference",
} as const;

/**
 * Inline provenance. Every number or claim Mission Control shows is paired with
 * one of these, so nothing reads as an unattributed assertion.
 */
export function ContextReceipt({
  evidence,
  heading = "Context used",
}: {
  evidence: readonly EvidenceRef[];
  heading?: string;
}) {
  if (evidence.length === 0) return null;
  const visibleEvidence =
    evidence.length > 5
      ? [
          {
            ...evidence[0]!,
            id: `summary:${evidence[0]!.id}`,
            label: `${evidence.length} ${evidence[0]!.label}${evidence[0]!.label.endsWith("s") ? "" : "s"}`,
            source: evidence[0]!.source.split(" · ")[0]!,
          },
        ]
      : evidence;

  return (
    <div className="flow-mc-receipt">
      <span className="flow-mc-receipt__head">{heading}</span>
      <ul className="flow-mc-receipt__list">
        {visibleEvidence.map((item) => (
          <li key={item.id} className="flow-mc-receipt__item">
            <span>
              {item.href ? (
                <Link href={item.href} className="flow-mc-receipt__source">
                  {item.label}
                </Link>
              ) : (
                <span className="flow-mc-receipt__source">{item.label}</span>
              )}
            </span>
            <span className="flow-mc-receipt__meta">
              {item.source} · {item.capturedAtLabel} · {item.trust} trust
            </span>
            {item.excerpt ? (
              <span className="flow-mc-receipt__meta">{item.excerpt}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Compact single-source proof chip for headlines and metric captions. */
export function EvidenceChip({ evidence }: { evidence: EvidenceRef }) {
  const label = (
    <ProofLabel type={CLAIM_TO_PROOF[evidence.claim]}>
      {evidence.claim === "FACT" ? "Fact" : "Inference"} · {evidence.source}
    </ProofLabel>
  );

  return evidence.href ? (
    <Link
      href={evidence.href}
      style={{ textDecoration: "none" }}
      title={`${evidence.label} — ${evidence.capturedAtLabel}`}
    >
      {label}
    </Link>
  ) : (
    label
  );
}

/**
 * States plainly whether the founder can act directly or needs a second
 * approver, mirroring the Action Wall outcome rather than implying authority.
 */
export function AuthorityNote({ authority }: { authority: AuthorityState }) {
  const modifier =
    authority.outcome === "ALLOW"
      ? "allow"
      : authority.outcome === "DENY"
        ? "deny"
        : "pending";

  const label =
    authority.outcome === "ALLOW"
      ? "You can decide this"
      : authority.outcome === "DENY"
        ? "Not available to you"
        : "Needs a second approver";

  return (
    <span className="flow-mc-authority">
      <span
        className={`flow-mc-authority__dot flow-mc-authority__dot--${modifier}`}
        aria-hidden
      />
      <span>
        <strong style={{ fontWeight: 500 }}>{label}</strong> —{" "}
        {authority.reason}
      </span>
    </span>
  );
}
