"use client";
/* eslint-disable @typescript-eslint/no-misused-promises */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { financeBadge, MoneyLine } from "../../../../../../components/commercial/Status";
import { CommercialRoute } from "../../../../../../components/commercial/CommercialRoute";
import { Button } from "../../../../../../components/ui/Button";
import { SectionHeader, StatusBadge } from "../../../../../../components/ui/Display";
import type { InvoiceDetail } from "../../../../../../lib/commercial/finance-api";
import { formatMinor } from "../../../../../../lib/commercial/finance-api";
import { useFinanceClient } from "../../../../../../lib/commercial/use-finance";

function InvoiceDetailPage() {
  const workspace = useParams().workspace as string;
  const invoiceId = useParams().id as string;
  const finance = useFinanceClient(workspace);
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const base = `/${workspace}/admin/finance`;

  const reload = async () => {
    if (!finance) return;
    setInvoice(await finance.getInvoice(invoiceId));
  };

  useEffect(() => {
    void reload();
  }, [finance, invoiceId]);

  if (!invoice) return null;

  const canSubmitReview = invoice.status === "draft";
  const canApprove = invoice.status === "founder_review";
  const canIssue = invoice.status === "approved";
  const canRecordPayment =
    invoice.status === "issued" ||
    invoice.status === "partially_paid" ||
    invoice.status === "overdue";

  return (
    <div className="flow-invoice-print">
      <SectionHeader
        eyebrow="Invoice"
        title={invoice.invoiceNumber ?? `Draft ${invoice.id.slice(0, 8)}`}
        description="Line items and lifecycle actions from stored finance records."
      />
      <nav className="flow-stepper" aria-label="Finance sections">
        <Link href={`${base}/invoices`} className="flow-stepper__step">
          All invoices
        </Link>
      </nav>
      {error ? <p role="alert">{error}</p> : null}

      <section className="flow-panel" data-testid="invoice-detail">
        <p>
          Status{" "}
          <StatusBadge variant={financeBadge(invoice.status)}>
            {invoice.status.replaceAll("_", " ")}
          </StatusBadge>
        </p>
        <MoneyLine label="Subtotal" minor={invoice.subtotalMinor} currency={invoice.currency} />
        <MoneyLine label="Tax" minor={invoice.taxMinor} currency={invoice.currency} />
        <MoneyLine label="Total" minor={invoice.totalMinor} currency={invoice.currency} />
        <MoneyLine
          label="Balance due"
          minor={invoice.balanceDueMinor}
          currency={invoice.currency}
        />
        {invoice.issueDate ? <p>Issued: {invoice.issueDate}</p> : null}
        {invoice.dueDate ? <p>Due: {invoice.dueDate}</p> : null}
      </section>

      <section className="flow-panel" data-testid="invoice-line-items">
        <h2>Line items</h2>
        <ul>
          {invoice.lineItems.map((line) => (
            <li key={line.id}>
              {line.description} —{" "}
              {formatMinor(line.amountMinor, invoice.currency)} ({line.lineType})
            </li>
          ))}
        </ul>
      </section>

      <section className="flow-panel flow-no-print" data-testid="invoice-actions">
        <h2>Actions</h2>
        <div className="flow-detail-group">
          {canSubmitReview ? (
            <Button
              data-testid="submit-invoice-review"
              onClick={async () => {
                if (!finance) return;
                try {
                  await finance.submitInvoiceReview(invoiceId);
                  await reload();
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : "Submit failed.",
                  );
                }
              }}
            >
              Submit for founder review
            </Button>
          ) : null}
          {canApprove ? (
            <Button
              data-testid="approve-invoice"
              onClick={async () => {
                if (!finance) return;
                try {
                  await finance.approveInvoice(invoiceId);
                  await reload();
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : "Approval failed.",
                  );
                }
              }}
            >
              Approve invoice
            </Button>
          ) : null}
          {canIssue ? (
            <Button
              data-testid="issue-invoice"
              onClick={async () => {
                if (!finance) return;
                try {
                  await finance.issueInvoice(
                    invoiceId,
                    `issue-${invoiceId}-${Date.now()}`,
                  );
                  await reload();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Issue failed.");
                }
              }}
            >
              Issue invoice
            </Button>
          ) : null}
        </div>

        {canRecordPayment ? (
          <form
            className="flow-form"
            data-testid="record-payment-form"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!finance || !paymentAmount) return;
              try {
                await finance.recordPayment(
                  {
                    paymentDate,
                    amountMinor: paymentAmount,
                    currency: invoice.currency,
                    paymentMethod: "wire",
                    allocations: [
                      { invoiceId, amountMinor: paymentAmount },
                    ],
                  },
                  `payment-${invoiceId}-${Date.now()}`,
                );
                setPaymentAmount("");
                await reload();
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Payment failed.",
                );
              }
            }}
          >
            <label>
              Payment date
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                data-testid="payment-date"
              />
            </label>
            <label>
              Amount (minor units)
              <input
                type="text"
                inputMode="numeric"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder={invoice.balanceDueMinor}
                data-testid="payment-amount"
              />
            </label>
            <Button type="submit" data-testid="record-payment">
              Record payment
            </Button>
          </form>
        ) : null}
      </section>
    </div>
  );
}

export default function Page() {
  return (
    <CommercialRoute>
      <InvoiceDetailPage />
    </CommercialRoute>
  );
}
