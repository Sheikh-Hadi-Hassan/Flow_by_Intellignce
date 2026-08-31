"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { DEMO_FOUNDER_FIRST_NAME } from "../../../content/demo/northstar";
import { FounderShell } from "../../../components/shell/AppShell";
import { WorkspaceGate } from "../../../components/shell/WorkspaceGate";
import { StatusBadge } from "../../../components/ui/Display";
import { getSetupProgress } from "../../../lib/prototype/recommendations";
import { getSetupChecklist } from "../../../lib/prototype/setup-checklist";
import { useWorkspaceSessionActions } from "../../../lib/workspace/session-actions";
import styles from "./founder-now.module.css";

function FounderHome() {
  const params = useParams();
  const workspace = params.workspace as string;
  const { session } = useWorkspaceSessionActions(workspace);
  const [greeting, setGreeting] = useState("there");

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  const operatingSummary = useMemo(() => {
    if (!session || !session.twin) return null;

    const checklist = getSetupChecklist(session);
    const progress = getSetupProgress(session);
    const ready = checklist.filter((item) => item.status === "Ready");
    const needsInfo = checklist.filter(
      (item) => item.status === "Needs information",
    );
    const notConnected = checklist.filter(
      (item) => item.status === "Not connected",
    );
    const recommended = checklist.filter(
      (item) => item.status === "Recommended",
    );

    return {
      checklist,
      progress,
      ready,
      needsInfo,
      notConnected,
      recommended,
      serviceCount: session.twin.services.length,
      selectedServiceCount: session.services.filter((service) => service.selected)
        .length,
    };
  }, [session]);

  if (!session || !session.twin || !operatingSummary) return null;

  const founderName =
    session.mode === "demo"
      ? DEMO_FOUNDER_FIRST_NAME
      : session.founderFirstName || "founder";

  const attentionCount =
    operatingSummary.needsInfo.length + operatingSummary.recommended.length;
  const nextAction =
    attentionCount > 0
      ? "Complete the remaining business setup decisions"
      : operatingSummary.notConnected.length > 0
        ? "Connect the operating inputs Flow still cannot observe"
        : "Your operating foundation is ready";

  return (
    <FounderShell workspace={workspace} session={session}>
      <div className={styles.nowPage}>
        <header className={styles.nowHero}>
          <p className="eyebrow">Founder now</p>
          <h1>Good {greeting}, {founderName}.</h1>
          <p className={styles.nowStatement}>
            {attentionCount > 0
              ? `${attentionCount} ${attentionCount === 1 ? "thing needs" : "things need"} your attention.`
              : "Your operating foundation is in good shape."}
          </p>
          <p className={styles.nowContext}>
            Flow has structured {operatingSummary.serviceCount} services and your
            Business Twin is {session.twin.completeness}% complete.
          </p>
        </header>

        <section className={styles.decisionObject} aria-labelledby="next-decision">
          <div className={styles.decisionMeta}>
            <span>01</span>
            <span>Foundation decision</span>
            {session.mode === "demo" && (
              <StatusBadge variant="demo">Demo workspace</StatusBadge>
            )}
          </div>

          <div className={styles.decisionLayout}>
            <div className={styles.decisionPrimary}>
              <p className={styles.decisionEyebrow}>What needs you</p>
              <h2 id="next-decision">{nextAction}</h2>
              <p>
                {attentionCount > 0
                  ? "Flow can prepare the operating system, but these remaining choices need business truth or founder authority before automation should continue."
                  : "No setup decision is currently blocking the Business Twin. You can move into live operating workflows as they become connected."}
              </p>
            </div>

            <div className={styles.decisionEvidence}>
              <p className={styles.decisionEyebrow}>Flow assessment</p>
              <dl>
                <div>
                  <dt>Workspace readiness</dt>
                  <dd>{operatingSummary.progress}%</dd>
                </div>
                <div>
                  <dt>Business Twin</dt>
                  <dd>{session.twin.completeness}%</dd>
                </div>
                <div>
                  <dt>Services structured</dt>
                  <dd>{operatingSummary.selectedServiceCount}</dd>
                </div>
                <div>
                  <dt>Unconnected inputs</dt>
                  <dd>{operatingSummary.notConnected.length}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className={styles.decisionActions}>
            <Link
              href={`/${workspace}/admin/setup`}
              className="flow-btn flow-btn--primary"
            >
              Review operating plan
            </Link>
            <Link
              href={`/${workspace}/admin/twin`}
              className="flow-btn flow-btn--secondary"
            >
              Inspect evidence
            </Link>
          </div>
        </section>

        <section className={styles.operatingStrip} aria-label="Flow operating summary">
          <div className={styles.instrument}>
            <span className={styles.instrumentLabel}>Flow handled</span>
            <strong>{operatingSummary.ready.length}</strong>
            <span>foundation checks ready</span>
          </div>
          <div className={styles.instrument}>
            <span className={styles.instrumentLabel}>Needs judgment</span>
            <strong>{attentionCount}</strong>
            <span>setup decisions</span>
          </div>
          <div className={styles.instrument}>
            <span className={styles.instrumentLabel}>Not connected</span>
            <strong>{operatingSummary.notConnected.length}</strong>
            <span>operating inputs</span>
          </div>
          <div className={styles.instrument}>
            <span className={styles.instrumentLabel}>Business Twin</span>
            <strong>{session.twin.completeness}%</strong>
            <span>current evidence coverage</span>
          </div>
        </section>

        <section className={styles.truthSection}>
          <div className={styles.sectionLead}>
            <div>
              <p className="eyebrow">Operating truth</p>
              <h2>What Flow knows, and what it does not.</h2>
            </div>
            <Link href={`/${workspace}/admin/twin`}>Open Business Twin →</Link>
          </div>

          <div className={styles.truthGrid}>
            <div className={styles.truthColumn}>
              <p className={styles.truthLabel}>Confirmed</p>
              {operatingSummary.ready.map((item) => (
                <div className={styles.truthRow} key={item.label}>
                  <span className={styles.machineMark} aria-hidden="true">●</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            <div className={styles.truthColumn}>
              <p className={styles.truthLabel}>Still outside Flow</p>
              {operatingSummary.notConnected.map((item) => (
                <div className={styles.truthRow} key={item.label}>
                  <span className={styles.machineMarkMuted} aria-hidden="true">○</span>
                  <span>{item.label}</span>
                </div>
              ))}
              {operatingSummary.notConnected.length === 0 && (
                <p className={styles.inlineEmpty}>No disconnected setup inputs.</p>
              )}
            </div>
          </div>
        </section>

        <section className={styles.commandInstrument}>
          <span className={styles.machinePulse} aria-hidden="true">●········</span>
          <div>
            <span>Ask Flow</span>
            <p>
              Contextual operating command will appear here when the intelligence
              runtime is connected. No simulated AI response is shown in this state.
            </p>
          </div>
          <span className={styles.commandContext}>Founder · Now</span>
        </section>
      </div>
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
