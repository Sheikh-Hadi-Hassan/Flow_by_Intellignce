"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CommercialRoute } from "../../../../../components/commercial/CommercialRoute";
import { SectionHeader } from "../../../../../components/ui/Display";
import { useCommercialClient } from "../../../../../lib/commercial/use-commercial";
import type {
  CommercialClientRecord,
  CommercialContactRecord,
} from "../../../../../lib/commercial/api";

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
  return (
    <CommercialRoute>
      <ClientDetail />
    </CommercialRoute>
  );
}
