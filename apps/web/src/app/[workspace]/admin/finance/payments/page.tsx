"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { financeBadge, MoneyLine } from "../../../../../components/commercial/Status";
import { CommercialRoute } from "../../../../../components/commercial/CommercialRoute";
import { SectionHeader, StatusBadge } from "../../../../../components/ui/Display";
import type { Invoice } from "../../../../../lib/commercial/finance-api";
import { useFinanceClient } from "../../../../../lib/commercial/use-finance";

function PaymentsPage() {
  const workspace = useParams().workspace as string;
  const finance = useFinanceClient(workspace);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const base = `/${workspace}/admin/finance`;

  useEffect(() => {
    if (!finance) return;
    void finance.listInvoices().then(setInvoices);
  }, [finance]);

  const paidInvoices = useMemo(
    () =>
      invoices.filter(
        (row) =>
          row.status === "paid" ||
          row.status === "partially_paid" ||
          BigInt(row.amountPaidMinor) > 0n,
      ),
    [invoices],
  );

  return (
    <>
      <SectionHeader
        eyebrow="Finance"
        title="Payments"
        description="Payment history derived from invoice paid state and recorded allocations."
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
      <div className="flow-panel" data-testid="payment-list">
        {paidInvoices.length === 0 ? (
          <p>No payments recorded yet. Record payments from an issued invoice.</p>
        ) : (
          <ul>
            {paidInvoices.map((invoice) => (
              <li key={invoice.id} data-testid={`payment-invoice-${invoice.id}`}>
                <Link href={`${base}/invoices/${invoice.id}`}>
                  {invoice.invoiceNumber ?? invoice.id.slice(0, 8)}
                </Link>{" "}
                · Paid{" "}
                <MoneyLine
                  label=""
                  minor={invoice.amountPaidMinor}
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
      <PaymentsPage />
    </CommercialRoute>
  );
}
