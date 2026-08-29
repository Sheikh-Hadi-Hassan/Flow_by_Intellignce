"use client";

import { useEffect, useState } from "react";

import { DEMO_BADGE_LABEL } from "../../content/demo/northstar";
import type { TwinSnapshot } from "../../lib/prototype/types";
import { ProofLabel, StatusBadge } from "../ui/Display";

function TwinLastUpdated({ iso }: { iso: string }) {
  const [formatted, setFormatted] = useState(iso);

  useEffect(() => {
    setFormatted(
      new Date(iso).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    );
  }, [iso]);

  return <>{formatted}</>;
}

export function TwinView({ twin }: { twin: TwinSnapshot }) {
  const isDemo = twin.sourceClassification === "demo-fixture";

  return (
    <article className="twin-view">
      <header className="twin-view__hero">
        <p className="eyebrow">Business Twin</p>
        <div className="twin-view__titleRow">
          <h1>{twin.businessName}</h1>
          {isDemo && (
            <StatusBadge variant="demo">{DEMO_BADGE_LABEL}</StatusBadge>
          )}
        </div>
        <p className="twin-view__classification">{twin.classification}</p>
        <p className="twin-view__operating">{twin.operatingModel}</p>

        <dl className="twin-view__metrics">
          <div>
            <dt>Completeness</dt>
            <dd className="tabular-nums">{twin.completeness}%</dd>
          </div>
          <div>
            <dt>Confidence</dt>
            <dd>
              <StatusBadge
                variant={
                  twin.confidence === "high"
                    ? "success"
                    : twin.confidence === "medium"
                      ? "default"
                      : "warning"
                }
              >
                {twin.confidence}
              </StatusBadge>
            </dd>
          </div>
          <div>
            <dt>Verification</dt>
            <dd>{twin.verification}</dd>
          </div>
          <div>
            <dt>Freshness</dt>
            <dd>{twin.freshnessLabel}</dd>
          </div>
        </dl>
      </header>

      <section className="flow-detail-group">
        <h2>Overview</h2>
        <p className="flow-field__help">{twin.identity}</p>
      </section>

      <section className="flow-detail-group">
        <h2>Operating model</h2>
        <p>{twin.operatingModel}</p>
      </section>

      <section className="flow-detail-group">
        <h2>Services</h2>
        {twin.services.length > 0 ? (
          <ul className="flow-compact-list">
            {twin.services.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        ) : (
          <p className="flow-field__help">No services selected yet.</p>
        )}
      </section>

      <section className="flow-detail-group">
        <h2>Guard policies</h2>
        <ul className="flow-compact-list">
          {twin.policies.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>

      <section className="flow-detail-group">
        <h2>Installed agency expertise</h2>
        <p>{twin.expertisePack}</p>
      </section>

      <section className="flow-detail-group">
        <h2>Business-logic coverage</h2>
        <ul className="flow-compact-list">
          {twin.logicCoverage.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </section>

      {twin.missingInformation.length > 0 && (
        <section className="flow-detail-group">
          <h2>Missing or unverified information</h2>
          <ul className="flow-compact-list">
            {twin.missingInformation.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </section>
      )}

      <footer className="twin-view__footer">
        <p>
          Last updated <TwinLastUpdated iso={twin.lastUpdated} />
        </p>
        <p>
          <ProofLabel type="fact">{twin.provenanceLabel}</ProofLabel>
        </p>
      </footer>
    </article>
  );
}
