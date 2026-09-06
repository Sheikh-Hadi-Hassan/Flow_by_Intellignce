"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";

import { CommercialRoute } from "../../../../components/commercial/CommercialRoute";
import { CrmCoreDirectory } from "../../../../components/crm-core/CrmCoreScreens";
import { WorkspaceGate } from "../../../../components/shell/WorkspaceGate";
import { Button } from "../../../../components/ui/Button";
import { FormField, TextInput } from "../../../../components/ui/FormField";
import { SectionHeader } from "../../../../components/ui/Display";
import { useCommercialClient } from "../../../../lib/commercial/use-commercial";
import type { CommercialClientRecord } from "../../../../lib/commercial/api";
import { isMissionDemoWorkspace } from "../../../../lib/mission-control/store";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function ClientsList() {
  const workspace = useParams().workspace as string;
  const router = useRouter();
  const clientApi = useCommercialClient(workspace);
  const [clients, setClients] = useState<CommercialClientRecord[]>([]);
  const [name, setName] = useState("Acme Robotics");
  const [contactFirstName, setContactFirstName] = useState("Priya");
  const [contactLastName, setContactLastName] = useState("Chen");

  useEffect(() => {
    if (!clientApi) return;
    void clientApi.listClients().then(setClients);
  }, [clientApi]);

  return (
    <>
      <SectionHeader
        eyebrow="CRM"
        title="Clients"
        description="Clients are CRM organizations, not the agency legal entity."
      />
      <section className="flow-panel">
        <h2>Create client</h2>
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
      <ul className="flow-compact-list">
        {clients.map((row) => (
          <li key={row.id}>
            <Link href={`/${workspace}/admin/clients/${row.id}`}>
              {row.name}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function Page() {
  const workspace = useParams().workspace as string;
  if (isMissionDemoWorkspace(workspace)) {
    return (
      <WorkspaceGate workspace={workspace} requireTwin variant="founder">
        <Suspense fallback={null}>
          <CrmCoreDirectory workspace={workspace} />
        </Suspense>
      </WorkspaceGate>
    );
  }
  return (
    <CommercialRoute>
      <ClientsList />
    </CommercialRoute>
  );
}
