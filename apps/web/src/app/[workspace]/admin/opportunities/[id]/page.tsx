"use client";
/* eslint-disable @typescript-eslint/no-misused-promises */

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { CommercialRoute } from "../../../../../components/commercial/CommercialRoute";
import {
  journeyBadge,
  MoneyLine,
  OpportunityNav,
} from "../../../../../components/commercial/Status";
import { QuestionnaireForm } from "../../../../../components/commercial/QuestionnaireForm";
import { Button } from "../../../../../components/ui/Button";
import { FormField, TextInput } from "../../../../../components/ui/FormField";
import {
  SectionHeader,
  StatusBadge,
} from "../../../../../components/ui/Display";
import { createAutosave } from "../../../../../lib/commercial/autosave";
import { useCommercialClient } from "../../../../../lib/commercial/use-commercial";
import type { OpportunityBundle } from "../../../../../lib/commercial/api";

function CalculationPanel({
  bundle,
  onCalculate,
}: {
  bundle: OpportunityBundle;
  onCalculate: () => Promise<void>;
}) {
  const calc = bundle.opportunity.latestCalculation;
  return (
    <section className="flow-panel">
      <h2>Business math</h2>
      <MoneyLine
        label="Internal labour"
        minor={
          typeof calc?.internalLabourCostMinor === "string"
            ? calc.internalLabourCostMinor
            : undefined
        }
        currency={bundle.opportunity.currency}
      />
      <MoneyLine
        label="Vendor / external"
        minor={
          typeof calc?.vendorCostMinor === "string"
            ? calc.vendorCostMinor
            : undefined
        }
        currency={bundle.opportunity.currency}
      />
      <MoneyLine
        label="Contingency"
        minor={
          typeof calc?.contingencyMinor === "string"
            ? calc.contingencyMinor
            : undefined
        }
        currency={bundle.opportunity.currency}
      />
      <MoneyLine
        label="Total delivery cost"
        minor={
          typeof calc?.totalDeliveryCostMinor === "string"
            ? calc.totalDeliveryCostMinor
            : undefined
        }
        currency={bundle.opportunity.currency}
      />
      <MoneyLine
        label="Recommended price"
        minor={
          typeof calc?.recommendedPriceMinor === "string"
            ? calc.recommendedPriceMinor
            : undefined
        }
        currency={bundle.opportunity.currency}
      />
      <MoneyLine
        label="Gross profit"
        minor={
          typeof calc?.grossProfitMinor === "string"
            ? calc.grossProfitMinor
            : undefined
        }
        currency={bundle.opportunity.currency}
      />
      <p>
        Target margin:{" "}
        {typeof calc?.targetMarginBps === "number"
          ? `${calc.targetMarginBps / 100}%`
          : "—"}
      </p>
      <p>
        Budget fit: {typeof calc?.budgetFit === "string" ? calc.budgetFit : "—"}
      </p>
      <p>
        Timeline feasibility:{" "}
        {typeof calc?.timelineFeasibility === "string"
          ? calc.timelineFeasibility
          : "—"}
      </p>
      <p>Completeness: {bundle.opportunity.completeness}%</p>
      <Button onClick={() => void onCalculate()}>
        Run deterministic calculation
      </Button>
    </section>
  );
}

function Overview() {
  const workspace = useParams().workspace as string;
  const opportunityId = useParams().id as string;
  const api = useCommercialClient(workspace);
  const [bundle, setBundle] = useState<OpportunityBundle | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [deliverableEdits, setDeliverableEdits] = useState<
    Record<string, string>
  >({});
  const autosaveRef = useRef<ReturnType<
    typeof createAutosave<Record<string, unknown>>
  > | null>(null);

  useEffect(() => {
    if (!api) return;
    void api.getOpportunity(opportunityId).then((next) => {
      setBundle(next);
      setAnswers(next.answers ?? {});
      setDeliverableEdits(
        Object.fromEntries(next.deliverables.map((row) => [row.id, row.name])),
      );
    });
  }, [api, opportunityId]);

  useEffect(() => {
    if (!api) return;
    const autosave = createAutosave((value: Record<string, unknown>) =>
      api.saveAnswers(opportunityId, value).then(setBundle),
    );
    autosaveRef.current = autosave;
    const onLeave = () => {
      void autosave.flush();
    };
    window.addEventListener("pagehide", onLeave);
    return () => {
      window.removeEventListener("pagehide", onLeave);
      void autosave.flush();
    };
  }, [api, opportunityId]);

  if (!bundle) return null;

  return (
    <>
      <SectionHeader eyebrow="Opportunity" title={bundle.opportunity.name} />
      <StatusBadge variant={journeyBadge(bundle.opportunity.journeyStatus)}>
        {bundle.opportunity.journeyStatus.replaceAll("_", " ")}
      </StatusBadge>
      <OpportunityNav workspace={workspace} opportunityId={opportunityId} />
      {bundle.questionnaire && (
        <section className="flow-panel">
          <h2>Questionnaire</h2>
          <QuestionnaireForm
            schema={bundle.questionnaire.jsonSchema}
            uiSchema={bundle.questionnaire.uiSchema}
            formData={answers}
            onChange={(value) => {
              setAnswers(value);
              autosaveRef.current?.queue(value);
            }}
          />
        </section>
      )}
      <CalculationPanel
        bundle={bundle}
        onCalculate={async () => {
          if (!api) return;
          await autosaveRef.current?.flush();
          setBundle(await api.calculate(opportunityId));
        }}
      />
      <section className="flow-panel">
        <h2>Scope</h2>
        <h3>Deliverables</h3>
        <ul className="flow-compact-list">
          {bundle.deliverables.map((row) => (
            <li key={row.id}>
              <FormField
                label="Deliverable name"
                htmlFor={`deliverable-${row.id}`}
              >
                <TextInput
                  id={`deliverable-${row.id}`}
                  value={deliverableEdits[row.id] ?? row.name}
                  onChange={(event) =>
                    setDeliverableEdits((current) => ({
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
                  await api.updateDeliverable(row.id, {
                    name: deliverableEdits[row.id] ?? row.name,
                    ...(row.description
                      ? { description: row.description }
                      : {}),
                  });
                  setBundle(await api.getOpportunity(opportunityId));
                }}
              >
                Save deliverable
              </Button>
            </li>
          ))}
        </ul>
        <h3>Requirements</h3>
        <ul className="flow-compact-list">
          {bundle.requirements.map((row) => (
            <li key={row.key}>
              {row.key}: {row.statement}
            </li>
          ))}
        </ul>
        <h3>Risks</h3>
        <ul className="flow-compact-list">
          {bundle.risks.map((row) => (
            <li key={row.id}>
              {row.statement}{" "}
              <StatusBadge
                variant={row.blocking && !row.handled ? "warning" : "success"}
              >
                {row.handled ? "Handled" : "Open"}
              </StatusBadge>
              {row.blocking && !row.handled && (
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!api) return;
                    await api.handleRisk(row.id);
                    setBundle(await api.getOpportunity(opportunityId));
                  }}
                >
                  Mark handled
                </Button>
              )}
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
      <Overview />
    </CommercialRoute>
  );
}
