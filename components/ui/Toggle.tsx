"use client";

import { cn } from "@/lib/format";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  id?: string;
};

export function Toggle({ checked, onChange, label, id }: Props) {
  const toggleId = id ?? label.replace(/\s+/g, "-").toLowerCase();
  return (
    <label
      htmlFor={toggleId}
      className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-ink"
    >
      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2",
          checked ? "bg-ink" : "bg-line",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-paper transition-transform",
            checked && "translate-x-5",
          )}
        />
      </button>
      <span>{label}</span>
    </label>
  );
}
