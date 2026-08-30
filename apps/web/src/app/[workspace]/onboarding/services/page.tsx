"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

import { OnboardingShell } from "../../../../components/shell/AppShell";
import { WorkspaceGate } from "../../../../components/shell/WorkspaceGate";
import { ChoiceCard } from "../../../../components/onboarding/ChoiceCard";
import { SectionHeader } from "../../../../components/ui/Display";
import { Button } from "../../../../components/ui/Button";
import {
  FormField,
  Select,
  TextInput,
} from "../../../../components/ui/FormField";
import { suggestedServicesFixture } from "../../../../content/demo/suggested-services";
import { mergeServices } from "../../../../lib/prototype/defaults";
import { useWorkspaceSessionActions } from "../../../../lib/workspace/session-actions";
import styles from "../../../../components/shell/shell.module.css";

function ServicesStep() {
  const params = useParams();
  const workspace = params.workspace as string;
  const router = useRouter();
  const { updateSession, session } = useWorkspaceSessionActions(workspace);

  useEffect(() => {
    if (session && session.services.length === 0) {
      updateSession({
        services: mergeServices(suggestedServicesFixture(), []),
      });
    }
  }, [session, updateSession]);

  if (!session) return null;

  const toggleService = (id: string) => {
    updateSession({
      services: session.services.map((s) =>
        s.id === id ? { ...s, selected: !s.selected } : s,
      ),
    });
  };

  const updateService = (
    id: string,
    patch: Partial<(typeof session.services)[0]>,
  ) => {
    updateSession({
      services: session.services.map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      ),
    });
  };

  const addCustom = () => {
    const id = `custom-${Date.now()}`;
    updateSession({
      services: [
        ...session.services,
        {
          id,
          name: "Custom service",
          description: "",
          pricingModel: "project",
          selected: true,
          custom: true,
        },
      ],
    });
  };

  return (
    <OnboardingShell workspace={workspace} stepIndex={2} session={session}>
      <SectionHeader
        eyebrow="Onboarding"
        title="What services do you sell?"
        description="Select and refine the services Flow should understand."
      />
      <div className="flow-choice-grid" style={{ gap: "var(--space-4)" }}>
        {session.services.map((service) => (
          <div
            key={service.id}
            className="flow-surface"
            style={{ padding: "var(--space-4)" }}
          >
            <ChoiceCard
              title={service.custom ? "Custom service" : service.name}
              description={service.description}
              selected={service.selected}
              onSelect={() => toggleService(service.id)}
            />
            {service.selected && (
              <div
                className={styles.formStack}
                style={{ marginTop: "var(--space-4)" }}
              >
                {service.custom && (
                  <FormField
                    label="Service name"
                    htmlFor={`name-${service.id}`}
                  >
                    <TextInput
                      id={`name-${service.id}`}
                      value={service.name}
                      onChange={(e) =>
                        updateService(service.id, { name: e.target.value })
                      }
                    />
                  </FormField>
                )}
                <FormField
                  label="Pricing model"
                  htmlFor={`price-${service.id}`}
                >
                  <Select
                    id={`price-${service.id}`}
                    value={service.pricingModel}
                    onChange={(e) =>
                      updateService(service.id, {
                        pricingModel: e.target.value,
                      })
                    }
                  >
                    <option value="retainer">Retainer</option>
                    <option value="project">Fixed project</option>
                    <option value="hourly">Hourly</option>
                    <option value="milestone">Milestone</option>
                  </Select>
                </FormField>
              </div>
            )}
          </div>
        ))}
      </div>
      <Button
        variant="ghost"
        onClick={addCustom}
        style={{ marginTop: "var(--space-4)" }}
      >
        + Add custom service
      </Button>
      <div className={styles.onboardingActions}>
        <Button
          variant="secondary"
          onClick={() => router.push(`/${workspace}/onboarding/operations`)}
        >
          Back
        </Button>
        <Button
          onClick={() => router.push(`/${workspace}/onboarding/policies`)}
        >
          Continue
        </Button>
      </div>
    </OnboardingShell>
  );
}

export default function ServicesPage() {
  const workspace = useParams().workspace as string;
  return (
    <WorkspaceGate workspace={workspace}>
      <ServicesStep />
    </WorkspaceGate>
  );
}
