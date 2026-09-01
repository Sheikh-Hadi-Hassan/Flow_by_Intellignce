"use client";
/* eslint-disable @typescript-eslint/no-misused-promises */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { financeBadge, MoneyLine } from "../../../../../components/commercial/Status";
import { CommercialRoute } from "../../../../../components/commercial/CommercialRoute";
import { Button } from "../../../../../components/ui/Button";
import { SectionHeader, StatusBadge } from "../../../../../components/ui/Display";
import { NORTHSTAR_FINANCE_PROJECT_ID } from "../../../../../content/demo/northstar-finance";
import type { Invoice } from "../../../../../lib/commercial/finance-api";
import {
  isDemoFinanceClient,
  useFinanceClient,
} from "../../../../../lib/commercial/use-finance";

function InvoicesPage() {
  const workspace = useParams().workspace as string;
  const finance = useFinanceClient(workspace);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const base = `/${workspace}/admin/finance`;
  const isDemo = isDemoFinanceClient(finance);

  const reload = async () => {
    if (!finance) return;
    setInvoices(await finance.listInvoices());
  };

  useEffect(() => {
    void reload();
  }, [finance]);

  return (
    <>
      <SectionHeader
        eyebrow="Finance"
        title="Invoices"
        description="Draft, review, issue, and track client invoices."
      />
      <nav className="flow-stepper" aria-label="Finance sections">
        <Link href={base} className="flow-stepper__step">
          Hub
        </Link>
        <Link href={`${base}/invoices`} className="flow-stepper__step">
          Invoices
        </Link>
        <Link href={`${base}/payments`} className="flow-stepper__step">
          Payments
        </Link>
      </nav>
      {isDemo ? (
        <Button
          data-testid="generate-draft-invoice"
          onClick={async () => {
            if (!finance) return;
            try {
              await finance.generateDraftInvoice(NORTHSTAR_FINANCE_PROJECT_ID);
              await reload();
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "Could not generate invoice.",
              );
            }
          }}
        >
          Generate draft invoice (demo project)
        </Button>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      <div className="flow-panel" data-testid="invoice-list">
        {invoices.length === 0 ? (
          <p>No invoices yet.</p>
        ) : (
          <ul>
            {invoices.map((invoice) => (
              <li key={invoice.id} data-testid={`invoice-row-${invoice.id}`}>
                <Link href={`${base}/invoices/${invoice.id}`}>
                  {invoice.invoiceNumber ?? invoice.id.slice(0, 8)}
                </Link>{" "}
                ·{" "}
                <MoneyLine
                  label="Total"
                  minor={invoice.totalMinor}
                  currency={invoice.currency}
                />{" "}
                <StatusBadge variant={financeBadge(invoice.status)}>
                  {invoice.status.replaceAll("_", " ")}
                </StatusBadge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export default function Page() {
  return (
    <CommercialRoute>
      <InvoicesPage />
    </CommercialRoute>
  );
}
