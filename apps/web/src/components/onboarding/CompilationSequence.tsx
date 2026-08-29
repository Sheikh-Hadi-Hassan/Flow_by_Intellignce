"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getCompilationStepDuration } from "../../lib/prototype/twin-compile";
import { COMPILATION_STEPS } from "../../lib/prototype/types";

export function TwinCompilationSequence({
  workspace,
  onComplete,
}: {
  workspace: string;
  onComplete: () => void;
}) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [done, setDone] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setActiveStep(COMPILATION_STEPS.length);
      setDone(true);
      onComplete();
      return;
    }

    if (activeStep >= COMPILATION_STEPS.length) {
      setDone(true);
      onComplete();
      return;
    }

    const delay = getCompilationStepDuration(reducedMotion, activeStep);
    const timer = window.setTimeout(() => {
      setActiveStep((s) => s + 1);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [activeStep, reducedMotion, onComplete]);

  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(
      () => {
        router.push(`/${workspace}/admin`);
      },
      reducedMotion ? 100 : 800,
    );
    return () => window.clearTimeout(timer);
  }, [done, workspace, router, reducedMotion]);

  return (
    <div className="flow-compilation" role="status" aria-live="polite">
      <header className="editorial-accent">
        <p className="eyebrow">Creating your Twin</p>
        <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 600 }}>
          {done ? "Twin ready" : "Compiling your business profile"}
        </h1>
        <p
          style={{
            marginTop: "var(--space-3)",
            color: "var(--color-text-secondary)",
          }}
        >
          {done
            ? "Your workspace is prepared. Redirecting to founder home."
            : "Deterministic prototype steps — no external research or backend execution."}
        </p>
      </header>
      <ol className="flow-compilation__list">
        {COMPILATION_STEPS.map((step, i) => {
          const isDone = i < activeStep;
          const isActive = i === activeStep && !done;
          return (
            <li
              key={step}
              className={`flow-compilation__item ${
                isDone ? "flow-compilation__item--done" : ""
              } ${isActive ? "flow-compilation__item--active" : ""}`}
            >
              <span aria-hidden="true">
                {isDone ? "✓" : isActive ? "→" : "·"}
              </span>
              {step}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
