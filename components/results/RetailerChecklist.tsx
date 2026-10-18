"use client";

import { nationalRetailers, type RetailerId } from "@/data/retailers";
import { cn } from "@/lib/format";

type Props = {
  resolved: RetailerId[];
  pending?: boolean;
};

export function RetailerChecklist({ resolved, pending }: Props) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-muted">
      {nationalRetailers.map((r) => {
        const done = resolved.includes(r.id);
        return (
          <li key={r.id} className="inline-flex items-center gap-1">
            <span className={cn(done ? "text-success" : pending ? "text-muted" : "text-line")}>
              {r.displayName}
              {done ? " ✓" : pending ? " …" : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
