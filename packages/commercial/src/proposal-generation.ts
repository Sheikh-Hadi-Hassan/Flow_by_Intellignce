import type { ProposalSectionKey } from "./proposal-lifecycle.js";

const SECTION_TITLES: Record<ProposalSectionKey, string> = {
  executive_summary: "Executive summary",
  client_goals: "Client goals",
  scope_deliverables: "Scope and deliverables",
  timeline_milestones: "Timeline and milestones",
  assumptions: "Assumptions",
  exclusions: "Exclusions",
  pricing_packages: "Pricing packages",
  optional_addons: "Optional add-ons",
  payment_schedule: "Payment schedule",
  terms: "Terms and conditions",
  approval_section: "Approval",
};

export interface BriefSectionInput {
  readonly key: string;
  readonly title: string;
  readonly body: string;
}

export interface ProposalGenerationInput {
  readonly clientName: string;
  readonly opportunityName: string;
  readonly currency: string;
  readonly briefSections: readonly BriefSectionInput[];
  readonly deliverables: readonly { readonly name: string; readonly description?: string }[];
  readonly recommendedPriceMinor: string;
  readonly pricingModel: string;
}

export function generateProposalSections(
  input: ProposalGenerationInput,
): readonly { readonly sectionKey: ProposalSectionKey; readonly title: string; readonly body: string }[] {
  const goals =
    input.briefSections.find((s) => s.key === "goals")?.body ??
    input.briefSections.find((s) => s.key === "client_goals")?.body ??
    "";
  const scope =
    input.briefSections.find((s) => s.key === "scope")?.body ??
    input.briefSections.find((s) => s.key === "deliverables")?.body ??
    "";
  const timeline = input.briefSections.find((s) => s.key === "timeline")?.body ?? "";
  const risks = input.briefSections.find((s) => s.key === "risks")?.body ?? "";

  const deliverableList = input.deliverables
    .map((d) => `- ${d.name}${d.description ? `: ${d.description}` : ""}`)
    .join("\n");

  const priceWhole = BigInt(input.recommendedPriceMinor) / 100n;
  const priceCents = (BigInt(input.recommendedPriceMinor) % 100n)
    .toString()
    .padStart(2, "0");

  return [
    {
      sectionKey: "executive_summary",
      title: SECTION_TITLES.executive_summary,
      body: `Proposal for ${input.clientName}: ${input.opportunityName}. This ${input.pricingModel} engagement is priced at ${input.currency} ${priceWhole}.${priceCents}.`,
    },
    {
      sectionKey: "client_goals",
      title: SECTION_TITLES.client_goals,
      body: goals || "Goals to be confirmed from approved brief.",
    },
    {
      sectionKey: "scope_deliverables",
      title: SECTION_TITLES.scope_deliverables,
      body: [scope, deliverableList ? `\nDeliverables:\n${deliverableList}` : ""]
        .filter(Boolean)
        .join("\n"),
    },
    {
      sectionKey: "timeline_milestones",
      title: SECTION_TITLES.timeline_milestones,
      body: timeline || "Timeline aligned to discovery constraints.",
    },
    {
      sectionKey: "assumptions",
      title: SECTION_TITLES.assumptions,
      body: "Client provides timely feedback. Third-party assets are licensed appropriately.",
    },
    {
      sectionKey: "exclusions",
      title: SECTION_TITLES.exclusions,
      body: "Out-of-scope work requires a change order. Media buy and production travel are excluded unless noted.",
    },
    {
      sectionKey: "pricing_packages",
      title: SECTION_TITLES.pricing_packages,
      body: `Recommended package total: ${input.currency} ${priceWhole}.${priceCents} (${input.pricingModel}).`,
    },
    {
      sectionKey: "optional_addons",
      title: SECTION_TITLES.optional_addons,
      body: "Optional add-ons available on request (rush delivery, additional revision rounds).",
    },
    {
      sectionKey: "payment_schedule",
      title: SECTION_TITLES.payment_schedule,
      body: "50% on contract execution, 50% on final delivery unless otherwise agreed.",
    },
    {
      sectionKey: "terms",
      title: SECTION_TITLES.terms,
      body: "Standard commercial terms apply. This document is not legal advice.",
    },
    {
      sectionKey: "approval_section",
      title: SECTION_TITLES.approval_section,
      body: risks
        ? `Review notes:\n${risks}`
        : "Please review and accept or request changes.",
    },
  ];
}
