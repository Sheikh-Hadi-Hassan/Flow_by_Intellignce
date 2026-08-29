"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import type { ModuleRecommendation } from "../../lib/prototype/types";
import { moduleStatusLabel } from "../../lib/prototype/recommendations";
import { ProofLabel, StatusBadge } from "../ui/Display";
import { Button } from "../ui/Button";

export function ModuleRecommendationList({
  modules,
  deferredIds,
  onToggleDeferred,
  showExpand = true,
}: {
  modules: ModuleRecommendation[];
  deferredIds: string[];
  onToggleDeferred?: (id: string) => void;
  showExpand?: boolean;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <div className="flow-module-list">
      {modules.map((mod) => {
        const deferred = deferredIds.includes(mod.id);
        const isOpen = expanded[mod.id] ?? false;

        return (
          <article key={mod.id} className="flow-module-row">
            <div className="flow-module-row__main">
              <div className="flow-module-row__title">
                <h3>{mod.name}</h3>
                <div className="flow-module-row__badges">
                  <StatusBadge
                    variant={mod.essential ? "essential" : "default"}
                  >
                    {moduleStatusLabel(mod.setupStatus)}
                  </StatusBadge>
                  {deferred && (
                    <StatusBadge variant="warning">Review later</StatusBadge>
                  )}
                </div>
              </div>
              <p className="flow-module-row__benefit">{mod.benefit}</p>
              <p className="flow-module-row__status">
                Current status: Not configured
              </p>
            </div>

            <div className="flow-module-row__actions">
              {showExpand && (
                <button
                  type="button"
                  className="flow-module-row__expand"
                  aria-expanded={isOpen}
                  onClick={() =>
                    setExpanded((prev) => ({ ...prev, [mod.id]: !isOpen }))
                  }
                >
                  <ChevronDown
                    size={16}
                    className={isOpen ? "flow-chevron--open" : undefined}
                  />
                  Why Flow recommends this
                </button>
              )}
              {onToggleDeferred && (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-pressed={deferred}
                  onClick={() => onToggleDeferred(mod.id)}
                >
                  {deferred
                    ? "Remove from later review"
                    : "Mark for later review"}
                </Button>
              )}
            </div>

            {showExpand && isOpen && (
              <div className="flow-module-row__details">
                <p>{mod.why}</p>
                <p className="flow-module-row__trigger">
                  Triggered by: {mod.trigger}
                </p>
                <ProofLabel type={mod.proofType}>
                  {mod.proofType === "fact"
                    ? "Verified from setup"
                    : mod.proofType === "inference"
                      ? "Inferred from setup"
                      : "Recommended capability"}
                </ProofLabel>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
