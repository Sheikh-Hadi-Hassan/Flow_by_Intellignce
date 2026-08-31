"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CommercialRoute } from "../../../components/commercial/CommercialRoute";
import { SectionHeader } from "../../../components/ui/Display";
import { useCommercialClient } from "../../../lib/commercial/use-commercial";

function MyWorkPage() {
  const workspace = useParams().workspace as string;
  const api = useCommercialClient(workspace);
  const [items, setItems] = useState<
    readonly {
      projectId: string;
      taskId: string;
      roleKey: string;
      allocationMinutes: number;
    }[]
  >([]);

  useEffect(() => {
    if (!api?.getMyWork) return;
    void api.getMyWork().then(setItems);
  }, [api]);

  return (
    <>
      <SectionHeader
        eyebrow="Work"
        title="My assignments"
        description="Published workload assigned to you."
      />
      <div className="flow-panel" data-testid="my-work-list">
        {items.length === 0 ? (
          <p>No published assignments yet.</p>
        ) : (
          <ul>
            {items.map((item) => (
              <li key={`${item.projectId}-${item.taskId}`}>
                {item.roleKey} — {item.allocationMinutes} minutes
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
      <MyWorkPage />
    </CommercialRoute>
  );
}
