"use client";

import {
  categoryLabels,
  type ProductCategory,
} from "@/data/products";
import { useWizardStore } from "@/lib/store";
import { cn } from "@/lib/format";

const tabs = (
  Object.entries(categoryLabels) as [ProductCategory, string][]
).map(([id, label]) => ({ id, label }));

export function CategoryTabs() {
  const category = useWizardStore((s) => s.category) ?? "tab";
  const setCategory = useWizardStore((s) => s.setCategory);
  const setProductId = useWizardStore((s) => s.setProductId);

  return (
    <div
      role="tablist"
      aria-label="Product categories"
      className="flex gap-0 overflow-x-auto border-b border-line"
    >
      {tabs.map((tab) => {
        const selected = tab.id === category;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => {
              setCategory(tab.id);
              setProductId(null);
            }}
            className={cn(
              "shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2",
              selected
                ? "border-ink text-ink"
                : "border-transparent text-muted hover:text-ink",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
