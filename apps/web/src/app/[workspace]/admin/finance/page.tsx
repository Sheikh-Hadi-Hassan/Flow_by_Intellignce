"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { financeBadge } from "../../../../components/commercial/Status";
import { CommercialRoute } from "../../../../components/commercial/CommercialRoute";
import { MissionScreen } from "../../../../components/os/MissionScreen";
import { StatusBadge } from "../../../../components/ui/Display";
import {
  isDemoFinanceClient,
  useFinanceClient,
} from "../../../../lib/commercial/use-finance";
import type { FinanceSummary, Invoice } from "../../../../lib/commercial/finance-api";
import { formatMinor } from "../../../../lib/commercial/finance-api";
import { buildFinancePriorities } from "../../../../lib/experience/mission-control";
import { NORTHSTAR_FINANCE_PROJECT_ID } from "../../../../content/demo/northstar-finance";

function FinanceHub() {
  const workspace = useParams().workspace as string;
  const finance = useFinanceClient(workspace);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const base = `/${workspace}/admin/finance`;
  const isDemo = isDemoFinanceClient(finance);

  useEffect(() => {
    if (!finance) return;
    void Promise.all([
      finance.getFinancialSummary(),
      finance.listInvoices(),
    ])
      .then(([nextSummary, nextInvoices]) => {
        setSummary(nextSummary);
        setInvoices(nextInvoices);
      })
      .catch((err: Error) => setError(err.message));
  }, [finance]);

  const attention = useMemo(
    () =>
      buildFinancePriorities(workspace, { summary, invoices }).filter(
        (row) => row.tone === "urgent",
      ),
    [workspace, summary, invoices],
  );

  const reviewInvoices = invoices.filter(
    (row) => row.status === "founder_review",
  );

  return (
    <MissionScreen
      lifecycle="Finance"
      title="Financial operations"
      why="Billable work, invoices, and collections from stored records — never invented metrics."
      decision={
        attention.length > 0
          ? `${attention.length} finance item${attention.length === 1 ? "" : "s"} need founder attention.`
          : "Review the snapshot and advance billable work to invoice."
      }
      next={
        reviewInvoices.length > 0
          ? "Approve invoices in founder review before issuing to clients."
          : "Submit and approve time and expenses, then generate draft invoices."
      }
      primaryAction={
        <Link href={`${base}/invoices`} className="flow-btn flow-btn--primary">
          View invoices
        </Link>
      }
      secondaryActions={
        <>
          <Link href={`${base}/time`} className="flow-btn flow-btn--secondary flow-btn--sm">
            Time
          </Link>
          <Link
            href={`${base}/expenses`}
            className="flow-btn flow-btn--secondary flow-btn--sm"
          >
            Expenses
          </Link>
          <Link
            href={`${base}/reports`}
            className="flow-btn flow-btn--secondary flow-btn--sm"
          >
            Reports
          </Link>
        </>
      }
      copilot={{
        changed: summary
          ? `Outstanding ${summary.outstandingMinor !== "0" ? "receivables on record" : "— no open balances"}.`
          : "Loading financial snapshot…",
        recommended:
          summary && summary.unbilledApprovedTimeMinutes > 0
            ? `${summary.unbilledApprovedTimeMinutes} approved billable minutes ready to invoice.`
            : "Keep time and expense approvals current before billing.",
      }}
    >
      {isDemo ? (
        <p className="flow-muted" data-testid="finance-demo-banner">
          Northstar demo — finance state is isolated in sessionStorage. No live
          database writes.
        </p>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}

      {summary ? (
        <div
          className="flow-mission-grid flow-mission-grid--3"
          data-testid="finance-summary"
        >
          <article className="flow-priority-card">
            <span className="flow-priority-card__label">Invoiced</span>
            <p className="flow-priority-card__title tabular-nums">
              {formatMinor(summary.invoicedMinor, "USD")}
            </p>
          </article>
          <article className="flow-priority-card">
            <span className="flow-priority-card__label">Collected</span>
            <p className="flow-priority-card__title tabular-nums">
              {formatMinor(summary.collectedMinor, "USD")}
            </p>
          </article>
          <article className="flow-priority-card">
            <span className="flow-priority-card__label">Outstanding</span>
            <p className="flow-priority-card__title tabular-nums">
              {formatMinor(summary.outstandingMinor, "USD")}
            </p>
          </article>
        </div>
      ) : null}

      <nav className="flow-stepper" aria-label="Finance sections">
        <Link href={`${base}/time`} className="flow-stepper__step">
          Time entries
        </Link>
        <Link href={`${base}/expenses`} className="flow-stepper__step">
          Expenses
        </Link>
        <Link href={`${base}/invoices`} className="flow-stepper__step">
          Invoices
        </Link>
        <Link href={`${base}/payments`} className="flow-stepper__step">
          Payments
        </Link>
        <Link href={`${base}/reports`} className="flow-stepper__step">
          Reports
        </Link>
      </nav>

      {reviewInvoices.length > 0 ? (
        <section data-testid="finance-attention-queue">
          <h2 className="flow-priority-card__label">Founder review queue</h2>
          <ul className="flow-record-list">
            {reviewInvoices.map((invoice) => (
              <li key={invoice.id} className="flow-record-list__item">
                <Link
                  href={`${base}/invoices/${invoice.id}`}
                  className="flow-record-list__link"
                >
                  <span>
                    <span className="flow-record-list__name">
                      {invoice.invoiceNumber ?? invoice.id.slice(0, 8)}
                    </span>
                    <span className="flow-priority-card__meta">
                      {invoice.totalMinor
                        ? `Total minor ${invoice.totalMinor}`
                        : "Awaiting approval"}
                    </span>
                  </span>
                  <StatusBadge variant={financeBadge(invoice.status)}>
                    {invoice.status.replaceAll("_", " ")}
                  </StatusBadge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {isDemo ? (
        <section className="flow-panel">
          <p className="flow-muted">
            Demo project ID for billing:{" "}
            <code>{NORTHSTAR_FINANCE_PROJECT_ID}</code>
          </p>
        </section>
      ) : null}
    </MissionScreen>
  );
}

export default function Page() {
  return (
    <CommercialRoute>
      <FinanceHub />
    </CommercialRoute>
  );
}
