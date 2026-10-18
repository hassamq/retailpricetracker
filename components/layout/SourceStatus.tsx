"use client";

import { useWizardStore } from "@/lib/store";
import { cn } from "@/lib/format";

export function SourceStatus() {
  const priceSource = useWizardStore((s) => s.priceSource);

  const label =
    priceSource === "live"
      ? "Live"
      : priceSource === "cache"
        ? "Cached"
        : priceSource === "fixture"
          ? "Sample"
          : "Ready";

  const tone =
    priceSource === "live"
      ? "bg-success"
      : priceSource === "cache"
        ? "bg-link-blue"
        : priceSource === "fixture" || priceSource === "mock"
          ? "bg-muted"
          : "bg-line";

  return (
    <span className="hidden items-center gap-2 text-xs font-bold text-muted sm:inline-flex">
      <span className={cn("h-2 w-2 rounded-full", tone)} aria-hidden />
      <span>
        Pricing: <span className="text-ink">{label}</span>
      </span>
    </span>
  );
}
