"use client";

import { cn } from "@/lib/format";
import type { WizardStep } from "@/lib/store";

const steps: { n: WizardStep; label: string }[] = [
  { n: 1, label: "Select product" },
  { n: 2, label: "Configure" },
  { n: 3, label: "Select store" },
  { n: 4, label: "Compare prices" },
];

type Props = {
  current: WizardStep;
  onJump?: (step: WizardStep) => void;
};

export function StepIndicator({ current, onJump }: Props) {
  return (
    <nav aria-label="Progress" className="mb-10 flex justify-center">
      <ol className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 text-xs font-semibold sm:gap-x-3 sm:text-sm">
        {steps.map((step, i) => {
          const active = current === step.n;
          const done = current > step.n;
          const clickable = Boolean(onJump) && (done || active);

          return (
            <li key={step.n} className="flex items-center gap-2 sm:gap-3">
              {i > 0 && (
                <span className="text-line select-none" aria-hidden>
                  —
                </span>
              )}
              <button
                type="button"
                disabled={!clickable}
                onClick={() => onJump?.(step.n)}
                className={cn(
                  "flex items-center gap-2",
                  clickable && "cursor-pointer",
                  !clickable && "cursor-default",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                    active || done
                      ? "bg-ink text-paper"
                      : "bg-mist text-muted",
                  )}
                  aria-current={active ? "step" : undefined}
                >
                  {step.n}
                </span>
                <span
                  className={cn(
                    "hidden sm:inline",
                    active ? "text-ink" : "text-muted",
                  )}
                >
                  {step.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
