"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CommercialRoute } from "../../../../components/commercial/CommercialRoute";
import { SectionHeader } from "../../../../components/ui/Display";
import { useCommercialClient } from "../../../../lib/commercial/use-commercial";
import type { ResourceProfileRecord } from "../../../../lib/commercial/api";

function TeamPage() {
  const workspace = useParams().workspace as string;
  const api = useCommercialClient(workspace);
  const [resources, setResources] = useState<ResourceProfileRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!api?.listResources) return;
    void api.listResources().then(setResources).catch((err: Error) => {
      setError(err.message);
    });
  }, [api]);

  return (
    <>
      <SectionHeader
        eyebrow="Team"
        title="Resource profiles"
        description="Employees and contractors available for governed assignment planning."
      />
      {error && <p role="alert">{error}</p>}
      <div className="flow-panel" data-testid="team-list">
        {resources.length === 0 ? (
          <p>No resources yet. Add team members from your workspace settings.</p>
        ) : (
          <ul>
            {resources.map((resource) => (
              <li key={resource.id}>
                <Link href={`/${workspace}/admin/team/${resource.id}`}>
                  {resource.displayName}
                </Link>{" "}
                — {resource.resourceType} · {resource.roleKeys.join(", ")}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export default function Page() {
  return (
    <CommercialRoute>
      <TeamPage />
    </CommercialRoute>
  );
}
