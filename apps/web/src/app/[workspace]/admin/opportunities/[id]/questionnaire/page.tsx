"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { parseBuilderDocument, validateQuestionnaireResponse } from "@flow/commercial";

import { CommercialRoute } from "../../../../../../components/commercial/CommercialRoute";
import { OpportunityNav } from "../../../../../../components/commercial/Status";
import {
  countAnswered,
  QuestionnaireAnswerForm,
  totalAnswerable,
} from "../../../../../../components/questionnaire/QuestionnaireAnswerForm";
import {
  AutosaveStatus,
  QuestionnaireProgress,
  ValidationMessage,
  type AutosaveState,
} from "../../../../../../components/questionnaire/QuestionnaireChrome";
import { Button } from "../../../../../../components/ui/Button";
import { InlineAlert, ProofLabel, SectionHeader } from "../../../../../../components/ui/Display";
import { createAutosave } from "../../../../../../lib/commercial/autosave";
import type { OpportunityBundle } from "../../../../../../lib/commercial/api";
import { useCommercialClient } from "../../../../../../lib/commercial/use-commercial";

function AnswerPage() {
  const workspace = useParams().workspace as string;
  const opportunityId = useParams().id as string;
  const api = useCommercialClient(workspace);
  const [bundle, setBundle] = useState<OpportunityBundle | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [autosave, setAutosave] = useState<AutosaveState>("idle");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const autosaveRef = useRef<ReturnType<typeof createAutosave<Record<string, unknown>>> | null>(null);

  useEffect(() => {
    if (!api) return;
    void api.getOpportunity(opportunityId).then((next) => {
      setBundle(next);
      setAnswers(next.answers ?? {});
      setSubmitted(
        Boolean(next.facts.some((fact) => fact.status === "draft" && fact.category)),
      );
    });
  }, [api, opportunityId]);

  useEffect(() => {
    if (!api) return;
    const autosaveClient = createAutosave(async (value) => {
      setAutosave("saving");
      try {
        const next = await api.saveAnswers(opportunityId, value);
        setBundle(next);
        setAutosave("saved");
      } catch {
        setAutosave("error");
      }
    });
    autosaveRef.current = autosaveClient;
    return () => {
      void autosaveClient.flush();
    };
  }, [api, opportunityId]);

  if (!bundle?.questionnaire) {
    return <p>No published questionnaire is attached to this opportunity.</p>;
  }

  const builder = parseBuilderDocument(bundle.questionnaire);
  const answered = countAnswered(builder, answers);
  const total = totalAnswerable(builder);

  const submit = async () => {
    if (!api) return;
    const validated = validateQuestionnaireResponse(
      {
        version: bundle.questionnaire!.versionNumber,
        jsonSchema: bundle.questionnaire!.jsonSchema,
        uiSchema: bundle.questionnaire!.uiSchema,
        questionMeta: bundle.questionnaire!.questionMeta as never,
      },
      answers,
      { enforceRequired: true },
    );
    if (!validated.valid) {
      setValidationErrors([...validated.errors]);
      return;
    }
    setValidationErrors([]);
    const next = await api.submitAnswers(opportunityId, answers);
    setBundle(next);
    setSubmitted(true);
  };

  return (
    <>
      <SectionHeader
        eyebrow="Questionnaire"
        title={bundle.opportunity.name}
        description="Responses autosave and become draft discovery evidence after submission."
      />
      <OpportunityNav workspace={workspace} opportunityId={opportunityId} />
      <AutosaveStatus state={autosave} />
      <QuestionnaireProgress answered={answered} total={total} />
      <ValidationMessage messages={validationErrors} />
      {submitted && (
        <InlineAlert variant="info">
          Submitted. Draft facts are available on the discovery screen for review — they are
          not automatically verified.
          <ProofLabel type="fact">Governed discovery input</ProofLabel>
        </InlineAlert>
      )}
      <section className="flow-panel">
        <QuestionnaireAnswerForm
          document={builder}
          answers={answers}
          errors={validationErrors}
          disabled={submitted}
          onChange={(value) => {
            setAnswers(value);
            autosaveRef.current?.queue(value);
          }}
        />
        <div className="flow-toolbar">
          <Button variant="secondary" onClick={() => void autosaveRef.current?.flush()}>
            Save now
          </Button>
          <Button onClick={() => void submit()} disabled={submitted}>
            Submit questionnaire
          </Button>
          <Link
            href={`/${workspace}/admin/opportunities/${opportunityId}/discovery`}
            className="flow-btn flow-btn--ghost"
          >
            Review discovery evidence
          </Link>
        </div>
      </section>
    </>
  );
}

export default function Page() {
  return (
    <CommercialRoute>
      <AnswerPage />
    </CommercialRoute>
  );
}
