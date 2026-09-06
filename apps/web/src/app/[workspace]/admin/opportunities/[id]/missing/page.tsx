"use client";
/* eslint-disable @typescript-eslint/no-misused-promises */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { parseBuilderDocument, unansweredQuestionnaireFields } from "@flow/commercial";

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
  const missingFollowUps = bundle.followUps.filter((row) => row.required && !row.answer);
  const questionnaireGaps =
    bundle.questionnaire && !bundle.questionnaireSubmission
      ? unansweredQuestionnaireFields(
          parseBuilderDocument(bundle.questionnaire),
          bundle.answers ?? {},
        )
      : [];
  const hasGaps = missingFollowUps.length > 0 || questionnaireGaps.length > 0;

  return (
    <>
      <SectionHeader
        eyebrow="Missing information"
        title="Questions still needed"
        description="Required questionnaire responses and follow-ups block ready-for-brief until complete."
      />
      <OpportunityNav workspace={workspace} opportunityId={opportunityId} />
      <StatusBadge variant={hasGaps ? "warning" : "success"}>
        {hasGaps ? "Missing information" : "Required inputs complete"}
      </StatusBadge>
      {questionnaireGaps.length > 0 && (
        <section className="flow-panel">
          <h2 className="flow-panel__title">Questionnaire</h2>
          <p className="flow-muted">
            Required questionnaire fields are unanswered or not yet submitted.
          </p>
          <ul className="flow-list">
            {questionnaireGaps.map((field) => (
              <li key={field.id}>{field.label}</li>
            ))}
          </ul>
          <Link
            href={`/${workspace}/admin/opportunities/${opportunityId}/questionnaire`}
            className="flow-btn flow-btn--secondary"
          >
            Complete questionnaire
          </Link>
        </section>
      )}
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
