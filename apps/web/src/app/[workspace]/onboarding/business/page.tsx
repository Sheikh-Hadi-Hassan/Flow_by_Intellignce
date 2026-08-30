"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { WorkspaceGate } from "../../../../components/shell/WorkspaceGate";
import { OnboardingShell } from "../../../../components/shell/AppShell";
import { SectionHeader } from "../../../../components/ui/Display";
import { Button } from "../../../../components/ui/Button";
import {
  FormField,
  Select,
  TextArea,
  TextInput,
} from "../../../../components/ui/FormField";
import { useWorkspaceSessionActions } from "../../../../lib/workspace/session-actions";
import styles from "../../../../components/shell/shell.module.css";

const BUSINESS_TYPES = [
  { value: "creative_marketing_agency", label: "Creative & marketing agency" },
  { value: "consulting", label: "Consulting" },
  { value: "legal", label: "Law firm" },
  { value: "healthcare", label: "Healthcare practice" },
  { value: "other_service", label: "Other service business" },
];

function BusinessStep() {
  const params = useParams();
  const workspace = params.workspace as string;
  const router = useRouter();
  const { updateSession, session } = useWorkspaceSessionActions(workspace);

  if (!session) return null;

  const { business } = session;

  const save = (patch: Partial<typeof business>) => {
    updateSession({
      business: { ...business, ...patch },
      workspaceName: patch.businessName ?? session.workspaceName,
    });
  };

  return (
    <OnboardingShell workspace={workspace} stepIndex={0} session={session}>
      <SectionHeader
        eyebrow="Onboarding"
        title="Tell us about your business"
        description="Flow uses this to shape your Twin and recommend the right capabilities."
      />
      <div className={styles.formStack}>
        <FormField label="Business name" htmlFor="businessName">
          <TextInput
            id="businessName"
            value={business.businessName}
            onChange={(e) => save({ businessName: e.target.value })}
          />
        </FormField>
        <FormField label="Business type" htmlFor="businessType">
          <Select
            id="businessType"
            value={business.businessType}
            onChange={(e) => save({ businessType: e.target.value })}
          >
            {BUSINESS_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Short description" htmlFor="description">
          <TextArea
            id="description"
            value={business.description}
            onChange={(e) => save({ description: e.target.value })}
          />
        </FormField>
        <FormField label="Website" htmlFor="website" help="Optional">
          <TextInput
            id="website"
            value={business.website}
            onChange={(e) => save({ website: e.target.value })}
          />
        </FormField>
        <div className={styles.grid2}>
          <FormField label="Country" htmlFor="country">
            <Select
              id="country"
              value={business.country}
              onChange={(e) => save({ country: e.target.value })}
            >
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="CA">Canada</option>
              <option value="AE">UAE</option>
            </Select>
          </FormField>
          <FormField label="Currency" htmlFor="currency">
            <Select
              id="currency"
              value={business.currency}
              onChange={(e) => save({ currency: e.target.value })}
            >
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="EUR">EUR</option>
              <option value="AED">AED</option>
            </Select>
          </FormField>
        </div>
        <div className={styles.grid2}>
          <FormField label="Team size" htmlFor="teamSize">
            <TextInput
              id="teamSize"
              inputMode="numeric"
              value={business.teamSize}
              onChange={(e) => save({ teamSize: e.target.value })}
            />
          </FormField>
          <FormField label="Main operating model" htmlFor="operatingModel">
            <TextInput
              id="operatingModel"
              value={business.operatingModel}
              onChange={(e) => save({ operatingModel: e.target.value })}
              placeholder="e.g. Retainers + project campaigns"
            />
          </FormField>
        </div>
      </div>
      <div className={styles.onboardingActions}>
        <Link href="/" className="flow-btn flow-btn--ghost">
          Exit
        </Link>
        <Button
          onClick={() => router.push(`/${workspace}/onboarding/operations`)}
          disabled={!business.businessName.trim()}
        >
          Continue
        </Button>
      </div>
    </OnboardingShell>
  );
}

export default function BusinessOnboardingPage() {
  const params = useParams();
  const workspace = params.workspace as string;

  return (
    <WorkspaceGate workspace={workspace}>
      <BusinessStep />
    </WorkspaceGate>
  );
}
