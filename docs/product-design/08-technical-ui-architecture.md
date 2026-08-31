# 08 — Technical UI Architecture

Planning specification for frontend implementation. **No code in this document.**

## Stack alignment

Build on the existing monorepo; do not introduce parallel frontend applications.

| Layer         | Choice                              | Rationale                                                                    |
| ------------- | ----------------------------------- | ---------------------------------------------------------------------------- |
| Framework     | Next.js 16 (App Router)             | Already in `apps/web`; ADR-003                                               |
| Language      | TypeScript                          | Monorepo standard                                                            |
| Styling       | CSS Modules + CSS custom properties | Token-driven; no Tailwind required initially; matches existing `globals.css` |
| Components    | React 19                            | Already installed                                                            |
| Icons         | Lucide React                        | MIT; matches design spec                                                     |
| Fonts         | `next/font` (Inter)                 | Performance, no layout shift                                                 |
| Forms         | React Hook Form + Zod               | Validation at trust boundary; shared schemas with API                        |
| Server state  | TanStack Query                      | Cache, retry, optimistic updates for record lists                            |
| URL state     | `nuqs` or Next.js `searchParams`    | Filters, tabs, drawer open state                                             |
| Tables        | TanStack Table                      | Headless; matches design system table spec                                   |
| Auth          | Supabase Auth (client)              | ADR-013; `@flow/auth` adapter on server                                      |
| API transport | REST to NestJS `apps/api`           | Existing API shell; extend with versioned routes                             |

### Deferred (not Phase 1)

| Technology                   | When                                                              |
| ---------------------------- | ----------------------------------------------------------------- |
| Tailwind / shadcn            | Phase 2+ if velocity requires; tokens must remain source of truth |
| Storybook                    | Phase 2 component library                                         |
| Playwright E2E               | Phase 1 exit or Phase 2 entry                                     |
| Realtime (Supabase Realtime) | Phase 5+ for collaborative editing                                |

---

## Application structure (planned)

```text
apps/web/src/
  app/                          # Next.js App Router
    (public)/                   # Marketing, sign-in, sign-up
    (auth)/                     # Authenticated layout wrapper
      [workspace]/
        (admin)/                # Founder portal routes
        (work)/                 # Employee portal routes
        (client)/               # Client portal routes
        (vendor)/               # Vendor portal routes
        onboarding/             # Onboarding flow
  components/
    ui/                         # Design system primitives
    shell/                      # AppHeader, AppSidebar, PortalSwitcher
    twin/                       # Business Twin surfaces
    ask-flow/                   # Ask Flow panel
    voice/                      # Voice overlay
    guard/                      # Guard preview
    proof/                      # Proof chips and drawer
  lib/
    api/                        # Typed API client
    auth/                       # Session helpers
    tokens/                     # CSS variable injection for white-label
  hooks/
  types/                        # UI-specific types; domain types from packages
```

Route groups mirror [02-information-architecture.md](./02-information-architecture.md).

---

## Boundary rules

### Frontend must not

- Enforce authoritative permissions (display hints only; server returns 403)
- Calculate authoritative financial numbers (display Logic results from API)
- Call LLM providers directly (all intelligence via API → BLM runtime)
- Store service-role keys or secrets
- Bypass Guard for mutations

### Frontend must

- Send `Authorization`, `x-flow-workspace-id`, `x-correlation-id` on API requests
- Render Guard preview before confirming `REQUIRES_APPROVAL` actions
- Show Proof claim types on AI-assisted content
- Respect portal route prefixes
- Support light/dark via `data-theme` attribute on `<html>`

---

## API contract shape (UI-facing)

Versioned REST under `/api/v1/` on NestJS (or Next.js BFF proxy — **decision required**; see PO questions).

### Phase 1 endpoints (planned)

| Method | Path                                  | Purpose                         |
| ------ | ------------------------------------- | ------------------------------- |
| POST   | `/auth/session`                       | Establish session (if BFF)      |
| GET    | `/workspaces/:id`                     | Workspace metadata              |
| PATCH  | `/workspaces/:id/onboarding`          | Save onboarding section         |
| POST   | `/workspaces/:id/onboarding/complete` | Trigger Twin compile            |
| GET    | `/workspaces/:id/twin`                | Twin snapshot                   |
| GET    | `/workspaces/:id/setup-plan`          | Module recommendations          |
| GET    | `/workspaces/:id/modules`             | Available + recommended modules |

### Standard response envelope

```typescript
interface ApiResponse<T> {
  data: T;
  correlationId: string;
  proof?: ProofBundle; // when AI-assisted
  guard?: GuardDecision; // when action evaluated
}
```

### Error envelope

```typescript
interface ApiError {
  code: string;
  message: string;
  correlationId: string;
  guard?: GuardDecision;
}
```

---

## Shared package usage

| Package               | UI usage                                         |
| --------------------- | ------------------------------------------------ |
| `@flow/contracts`     | Type-only imports for Action, Guard, Actor types |
| `@flow/blm-contracts` | Module names, semantic IDs for labels            |
| `@flow/auth`          | Server-side session verification only            |
| `@flow/config`        | Runtime config                                   |

Do **not** import `@flow/blm-core` or `@flow/database` in client components.

---

## Authentication flow

```text
Browser → Supabase Auth (sign-in) → session JWT
       → Next.js middleware: verify session, resolve workspace membership
       → API requests: Bearer token + workspace header
       → NestJS: SupabaseAuthAdapter or StaticToken (dev)
       → ActorContext → Action Wall
```

Middleware responsibilities:

1. Redirect unauthenticated users from `/(auth)/*` to `/sign-in`
2. Redirect incomplete onboarding to `/:workspace/onboarding`
3. Set `data-theme` from user preference cookie
4. Inject workspace brand CSS variables

---

## State management

| State type                           | Approach                                   |
| ------------------------------------ | ------------------------------------------ |
| Server records                       | TanStack Query                             |
| Auth session                         | Supabase client + React context            |
| UI chrome (sidebar collapsed, theme) | `localStorage` + React context             |
| Ask Flow thread                      | Session-scoped; server persistence Phase 8 |
| Voice state machine                  | React reducer; ephemeral                   |
| Onboarding draft                     | Auto-save to API on debounce (500ms)       |

No global Redux store.

---

## Intelligence UI integration (later phases)

```text
UI → POST /api/v1/ask { workspaceId, context, message }
   → API → BLM runtime plane → reasoning adapter
   → Response { text, proof, suggestedActions[] }
   → UI renders; suggestedActions open Guard preview if mutating
```

Voice path:

```text
UI → Web Speech API (STT) → text
   → same /ask endpoint
   → TTS optional (user-initiated play only; no autoplay)
```

---

## Theming implementation

1. `tokens.css` — platform tokens (design spec)
2. `theme-light.css` / `theme-dark.css` — semantic overrides
3. `WorkspaceThemeProvider` — injects `--color-brand*` from workspace config
4. `document-theme.css` — proposal/contract print and client portal

---

## Performance targets

| Metric                            | Target            |
| --------------------------------- | ----------------- |
| LCP (authenticated home)          | < 2.5s            |
| First onboarding step interactive | < 1.5s            |
| Route transition                  | < 300ms perceived |
| Ask Flow first token (Phase 8)    | < 2s P95          |

---

## Testing strategy

| Layer         | Tool                           |
| ------------- | ------------------------------ |
| Unit          | Vitest (existing)              |
| Component     | Vitest + React Testing Library |
| Accessibility | axe-core in component tests    |
| E2E           | Playwright (Phase 2+)          |
| Visual        | Chromatic or Percy (Phase 5+)  |

---

## API dev server note

`apps/api` watch mode has a `dist/main` path mismatch. **Pre-Phase 1 engineering task:** fix NestJS `outDir`/`rootDir` or entry script. UI development can proceed against `nest build` + `node` or a corrected watch script.

---

## Security checklist (UI)

- [ ] CSP headers on Next.js
- [ ] No secrets in `NEXT_PUBLIC_*`
- [ ] Signed URLs for client proposal preview
- [ ] CSRF protection on cookie-based auth (if BFF)
- [ ] Rate limit on `/ask` and auth routes
