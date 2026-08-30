"use client";
/* eslint-disable @typescript-eslint/no-misused-promises */

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CommercialRoute } from "../../../../../../components/commercial/CommercialRoute";
import { OpportunityNav } from "../../../../../../components/commercial/Status";
import { Button } from "../../../../../../components/ui/Button";
import {
  FormField,
  TextInput,
} from "../../../../../../components/ui/FormField";
import {
  SectionHeader,
  StatusBadge,
} from "../../../../../../components/ui/Display";
import { useCommercialClient } from "../../../../../../lib/commercial/use-commercial";
import type { OpportunityBundle } from "../../../../../../lib/commercial/api";

function Missing() {
  const workspace = useParams().workspace as string;
  const opportunityId = useParams().id as string;
  const api = useCommercialClient(workspace);
  const [bundle, setBundle] = useState<OpportunityBundle | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!api) return;
    void api.getOpportunity(opportunityId).then(setBundle);
  }, [api, opportunityId]);

  if (!bundle) return null;
  const missing = bundle.followUps.filter((row) => row.required && !row.answer);

  return (
    <>
      <SectionHeader
        eyebrow="Missing information"
        title="Questions still needed"
        description="Required follow-ups block ready-for-brief until answered."
      />
      <OpportunityNav workspace={workspace} opportunityId={opportunityId} />
      <StatusBadge variant={missing.length ? "warning" : "success"}>
        {missing.length
          ? "Missing information"
          : "Required follow-ups complete"}
      </StatusBadge>
      {bundle.followUps.map((row) => (
        <section key={row.id} className="flow-panel">
          <FormField label={row.prompt} htmlFor={row.id}>
            <TextInput
              id={row.id}
              value={answers[row.id] ?? row.answer ?? ""}
              onChange={(event) =>
                setAnswers((current) => ({
                  ...current,
                  [row.id]: event.target.value,
                }))
              }
            />
          </FormField>
          <Button
            size="sm"
            onClick={async () => {
              if (!api) return;
              await api.answerFollowUp(row.id, answers[row.id] ?? "");
              setBundle(await api.getOpportunity(opportunityId));
            }}
          >
            Save answer
          </Button>
        </section>
      ))}
    </>
  );
}

export default function Page() {
  return (
    <CommercialRoute>
      <Missing />
    </CommercialRoute>
  );
}
