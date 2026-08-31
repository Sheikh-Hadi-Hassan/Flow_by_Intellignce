import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  FileSignature,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Search,
  Users,
} from "lucide-react";

export interface LifecycleNavItem {
  readonly id: string;
  readonly label: string;
  readonly shortLabel?: string;
  readonly href: string;
  readonly icon: LucideIcon;
  readonly exact?: boolean;
}

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
      id: "sales",
      label: "Sales",
      href: `${base}/clients`,
      icon: Users,
    },
    {
      id: "discovery",
      label: "Discovery",
      href: `${base}/opportunities`,
      icon: Search,
    },
    {
      id: "proposal",
      label: "Proposal",
      href: `${base}/lifecycle/proposals`,
      icon: FileText,
    },
    {
      id: "contracts",
      label: "Contracts",
      href: `${base}/lifecycle/contracts`,
      icon: FileSignature,
    },
    {
      id: "projects",
      label: "Projects",
      href: `${base}/lifecycle/projects`,
      icon: FolderKanban,
    },
    {
      id: "reporting",
      label: "Reporting",
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
    case "sales":
      return pathname.includes("/admin/clients");
    case "discovery":
      return (
        pathname.includes("/admin/opportunities") &&
        !pathname.includes("/proposal") &&
        !pathname.includes("/contract") &&
        !pathname.includes("/project")
      );
    case "proposal":
      return (
        pathname.includes("/lifecycle/proposals") ||
        pathname.includes("/proposal")
      );
    case "contracts":
      return (
        pathname.includes("/lifecycle/contracts") ||
        pathname.includes("/contract")
      );
    case "projects":
      return (
        pathname.includes("/lifecycle/projects") ||
        pathname.includes("/project")
      );
    case "reporting":
      return pathname.includes("/lifecycle/reporting");
    default:
      return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
}

/** Mobile bottom bar — highest-traffic lifecycle stages */
export const MOBILE_LIFECYCLE_NAV_IDS = [
  "mission",
  "sales",
  "discovery",
  "projects",
] as const;
