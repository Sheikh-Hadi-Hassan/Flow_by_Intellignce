"use client";
/* eslint-disable @typescript-eslint/no-misused-promises */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { financeBadge } from "../../../../../components/commercial/Status";
import { CommercialRoute } from "../../../../../components/commercial/CommercialRoute";
import { Button } from "../../../../../components/ui/Button";
import { SectionHeader, StatusBadge } from "../../../../../components/ui/Display";
import type { TimeEntry } from "../../../../../lib/commercial/finance-api";
import { useFinanceClient } from "../../../../../lib/commercial/use-finance";

function TimeEntriesPage() {
  const workspace = useParams().workspace as string;
  const finance = useFinanceClient(workspace);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const base = `/${workspace}/admin/finance`;

  const reload = async () => {
    if (!finance) return;
    setEntries(await finance.listTimeEntries());
  };

  useEffect(() => {
    void reload();
  }, [finance]);

  return (
    <>
      <SectionHeader
        eyebrow="Finance"
        title="Time entries"
        description="Review submitted time and approve billable hours for invoicing."
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
      <div className="flow-panel" data-testid="time-entry-list">
        {entries.length === 0 ? (
          <p>No time entries yet.</p>
        ) : (
          <ul>
            {entries.map((entry) => (
              <li key={entry.id} data-testid={`time-entry-${entry.id}`}>
                <strong>{entry.workDate}</strong> — {entry.description} ·{" "}
                {entry.durationMinutes} min ·{" "}
                <StatusBadge variant={financeBadge(entry.status)}>
                  {entry.status}
                </StatusBadge>
                {entry.status === "submitted" ? (
                  <Button
                    data-testid={`approve-time-${entry.id}`}
                    onClick={async () => {
                      if (!finance) return;
                      try {
                        await finance.approveTimeEntry(entry.id);
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
      <TimeEntriesPage />
    </CommercialRoute>
  );
}
