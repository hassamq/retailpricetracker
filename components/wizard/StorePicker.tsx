"use client";

import { retailers, type RetailerId } from "@/data/retailers";
import { useWizardStore } from "@/lib/store";
import { cn } from "@/lib/format";

export function StorePicker() {
  const storeId = useWizardStore((s) => s.storeId);
  const setStoreId = useWizardStore((s) => s.setStoreId);

  return (
    <div>
      <p className="mb-8 text-sm text-muted">
        Where are you shopping or working today?
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {retailers.map((retailer) => {
          const selected = storeId === retailer.id;
          return (
            <button
              key={retailer.id}
              type="button"
              onClick={() => setStoreId(retailer.id as RetailerId)}
              className={cn(
                "border bg-paper p-5 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2",
                selected
                  ? "border-ink bg-mist"
                  : "border-line hover:border-ink",
              )}
              aria-pressed={selected}
            >
              <span
                className="mb-3 block h-0.5 w-8"
                style={{ backgroundColor: retailer.accent }}
                aria-hidden
              />
              <span className="block text-sm font-bold text-ink">
                {retailer.displayName}
              </span>
              <span className="mt-1.5 block text-[11px] leading-snug text-muted">
                {retailer.dealContext}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
