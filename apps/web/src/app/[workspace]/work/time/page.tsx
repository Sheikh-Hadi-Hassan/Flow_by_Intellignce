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

function SubmitTimePage() {
  const workspace = useParams().workspace as string;
  const finance = useFinanceClient(workspace);
  const [workDate, setWorkDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [durationMinutes, setDurationMinutes] = useState("120");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(NORTHSTAR_FINANCE_PROJECT_ID);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isDemo = isDemoFinanceClient(finance);

  return (
    <>
      <SectionHeader
        eyebrow="My Work"
        title="Submit time"
        description="Log billable hours for founder approval."
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
        <p className="flow-muted" data-testid="work-time-demo-banner">
          Northstar demo — time entries stay in sessionStorage only.
        </p>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      <form
        className="flow-panel flow-form"
        data-testid="submit-time-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!finance) return;
          try {
            const entry = await finance.createTimeEntry({
              projectId,
              workDate,
              durationMinutes: Number(durationMinutes),
              billable: true,
              description: description || "Billable project work",
              hourlyRateMinor: "15000",
            });
            await finance.submitTimeEntry(entry.id);
            setMessage(`Time entry submitted (${entry.id.slice(0, 8)}).`);
            setDescription("");
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
            data-testid="time-project-id"
          />
        </label>
        <label>
          Work date
          <input
            type="date"
            value={workDate}
            onChange={(e) => setWorkDate(e.target.value)}
            data-testid="time-work-date"
          />
        </label>
        <label>
          Duration (minutes)
          <input
            type="number"
            min={1}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            data-testid="time-duration"
          />
        </label>
        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            data-testid="time-description"
          />
        </label>
        <Button type="submit" data-testid="submit-time">
          Submit time entry
        </Button>
      </form>
    </>
  );
}

export default function Page() {
  return (
    <CommercialRoute>
      <SubmitTimePage />
    </CommercialRoute>
  );
}
