"use client";

import { cn } from "@/lib/format";

type Tab<T extends string> = {
  id: T;
  label: string;
};

type Props<T extends string> = {
  tabs: Tab<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel?: string;
};

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel = "Tabs",
}: Props<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex flex-wrap gap-2"
    >
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-bold transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2",
              selected
                ? "bg-ink text-paper"
                : "bg-mist text-muted hover:text-ink",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
