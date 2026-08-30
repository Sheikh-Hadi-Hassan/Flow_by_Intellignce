"use client";
/* eslint-disable @typescript-eslint/no-misused-promises */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CommercialRoute } from "../../../../components/commercial/CommercialRoute";
import { journeyBadge } from "../../../../components/commercial/Status";
import { Button } from "../../../../components/ui/Button";
import {
  FormField,
  Select,
  TextInput,
} from "../../../../components/ui/FormField";
import { SectionHeader, StatusBadge } from "../../../../components/ui/Display";
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

  return (
    <>
      <SectionHeader
        eyebrow="Pipeline"
        title="Opportunities"
        description="Discovery through immutable brief approval."
      />
      <section className="flow-panel">
        <h2>Create opportunity</h2>
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
          onClick={async () => {
            if (!api || !clientId || !serviceId) return;
            const created = await api.createOpportunity({
              clientId,
              serviceId,
              name,
              budgetMinMinor: "7000000",
              budgetMaxMinor: "9000000",
            });
            router.push(`/${workspace}/admin/opportunities/${created.id}`);
          }}
        >
          Create opportunity
        </Button>
      </section>
      <ul className="flow-compact-list">
        {rows.map((row) => (
          <li key={row.id}>
            <Link href={`/${workspace}/admin/opportunities/${row.id}`}>
              {row.name}
            </Link>{" "}
            <StatusBadge variant={journeyBadge(row.journeyStatus)}>
              {row.journeyStatus.replaceAll("_", " ")}
            </StatusBadge>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function Page() {
  return (
    <CommercialRoute>
      <OpportunitiesList />
    </CommercialRoute>
  );
}
