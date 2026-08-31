"use client";
/* eslint-disable @typescript-eslint/no-misused-promises */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CommercialRoute } from "../../../../components/commercial/CommercialRoute";
import { MissionScreen } from "../../../../components/os/MissionScreen";
import { Button } from "../../../../components/ui/Button";
import { FormField, TextInput } from "../../../../components/ui/FormField";
import { useCommercialClient } from "../../../../lib/commercial/use-commercial";
import type { CommercialClientRecord } from "../../../../lib/commercial/api";

function ClientsList() {
  const workspace = useParams().workspace as string;
  const router = useRouter();
  const clientApi = useCommercialClient(workspace);
  const [clients, setClients] = useState<CommercialClientRecord[]>([]);
  const [name, setName] = useState("Acme Robotics");
  const [contactFirstName, setContactFirstName] = useState("Priya");
  const [contactLastName, setContactLastName] = useState("Chen");
  const [showCreate, setShowCreate] = useState(false);
  const showForm = showCreate || clients.length === 0;

  useEffect(() => {
    if (!clientApi) return;
    void clientApi.listClients().then(setClients);
  }, [clientApi]);

  return (
    <MissionScreen
      lifecycle="Sales"
      title="Client relationships"
      why="Every engagement starts with a client — your revenue relationships live here."
      decision={
        clients.length > 0
          ? "Open an existing client or add a new one."
          : "Add your first client to start the pipeline."
      }
      next="After adding a client, open Discovery to capture opportunity context."
      primaryAction={
        clients.length > 0 ? (
          <Button onClick={() => setShowCreate((v) => !v)}>
            {showForm ? "Hide form" : "Add client"}
          </Button>
        ) : undefined
      }
      secondaryActions={
        clients.length > 0 ? (
          <Link
            href={`/${workspace}/admin/opportunities`}
            className="flow-btn flow-btn--secondary flow-btn--sm"
          >
            Open discovery
          </Link>
        ) : null
      }
      copilot={{
        changed: `${clients.length} client${clients.length === 1 ? "" : "s"} in your book.`,
        recommended:
          clients.length === 0
            ? "Start with your hottest prospect — you can refine details later."
            : "Link each client to an opportunity before running discovery.",
      }}
    >
      {showForm ? (
        <section className="flow-panel">
          <h2>New client</h2>
          <FormField label="Client name" htmlFor="client-name">
            <TextInput
              id="client-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </FormField>
          <FormField label="Primary contact first name" htmlFor="contact-first">
            <TextInput
              id="contact-first"
              value={contactFirstName}
              onChange={(event) => setContactFirstName(event.target.value)}
            />
          </FormField>
          <FormField label="Primary contact last name" htmlFor="contact-last">
            <TextInput
              id="contact-last"
              value={contactLastName}
              onChange={(event) => setContactLastName(event.target.value)}
            />
          </FormField>
          <Button
            onClick={async () => {
              if (!clientApi) return;
              const created = await clientApi.createClient({
                name,
                contactFirstName,
                contactLastName,
                industry: "industrial robotics",
              });
              router.push(`/${workspace}/admin/clients/${created.client.id}`);
            }}
          >
            Create client
          </Button>
        </section>
      ) : null}

      {clients.length === 0 ? (
        <p className="flow-muted">No clients yet.</p>
      ) : (
        <ul className="flow-record-list">
          {clients.map((row) => (
            <li key={row.id} className="flow-record-list__item">
              <Link
                href={`/${workspace}/admin/clients/${row.id}`}
                className="flow-record-list__link"
              >
                <span className="flow-record-list__name">{row.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </MissionScreen>
  );
}

export default function Page() {
  return (
    <CommercialRoute>
      <ClientsList />
    </CommercialRoute>
  );
}
