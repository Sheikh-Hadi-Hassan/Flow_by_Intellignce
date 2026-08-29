import type { ServiceSelection } from "../../lib/prototype/types";

/** Demo fixture — suggested agency services for onboarding multi-select. */
export function suggestedServicesFixture(): ServiceSelection[] {
  return [
    {
      id: "brand-strategy",
      name: "Brand Strategy and Identity",
      description:
        "Positioning, messaging, and visual identity systems for B2B brands.",
      pricingModel: "retainer",
      selected: false,
    },
    {
      id: "social-media",
      name: "Social Media Management",
      description: "Organic and paid social programs with monthly reporting.",
      pricingModel: "retainer",
      selected: false,
    },
    {
      id: "paid-media",
      name: "Paid Media Campaigns",
      description:
        "LinkedIn, search, and trade media campaign planning and optimization.",
      pricingModel: "project",
      selected: false,
    },
    {
      id: "web-design",
      name: "Website Design and Development",
      description: "UX, design systems, and launch-ready marketing sites.",
      pricingModel: "project",
      selected: false,
    },
    {
      id: "content-video",
      name: "Content and Video Production",
      description: "Campaign assets, explainers, and product launch content.",
      pricingModel: "project",
      selected: false,
    },
  ];
}
