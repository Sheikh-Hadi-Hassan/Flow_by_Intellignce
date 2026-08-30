"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "../../../components/ui/Button";
import { SectionHeader, StatusBadge } from "../../../components/ui/Display";
import { proposalBadge } from "../../../components/commercial/Status";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface SharedProposal {
  readonly proposal: {
    readonly status: string;
    readonly sections: readonly { title: string; body: string }[];
    readonly packages: readonly { name: string; totalMinor: string }[];
  };
  readonly expiresAt: string;
}

function ClientReviewPage() {
  const token = useParams().token as string;
  const [data, setData] = useState<SharedProposal | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`${apiBase}/api/v1/client-review/${token}/proposal`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Review link not found or expired.");
        return res.json() as Promise<SharedProposal>;
      })
      .then(setData)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load proposal.");
      });
  }, [token]);

  async function respond(
    response: "accepted" | "declined" | "changes_requested",
  ) {
    const res = await fetch(
      `${apiBase}/api/v1/client-review/${token}/proposal/respond`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response,
          actorLabel: "Client reviewer",
        }),
      },
    );
    if (!res.ok) {
      setError("Unable to record response.");
      return;
    }
    const body = (await res.json()) as { status: string };
    setMessage(`Response recorded: ${body.status.replaceAll("_", " ")}`);
    setData(
      (current) =>
        current && {
          ...current,
          proposal: { ...current.proposal, status: body.status },
        },
    );
  }

  return (
    <main className="flow-page flow-page--narrow">
      <SectionHeader
        eyebrow="Secure review"
        title="Proposal review"
        description="Minimal client surface — no workspace navigation."
      />
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {data && (
        <>
          <StatusBadge variant={proposalBadge(data.proposal.status)}>
            {data.proposal.status.replaceAll("_", " ")}
          </StatusBadge>
          <p>Expires {new Date(data.expiresAt).toLocaleString()}</p>
          <div className="flow-panel">
            {data.proposal.sections.map((section) => (
              <article key={section.title}>
                <h2>{section.title}</h2>
                <p>{section.body}</p>
              </article>
            ))}
          </div>
          <div className="flow-action-row">
            <Button onClick={() => void respond("accepted")}>Accept</Button>
            <Button onClick={() => void respond("declined")}>Decline</Button>
            <Button onClick={() => void respond("changes_requested")}>
              Request changes
            </Button>
          </div>
        </>
      )}
    </main>
  );
}

export default ClientReviewPage;
