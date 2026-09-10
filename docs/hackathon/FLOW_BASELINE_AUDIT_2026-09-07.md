# Flow Baseline Audit - 2026-09-07

## Freeze Point

- Canonical repository: `/Users/sheikhhadihassan/Documents/Flow by Intellignce`
- Remote: `https://github.com/Sheikh-Hadi-Hassan/Flow_by_Intellignce.git`
- Branch: `deploy/bird-eye-current`
- HEAD: `d981fcd51037f43eb3aae77b063ff6be2177247c`
- Package manager: `pnpm@11.16.0`
- Runtime: Node.js `v22.21.0`
- Working tree was dirty before this audit. Existing modifications were preserved.
- Baseline classification: **PARTIAL**. The application builds and the local investor lifecycle passes, but the unit, lint, formatting, database-lint, persistence-integration, and OSS-foundation gates are not all green.

## Current-State Map

| Boundary              | Current evidence                                                                                                                                                         | Status                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| Web                   | Next.js application under `apps/web`; 48 routes reported by production build                                                                                             | Implemented                                                 |
| API                   | NestJS modular application under `apps/api`                                                                                                                              | Implemented                                                 |
| Shared business logic | Deterministic commercial calculations and lifecycle machines in `packages/commercial`                                                                                    | Implemented                                                 |
| Authorization         | Trusted server context, workspace checks, permissions, RLS, tool registry, and `StaticActionWall`/provider-backed Action Wall contracts                                  | Implemented foundation                                      |
| Persistence           | PostgreSQL repositories with development/test in-memory fallback; 20 Supabase migrations                                                                                 | Implemented but live integration not verified in this audit |
| Ask Flow              | Server-owned request context, deterministic command/query routes, local fallback, optional OpenRouter route                                                              | Implemented with one governance-test conflict               |
| BLM                   | Root scripts reference BLM packages, but the current Git tree contains no tracked BLM package source or package manifests; only ignored generated remnants exist locally | Not reproducible from Git                                   |
| Local orchestration   | No Docker Compose file or Flow local orchestrator is present                                                                                                             | Missing                                                     |
| Twenty                | No tracked integration, provider contract, version pin, or license record                                                                                                | Missing P0 foundation                                       |
| Penpot                | No tracked integration, provider contract, version pin, or license record                                                                                                | Missing P0 foundation                                       |
| Documenso CE          | No tracked integration, provider contract, version pin, or license record                                                                                                | Missing signing foundation                                  |

## Golden Lifecycle

| Stage                  | Current implementation evidence                                                                                                           | Baseline status                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Service                | Commercial service/application routes and persistence migration                                                                           | Available                                                    |
| Questionnaire / Intake | Questionnaire domain, UI routes, audit migration, and tests                                                                               | Available                                                    |
| Client / Contact       | CRM Core seed/store, application service, and client routes                                                                               | Available; not Twenty-backed                                 |
| Opportunity            | Commercial application service, migration, and UI routes                                                                                  | Available; not Twenty-backed                                 |
| Discovery              | Discovery source, extraction, verification, and UI flow                                                                                   | Available                                                    |
| Approved Brief         | Versioned brief lifecycle and approval paths                                                                                              | Available                                                    |
| Proposal               | Deterministic generation and version lifecycle                                                                                            | Available                                                    |
| Contract               | Version lifecycle and controlled acceptance/execution                                                                                     | Available                                                    |
| Signature / Execution  | Demo-controlled execution only; no Documenso integration or webhook evidence                                                              | Partial                                                      |
| Project                | Project engine, persistence, lifecycle, UI, and demo command                                                                              | Available                                                    |
| Tasks                  | Project-generated tasks and controlled demo completion command                                                                            | Partial; generic task records remain unavailable             |
| Employee Assignment    | Resource/capacity service and demo assignment                                                                                             | Available foundation                                         |
| Task Completion        | Demonstrated through `delivery.complete_task` and Action Wall                                                                             | Demo-available                                               |
| Delivery Performance   | Demo-only score with documented formula                                                                                                   | Demo-only; not governed production truth                     |
| Invoice                | Read-oriented seed/Ask concepts exist, but no permanent executed-contract invoice generation application service or golden command exists | Missing                                                      |
| Reporting              | Reporting route and mission-control selectors exist                                                                                       | Partial; golden lifecycle reporting is not end-to-end proven |

## Permanent Command Baseline

1. `Generate a proposal for Acme Robotics from the approved questionnaire.` - passes local browser replay.
2. `Start the Acme project from the executed contract.` - passes local browser replay.
3. `Mark the Acme homepage design task complete: 7 hours, quality 5.` - passes local browser replay with 420 minutes, quality 5, and demo score 100.
4. `Generate the Acme invoice from the executed contract.` - not implemented.

The first three commands use one deterministic command bridge, server-owned identifiers, `StaticActionWall`, idempotent record reuse, one execution, and one evidence emission. The state is process-memory demo state and is not production persistence.

## Persistence And Security

- Supabase remains the declared PostgreSQL/Auth/RLS platform.
- The repository contains 20 ordered migrations with 112 `create table` statements, 63 RLS-enable statements, and 215 policy statements.
- API persistence selects PostgreSQL when `DATABASE_URL` is configured and fails closed for production without database configuration.
- Development and test may use explicit in-memory repositories.
- The authenticated commercial Playwright suite was skipped because its explicit Supabase service credential/test gate was unavailable. No live RLS or migration parity claim is made.
- The secret scan passed. No secret values were printed or added.

## Baseline Verification

| Command                                         | Result                                                                                                     |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`                                | PASS across 10 configured projects                                                                         |
| `pnpm build`                                    | PASS; all packages and 48 Next routes built                                                                |
| `pnpm test`                                     | FAIL: 693 passed, 1 failed, 11 skipped                                                                     |
| `pnpm lint`                                     | FAIL: generated ignored files under `packages/contracts/src` are linted, plus 3 existing typed lint errors |
| `pnpm format:check`                             | FAIL: 253 files reported                                                                                   |
| `pnpm db:lint`                                  | FAIL: referenced `scripts/db-lint.mjs` does not exist                                                      |
| `pnpm quality:hooks:test`                       | PASS: 16/16                                                                                                |
| `pnpm quality:secret-scan`                      | PASS                                                                                                       |
| Focused investor lifecycle Playwright           | PASS: 1/1                                                                                                  |
| Authenticated commercial golden path Playwright | SKIPPED: 1; environment gate not satisfied                                                                 |
| Web health                                      | PASS: HTTP 200 on `http://localhost:3000/`                                                                 |

### Unit Failure

`apps/web/src/lib/ask-flow/business-query/business-query.test.ts` asserts that no registered tool name may contain `task`. The current golden demo intentionally registers the server-owned `delivery.complete_task` mutation. Generic task list/count queries still return `CAPABILITY_UNAVAILABLE` without adapter execution. This is a contract conflict requiring an explicit governance decision; the test was not weakened during this audit.

## Resource Baseline

- Initial free disk space: approximately 1.1 GiB.
- `apps/web/.next` initially consumed approximately 2.3 GiB.
- The running development server was stopped, only the ignored `.next` cache was cleared, and verification was rerun.
- Free disk after build, browser verification, and dev-server restart: approximately 1.8 GiB.
- The web development server was restarted and returned HTTP 200.
- Running Twenty, Penpot, and Documenso together on this machine is not an acceptable baseline. Future orchestration must use mutually selective profiles and explicit cleanup commands.

## Provider And License Gate

No new dependency or provider was added. Twenty, Penpot, and Documenso CE are mandatory product decisions but are not adopted in the current Git baseline. Exact upstream commit/version, license scope, excluded commercial directories, self-host procedure, data authority, failure behavior, and replacement boundary must be documented before each provider is integrated.

Existing optional OpenRouter/OpenAI references predate this audit. They do not satisfy the no-new-paid-provider rule for the required local OSS foundations.

## Known Risks

1. The checked-in root README materially understates the implemented application and is stale.
2. BLM commands in the root package manifest are not reproducible from tracked package source in this checkout.
3. The full unit suite is red because task capability governance and the golden demo tool contract disagree.
4. Lint and repository-wide formatting gates are red.
5. The database-lint command points to a missing script.
6. Live Supabase migration/RLS parity was not verified.
7. The demo lifecycle is process-memory state, not authoritative persisted state.
8. Contract signing is not connected to Documenso and invoice generation is absent.
9. Twenty, Penpot, and Documenso have no exact pins or provider boundaries in the canonical repository.
10. Disk headroom remains too small for concurrent heavy OSS runtimes.

## Next Job

`FLOW-BASELINE-01` - reconcile the `delivery.complete_task` governance contract, restore reproducible BLM package ownership or remove stale scripts, repair the missing database-lint entry point, and return unit/lint gates to green without adding product capability. Do not begin OSS provider integration until this baseline-hardening gate passes.
