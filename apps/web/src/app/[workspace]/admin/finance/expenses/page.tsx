"use client";
/* eslint-disable @typescript-eslint/no-misused-promises */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { financeBadge, MoneyLine } from "../../../../../components/commercial/Status";
import { CommercialRoute } from "../../../../../components/commercial/CommercialRoute";
import { Button } from "../../../../../components/ui/Button";
import { SectionHeader, StatusBadge } from "../../../../../components/ui/Display";
import type { Expense } from "../../../../../lib/commercial/finance-api";
import { useFinanceClient } from "../../../../../lib/commercial/use-finance";

function ExpensesPage() {
  const workspace = useParams().workspace as string;
  const finance = useFinanceClient(workspace);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [error, setError] = useState<string | null>(null);
  const base = `/${workspace}/admin/finance`;

  const reload = async () => {
    if (!finance) return;
    setExpenses(await finance.listExpenses());
  };

  useEffect(() => {
    void reload();
  }, [finance]);

  return (
    <>
      <SectionHeader
        eyebrow="Finance"
        title="Expenses"
        description="Review submitted expenses and approve billable costs."
      />
      <nav className="flow-stepper" aria-label="Finance sections">
        <Link href={base} className="flow-stepper__step">
          Hub
        </Link>
        <Link href={`${base}/time`} className="flow-stepper__step">
          Time
        </Link>
        <Link href={`${base}/expenses`} className="flow-stepper__step">
          Expenses
        </Link>
        <Link href={`${base}/invoices`} className="flow-stepper__step">
          Invoices
        </Link>
      </nav>
      {error ? <p role="alert">{error}</p> : null}
      <div className="flow-panel" data-testid="expense-list">
        {expenses.length === 0 ? (
          <p>No expenses yet.</p>
        ) : (
          <ul>
            {expenses.map((expense) => (
              <li key={expense.id} data-testid={`expense-${expense.id}`}>
                <strong>{expense.vendorName}</strong> — {expense.description} ·{" "}
                <MoneyLine
                  label="Amount"
                  minor={expense.amountMinor}
                  currency={expense.currency}
                />{" "}
                <StatusBadge variant={financeBadge(expense.status)}>
                  {expense.status}
                </StatusBadge>
                {expense.status === "submitted" ? (
                  <Button
                    data-testid={`approve-expense-${expense.id}`}
                    onClick={async () => {
                      if (!finance) return;
                      try {
                        await finance.approveExpense(expense.id);
                        await reload();
                      } catch (err) {
                        setError(
                          err instanceof Error ? err.message : "Approval failed.",
                        );
                      }
                    }}
                  >
                    Approve
                  </Button>
                ) : null}
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
      <ExpensesPage />
    </CommercialRoute>
  );
}
