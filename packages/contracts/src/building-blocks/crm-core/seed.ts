import type { CrmClientType, CrmLifecycleStage } from "./config.js";

export interface CrmOwnerRef {
  readonly id: string;
  readonly name: string;
  readonly role: string;
}

export interface CrmContactSeed {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly title: string;
  readonly email: string;
  readonly isPrimary: boolean;
}

export interface CrmInteractionSeed {
  readonly id: string;
  readonly atLabel: string;
  readonly daysAgo: number;
  readonly actorName: string;
  readonly kind: "email" | "meeting" | "note";
  readonly summary: string;
}

export interface CrmRelatedRef {
  readonly kind: "opportunity" | "project" | "contract" | "invoice";
  readonly id: string;
  readonly label: string;
  readonly href: string;
}

export interface CrmClientSeed {
  readonly id: string;
  readonly demoKey: string;
  readonly name: string;
  readonly industry: string;
  readonly website: string;
  readonly clientType: CrmClientType;
  readonly lifecycleStage: CrmLifecycleStage;
  readonly status: "active" | "prospect" | "archived";
  readonly owner: CrmOwnerRef;
  readonly healthScore: number;
  readonly lastInteractionLabel: string;
  readonly daysSinceInteraction: number;
  readonly contacts: readonly CrmContactSeed[];
  readonly interactions: readonly CrmInteractionSeed[];
  readonly related: readonly CrmRelatedRef[];
  readonly isDemo: true;
}

export interface CrmDuplicateSeed {
  readonly id: string;
  readonly leftId: string;
  readonly rightId: string;
  readonly score: number;
  readonly reason: string;
  readonly status: "open" | "proposed" | "merged";
}

const OWNERS: readonly CrmOwnerRef[] = [
  { id: "ns-res-maya", name: "Maya Chen", role: "Founder" },
  { id: "ns-res-ops", name: "Jordan Ellis", role: "Operations lead" },
  { id: "ns-res-strategist", name: "Avery Brooks", role: "Brand strategist" },
  { id: "ns-res-designer", name: "Sam Rivera", role: "Designer" },
];

const INDUSTRIES = [
  "healthcare",
  "finance",
  "logistics",
  "energy",
  "food",
  "software",
  "retail",
  "education",
] as const;

const STAGES: readonly CrmLifecycleStage[] = [
  "active",
  "active",
  "active",
  "lead",
  "dormant",
  "at_risk",
  "former",
];

const GENERATED_NAMES = [
  "Harbor & Pine",
  "Northglass Studio",
  "Cedarline Partners",
  "Brightline Media",
  "Brightline Media LLC",
  "Ironclad Goods",
  "Fieldnote Press",
  "Silvermint Labs",
  "Cove & Timber",
  "Redline Athletics",
  "Paperstone Co",
  "Alpine Circuit",
  "Moonwell Audio",
  "Third Rail Brands",
  "Lowland Ceramics",
  "Arcadia Mutual",
  "Kindling Supply",
  "Overcast Films",
  "Plainspoken",
  "Westfork Legal",
  "Saffron Route",
  "Glasshouse Hotels",
  "Tidal Range",
  "Northroom",
  " Ember & Oak",
  "Quietwork",
  "Foldline Architecture",
  "Hearthside Coffee",
  "Signalmast",
  "Riverwin Distilling",
  " palisade Health",
  "Common Thread",
  "Drydock Marine",
  "Lumenot",
  "Parcel & Page",
  "Afterhours Radio",
  "Stonefruit",
  "Midharbor Bank",
  "Yellowfield Farms",
  "Copperstate",
  "Nightowls",
  "True North Clinics",
  "Windmill Schools",
] as const;

function uuid(n: number): string {
  return `00000000-0000-4000-a000-${n.toString(16).padStart(12, "0")}`;
}

function ownerAt(index: number): CrmOwnerRef {
  return OWNERS[index % OWNERS.length]!;
}

function namedClient(
  n: number,
  name: string,
  industry: string,
  stage: CrmLifecycleStage,
  related: readonly CrmRelatedRef[],
): CrmClientSeed {
  const owner = ownerAt(n);
  const days = stage === "active" ? 6 : stage === "at_risk" ? 48 : stage === "dormant" ? 110 : 20;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    id: uuid(n),
    demoKey: slug,
    name,
    industry,
    website: `https://${slug}.example.test`,
    clientType: stage === "lead" ? "project" : "brand",
    lifecycleStage: stage,
    status: stage === "former" ? "archived" : stage === "lead" ? "prospect" : "active",
    owner,
    healthScore: stage === "at_risk" ? 38 : stage === "dormant" ? 22 : 81,
    lastInteractionLabel: days <= 7 ? "This week" : `${days} days ago`,
    daysSinceInteraction: days,
    contacts: [
      {
        id: uuid(1000 + n),
        firstName: n % 2 === 0 ? "Priya" : "Jonah",
        lastName: n % 2 === 0 ? "Chen" : "Adeyemi",
        title: "Decision maker",
        email: `contact@${slug}.example.test`,
        isPrimary: true,
      },
      {
        id: uuid(1100 + n),
        firstName: n % 2 === 0 ? "Elena" : "Marcus",
        lastName: n % 2 === 0 ? "Voss" : "Hale",
        title: "Day-to-day contact",
        email: `ops@${slug}.example.test`,
        isPrimary: false,
      },
    ],
    interactions: [
      {
        id: uuid(2000 + n),
        atLabel: days <= 7 ? "Today, 08:12" : `${days} days ago`,
        daysAgo: days,
        actorName: owner.name,
        kind: "meeting",
        summary: `Reviewed ${name} relationship and next deliverable.`,
      },
      {
        id: uuid(2100 + n),
        atLabel: `${days + 12} days ago`,
        daysAgo: days + 12,
        actorName: owner.name,
        kind: "email",
        summary: `Sent ${name} a status note on open work.`,
      },
    ],
    related,
    isDemo: true,
  };
}

const NAMED: readonly CrmClientSeed[] = [
  namedClient(1, "Acme Robotics", "software", "active", [
    {
      kind: "opportunity",
      id: "ns-opp-acme",
      label: "Acme Robotics launch brand",
      href: "/northstar-creative/admin/opportunities",
    },
  ]),
  namedClient(2, "Meridian Health", "healthcare", "at_risk", [
    {
      kind: "opportunity",
      id: "ns-opp-meridian",
      label: "Meridian Health proposal",
      href: "/northstar-creative/admin/opportunities",
    },
    {
      kind: "project",
      id: "ns-proj-meridian",
      label: "Meridian Brand Ops",
      href: "/northstar-creative/admin/lifecycle/projects",
    },
  ]),
  namedClient(3, "Northwind Bank", "finance", "active", [
    {
      kind: "contract",
      id: "ns-contract-northwind",
      label: "Northwind redlines",
      href: "/northstar-creative/admin/lifecycle/contracts",
    },
  ]),
  namedClient(4, "Vantage Logistics", "logistics", "active", [
    {
      kind: "project",
      id: "ns-proj-vantage",
      label: "Vantage Brand Ops",
      href: "/northstar-creative/admin/lifecycle/projects",
    },
  ]),
  namedClient(5, "Halcyon Energy", "energy", "active", [
    {
      kind: "invoice",
      id: "ns-inv-halcyon",
      label: "Halcyon Energy invoice",
      href: "/northstar-creative/admin/lifecycle/reporting",
    },
  ]),
  namedClient(6, "Lumen Studios", "retail", "dormant", []),
  namedClient(7, "Kestrel Foods", "food", "active", []),
  namedClient(8, "Orbit Labs", "software", "lead", []),
  namedClient(9, "Cedar Civic", "education", "former", []),
];

function generatedClient(index: number, name: string): CrmClientSeed {
  const n = index + 10;
  const stage = STAGES[index % STAGES.length]!;
  const industry = INDUSTRIES[index % INDUSTRIES.length]!;
  return namedClient(n, name.trim(), industry, stage, []);
}

export function northstarCrmSeed(): {
  readonly clients: readonly CrmClientSeed[];
  readonly duplicates: readonly CrmDuplicateSeed[];
} {
  const generated = GENERATED_NAMES.map((name, index) =>
    generatedClient(index, name),
  );
  const clients = [...NAMED, ...generated];
  const brightline = clients.filter((row) =>
    row.name.startsWith("Brightline Media"),
  );
  return {
    clients,
    duplicates: [
      {
        id: uuid(9001),
        leftId: brightline[0]!.id,
        rightId: brightline[1]!.id,
        score: 92,
        reason: "Near-identical legal names sharing the Brightline Media stem.",
        status: "open",
      },
    ],
  };
}

export function duplicateScore(left: string, right: string): number {
  const a = left.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const b = right.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (a === b) return 100;
  const [short, long] = a.length < b.length ? [a, b] : [b, a];
  if (long.startsWith(short) && short.length >= 8) {
    return Math.round((short.length / long.length) * 100);
  }
  let matches = 0;
  const window = Math.min(short.length, long.length);
  for (let i = 0; i < window; i += 1) {
    if (short[i] === long[i]) matches += 1;
  }
  return Math.round((matches / long.length) * 100);
}

export function segmentIdFor(stage: CrmLifecycleStage): string {
  if (stage === "at_risk") return "seg-risk";
  if (stage === "dormant") return "seg-dormant";
  if (stage === "former") return "seg-former";
  return "seg-active";
}
