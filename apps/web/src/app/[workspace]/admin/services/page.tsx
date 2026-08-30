"use client";
/* eslint-disable @typescript-eslint/no-misused-promises */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CommercialRoute } from "../../../../components/commercial/CommercialRoute";
import { Button } from "../../../../components/ui/Button";
import { FormField, TextInput } from "../../../../components/ui/FormField";
import { SectionHeader, StatusBadge } from "../../../../components/ui/Display";
import { useCommercialClient } from "../../../../lib/commercial/use-commercial";
import type { CommercialServiceRecord } from "../../../../lib/commercial/api";

function ServicesList() {
  const workspace = useParams().workspace as string;
  const router = useRouter();
  const client = useCommercialClient(workspace);
  const [services, setServices] = useState<CommercialServiceRecord[]>([]);
  const [name, setName] = useState("Brand Strategy & Identity");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client) return;
    void client
      .listServices()
      .then(setServices)
      .catch((err: Error) => setError(err.message));
  }, [client]);

  return (
    <>
      <SectionHeader
        eyebrow="Catalogue"
        title="Services"
        description="Create a service, then publish its questionnaire before collecting responses."
      />
      {error && <p role="alert">{error}</p>}
      <section className="flow-panel">
        <h2>Create service</h2>
        <FormField label="Service name" htmlFor="service-name">
          <TextInput
            id="service-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </FormField>
        <Button
          onClick={async () => {
            if (!client) return;
            const created = await client.createService({
              name,
              pricingModel: "project",
              currency: "USD",
            });
            router.push(`/${workspace}/admin/services/${created.service.id}`);
          }}
        >
          Create service
        </Button>
      </section>
      <ul className="flow-compact-list">
        {services.map((service) => (
          <li key={service.id}>
            <Link href={`/${workspace}/admin/services/${service.id}`}>
              {service.name}
            </Link>{" "}
            <StatusBadge>{service.status}</StatusBadge>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function Page() {
  return (
    <CommercialRoute>
      <ServicesList />
    </CommercialRoute>
  );
}
