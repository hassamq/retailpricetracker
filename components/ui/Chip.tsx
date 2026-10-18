"use client";

import { cn } from "@/lib/format";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  children: ReactNode;
};

export function Chip({ selected, children, className, ...props }: Props) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2",
        selected
          ? "border-ink bg-ink text-paper"
          : "border-line bg-paper text-ink hover:border-ink",
        className,
      )}
      aria-pressed={selected}
      {...props}
    >
      {children}
    </button>
  );
}
