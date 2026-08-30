"use client";

import { useParams, useRouter } from "next/navigation";

import { OnboardingShell } from "../../../../components/shell/AppShell";
import { WorkspaceGate } from "../../../../components/shell/WorkspaceGate";
import { SectionHeader, InlineAlert } from "../../../../components/ui/Display";
import { Button } from "../../../../components/ui/Button";
import { FormField, Select } from "../../../../components/ui/FormField";
import { useWorkspaceSessionActions } from "../../../../lib/workspace/session-actions";
import styles from "../../../../components/shell/shell.module.css";

function PoliciesStep() {
  const params = useParams();
  const workspace = params.workspace as string;
  const router = useRouter();
  const { updateSession, session } = useWorkspaceSessionActions(workspace);
  if (!session) return null;

  const { policies } = session;
  const setPolicy = (key: keyof typeof policies, value: string) => {
    updateSession({ policies: { ...policies, [key]: value } });
  };

  return (
    <OnboardingShell workspace={workspace} stepIndex={3} session={session}>
      <SectionHeader
        eyebrow="Onboarding"
        title="Operating policies and Guard boundaries"
        description="These preferences shape how Flow prepares Guard rules. Production enforcement arrives with the execution spine."
      />
      <InlineAlert>
        Guard will use these settings to preview approvals in later phases. No
        actions are executed in this prototype.
      </InlineAlert>
      <div className={styles.formStack} style={{ marginTop: "var(--space-6)" }}>
        {(
          [
            ["proposalApproval", "Proposal approval"],
            ["contractApproval", "Contract approval"],
            ["projectCreationApproval", "Project creation approval"],
            ["invoiceApproval", "Invoice approval"],
            ["expenseApproval", "Expense approval"],
          ] as const
        ).map(([key, label]) => (
          <FormField key={key} label={label} htmlFor={key}>
            <Select
              id={key}
              value={policies[key]}
              onChange={(e) => setPolicy(key, e.target.value)}
            >
              <option value="founder">Founder</option>
              <option value="operations_lead">Operations lead</option>
              <option value="finance">Finance admin</option>
              <option value="delegated">Delegated approver</option>
            </Select>
          </FormField>
        ))}
        <FormField label="Client-facing visibility" htmlFor="clientVisibility">
          <Select
            id="clientVisibility"
            value={policies.clientVisibility}
            onChange={(e) => setPolicy("clientVisibility", e.target.value)}
          >
            <option value="deliverables_only">Deliverables only</option>
            <option value="deliverables_and_timeline">
              Deliverables and timeline
            </option>
            <option value="limited_financial">Limited financial summary</option>
          </Select>
        </FormField>
        <FormField
          label="Preferred AI autonomy"
          htmlFor="aiAutonomy"
          help="How Flow may assist before Guard"
        >
          <Select
            id="aiAutonomy"
            value={policies.aiAutonomy}
            onChange={(e) => setPolicy("aiAutonomy", e.target.value)}
          >
            <option value="recommend_only">Recommend only</option>
            <option value="recommend_draft">Recommend and draft</option>
            <option value="limited_actions">
              Limited guarded actions (later)
            </option>
          </Select>
        </FormField>
      </div>
      <div className={styles.onboardingActions}>
        <Button
          variant="secondary"
          onClick={() => router.push(`/${workspace}/onboarding/services`)}
        >
          Back
        </Button>
        <Button onClick={() => router.push(`/${workspace}/onboarding/review`)}>
          Continue
        </Button>
      </div>
    </OnboardingShell>
  );
}

export default function PoliciesPage() {
  const workspace = useParams().workspace as string;
  return (
    <WorkspaceGate workspace={workspace}>
      <PoliciesStep />
    </WorkspaceGate>
  );
}
