---
name: flow-supabase-safety
description: Supabase migration safety, RLS verification, and cross-tenant denial for Flow. Use before applying migrations, creating tenant tables, or claiming database closure.
disable-model-invocation: true
---

# Flow Supabase Safety

## Allowed project

```text
zuvtnmmnwohrapaecsuj
```

Never access the retired apptech project.

## Pre-migration checklist

```bash
npx supabase@2.116.0 migration list --linked
npx supabase@2.116.0 db push --dry-run
```

1. Confirm linked project ref matches `zuvtnmmnwohrapaecsuj`
2. Dry-run shows only intended migration(s)
3. SQL reviewed for additive-only changes
4. No destructive alteration of prior migrations

## New tenant table requirements

- `workspace_id` on every tenant-owned record
- RLS enabled
- Permission-aware policies
- Foreign keys and indexes
- Cross-tenant denial tested

## Post-migration

```bash
pnpm db:rls:commercial   # when applicable
```

Run Supabase advisors; resolve ERROR findings introduced by the change.

## Evidence to record

- Migration name and timestamp
- `migration list` output
- `db push --dry-run` output
- RLS policy summary
- Cross-tenant test result
- Advisor result (errors vs warnings)

Never expose service-role keys or connection strings in reports.
