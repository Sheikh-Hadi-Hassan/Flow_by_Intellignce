"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CommercialRoute } from "../../../../../components/commercial/CommercialRoute";
import { MoneyLine } from "../../../../../components/commercial/Status";
import { MissionScreen } from "../../../../../components/os/MissionScreen";
import type { AgingBucket, FinanceSummary } from "../../../../../lib/commercial/finance-api";
import { formatMinor } from "../../../../../lib/commercial/finance-api";
import { useFinanceClient } from "../../../../../lib/commercial/use-finance";

const BUCKET_LABELS: Record<AgingBucket["bucket"], string> = {
  current: "Current",
  "1_30": "1–30 days",
  "31_60": "31–60 days",
  "61_90": "61–90 days",
  "90_plus": "90+ days",
};

function FinanceReportsPage() {
  const workspace = useParams().workspace as string;
  const finance = useFinanceClient(workspace);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [aging, setAging] = useState<readonly AgingBucket[]>([]);
  const base = `/${workspace}/admin/finance`;

  useEffect(() => {
    if (!finance) return;
    void Promise.all([
      finance.getFinancialSummary(),
      finance.getReceivablesAging(),
    ]).then(([nextSummary, nextAging]) => {
      setSummary(nextSummary);
      setAging(nextAging);
    });
  }, [finance]);

  return (
    <MissionScreen
      lifecycle="Finance · Reports"
      title="Financial reporting"
      why="Summaries and aging from stored invoice and payment records only."
      decision="Review receivables exposure and unbilled approved work."
      next="Open individual invoices for line-item detail."
      primaryAction={
        <Link href={`${base}/invoices`} className="flow-btn flow-btn--primary">
          View invoices
        </Link>
      }
      secondaryActions={
        <Link href={base} className="flow-btn flow-btn--secondary flow-btn--sm">
          Finance hub
        </Link>
      }
      copilot={{
        changed: summary
          ? `Outstanding ${formatMinor(summary.outstandingMinor, "USD")}.`
          : "Loading…",
        recommended: "Aging buckets reflect issued invoice balances by due date.",
      }}
    >
      {summary ? (
        <section className="flow-panel" data-testid="finance-report-summary">
          <h2>Workspace summary</h2>
          <MoneyLine label="Invoiced" minor={summary.invoicedMinor} currency="USD" />
          <MoneyLine label="Collected" minor={summary.collectedMinor} currency="USD" />
          <MoneyLine
            label="Outstanding"
            minor={summary.outstandingMinor}
            currency="USD"
          />
          <MoneyLine label="Overdue" minor={summary.overdueMinor} currency="USD" />
          <p>Unbilled approved time: {summary.unbilledApprovedTimeMinutes} minutes</p>
          <MoneyLine
            label="Unbilled approved expenses"
            minor={summary.unbilledApprovedExpenseMinor}
            currency="USD"
          />
          <p>Draft invoices: {summary.draftInvoiceCount}</p>
        </section>
      ) : null}

      <section className="flow-panel" data-testid="receivables-aging">
        <h2>Receivables aging</h2>
        {aging.length === 0 ? (
          <p>No open receivables.</p>
        ) : (
          <ul>
            {aging.map((bucket) => (
              <li key={bucket.bucket} data-testid={`aging-${bucket.bucket}`}>
                {BUCKET_LABELS[bucket.bucket]} — {bucket.invoiceCount} invoice
                {bucket.invoiceCount === 1 ? "" : "s"} ·{" "}
                {formatMinor(bucket.balanceDueMinor, "USD")}
              </li>
            ))}
          </ul>
        )}
      </section>
    </MissionScreen>
  );
}

export default function Page() {
  return (
    <CommercialRoute>
      <FinanceReportsPage />
    </CommercialRoute>
  );
}
