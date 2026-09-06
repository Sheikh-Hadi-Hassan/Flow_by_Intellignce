"use client";

import { useParams } from "next/navigation";

import { CommercialRoute } from "../../../../../components/commercial/CommercialRoute";
import { CrmClient360 } from "../../../../../components/crm-core/CrmCoreScreens";
import { WorkspaceGate } from "../../../../../components/shell/WorkspaceGate";
import { SectionHeader } from "../../../../../components/ui/Display";
import { useCommercialClient } from "../../../../../lib/commercial/use-commercial";
import type {
  CommercialClientRecord,
  CommercialContactRecord,
} from "../../../../../lib/commercial/api";
import { isMissionDemoWorkspace } from "../../../../../lib/mission-control/store";
import { useEffect, useState } from "react";

function ClientDetail() {
  const workspace = useParams().workspace as string;
  const clientId = useParams().id as string;
  const api = useCommercialClient(workspace);
  const [client, setClient] = useState<CommercialClientRecord | null>(null);
  const [contacts, setContacts] = useState<CommercialContactRecord[]>([]);

  useEffect(() => {
    if (!api) return;
    void api.getClient(clientId).then((result) => {
      setClient(result.client);
      setContacts(result.contacts);
    });
  }, [api, clientId]);

  if (!client) return null;
  return (
    <>
      <SectionHeader eyebrow="Client" title={client.name} />
      <p>{client.industry}</p>
      <h2>Contacts</h2>
      <ul className="flow-compact-list">
        {contacts.map((contact) => (
          <li key={contact.id}>
            {contact.firstName} {contact.lastName}
            {contact.title ? ` · ${contact.title}` : ""}
          </li>
        ))}
      </ul>
    </>
  );
}

export default function Page() {
  const workspace = useParams().workspace as string;
  const clientId = useParams().id as string;
  if (isMissionDemoWorkspace(workspace)) {
    return (
      <WorkspaceGate workspace={workspace} requireTwin variant="founder">
        <CrmClient360 workspace={workspace} clientId={clientId} />
      </WorkspaceGate>
    );
  }
  return (
    <CommercialRoute>
      <ClientDetail />
    </CommercialRoute>
  );
}
