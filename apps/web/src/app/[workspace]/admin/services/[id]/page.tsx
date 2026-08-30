"use client";
/* eslint-disable @typescript-eslint/no-misused-promises */

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CommercialRoute } from "../../../../../components/commercial/CommercialRoute";
import { MoneyLine } from "../../../../../components/commercial/Status";
import { Button } from "../../../../../components/ui/Button";
import { FormField, TextInput } from "../../../../../components/ui/FormField";
import {
  SectionHeader,
  StatusBadge,
} from "../../../../../components/ui/Display";
import { useCommercialClient } from "../../../../../lib/commercial/use-commercial";
import type { QuestionnaireVersion } from "../../../../../lib/commercial/api";

type CostRow = {
  roleKey: string;
  estimatedMinutes: number;
  internalRatePerHourMinor: string;
  vendorCostMinor: string;
};

function ServiceDetail() {
  const workspace = useParams().workspace as string;
  const serviceId = useParams().id as string;
  const client = useCommercialClient(workspace);
  const [name, setName] = useState("");
  const [pricingModel, setPricingModel] = useState("project");
  const [costs, setCosts] = useState<CostRow[]>([]);
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireVersion[]>(
    [],
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!client) return;
    void client.getService(serviceId).then((result) => {
      setName(result.service.name);
      setPricingModel(result.service.pricingModel);
      setCosts([
        ...(result.costs.length > 0
          ? result.costs
          : [
              {
                roleKey: "strategist",
                estimatedMinutes: 2400,
                internalRatePerHourMinor: "15000",
                vendorCostMinor: "0",
              },
            ]),
      ]);
      setQuestionnaires(result.questionnaires);
    });
  }, [client, serviceId]);

  const draft = questionnaires.find((row) => row.status === "draft");
  const published = questionnaires.find((row) => row.status === "published");

  return (
    <>
      <SectionHeader eyebrow="Service" title={name || "Service"} />
      {published && (
        <StatusBadge variant="success">Questionnaire published</StatusBadge>
      )}
      <section className="flow-panel">
        <h2>Service details</h2>
        <FormField label="Name" htmlFor="service-name">
          <TextInput
            id="service-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </FormField>
        <FormField label="Pricing model" htmlFor="pricing-model">
          <TextInput
            id="pricing-model"
            value={pricingModel}
            onChange={(event) => setPricingModel(event.target.value)}
          />
        </FormField>
        <h3>Cost components</h3>
        {costs.map((row, index) => (
          <div key={`${row.roleKey}-${index}`} className="flow-detail-group">
            <FormField label="Role" htmlFor={`role-${index}`}>
              <TextInput
                id={`role-${index}`}
                value={row.roleKey}
                onChange={(event) =>
                  setCosts((current) =>
                    current.map((entry, entryIndex) =>
                      entryIndex === index
                        ? { ...entry, roleKey: event.target.value }
                        : entry,
                    ),
                  )
                }
              />
            </FormField>
            <FormField label="Estimated minutes" htmlFor={`minutes-${index}`}>
              <TextInput
                id={`minutes-${index}`}
                inputMode="numeric"
                value={String(row.estimatedMinutes)}
                onChange={(event) =>
                  setCosts((current) =>
                    current.map((entry, entryIndex) =>
                      entryIndex === index
                        ? {
                            ...entry,
                            estimatedMinutes: Number(event.target.value) || 0,
                          }
                        : entry,
                    ),
                  )
                }
              />
            </FormField>
            <MoneyLine
              label="Internal rate / hour (minor units)"
              minor={row.internalRatePerHourMinor}
              currency="USD"
            />
            <FormField
              label="Internal rate / hour (minor)"
              htmlFor={`rate-${index}`}
            >
              <TextInput
                id={`rate-${index}`}
                inputMode="numeric"
                value={row.internalRatePerHourMinor}
                onChange={(event) =>
                  setCosts((current) =>
                    current.map((entry, entryIndex) =>
                      entryIndex === index
                        ? {
                            ...entry,
                            internalRatePerHourMinor: event.target.value,
                          }
                        : entry,
                    ),
                  )
                }
              />
            </FormField>
            <FormField label="Vendor cost (minor)" htmlFor={`vendor-${index}`}>
              <TextInput
                id={`vendor-${index}`}
                inputMode="numeric"
                value={row.vendorCostMinor}
                onChange={(event) =>
                  setCosts((current) =>
                    current.map((entry, entryIndex) =>
                      entryIndex === index
                        ? { ...entry, vendorCostMinor: event.target.value }
                        : entry,
                    ),
                  )
                }
              />
            </FormField>
          </div>
        ))}
        <Button
          onClick={async () => {
            if (!client) return;
            await client.updateService(serviceId, {
              name,
              pricingModel,
              costs,
            });
            setMessage("Service and costs saved.");
          }}
        >
          Save service
        </Button>
      </section>
      {draft && (
        <section className="flow-panel">
          <h2>Draft questionnaire v{draft.versionNumber}</h2>
          <p>
            Portable JSON Schema with conditional legal-review owner when legal
            review is required.
          </p>
          <Button
            onClick={async () => {
              if (!client) return;
              await client.publishQuestionnaire(draft.id);
              setMessage("Published. Responses will bind to this version.");
              const next = await client.getService(serviceId);
              setQuestionnaires(next.questionnaires);
            }}
          >
            Publish questionnaire
          </Button>
        </section>
      )}
      {message && <p role="status">{message}</p>}
    </>
  );
}

export default function Page() {
  return (
    <CommercialRoute>
      <ServiceDetail />
    </CommercialRoute>
  );
}
