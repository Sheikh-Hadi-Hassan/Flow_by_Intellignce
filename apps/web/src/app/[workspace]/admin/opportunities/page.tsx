"use client";
/* eslint-disable @typescript-eslint/no-misused-promises */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CommercialRoute } from "../../../../components/commercial/CommercialRoute";
import { journeyBadge } from "../../../../components/commercial/Status";
import { MissionScreen } from "../../../../components/os/MissionScreen";
import { Button } from "../../../../components/ui/Button";
import {
  FormField,
  Select,
  TextInput,
} from "../../../../components/ui/FormField";
import { StatusBadge } from "../../../../components/ui/Display";
import { useCommercialClient } from "../../../../lib/commercial/use-commercial";
import type {
  CommercialClientRecord,
  CommercialServiceRecord,
  OpportunityRecord,
} from "../../../../lib/commercial/api";

function OpportunitiesList() {
  const workspace = useParams().workspace as string;
  const router = useRouter();
  const api = useCommercialClient(workspace);
  const [rows, setRows] = useState<OpportunityRecord[]>([]);
  const [clients, setClients] = useState<CommercialClientRecord[]>([]);
  const [services, setServices] = useState<CommercialServiceRecord[]>([]);
  const [clientId, setClientId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [name, setName] = useState("Acme Robotics brand system");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const showForm = showCreate || rows.length === 0;
  const ready = Boolean(api && clientId && serviceId);

  useEffect(() => {
    if (!api) return;
    void Promise.all([
      api.listOpportunities(),
      api.listClients(),
      api.listServices(),
    ]).then(([nextRows, nextClients, nextServices]) => {
      setRows(nextRows);
      setClients(nextClients);
      setServices(nextServices);
      setClientId(nextClients[0]?.id ?? "");
      setServiceId(nextServices[0]?.id ?? "");
    });
  }, [api]);

  const needsAttention = rows.filter(
    (r) =>
      r.journeyStatus === "founder_review" ||
      r.journeyStatus === "information_missing" ||
      r.journeyStatus === "changes_requested",
  ).length;

  return (
    <MissionScreen
      lifecycle="Discovery"
      title="Opportunity pipeline"
      why="Capture what the client needs before you scope, price, or propose."
      decision={
        rows.length > 0
          ? "Pick an engagement to continue discovery or start a new one."
          : "Create an opportunity linked to a client and service."
      }
      next="Complete discovery notes, extract facts, then generate the brief."
      primaryAction={
        rows.length > 0 ? (
          <Button
            onClick={() => setShowCreate((v) => !v)}
            disabled={clients.length === 0}
          >
            {showForm ? "Hide form" : "New opportunity"}
          </Button>
        ) : (
          <Button disabled={clients.length === 0}>New opportunity</Button>
        )
      }
      copilot={{
        changed: `${rows.length} opportunit${rows.length === 1 ? "y" : "ies"} tracked.`,
        recommended:
          needsAttention > 0
            ? `${needsAttention} need${needsAttention === 1 ? "s" : ""} your attention — start there.`
            : "Run discovery analysis after saving meeting notes.",
        ...(clients.length === 0
          ? { risk: "Add a client under Sales before creating opportunities." }
          : {}),
      }}
    >
      {showForm ? (
        <section className="flow-panel">
          <h2>New opportunity</h2>
          {error ? (
            <p className="flow-error" role="alert">
              {error}
            </p>
          ) : null}
          <FormField label="Name" htmlFor="opp-name">
            <TextInput
              id="opp-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </FormField>
          <FormField label="Client" htmlFor="opp-client">
            <Select
              id="opp-client"
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
            >
              {clients.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Service" htmlFor="opp-service">
            <Select
              id="opp-service"
              value={serviceId}
              onChange={(event) => setServiceId(event.target.value)}
            >
              {services.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </Select>
          </FormField>
          <Button
            disabled={!ready || creating}
            onClick={async () => {
              if (!api || !clientId || !serviceId) return;
              setCreating(true);
              setError(null);
              try {
                const created = await api.createOpportunity({
                  clientId,
                  serviceId,
                  name,
                  budgetMinMinor: "7000000",
                  budgetMaxMinor: "9000000",
                });
                router.push(`/${workspace}/admin/opportunities/${created.id}`);
              } catch (createError) {
                setError(
                  createError instanceof Error
                    ? createError.message
                    : "Unable to create opportunity.",
                );
              } finally {
                setCreating(false);
              }
            }}
          >
            {creating ? "Creating…" : "Create opportunity"}
          </Button>
        </section>
      ) : null}

      {rows.length === 0 ? (
        <p className="flow-muted">No opportunities yet.</p>
      ) : (
        <ul className="flow-record-list">
          {rows.map((row) => (
            <li key={row.id} className="flow-record-list__item">
              <Link
                href={`/${workspace}/admin/opportunities/${row.id}`}
                className="flow-record-list__link"
              >
                <span className="flow-record-list__name">{row.name}</span>
                <StatusBadge variant={journeyBadge(row.journeyStatus)}>
                  {row.journeyStatus.replaceAll("_", " ")}
                </StatusBadge>
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
      <OpportunitiesList />
    </CommercialRoute>
  );
}
