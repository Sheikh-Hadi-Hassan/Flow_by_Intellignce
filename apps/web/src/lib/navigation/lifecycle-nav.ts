import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Briefcase,
  DollarSign,
  FolderKanban,
  LayoutDashboard,
  Users,
  UserCircle,
  UsersRound,
} from "lucide-react";

export interface LifecycleNavItem {
  readonly id: string;
  readonly label: string;
  readonly shortLabel?: string;
  readonly href: string;
  readonly icon: LucideIcon;
  readonly exact?: boolean;
}

/** Primary operating navigation — maps to real routes only. */
export function founderLifecycleNav(workspace: string): LifecycleNavItem[] {
  const base = `/${workspace}/admin`;
  return [
    {
      id: "mission",
      label: "Mission Control",
      shortLabel: "Mission",
      href: base,
      icon: LayoutDashboard,
      exact: true,
    },
    {
      id: "clients",
      label: "Clients",
      href: `${base}/clients`,
      icon: Users,
    },
    {
      id: "pipeline",
      label: "Pipeline",
      href: `${base}/opportunities`,
      icon: Briefcase,
    },
    {
      id: "delivery",
      label: "Delivery",
      href: `${base}/lifecycle/projects`,
      icon: FolderKanban,
    },
    {
      id: "team",
      label: "Team",
      href: `${base}/team`,
      icon: UsersRound,
    },
    {
      id: "finance",
      label: "Finance",
      href: `${base}/finance`,
      icon: DollarSign,
    },
    {
      id: "mywork",
      label: "My Work",
      href: `/${workspace}/work`,
      icon: UserCircle,
    },
    {
      id: "reports",
      label: "Reports",
      href: `${base}/lifecycle/reporting`,
      icon: BarChart3,
    },
  ];
}

export function founderUtilityNav(workspace: string) {
  const base = `/${workspace}/admin`;
  return [
    { href: `${base}/twin`, label: "Business Twin" },
    { href: `${base}/setup`, label: "Setup plan" },
    { href: `${base}/services`, label: "Services" },
    { href: `${base}/settings`, label: "Settings" },
  ];
}

export function isLifecycleNavActive(
  pathname: string,
  item: LifecycleNavItem,
): boolean {
  if (item.exact) return pathname === item.href;

  switch (item.id) {
    case "clients":
      return pathname.includes("/admin/clients");
    case "pipeline":
      return (
        pathname.includes("/admin/opportunities") ||
        pathname.includes("/lifecycle/proposals") ||
        pathname.includes("/lifecycle/contracts")
      );
    case "delivery":
      return (
        pathname.includes("/lifecycle/projects") ||
        pathname.includes("/project")
      );
    case "team":
      return pathname.includes("/admin/team");
    case "finance":
      return pathname.includes("/admin/finance");
    case "mywork":
      return pathname.endsWith("/work") || pathname.includes("/work/");
    case "reports":
      return (
        pathname.includes("/lifecycle/reporting") ||
        pathname.includes("/admin/finance/reports")
      );
    default:
      return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
}

export const MOBILE_LIFECYCLE_NAV_IDS = [
  "mission",
  "pipeline",
  "delivery",
  "mywork",
] as const;

export const LIFECYCLE_PIPELINE_STAGES = [
  { id: "lead", label: "Lead", match: () => true },
  {
    id: "discovery",
    label: "Discovery",
    match: (s: string) =>
      s === "collecting_information" || s === "information_missing",
  },
  {
    id: "brief",
    label: "Brief",
    match: (s: string) =>
      s === "ready_for_brief" ||
      s === "brief_draft" ||
      s === "founder_review" ||
      s === "changes_requested",
  },
  {
    id: "proposal",
    label: "Proposal",
    match: (s: string) => s.includes("proposal"),
  },
  {
    id: "contract",
    label: "Contract",
    match: (s: string) => s.includes("contract"),
  },
  {
    id: "project",
    label: "Project",
    match: (s: string) => s === "approved" || s === "executed",
  },
  {
    id: "staffing",
    label: "Staffing",
    match: (s: string) => s === "executed",
  },
  {
    id: "delivery",
    label: "Delivery",
    match: (s: string) => s === "executed",
  },
] as const;
