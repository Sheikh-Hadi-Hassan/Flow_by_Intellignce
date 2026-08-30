"use client";

import { useParams, useRouter } from "next/navigation";

import { OnboardingShell } from "../../../../components/shell/AppShell";
import { WorkspaceGate } from "../../../../components/shell/WorkspaceGate";
import { MultiSelectChoice } from "../../../../components/onboarding/ChoiceCard";
import { SectionHeader } from "../../../../components/ui/Display";
import { Button } from "../../../../components/ui/Button";
import { FormField, Select } from "../../../../components/ui/FormField";
import { useWorkspaceSessionActions } from "../../../../lib/workspace/session-actions";
import styles from "../../../../components/shell/shell.module.css";

const WORK_MODELS = [
  {
    id: "project_based",
    label: "Project-based",
    description: "Fixed scope engagements",
  },
  {
    id: "retainer",
    label: "Retainer",
    description: "Ongoing monthly programs",
  },
  {
    id: "milestone",
    label: "Milestone billing",
    description: "Phased payments",
  },
  { id: "hourly", label: "Hourly", description: "Time and materials" },
  { id: "hybrid", label: "Hybrid", description: "Mix of models" },
];

const TOOLS = [
  { id: "QuickBooks", label: "QuickBooks" },
  { id: "ClickUp", label: "ClickUp" },
  { id: "Slack", label: "Slack" },
  { id: "Google Workspace", label: "Google Workspace" },
  { id: "HubSpot", label: "HubSpot" },
];

function OperationsStep() {
  const params = useParams();
  const workspace = params.workspace as string;
  const router = useRouter();
  const { updateSession, session } = useWorkspaceSessionActions(workspace);
  if (!session) return null;

  const { operations } = session;

  return (
    <OnboardingShell workspace={workspace} stepIndex={1} session={session}>
      <SectionHeader
        eyebrow="Onboarding"
        title="How does your agency operate?"
        description="Delivery model, team shape, and tools help Flow understand capacity and risk."
      />
      <FormField label="Work models" htmlFor="work-models">
        <MultiSelectChoice
          options={WORK_MODELS}
          selected={operations.workModels}
          onChange={(workModels) =>
            updateSession({ operations: { ...operations, workModels } })
          }
        />
      </FormField>
      <div className={styles.grid2} style={{ marginTop: "var(--space-6)" }}>
        <FormField label="Team location" htmlFor="teamLocation">
          <Select
            id="teamLocation"
            value={operations.teamLocation}
            onChange={(e) =>
              updateSession({
                operations: { ...operations, teamLocation: e.target.value },
              })
            }
          >
            <option value="">Select…</option>
            <option value="remote">Remote</option>
            <option value="onsite">Onsite</option>
            <option value="hybrid">Hybrid</option>
          </Select>
        </FormField>
        <FormField label="Primary client type" htmlFor="clientType">
          <Select
            id="clientType"
            value={operations.clientType}
            onChange={(e) =>
              updateSession({
                operations: { ...operations, clientType: e.target.value },
              })
            }
          >
            <option value="">Select…</option>
            <option value="b2b_enterprise">B2B enterprise</option>
            <option value="b2b_smb">B2B SMB</option>
            <option value="b2c">B2C</option>
          </Select>
        </FormField>
      </div>
      <FormField
        label="Typical project duration"
        htmlFor="projectDuration"
        help="Helps planning defaults"
      >
        <Select
          id="projectDuration"
          value={operations.projectDuration}
          onChange={(e) =>
            updateSession({
              operations: { ...operations, projectDuration: e.target.value },
            })
          }
        >
          <option value="">Select…</option>
          <option value="4-8_weeks">4–8 weeks</option>
          <option value="8-14_weeks">8–14 weeks</option>
          <option value="3-6_months">3–6 months</option>
        </Select>
      </FormField>
      <FormField label="Current tools">
        <MultiSelectChoice
          options={TOOLS}
          selected={operations.tools}
          onChange={(tools) =>
            updateSession({ operations: { ...operations, tools } })
          }
        />
      </FormField>
      <FormField label="Key operational concern" htmlFor="concern">
        <Select
          id="concern"
          value={operations.operationalConcern}
          onChange={(e) =>
            updateSession({
              operations: { ...operations, operationalConcern: e.target.value },
            })
          }
        >
          <option value="">Select…</option>
          <option value="scope_creep">Scope creep</option>
          <option value="utilization">Utilization</option>
          <option value="cash_flow">Cash flow</option>
          <option value="delivery_quality">Delivery quality</option>
        </Select>
      </FormField>
      <div className={styles.onboardingActions}>
        <Button
          variant="secondary"
          onClick={() => router.push(`/${workspace}/onboarding/business`)}
        >
          Back
        </Button>
        <Button
          onClick={() => router.push(`/${workspace}/onboarding/services`)}
        >
          Continue
        </Button>
      </div>
    </OnboardingShell>
  );
}

export default function OperationsPage() {
  const workspace = useParams().workspace as string;
  return (
    <WorkspaceGate workspace={workspace}>
      <OperationsStep />
    </WorkspaceGate>
  );
}
