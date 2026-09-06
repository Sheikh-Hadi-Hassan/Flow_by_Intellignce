"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CommercialRoute } from "../../../../../../components/commercial/CommercialRoute";
import { QuestionnaireBuilder } from "../../../../../../components/questionnaire/QuestionnaireBuilder";
import { SectionHeader } from "../../../../../../components/ui/Display";
import type { QuestionnaireVersion } from "../../../../../../lib/commercial/api";
import { useCommercialClient } from "../../../../../../lib/commercial/use-commercial";

function QuestionnairePage() {
  const workspace = useParams().workspace as string;
  const serviceId = useParams().id as string;
  const router = useRouter();
  const client = useCommercialClient(workspace);
  const [versions, setVersions] = useState<QuestionnaireVersion[]>([]);
  const [serviceName, setServiceName] = useState("");

  const load = async () => {
    if (!client) return;
    const result = await client.getService(serviceId);
    setServiceName(result.service.name);
    setVersions(result.questionnaires);
  };

  useEffect(() => {
    void load();
  }, [client, serviceId]);

  const draft = versions.find((row) => row.status === "draft");
  const published = versions.find((row) => row.status === "published");

  if (!client) return null;
  if (!draft && !published) {
    return (
      <>
        <SectionHeader eyebrow="Service" title={serviceName} />
        <p>No questionnaire versions found for this service.</p>
      </>
    );
  }

  const active = draft ?? published!;

  return (
    <>
      <div className="flow-toolbar">
        <Link href={`/${workspace}/admin/services/${serviceId}`} className="flow-btn flow-btn--ghost">
          Back to service
        </Link>
      </div>
      <QuestionnaireBuilder
        initialVersion={active}
        publishedVersionNumber={published?.versionNumber}
        onSaveDraft={async (builder) => {
          if (!draft) return;
          await client.updateDraftQuestionnaire(draft.id, { builder });
          await load();
        }}
        onPublish={async () => {
          if (!draft) return;
          await client.publishQuestionnaire(draft.id);
          await load();
        }}
        {...(published
          ? {
              onDuplicatePublished: async () => {
                await client.duplicateQuestionnaireDraft(serviceId);
                await load();
                router.refresh();
              },
            }
          : {})}
      />
      <section className="flow-panel">
        <h2>Version history</h2>
        <ul className="flow-compact-list">
          {versions.map((version) => (
            <li key={version.id}>
              v{version.versionNumber} — {version.status.replaceAll("_", " ")}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export default function Page() {
  return (
    <CommercialRoute>
      <QuestionnairePage />
    </CommercialRoute>
  );
}
