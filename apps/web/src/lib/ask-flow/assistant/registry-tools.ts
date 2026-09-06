import {
  missingRegistrationFields,
  northstarBusinessRegistrySeed,
  presentBusinessRegistry,
  permissionsForRegistryRole,
  NORTHSTAR_ORG_ID,
} from "@flow/contracts";
import { isBusinessRegistryActive } from "../../business-registry/store";
import type { AskApplicationContext } from "../types";
import type { AskToolCall, AskToolResult } from "./types";

const AS_OF = "3 September 2026, 08:12 America/Chicago";
const FICTIONAL =
  "This is fictional demonstration company data for Northstar Creative. It is not a real registrant.";

const REGISTRY_TOOLS = new Set([
  "get_business_profile",
  "get_business_registration",
  "list_business_locations",
  "get_business_firmographics",
  "list_authorised_signatories",
  "list_expiring_business_documents",
  "list_compliance_obligations",
  "explain_business_structure",
  "propose_business_profile_update",
  "propose_location_change",
]);

const PARTIAL_MISSING = [
  "Registration identifier",
  "Primary location for correspondence",
  "At least one authorised signatory",
] as const;

function deny(
  name: AskToolCall["name"],
  workspaceId: string,
  message: string,
  code: NonNullable<AskToolResult["error"]>["code"] = "unavailable",
): AskToolResult {
  return {
    ok: false,
    name,
    workspaceId,
    recordIds: [],
    asOf: AS_OF,
    values: {},
    evidence: [],
    related: [],
    actions: [],
    error: { code, message },
  };
}

function roleFromContext(context: AskApplicationContext): "founder" | "finance" | "operations" | "employee" {
  const role = context.role.toLowerCase();
  if (role.includes("founder") || role.includes("admin") || role.includes("owner")) {
    return "founder";
  }
  if (role.includes("finance")) return "finance";
  if (role.includes("ops") || role.includes("operations")) return "operations";
  return "employee";
}

function permissionsFor(context: AskApplicationContext) {
  if (
    context.visibleRecordPermissions &&
    context.visibleRecordPermissions.length > 0
  ) {
    return context.visibleRecordPermissions;
  }
  const hasRegistryManage =
    context.permissions.includes("organization.update_profile") ||
    context.permissions.includes("registry.tax.manage") ||
    context.permissions.includes("location.manage") ||
    context.permissions.includes("registry.signatory.manage");
  return hasRegistryManage
    ? context.permissions
    : permissionsForRegistryRole(roleFromContext(context));
}

function seedView(context: AskApplicationContext) {
  const seed = context.businessRegistry ?? northstarBusinessRegistrySeed();
  return presentBusinessRegistry(seed, permissionsFor(context));
}

function cite(
  id: string,
  label: string,
  href: string,
  snapshotId?: string,
) {
  return {
    id,
    kind: "system-record" as const,
    label,
    source: snapshotId
      ? `Business Registry · ${snapshotId}`
      : "Business Registry",
    capturedAtLabel: AS_OF,
    claim: "FACT" as const,
    trust: "high" as const,
    href,
  };
}

function incompleteAnswer(
  call: AskToolCall,
  context: AskApplicationContext,
): AskToolResult {
  const seed = context.businessRegistry ?? northstarBusinessRegistrySeed();
  const href = `/${context.workspaceId}/admin/settings/business`;
  const verified = [
    seed.tradingName ? `Trading name: ${seed.tradingName}` : null,
    seed.legalName ? `Legal name: ${seed.legalName}` : null,
    seed.operatingJurisdiction
      ? `Jurisdiction: United States · ${seed.operatingJurisdiction}`
      : null,
    seed.timezone && seed.currency
      ? `Timezone / currency: ${seed.timezone} · ${seed.currency}`
      : null,
  ].filter(Boolean) as string[];
  const missing =
    missingRegistrationFields(seed).length > 0
      ? missingRegistrationFields(seed)
      : [...PARTIAL_MISSING];
  const answer = [
    "Northstar’s fictional registration profile is incomplete.",
    verified.length
      ? `The currently verified fields are ${verified.join("; ")}.`
      : "No registration fields are verified yet.",
    `The following required fields are still missing: ${missing.join("; ")}.`,
    FICTIONAL,
  ].join(" ");

  return {
    ok: true,
    name: call.name,
    workspaceId: context.workspaceId,
    recordIds: [seed.organizationId || NORTHSTAR_ORG_ID],
    asOf: AS_OF,
    values: {
      fictional: FICTIONAL,
      incomplete: true,
      demoState: context.demoState,
      snapshotId: context.snapshotId,
      verified,
      missing,
      answer,
    },
    evidence: [
      cite(
        seed.organizationId || NORTHSTAR_ORG_ID,
        "Incomplete registration profile",
        href,
        context.snapshotId,
      ),
    ],
    related: [
      {
        id: seed.organizationId || NORTHSTAR_ORG_ID,
        label: seed.legalName || "Northstar Creative LLC",
        href,
      },
    ],
    actions: [
      {
        id: "complete",
        label: "Complete registration",
        href: `${href}?state=partial`,
      },
    ],
  };
}

export function runRegistryAskTool(
  call: AskToolCall,
  context: AskApplicationContext,
): AskToolResult | null {
  if (!REGISTRY_TOOLS.has(call.name)) return null;
  const active = Array.isArray(context.activeBuildingBlocks)
    ? context.activeBuildingBlocks.includes("registry.business")
    : isBusinessRegistryActive();
  if (!active) {
    return deny(
      call.name,
      context.workspaceId,
      "Business Registry is not active in this workspace.",
    );
  }

  const demoState = (context.demoState ?? "populated").toLowerCase();
  if (demoState === "empty") {
    return deny(
      call.name,
      context.workspaceId,
      "Business Registry has no company profile yet.",
    );
  }
  if (demoState === "loading") {
    return deny(
      call.name,
      context.workspaceId,
      "Business Registry is still loading.",
    );
  }
  if (demoState === "error") {
    return deny(
      call.name,
      context.workspaceId,
      "Business Registry could not load. Canonical records were not deleted.",
    );
  }
  if (demoState === "partial" || demoState === "missing" || demoState === "missing-information") {
    return incompleteAnswer(call, context);
  }

  const href = `/${context.workspaceId}/admin/settings/business`;
  const view = seedView(context);
  const seed = view.profile;
  const snap = context.snapshotId;

  if (call.name === "get_business_profile" || call.name === "explain_business_structure") {
    return {
      ok: true,
      name: call.name,
      workspaceId: context.workspaceId,
      recordIds: [seed.organizationId],
      asOf: AS_OF,
      values: {
        fictional: FICTIONAL,
        tradingName: seed.tradingName,
        legalName: seed.legalName,
        organizationId: seed.organizationId,
        demoKey: seed.demoKey,
        snapshotId: snap,
        structure: `${seed.legalName} is an Illinois LLC. Maya Chen holds 70% and Ellis Holdings DEMO holds 30%.`,
      },
      evidence: [cite(seed.organizationId, seed.legalName, href, snap)],
      related: [{ id: seed.organizationId, label: seed.legalName, href }],
      actions: [],
    };
  }

  if (call.name === "get_business_registration") {
    const chicago = seed.locations.find((row) => row.isPrimary);
    return {
      ok: true,
      name: call.name,
      workspaceId: context.workspaceId,
      recordIds: [seed.organizationId, chicago?.id ?? ""],
      asOf: AS_OF,
      values: {
        fictional: FICTIONAL,
        legalName: seed.legalName,
        registrationNumber: seed.registrationNumber,
        jurisdiction: `United States, ${seed.operatingJurisdiction}`,
        office: chicago
          ? `${chicago.addressLine1}, ${chicago.city}, ${chicago.region}`
          : "",
        snapshotId: snap,
      },
      evidence: [
        cite(seed.organizationId, seed.registrationNumber, href, snap),
        cite(chicago?.id ?? seed.organizationId, "Chicago headquarters", href, snap),
      ],
      related: [{ id: seed.organizationId, label: seed.legalName, href }],
      actions: [],
    };
  }

  if (call.name === "list_business_locations") {
    const activeLocations = seed.locations.filter((row) => row.status === "ACTIVE");
    return {
      ok: true,
      name: call.name,
      workspaceId: context.workspaceId,
      recordIds: activeLocations.map((row) => row.id),
      asOf: AS_OF,
      values: {
        fictional: FICTIONAL,
        snapshotId: snap,
        locations: activeLocations.map((row) => ({
          name: row.name,
          city: row.city,
          timezone: row.timezone,
          primary: row.isPrimary,
        })),
      },
      evidence: activeLocations.map((row) => cite(row.id, row.name, href, snap)),
      related: activeLocations.map((row) => ({
        id: row.id,
        label: row.name,
        href,
      })),
      actions: [],
    };
  }

  if (call.name === "get_business_firmographics") {
    return {
      ok: true,
      name: call.name,
      workspaceId: context.workspaceId,
      recordIds: [seed.organizationId],
      asOf: AS_OF,
      values: {
        fictional: FICTIONAL,
        snapshotId: snap,
        industry: seed.firmographics.industry,
        employeeTarget: seed.firmographics.employeeCountTarget.value,
        employeeActual: seed.firmographics.employeeCountActual.value,
        revenueBand: seed.firmographics.annualRevenueBand,
      },
      evidence: [cite(seed.organizationId, "Firmographics", href, snap)],
      related: [{ id: seed.organizationId, label: seed.legalName, href }],
      actions: [],
    };
  }

  if (call.name === "list_authorised_signatories") {
    if (seed.signatories.length === 0) {
      return deny(
        call.name,
        context.workspaceId,
        `Your role (${context.role}) cannot read authorised signatories.`,
        "permission_denied",
      );
    }
    return {
      ok: true,
      name: call.name,
      workspaceId: context.workspaceId,
      recordIds: seed.signatories.map((row) => row.id),
      asOf: AS_OF,
      values: {
        fictional: FICTIONAL,
        snapshotId: snap,
        signatories: seed.signatories.map((row) => ({
          name: row.name,
          title: row.title,
          authority: row.authority,
        })),
      },
      evidence: seed.signatories.map((row) => cite(row.id, row.name, href, snap)),
      related: seed.signatories.map((row) => ({
        id: row.id,
        label: row.name,
        href,
      })),
      actions: [],
    };
  }

  if (
    call.name === "list_expiring_business_documents" ||
    call.name === "list_compliance_obligations"
  ) {
    const due = seed.documents.filter(
      (row) => row.urgency === "due_30" || row.urgency === "due_90",
    );
    return {
      ok: true,
      name: call.name,
      workspaceId: context.workspaceId,
      recordIds: due.map((row) => row.id),
      asOf: AS_OF,
      values: {
        fictional: FICTIONAL,
        snapshotId: snap,
        documents: due.map((row) => ({
          title: row.title,
          reference: row.reference,
          expiry: row.expiryOrReviewDate,
          urgency: row.urgency,
          owner: row.ownerName,
        })),
      },
      evidence: due.map((row) => cite(row.id, row.reference, href, snap)),
      related: due.map((row) => ({
        id: row.id,
        label: row.title,
        href,
      })),
      actions: [],
    };
  }

  return {
    ok: true,
    name: call.name,
    workspaceId: context.workspaceId,
    recordIds: [seed.organizationId],
    asOf: AS_OF,
    values: {
      fictional: FICTIONAL,
      snapshotId: snap,
      note: "Proposed. A founder must approve before the canonical company record changes.",
    },
    evidence: [cite(seed.organizationId, seed.legalName, href, snap)],
    related: [{ id: seed.organizationId, label: seed.legalName, href }],
    actions: [{ id: "approve", label: "Review proposal", href }],
  };
}
