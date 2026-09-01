"use client";
/* eslint-disable @typescript-eslint/no-misused-promises */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { CommercialRoute } from "../../../../components/commercial/CommercialRoute";
import { Button } from "../../../../components/ui/Button";
import { SectionHeader } from "../../../../components/ui/Display";
import { NORTHSTAR_FINANCE_PROJECT_ID } from "../../../../content/demo/northstar-finance";
import {
  isDemoFinanceClient,
  useFinanceClient,
} from "../../../../lib/commercial/use-finance";

function SubmitExpensePage() {
  const workspace = useParams().workspace as string;
  const finance = useFinanceClient(workspace);
  const [projectId, setProjectId] = useState(NORTHSTAR_FINANCE_PROJECT_ID);
  const [vendorName, setVendorName] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("media");
  const [amountMinor, setAmountMinor] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isDemo = isDemoFinanceClient(finance);

  return (
    <>
      <SectionHeader
        eyebrow="My Work"
        title="Submit expense"
        description="Log billable expenses for founder approval."
      />
      <nav className="flow-stepper" aria-label="Work sections">
        <Link href={`/${workspace}/work`} className="flow-stepper__step">
          Assignments
        </Link>
        <Link href={`/${workspace}/work/time`} className="flow-stepper__step">
          Submit time
        </Link>
        <Link
          href={`/${workspace}/work/expenses`}
          className="flow-stepper__step"
        >
          Submit expenses
        </Link>
      </nav>
      {isDemo ? (
        <p className="flow-muted" data-testid="work-expense-demo-banner">
          Northstar demo — expenses stay in sessionStorage only.
        </p>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      <form
        className="flow-panel flow-form"
        data-testid="submit-expense-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!finance || !amountMinor) return;
          try {
            const expense = await finance.createExpense({
              projectId,
              vendorName: vendorName || "Vendor",
              expenseDate,
              description: description || "Project expense",
              category,
              amountMinor,
              billable: true,
            });
            await finance.submitExpense(expense.id);
            setMessage(`Expense submitted (${expense.id.slice(0, 8)}).`);
            setVendorName("");
            setDescription("");
            setAmountMinor("");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Submit failed.");
          }
        }}
      >
        <label>
          Project ID
          <input
            type="text"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            data-testid="expense-project-id"
          />
        </label>
        <label>
          Vendor
          <input
            type="text"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            data-testid="expense-vendor"
          />
        </label>
        <label>
          Expense date
          <input
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            data-testid="expense-date"
          />
        </label>
        <label>
          Category
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            data-testid="expense-category"
          />
        </label>
        <label>
          Amount (minor units, e.g. 15000 = $150.00)
          <input
            type="text"
            inputMode="numeric"
            value={amountMinor}
            onChange={(e) => setAmountMinor(e.target.value)}
            data-testid="expense-amount"
          />
        </label>
        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            data-testid="expense-description"
          />
        </label>
        <Button type="submit" data-testid="submit-expense">
          Submit expense
        </Button>
      </form>
    </>
  );
}

export default function Page() {
  return (
    <CommercialRoute>
      <SubmitExpensePage />
    </CommercialRoute>
  );
}
