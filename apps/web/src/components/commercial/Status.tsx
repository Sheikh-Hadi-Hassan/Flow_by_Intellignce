"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function proposalBadge(status: string) {
  if (status === "accepted" || status === "approved") return "success" as const;
  if (status === "declined") return "warning" as const;
  if (status === "in_review" || status === "client_review") return "essential" as const;
  if (status === "changes_requested") return "warning" as const;
  return "default" as const;
}

export function contractBadge(status: string) {
  if (status === "executed") return "success" as const;
  if (status === "pending_client_acceptance") return "essential" as const;
  if (status === "changes_requested") return "warning" as const;
  return "default" as const;
}

export function journeyBadge(status: string) {
  if (status === "approved") return "success" as const;
  if (status.includes("missing") || status === "changes_requested") {
    return "warning" as const;
  }
  if (status === "founder_review") return "essential" as const;
  return "default" as const;
}

export function factBadge(status: string) {
  if (status === "verified") return "success" as const;
  if (status === "rejected") return "warning" as const;
  return "default" as const;
}

export function projectBadge(status: string) {
  if (status === "active" || status === "published" || status === "approved") {
    return "success" as const;
  }
  if (status === "changes_requested" || status === "on_hold") {
    return "warning" as const;
  }
  if (status === "in_review") return "essential" as const;
  return "default" as const;
}

export function OpportunityNav({
  workspace,
  opportunityId,
}: {
  workspace: string;
  opportunityId: string;
}) {
  const base = `/${workspace}/admin/opportunities/${opportunityId}`;
  const links = [
    { href: base, label: "Overview" },
    { href: `${base}/discovery`, label: "Discovery" },
    { href: `${base}/questionnaire`, label: "Questionnaire" },
    { href: `${base}/missing`, label: "Missing information" },
    { href: `${base}/brief`, label: "Brief" },
    { href: `${base}/approvals`, label: "Approvals" },
    { href: `${base}/proposal`, label: "Proposal" },
    { href: `${base}/contract`, label: "Contract" },
    { href: `${base}/project`, label: "Project" },
    { href: `${base}/project/capacity`, label: "Capacity" },
  ];
  return (
    <nav aria-label="Opportunity sections" className="flow-stepper">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="flow-stepper__step">
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export function MoneyLine({
  label,
  minor,
  currency,
}: {
  label: string;
  minor?: string | undefined;
  currency: string;
}) {
  if (minor === undefined) {
    return <p>{label}: —</p>;
  }
  const amount = BigInt(minor);
  const sign = amount < 0n ? "-" : "";
  const abs = amount < 0n ? -amount : amount;
  const whole = abs / 100n;
  const cents = (abs % 100n).toString().padStart(2, "0");
  return (
    <p>
      {label}:{" "}
      <span className="tabular-nums">
        {sign}
        {currency} {whole.toString()}.{cents}
      </span>
    </p>
  );
}

export function CommercialStack({ children }: { children: ReactNode }) {
  return <div className="flow-detail-group">{children}</div>;
}
