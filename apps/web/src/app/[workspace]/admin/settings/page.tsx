"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { NORTHSTAR_WORKSPACE_NAME } from "../../../../content/demo/northstar";
import { FounderShell } from "../../../../components/shell/AppShell";
import { WorkspaceGate } from "../../../../components/shell/WorkspaceGate";
import { SectionHeader, StatusBadge } from "../../../../components/ui/Display";
import { FormField, TextInput } from "../../../../components/ui/FormField";
import { useTheme } from "../../../../lib/theme/context";
import {
  usePrototype,
  useWorkspaceSession,
} from "../../../../lib/prototype/context";
import { applyAccent } from "../../../../lib/prototype/storage";
import styles from "../../../../components/shell/shell.module.css";

const ACCENTS = [
  { id: "blue", name: "Blue", value: "#1a56db" },
  { id: "orange", name: "Orange", value: "#c2410c" },
  { id: "teal", name: "Teal", value: "#0d6e6e" },
  { id: "slate", name: "Slate", value: "#334155" },
];

function SettingsPage() {
  const params = useParams();
  const workspace = params.workspace as string;
  const { theme, setTheme } = useTheme();
  const { updateSession } = usePrototype();
  const { session } = useWorkspaceSession(workspace);
  if (!session) return null;

  const isDemo = session.mode === "demo";
  const workspaceLabel = isDemo
    ? NORTHSTAR_WORKSPACE_NAME
    : session.workspaceName;

  return (
    <FounderShell workspace={workspace} session={session}>
      <div className={styles.settingsColumn}>
        <SectionHeader
          eyebrow="Settings"
          title="Workspace preferences"
          description="Visual preferences for this prototype workspace."
        />

        <section className="flow-settings-section">
          <h2>Workspace identity</h2>
          {isDemo ? (
            <div className="flow-settings-info">
              <p className="flow-settings-info__value">{workspaceLabel}</p>
              <StatusBadge variant="demo">Demo workspace</StatusBadge>
              <p className="flow-field__help">
                Demo identity is fixed to the Northstar Creative fixture.
              </p>
            </div>
          ) : (
            <FormField label="Workspace name" htmlFor="ws-name">
              <TextInput
                id="ws-name"
                className="flow-input--editable"
                value={session.workspaceName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateSession({ workspaceName: e.target.value })
                }
              />
            </FormField>
          )}
        </section>

        <section className="flow-settings-section">
          <h2>Theme</h2>
          <FormField label="Appearance" htmlFor="theme">
            <select
              id="theme"
              className="flow-select"
              value={theme}
              onChange={(e) => setTheme(e.target.value as "light" | "dark")}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </FormField>
        </section>

        <section className="flow-settings-section">
          <h2>Workspace accent</h2>
          <p className="flow-field__help">
            Monotone brand color for actions, focus, and navigation selection.
          </p>
          <div
            className={styles.accentSwatches}
            role="radiogroup"
            aria-label="Workspace accent"
          >
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={session.accentColor === a.value}
                aria-label={`${a.name} accent`}
                title={a.name}
                className={`${styles.accentSwatch} ${
                  session.accentColor === a.value
                    ? styles.accentSwatchActive
                    : ""
                }`}
                style={{ background: a.value }}
                onClick={() => {
                  updateSession({ accentColor: a.value });
                  applyAccent(a.value);
                }}
              />
            ))}
          </div>
        </section>

        <section className="flow-settings-section">
          <h2>Localization</h2>
          <dl className="flow-settings-dl">
            <div>
              <dt>Language</dt>
              <dd>English (US)</dd>
            </div>
            <div>
              <dt>Currency</dt>
              <dd>USD</dd>
            </div>
            <div>
              <dt>Region</dt>
              <dd>United States</dd>
            </div>
          </dl>
        </section>

        <p className={styles.settingsModuleLink}>
          <Link href={`/${workspace}/admin/settings/modules`}>
            View module recommendations
          </Link>
        </p>
      </div>
    </FounderShell>
  );
}

export default function AdminSettingsPage() {
  const workspace = useParams().workspace as string;
  return (
    <WorkspaceGate workspace={workspace} requireTwin variant="founder">
      <SettingsPage />
    </WorkspaceGate>
  );
}
