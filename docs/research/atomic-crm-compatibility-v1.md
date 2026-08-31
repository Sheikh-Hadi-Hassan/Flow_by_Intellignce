# Atomic CRM compatibility report

Inspected repository: `https://github.com/marmelab/atomic-crm`  
Temporary clone: `/tmp/flow-atomic-crm-research` (not committed)  
Pinned commit: `167a4cdb652b1ab2b4b030831cfa7adcf2099321`  
License: MIT (Copyright 2024-present Francois Zaninotto, Marmelab)

## Mapping

| Atomic CRM | Flow decision |
| ---------- | ------------- |
| `companies` | Reject as datastore. Flow CRM clients are `crm_clients`. Workspace `organizations` stay the agency entity. |
| `contacts` | Pattern only: first/last name, title, email, company link. New table `crm_contacts` with UUID + `workspace_id`. |
| `deals` | Reject pipeline-as-CRM-core. Flow uses `crm_opportunities` with journey status + service/budget/timeline. Amount as integer minor units + currency, not a bare bigint. |
| `contact_notes` / `deal_notes` | Pattern: retain original note text. Flow uses `discovery_sources` with provenance, not sales_id. |
| `tasks` | Deferred. Not Phase 2. |
| `attachments` jsonb | Reject blob-in-json. Store metadata + content-type on `discovery_sources` only. |
| RLS `using (true)` | Reject. Flow uses membership + permission helpers. |
| bigint identity PKs | Reject. UUID consistent with Phase 1B. |
| PostgREST / react-admin / Refine UI | Reject. NestJS + existing Flow UI. |
| MCP SQL tools | Reject. No unrestricted SQL. |

## Files copied into Flow

None. No Atomic CRM source files were copied.

## Notices

MIT license recorded in the dependency register. No substantial portion of Atomic CRM is included, so no LICENSE file is required in-tree.
