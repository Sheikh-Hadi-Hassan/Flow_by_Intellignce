# Northstar scenario catalogue

DEMO-01. Believable imperfect operating history. Each scenario is a seed
requirement for a later milestone. Nothing here is implemented in this run.

Every scenario must eventually store: what happened, why it matters, impact,
owner, deadline vs demo clock (2026-09-03), evidence IDs, recommended action,
approval requirement.

## Snapshot locks (current period)

These already exist as Mission Control / CRM Core IDs. Later seeds **extend**
them; they do not replace the IDs.

- 8 open opportunities, 5 active projects, 3 founder approvals, 4 client actions
- Vantage INV-2041 34 days overdue; Kestrel INV-2038 12 days overdue
- Meridian wayfinding blocked on legal; Vantage brand ops at risk
- Brightline Media / Brightline Media LLC duplicate pair
- Combined decision exposure $356K

## Commercial and cash

| ID | What happened | Why it matters | Impact | Owner | Deadline | Evidence | Action | Approval |
|---|---|---|---|---|---|---|---|---|
| SC-PAY-01 | Vantage payment days stretched; INV-2041 now 34 days overdue | Cash and forecast | $18,500 overdue; ageing worsens | Jordan Ellis | Collect this week | `inv-2041` | Call billing contact | No |
| SC-PAY-02 | Kestrel INV-2038 12 days overdue | Second overdue in the $27,750 pair | $9,250 | Maya Chen | 5 Sep | `inv-2038` | Reminder + terms check | No |
| SC-PAY-03 | Historical invoices show a client whose days-to-pay rose two quarters in a row | Same Ask Flow question as today | Receivables risk | Finance | Rolling | Invoice ageing series | Watch + tighten terms on renewal | Founder if terms change |
| SC-DISC-01 | Discount on a live proposal sits in the approval queue | Margin floor | Part of $356K exposure | Maya Chen | Today 08:12 | Approval decision row | Approve, reduce, or refuse | Yes |
| SC-OPP-01 | Kestrel packaging identity stalled 9 days, questionnaire outstanding | Dead pipeline | $42K unweighted, 30% | Avery Brooks | Unblock discovery | `ns-opp-kestrel` | Chase questionnaire | No |
| SC-OPP-02 | Lumen launch film waiting on creative feedback | Disengaged buyer | $58K at 25% | Sam Rivera | 30 Sep close target | `ns-opp-lumen` | Restart or recategorise forecast | No |
| SC-WIN-01 | Acme Q4 launch already at 95% / contract executed | Healthy contrast | $85K | Maya Chen | Closed 28 Aug | `ns-opp-acme-brand` | None | No |
| SC-LOST-01 | A 2025 pitch lost on price to a named competitor | Win/loss learning | Historical value | Sales | n/a | Closed opportunity | Feed BB-17 | No |

## Legal and negotiation

| ID | What happened | Why it matters | Impact | Owner | Deadline | Evidence | Action | Approval |
|---|---|---|---|---|---|---|---|---|
| SC-NEG-01 | Northwind retainer: client redlines, liability cap and payment terms disputed | Largest open deal | $180K at 45%; redlines expire Friday | Maya Chen | Friday after clock | `ns-opp-northwind` | Respond to redlines | Founder on concession |
| SC-CON-01 | Contract renews inside 90 days with weak usage | Retention | Backlog at risk | Account lead | +90 days | Contract expiry | Renewal conversation | If discount |
| SC-CON-02 | Unprofitable historical T&M: recognised revenue < labour + vendors | Margin leakage | Negative gross profit | Delivery + finance | n/a | Project + time + invoices | Do not repeat terms | Yes for similar bids |
| SC-CHG-01 | Unapproved change request on an active project | Scope creep | Budget variance | PM | Immediate | Change request draft | Submit for approval | Yes |
| SC-LEGAL-01 | Indemnity / unlimited liability clause on a demo contract | Legal exposure | Risk class high | Maya Chen | Before signature | Clause row + CUAD category | Redline | Yes |

All contract text: **Fictional demo contract — not legal advice.**

## Delivery

| ID | What happened | Why it matters | Impact | Owner | Deadline | Evidence | Action | Approval |
|---|---|---|---|---|---|---|---|---|
| SC-DEL-01 | Meridian wayfinding: accessibility legal review missing | Blocks handoff | $64K exposed | Avery Brooks | Overdue 2 days | `ns-project-meridian`, risk | Book legal | No |
| SC-DEL-02 | Vantage brand ops at risk: late client positioning feedback | Timeline | $52K contract | Avery Brooks | 6 days | `ns-project-vantage` | Escalate | No |
| SC-DEL-03 | Client-caused delay with evidence (late assets) | Protects margin narrative | Days + cost | PM | Milestone | Task blocker | Change order or timeline concession | Yes if commercial |
| SC-DEL-04 | Internal quality rejection / rework | Quality dimension | Extra hours | Creative lead | Sprint | Task revision | Fix + BB-10 observation | No |
| SC-DEL-05 | Resource conflict: two projects want the same designer | Capacity | Over-allocation | Jordan Ellis | This week | BB-11 rows | Replan | If client date moves |
| SC-DEL-06 | Early completion / strongly profitable project (historical) | Contrast | Positive GP | PM | n/a | Closed project | Case evidence | No |
| SC-DEL-07 | Missing client approval on a deliverable | Cannot invoice milestone | Unbilled work | PM | This week | Approval task | Chase | No |

## People

| ID | What happened | Why it matters | Impact | Owner | Deadline | Evidence | Action | Approval |
|---|---|---|---|---|---|---|---|---|
| SC-CAP-01 | Two employees over-allocated this week | Delivery risk | 63 hours still free elsewhere | Jordan Ellis | Week of 31 Aug | Capacity engine | Move work | If client visible |
| SC-CAP-02 | Approved leave in a critical week | Coverage | Hours missing | People ops | Leave dates | Leave row | Backfill | No |
| SC-CAP-03 | Underutilised employee | Cost | Low billable bps | Manager | Quarter | Time entries | Staff onto work | No |
| SC-PERF-01 | Avery Brooks quarter review | Ask Flow question | Dimensioned, evidenced | Manager | Quarter end | Tasks, utilisation, feedback | Explain, do not score | Restricted |
| SC-PERF-02 | Utilisation fell because of approved training + rework | Honest explanation | Missing billable hours | Manager | Period | Time codes | Keep training visible | No |

## Data quality and integrations

| ID | What happened | Why it matters | Impact | Owner | Deadline | Evidence | Action | Approval |
|---|---|---|---|---|---|---|---|---|
| SC-DUP-01 | Brightline Media vs Brightline Media LLC | Duplicate master | Merge is protected | Founder | Queue | Duplicate score 92 | Propose merge | Yes |
| SC-MIG-01 | Incomplete migrated contact (email missing) | Partial-data state | Cannot invoice legally | Ops | Cutover report | Migration exception | Complete or quarantine | No |
| SC-SYNC-01 | Integration sync failed (accounting) | Dual numbers | BB-16 exception | Ops | Retry window | Sync run | Retry; do not silent-write | No |

## High-revenue weak profit

| ID | What happened | Why it matters | Impact | Owner | Deadline | Evidence | Action | Approval |
|---|---|---|---|---|---|---|---|---|
| SC-PROF-01 | Named client with high invoice volume and low contribution | Strategy | BB-13 band “weak” | Maya Chen | QBR | Invoices + labour | Reprice or reshape | Yes for rate card |
| SC-FCST-01 | Forecast vs actual variance on a closed month | Planning | BB-17 | Finance | Month close | Recognition vs invoices | Explain, do not edit history | No |

## Recovery

| ID | What happened | Why it matters | Impact | Owner | Deadline | Evidence | Action | Approval |
|---|---|---|---|---|---|---|---|---|
| SC-REC-01 | At-risk project recovered (historical): risk closed, margin restored | Shows the OS working | Positive | PM | n/a | Risk timeline | None | No |

## Ask Flow questions these scenarios must support

Today's sales update; active projects; most profitable projects; worsening
payment behaviour; overdue invoices; contracts renewing in 90 days; legal
risk terms; Northwind concessions; discount vs margin; over-capacity
employees; Avery Brooks this quarter; utilisation drop; who is available;
high-revenue weak-profit client; what needs approval; why $356K is exposed;
blocking tasks; projects waiting on client; what changed this week.

Answers cite record IDs, explain calculations, respect permissions, and
propose writes.
