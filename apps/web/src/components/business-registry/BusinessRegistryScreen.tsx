"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import type { BusinessLocationSeed, BusinessRegistryRole } from "@flow/contracts";
import { NORTHSTAR_REMOTE_LOCATION_ID } from "@flow/contracts";
import { Button } from "../ui/Button";
import { SectionHeader, StatusBadge } from "../ui/Display";
import { useBusinessRegistry } from "../../lib/business-registry/use-business-registry";
import {
  setBusinessRegistryRole,
  setBusinessRegistryUi,
  type BusinessRegistryUiState,
} from "../../lib/business-registry/store";

const STATES: readonly BusinessRegistryUiState[] = [
  "empty",
  "loading",
  "populated",
  "partial",
  "error",
  "restricted",
  "dense",
];

function metricLabel(provenance: "declared_target" | "computed_actual") {
  return provenance === "declared_target" ? "Declared target" : "Computed actual";
}

export function BusinessRegistryScreen({ workspace }: { workspace: string }) {
  const registry = useBusinessRegistry(workspace);
  const params = useSearchParams();
  const queried = params.get("state");
  const roleQuery = params.get("role") as BusinessRegistryRole | null;
  const [editingIdentity, setEditingIdentity] = useState(false);
  const [tradingName, setTradingName] = useState(
    registry.seed?.tradingName ?? "",
  );
  const [editingRemote, setEditingRemote] = useState(false);
  const [remoteName, setRemoteName] = useState("Remote operations");
  const [confirmPrimary, setConfirmPrimary] = useState(false);
  const [renewalId, setRenewalId] = useState<string | null>(null);
  const [renewalDate, setRenewalDate] = useState("");
  const [ownerArea, setOwnerArea] = useState("Operations and insurance");
  const [docTitle, setDocTitle] = useState("");
  const [docReference, setDocReference] = useState("DEMO-POL-NEW");

  useEffect(() => {
    if (STATES.includes(queried as BusinessRegistryUiState)) {
      setBusinessRegistryUi(queried as BusinessRegistryUiState);
    } else if (!queried) {
      setBusinessRegistryUi("populated");
    }
    if (
      roleQuery === "employee" ||
      roleQuery === "finance" ||
      roleQuery === "operations" ||
      roleQuery === "founder"
    ) {
      setBusinessRegistryRole(roleQuery);
    } else if (!roleQuery) {
      setBusinessRegistryRole("founder");
    }
  }, [queried, roleQuery]);

  useEffect(() => {
    if (registry.seed?.tradingName) {
      setTradingName(registry.seed.tradingName);
    }
  }, [registry.seed?.tradingName]);

  const ui =
    queried && STATES.includes(queried as BusinessRegistryUiState)
      ? (queried as BusinessRegistryUiState)
      : registry.ui;
  const view = registry.view;
  const seed = view?.profile ?? registry.seed;

  const renewals = useMemo(
    () =>
      (seed?.documents ?? []).filter(
        (row) => row.urgency === "due_30" || row.urgency === "due_90",
      ),
    [seed],
  );

  if (ui === "loading") {
    return (
      <div className="flow-br" data-testid="br-state-loading">
        <p>Loading the business registry…</p>
      </div>
    );
  }
  if (ui === "error") {
    return (
      <div className="flow-br" role="alert" data-testid="br-state-error">
        <h1>Business Registry could not load</h1>
        <p>
          {registry.lastError ??
            "The company profile is unavailable. Canonical records were not deleted."}
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setBusinessRegistryUi("populated")}
        >
          Return to registry
        </Button>
      </div>
    );
  }
  if (ui === "restricted" || roleQuery === "employee") {
    return (
      <div className="flow-br" data-testid="br-state-restricted">
        <div className="flow-br-banner">
          <SectionHeader
            eyebrow="Settings · Business Registry"
            title="Northstar Creative"
            description="Fictional demonstration company. Employees can see the public workspace identity only."
          />
          <StatusBadge variant="demo">Fictional demo</StatusBadge>
        </div>
        <section className="flow-br-section" aria-labelledby="br-restricted-identity">
          <h2 id="br-restricted-identity">Public workspace identity</h2>
          <dl className="flow-br-facts">
            <dt>Trading name</dt>
            <dd>Northstar Creative</dd>
            <dt>Industry</dt>
            <dd>Creative and marketing agency</dd>
            <dt>Headquarters</dt>
            <dd>Chicago · America/Chicago</dd>
            <dt>Operating regions</dt>
            <dd>Illinois · New York · national remote delivery</dd>
          </dl>
        </section>
        <section className="flow-br-section" aria-labelledby="br-restricted-hidden">
          <h2 id="br-restricted-hidden">Restricted from this role</h2>
          <ul className="flow-br-checklist">
            <li>Registration identifier and formation documents</li>
            <li>Tax and banking metadata</li>
            <li>Ownership percentages and authorised signatories</li>
            <li>Insurance policies and renewal dates</li>
            <li>Compliance owners and audit history</li>
          </ul>
          <p className="flow-br-note">
            Ask a founder or operations lead if you need a registration or renewal answer.
          </p>
        </section>
      </div>
    );
  }
  if (ui === "empty" || !seed) {
    return (
      <div className="flow-br" data-testid="br-state-empty">
        <div className="flow-br-banner">
          <SectionHeader
            eyebrow="Settings · Business Registry"
            title="Register the company that owns this workspace"
            description="Business Registry keeps one canonical legal entity, offices, renewals, and signatories so Ask Flow can answer from records instead of a spreadsheet."
          />
        </div>
        <section className="flow-br-section">
          <h2>What this enables</h2>
          <ul className="flow-br-checklist">
            <li>One fictional legal entity per demo workspace — no second company table</li>
            <li>Headquarters and remote locations with correspondence flags</li>
            <li>Firmographics with declared targets separate from computed actuals</li>
            <li>Document renewals driven by the Northstar demo clock</li>
            <li>Permission-aware Ask Flow answers that cite canonical records</li>
          </ul>
          <p className="flow-br-note">
            Activate the block, then seed the Northstar demonstration company. This is not a client directory.
          </p>
          <Link href={`/${workspace}/admin/building-blocks`}>Open building blocks</Link>
        </section>
      </div>
    );
  }
  if (ui === "partial") {
    return (
      <div className="flow-br" data-testid="br-state-partial">
        <div className="flow-br-banner">
          <SectionHeader
            eyebrow="Settings · Business Registry"
            title="Registration is incomplete"
            description="Northstar Creative is on file, but required registration fields are still missing."
          />
          <StatusBadge variant="default">Incomplete</StatusBadge>
        </div>
        <section className="flow-br-section" aria-labelledby="br-partial-missing">
          <h2 id="br-partial-missing">Missing before the registry is complete</h2>
          <ul className="flow-br-checklist flow-br-checklist--missing">
            <li>Registration identifier prefixed DEMO-</li>
            <li>Primary location for correspondence</li>
            <li>At least one authorised signatory</li>
          </ul>
        </section>
        <section className="flow-br-section" aria-labelledby="br-partial-ready">
          <h2 id="br-partial-ready">Already on file</h2>
          <dl className="flow-br-facts">
            <dt>Trading name</dt>
            <dd>Northstar Creative</dd>
            <dt>Legal name</dt>
            <dd>Northstar Creative LLC</dd>
            <dt>Jurisdiction</dt>
            <dd>United States · Illinois</dd>
            <dt>Timezone / currency</dt>
            <dd>America/Chicago · USD</dd>
          </dl>
          <p className="flow-br-note">
            Completing registration restores renewals, document metadata, and founder Ask Flow answers.
          </p>
          <Button type="button" onClick={() => setBusinessRegistryUi("populated")}>
            Complete registration
          </Button>
        </section>
      </div>
    );
  }

  const chicago = seed.locations.find((row) => row.demoKey === "ns-loc-chicago");
  const remote = seed.locations.find((row) => row.demoKey === "ns-loc-remote");
  const dense = ui === "dense";

  return (
    <div className="flow-br" data-testid="br-state-populated">
      <div className="flow-br-banner">
        <div>
          <SectionHeader
            eyebrow="Settings · Business Registry"
            title={seed.tradingName}
            description={`${seed.fictionalLabel}. Canonical organisation ${seed.demoKey}.`}
          />
        </div>
        <StatusBadge variant="demo">Fictional demo</StatusBadge>
      </div>
      {registry.dirty ? (
        <p className="flow-br-note" role="status">
          You have unsaved identity changes. Save or discard before leaving edit
          mode.
        </p>
      ) : null}
      {registry.lastError ? (
        <p className="flow-br-note" role="alert">
          {registry.lastError}
        </p>
      ) : null}

      <section className="flow-br-section" aria-labelledby="br-identity">
        <h2 id="br-identity">Business identity</h2>
        <div className="flow-br-identity">
          <h1>{seed.tradingName}</h1>
          <p className="flow-br-legal">{seed.legalName}</p>
          <p className="flow-br-note">
            {seed.entityType} · {seed.legalStatus} · Formed {seed.formationDate}
          </p>
        </div>
        {view?.canEditProfile ? (
          <div className="flow-br-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditingIdentity((value) => !value)}
            >
              {editingIdentity ? "Close" : "Edit identity"}
            </Button>
          </div>
        ) : null}
        {editingIdentity ? (
          <form
            className="flow-br-form"
            data-testid="br-identity-edit"
            onSubmit={(event) => {
              event.preventDefault();
              void registry.updateTradingName(tradingName, "Update trading name");
              if (tradingName.trim()) setEditingIdentity(false);
            }}
          >
            <label htmlFor="br-trading-name">Trading name</label>
            <input
              id="br-trading-name"
              value={tradingName}
              onChange={(event) => {
                setTradingName(event.target.value);
                registry.setDraftTradingName(event.target.value);
              }}
            />
            <p className="flow-br-note">Legal name cannot be deleted. Trading name is editable.</p>
            <div className="flow-br-actions">
              <Button type="submit">Save identity</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (
                    registry.dirty &&
                    !window.confirm("Discard unsaved identity changes?")
                  ) {
                    return;
                  }
                  setTradingName(seed.tradingName);
                  registry.setDraftTradingName(seed.tradingName);
                  setEditingIdentity(false);
                }}
              >
                Discard
              </Button>
            </div>
          </form>
        ) : null}
      </section>

      <section className="flow-br-section" aria-labelledby="br-registration">
        <h2 id="br-registration">Registration</h2>
        <dl className="flow-br-facts">
          <dt>Registration</dt>
          <dd>{seed.registrationNumber}</dd>
          <dt>Jurisdiction</dt>
          <dd>United States · {seed.operatingJurisdiction}</dd>
          <dt>Timezone</dt>
          <dd>{seed.timezone}</dd>
          <dt>Currency</dt>
          <dd>{seed.currency}</dd>
          <dt>Fiscal year</dt>
          <dd>{seed.fiscalYear}</dd>
        </dl>
      </section>

      <section className="flow-br-section" aria-labelledby="br-locations" data-testid="br-locations">
        <h2 id="br-locations">Locations</h2>
        {seed.locations
          .filter((row) => dense || row.status === "ACTIVE")
          .map((location) => (
            <article key={location.id} className="flow-br-location">
              <h3>{location.name}</h3>
              <p>
                {location.addressLine1}
                {location.addressLine2 ? `, ${location.addressLine2}` : ""}
                {", "}
                {location.city}, {location.region} {location.postalCode}
              </p>
              <p>
                {location.timezone} · {location.workMode.replaceAll("_", " ")} ·{" "}
                {location.operatingHours}
              </p>
              <p>
                {location.primaryContactName}, {location.primaryContactRole}.{" "}
                {location.departmentsSupported.join(", ")}. {location.functionNote}
              </p>
              {location.isPrimary ? (
                <StatusBadge>Primary · correspondence</StatusBadge>
              ) : (
                <div className="flow-br-actions">
                  {view?.canManageLocations && location.status === "ACTIVE" ? (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setEditingRemote(true);
                          setRemoteName(location.name);
                        }}
                      >
                        Edit location
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          registry.archiveLocation(
                            location.id,
                            "Archive non-primary location",
                          )
                        }
                      >
                        Archive location
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setConfirmPrimary(true)}
                      >
                        Make primary
                      </Button>
                    </>
                  ) : null}
                </div>
              )}
            </article>
          ))}
        {editingRemote && remote ? (
          <form
            className="flow-br-form"
            onSubmit={(event) => {
              event.preventDefault();
              const next: BusinessLocationSeed = { ...remote, name: remoteName };
              registry.upsertLocation(next, "Update remote operations name");
              setEditingRemote(false);
            }}
          >
            <label htmlFor="br-remote-name">Location name</label>
            <input
              id="br-remote-name"
              value={remoteName}
              onChange={(event) => setRemoteName(event.target.value)}
            />
            <Button type="submit">Save location</Button>
          </form>
        ) : null}
        {confirmPrimary ? (
          <div className="flow-br-confirm">
            <p>
              Changing the primary location is a protected action. Correspondence
              and registration address will move.
            </p>
            <div className="flow-br-actions">
              <Button
                type="button"
                onClick={() => {
                  registry.changePrimary(
                    NORTHSTAR_REMOTE_LOCATION_ID,
                    "Founder confirmed primary location change",
                  );
                  setConfirmPrimary(false);
                }}
              >
                Confirm primary change
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmPrimary(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="flow-br-section" aria-labelledby="br-firmographics">
        <h2 id="br-firmographics">Firmographics</h2>
        <dl className="flow-br-facts">
          <dt>Industry</dt>
          <dd>
            {seed.firmographics.industry} / {seed.firmographics.subIndustry}
          </dd>
          <dt>NAICS</dt>
          <dd>
            {seed.firmographics.naicsCode} · {seed.firmographics.naicsTitle}
          </dd>
          <dt>Business model</dt>
          <dd>{seed.firmographics.businessModel}</dd>
          <dt>Company size</dt>
          <dd>{seed.firmographics.companySizeBand}</dd>
          <dt>Revenue band</dt>
          <dd>{seed.firmographics.annualRevenueBand}</dd>
          <dt>Employees</dt>
          <dd className="flow-br-metric">
            {String(seed.firmographics.employeeCountTarget.value)}{" "}
            <small>
              {metricLabel(seed.firmographics.employeeCountTarget.provenance)}
            </small>
            <span>{String(seed.firmographics.employeeCountActual.value)}</span>
            <small>
              {metricLabel(seed.firmographics.employeeCountActual.provenance)}
            </small>
          </dd>
          <dt>Contractors</dt>
          <dd className="flow-br-metric">
            {String(seed.firmographics.contractorCountTarget.value)}{" "}
            <small>Declared target</small>
            <span>{String(seed.firmographics.contractorCountActual.value)}</span>
            <small>Computed actual</small>
          </dd>
          <dt>Clients</dt>
          <dd className="flow-br-metric">
            {String(seed.firmographics.clientCountTarget.value)}{" "}
            <small>Declared target</small>
            <span>{String(seed.firmographics.clientCountActual.value)}</span>
            <small>Computed actual</small>
          </dd>
          <dt>Market</dt>
          <dd>{seed.firmographics.primaryMarket}</dd>
          <dt>Regions</dt>
          <dd>{seed.firmographics.operatingRegions.join(" · ")}</dd>
          <dt>Service mix</dt>
          <dd>
            {seed.firmographics.serviceMix
              .map((row) => `${row.label} ${row.percent}%`)
              .join(" · ")}
          </dd>
          <dt>Revenue mix</dt>
          <dd>{seed.firmographics.retainerVersusProject}</dd>
          <dt>Typical client</dt>
          <dd>{seed.firmographics.typicalClientSize}</dd>
          <dt>Contract value</dt>
          <dd>{seed.firmographics.typicalContractValueBand}</dd>
          <dt>Project duration</dt>
          <dd>{seed.firmographics.averageProjectDurationBand}</dd>
          <dt>Workplace mix</dt>
          <dd>{seed.firmographics.workplaceMix}</dd>
        </dl>
      </section>

      {view?.showRestrictedFinancials ? (
        <>
          <section className="flow-br-section" aria-labelledby="br-ownership">
            <h2 id="br-ownership">Ownership and signatories</h2>
            <dl className="flow-br-facts">
              {seed.ownership.map((row) => (
                <div key={row.id} style={{ display: "contents" }}>
                  <dt>{row.name}</dt>
                  <dd>
                    {row.percent}% · {row.role}
                  </dd>
                </div>
              ))}
              {seed.signatories.map((row) => (
                <div key={row.id} style={{ display: "contents" }}>
                  <dt>{row.name}</dt>
                  <dd>
                    {row.title}. {row.authority}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="flow-br-section" aria-labelledby="br-tax">
            <h2 id="br-tax">Tax and banking summary</h2>
            <dl className="flow-br-facts">
              {seed.tax.map((row) => (
                <div key={row.id} style={{ display: "contents" }}>
                  <dt>{row.label}</dt>
                  <dd>
                    {row.maskedValue} · {row.demoLabel}
                  </dd>
                </div>
              ))}
              {seed.banks.map((row) => (
                <div key={row.id} style={{ display: "contents" }}>
                  <dt>{row.displayName}</dt>
                  <dd>
                    {row.accountType} · ****{row.lastFour} · {row.currency} ·{" "}
                    {row.verificationStatus} · {row.billingPurpose}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </>
      ) : null}

      <section className="flow-br-section" aria-labelledby="br-insurance" data-testid="br-documents">
        <h2 id="br-insurance">Insurance</h2>
        {seed.documents
          .filter((row) => row.type.includes("liability"))
          .map((row) => (
            <article key={row.id} className="flow-br-doc">
              <div>
                <strong>{row.title}</strong>
                <p>
                  {row.reference} · v{row.version} · Owner {row.ownerName}
                </p>
              </div>
              <span>{row.expiryOrReviewDate ?? "No expiry"}</span>
            </article>
          ))}
      </section>

      <section className="flow-br-section" aria-labelledby="br-policies">
        <h2 id="br-policies">Policies and documents</h2>
        {seed.documents.map((row) => (
          <article key={row.id} className="flow-br-doc">
            <div>
              <strong>{row.title}</strong>
              <p>
                {row.reference} · issued {row.issuedDate} · effective{" "}
                {row.effectiveDate} · {row.evidenceNote}
              </p>
            </div>
            <span>
              {row.urgency.replaceAll("_", " ")}
              {row.expiryOrReviewDate ? ` · ${row.expiryOrReviewDate}` : ""}
            </span>
          </article>
        ))}
        {view?.canManageRegistration ? (
          <form
            className="flow-br-form"
            onSubmit={(event) => {
              event.preventDefault();
              registry.addDocument(docTitle, docReference);
              setDocTitle("");
            }}
          >
            <label htmlFor="br-new-doc">Add document metadata</label>
            <input
              id="br-new-doc"
              value={docTitle}
              placeholder="Title — binary upload is deferred"
              onChange={(event) => setDocTitle(event.target.value)}
            />
            <label htmlFor="br-new-doc-ref">DEMO- reference</label>
            <input
              id="br-new-doc-ref"
              value={docReference}
              onChange={(event) => setDocReference(event.target.value)}
            />
            <Button type="submit" variant="secondary">
              Save metadata
            </Button>
          </form>
        ) : null}
      </section>

      <section className="flow-br-section" aria-labelledby="br-renewals">
        <h2 id="br-renewals">Upcoming renewals</h2>
        <p className="flow-br-note">As of the demo clock, 3 September 2026, 08:12 America/Chicago.</p>
        {renewals.map((row) => (
          <article key={row.id} className="flow-br-doc">
            <div>
              <strong>{row.title}</strong>
              <p>
                {row.urgency === "due_30" ? "Due within 30 days" : "Due within 90 days"}{" "}
                · {row.expiryOrReviewDate} · reminder {row.reminderDate}
              </p>
            </div>
            {view?.canManageRegistration ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setRenewalId(row.id);
                  setRenewalDate(row.expiryOrReviewDate ?? "");
                }}
              >
                Update date
              </Button>
            ) : null}
          </article>
        ))}
        {renewalId ? (
          <form
            className="flow-br-form"
            onSubmit={(event) => {
              event.preventDefault();
              registry.updateRenewal(renewalId, renewalDate, "Update renewal date");
              setRenewalId(null);
            }}
          >
            <label htmlFor="br-renewal">Expiry or review date</label>
            <input
              id="br-renewal"
              value={renewalDate}
              onChange={(event) => setRenewalDate(event.target.value)}
            />
            <Button type="submit">Save renewal</Button>
          </form>
        ) : null}
      </section>

      <section className="flow-br-section" aria-labelledby="br-owners">
        <h2 id="br-owners">Compliance owners</h2>
        <dl className="flow-br-facts">
          {seed.complianceOwners.map((row) => (
            <div key={row.area} style={{ display: "contents" }}>
              <dt>{row.area}</dt>
              <dd>{row.ownerName}</dd>
            </div>
          ))}
        </dl>
        {view?.canManageCompliance ? (
          <form
            className="flow-br-form"
            onSubmit={(event) => {
              event.preventDefault();
              registry.assignOwner(ownerArea, "Jordan Ellis", "ns-res-ops");
            }}
          >
            <label htmlFor="br-owner-area">Assign owner</label>
            <input
              id="br-owner-area"
              value={ownerArea}
              onChange={(event) => setOwnerArea(event.target.value)}
            />
            <Button type="submit" variant="secondary">
              Assign Jordan Ellis
            </Button>
          </form>
        ) : null}
      </section>

      <section className="flow-br-section" aria-labelledby="br-audit">
        <h2 id="br-audit">Audit history</h2>
        {seed.audits.map((row) => (
          <article key={row.id} className="flow-br-audit">
            {row.occurredAt} · {row.actorName} · {row.action} · {row.recordId} ·{" "}
            {row.reason}
            {row.previousValue ? ` · from ${row.previousValue}` : ""} → {row.newValue}
          </article>
        ))}
      </section>
    </div>
  );
}
