"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { DEMO_FOUNDER_FIRST_NAME } from "../../../content/demo/northstar";
import { FounderShell } from "../../../components/shell/AppShell";
import { WorkspaceGate } from "../../../components/shell/WorkspaceGate";
import {
  SectionHeader,
  ProgressBar,
  StatusBadge,
} from "../../../components/ui/Display";
import { Button } from "../../../components/ui/Button";
import {
  getSetupChecklist,
  getSetupProgress,
} from "../../../lib/prototype/recommendations";
import { useWorkspaceSession } from "../../../lib/prototype/context";
import styles from "../../../components/shell/shell.module.css";

function FounderHome() {
  const params = useParams();
  const workspace = params.workspace as string;
  const { session } = useWorkspaceSession(workspace);
  const [greeting, setGreeting] = useState("there");

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  if (!session || !session.twin) return null;

  const progress = getSetupProgress(session);
  const checklist = getSetupChecklist(session);
  const founderName =
    session.mode === "demo" ? DEMO_FOUNDER_FIRST_NAME : "founder";
  const serviceCount = session.twin.services.length;

  return (
    <FounderShell workspace={workspace} session={session}>
      <SectionHeader
        eyebrow="Founder home"
        title={`Good ${greeting}, ${founderName}`}
        description="What Flow understands, what needs attention, and what to do next."
      />

      <ProgressBar
        value={progress}
        label="Workspace readiness"
        help="How much of your initial setup Flow has captured."
      />

      <div className={styles.homeGrid}>
        <section className="flow-panel">
          <div className={styles.panelHeader}>
            <h2>What Flow understands</h2>
            {session.mode === "demo" && (
              <StatusBadge variant="demo">Demo workspace</StatusBadge>
            )}
          </div>
          <p className={styles.panelLead}>{session.twin.businessName}</p>
          <p className={styles.panelMeta}>
            {session.twin.classification} · {serviceCount} services ·{" "}
            {session.twin.completeness}% Twin completeness
          </p>
          <div className={styles.panelActions}>
            <Link
              href={`/${workspace}/admin/twin`}
              className="flow-btn flow-btn--secondary flow-btn--sm"
            >
              View Twin
            </Link>
          </div>
        </section>

        <section className="flow-panel">
          <h2>Pulse preview</h2>
          <p className={styles.inlineEmpty}>
            No operational signals yet. Pulse will surface delivery and finance
            activity once those capabilities are connected.
          </p>
        </section>
      </div>

      <section className="flow-panel flow-panel--flat">
        <h2>Recommended next step</h2>
        <p className={styles.panelMeta}>
          Review your setup plan and capability recommendations.
        </p>
        <div className={styles.panelActions}>
          <Link href={`/${workspace}/admin/setup`}>
            <Button size="sm">Review setup plan</Button>
          </Link>
        </div>
      </section>

      <section className="flow-panel flow-panel--flat">
        <h2>Setup checklist</h2>
        <ul className={styles.checklist}>
          {checklist.map((item) => (
            <li key={item.label} className={styles.checklistItem}>
              <span className={styles.checklistLabel}>{item.label}</span>
              <StatusBadge
                variant={
                  item.status === "Ready"
                    ? "success"
                    : item.status === "Recommended"
                      ? "essential"
                      : "default"
                }
              >
                {item.status}
              </StatusBadge>
            </li>
          ))}
        </ul>
      </section>
    </FounderShell>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

export default function AdminHomePage() {
  const workspace = useParams().workspace as string;
  return (
    <WorkspaceGate workspace={workspace} requireTwin variant="founder">
      <FounderHome />
    </WorkspaceGate>
  );
}
