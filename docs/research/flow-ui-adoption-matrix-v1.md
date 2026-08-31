# Flow UI Adoption Matrix v1

Phase 5.5 research for external UI patterns. **No GPL/AGPL code copied.** Pattern-only entries are reimplemented with Flow tokens.

| Resource | License | Useful pattern | Adopt / Adapt / Reject | Exact planned use | Integration cost | Risk |
| -------- | ------- | -------------- | ---------------------- | ----------------- | ---------------- | ---- |
| [shadcn/ui](https://github.com/shadcn-ui/ui) | MIT | Accessible primitives, focus rings | **Reject** (full) | — | High — Radix + Tailwind stack not in repo | Bundle + styling divergence |
| [Radix Primitives](https://github.com/radix-ui/primitives) | MIT | Focus trap, dialog semantics | **Adapt** | Ask Flow drawer focus/Escape behavior mirrored in CSS + native dialog patterns | Low | None — no dependency added |
| [Tremor](https://github.com/tremorlabs/tremor) | Apache-2.0 | Dashboard KPI cards | **Reject** | — | Medium | Encourages decorative metrics |
| [Recharts](https://github.com/recharts/recharts) | MIT | Chart shells | **Reject** (Phase 5.5) | Reporting hub uses links, not charts | Medium bundle | Fake chart temptation |
| [TanStack Table](https://github.com/TanStack/table) | MIT | Dense data tables | **Reject** (defer) | Existing list markup sufficient | Medium | YAGNI for this sprint |
| [cmdk](https://github.com/pacocoursey/cmdk) | MIT | Command palette | **Adapt** (pattern) | Ask Flow intent chips, not full command menu | Low | Scope creep if expanded |
| [Vercel Geist](https://vercel.com/font) | SIL OFL | Sans typography | **Reject** | System/ui-sans stack already in tokens | Low | License OK but unnecessary |
| [IBM Plex Sans](https://github.com/IBM/plex) | SIL OFL | Readable body | **Reject** (defer) | Keep system sans for body | Low | Font flash risk |
| [Nothing Dot Matrix](https://nothing.tech) | Proprietary brand | Dotted surface texture | **Adapt** (pattern) | Subtle `radial-gradient` dot on mission context only | Low | Overuse hurts readability |
| [Lucide](https://github.com/lucide-icons/lucide) | ISC | Sidebar icons | **Adopt** | Already installed — lifecycle nav icons | None | None |
| Internal WIP `efffd21` | Internal | MissionScreen, LifecycleHub, os.css | **Adapt** | Selectively ported to current branch | Low | Must not cherry-pick wholesale |
| Flow `tokens.css` | Internal | Semantic colors, Proof/Guard | **Adopt** | Extended with `--color-text-tertiary`, os layer | Low | None |
| Flow `CommercialRoute` | Internal | Shell + data gate | **Adopt** | Lifecycle hub pages | None | None |
| Flow `northstar-store` | Internal | Demo isolation | **Adopt** | Northstar journey unchanged | None | Cross-tenant if misused |

## Summary decisions

- **No new chart or table dependencies** for Phase 5.5.
- **No shadcn/Tailwind migration** — extend CSS modules + global tokens.
- **Lucide + existing Button/Display** remain the component registry.
- **Ask Flow** is a governed drawer, not an embedded chat SDK.
- **Nothing-inspired** treatment limited to dotted mission context background.

## Maintenance notes

Revisit Tremor/Recharts when finance module ships real time-series data. Revisit cmdk if global search ships with server-backed indices.
