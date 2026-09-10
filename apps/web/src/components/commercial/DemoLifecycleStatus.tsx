"use client";

import { useCallback, useEffect, useState } from "react";

import type { DemoLifecycleSnapshot } from "../../lib/hackathon/demo-lifecycle";
import { Button } from "../ui/Button";

export function DemoLifecycleStatus({
  onProjectExists,
}: {
  readonly onProjectExists?: (exists: boolean) => void;
}) {
  const [snapshot, setSnapshot] = useState<DemoLifecycleSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/demo/lifecycle", { cache: "no-store" });
    if (!response.ok) throw new Error("Demo lifecycle could not load.");
    const next = (await response.json()) as DemoLifecycleSnapshot;
    setSnapshot(next);
    onProjectExists?.(Boolean(next.project));
  }, [onProjectExists]);

  useEffect(() => {
    void refresh().catch((reason: Error) => setError(reason.message));
  }, [refresh]);

  async function transition(action: "reset" | "execute_contract") {
    setError(null);
    const response = await fetch("/api/demo/lifecycle", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const body = (await response.json()) as DemoLifecycleSnapshot & {
      error?: string;
    };
    if (!response.ok) {
      setError(body.error ?? "Demo transition failed.");
      return;
    }
    setSnapshot(body);
    onProjectExists?.(Boolean(body.project));
  }

  if (!snapshot) return error ? <p role="alert">{error}</p> : null;

  return (
    <section className="flow-panel" data-testid="demo-lifecycle-status">
      <h3>Acme investor demo journey</h3>
      <p>
        Intake: <strong>{snapshot.intake.status}</strong> · Proposal:{" "}
        <strong>{snapshot.proposal?.status ?? "not generated"}</strong> ·
        Contract: <strong>{snapshot.contract?.status ?? "not executed"}</strong>{" "}
        · Project: <strong>{snapshot.project?.status ?? "not started"}</strong>
      </p>
      <p data-testid="demo-performance-score">
        {snapshot.employee.name} · Delivery Performance Score (demo):{" "}
        <strong>
          {snapshot.employee.deliveryPerformanceScore ?? "not scored"}
        </strong>{" "}
        · Completed tasks: <strong>{snapshot.completedTaskCount}</strong>
      </p>
      {snapshot.project && (
        <>
          <h4>Delivery tasks ({snapshot.project.tasks.length})</h4>
          <ul data-testid="demo-delivery-tasks">
            {snapshot.project.tasks.map((task) => (
              <li key={task.id}>
                {task.name} · {task.status}
                {task.assigneeName ? ` · ${task.assigneeName}` : ""}
                {task.actualMinutes !== undefined
                  ? ` · ${task.actualMinutes / 60}h · quality ${task.qualityScore}`
                  : ""}
              </li>
            ))}
          </ul>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      <div className="flow-action-row">
        <Button variant="secondary" onClick={() => void refresh()}>
          Refresh demo status
        </Button>
        <Button
          variant="secondary"
          disabled={!snapshot.proposal || Boolean(snapshot.contract)}
          onClick={() => void transition("execute_contract")}
        >
          Accept proposal and execute contract
        </Button>
        <Button variant="secondary" onClick={() => void transition("reset")}>
          Reset investor demo
        </Button>
      </div>
    </section>
  );
}
