"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import { getRetailer } from "@/data/retailers";
import type { CalculatedOffer } from "@/lib/pricing/types";

type Props = {
  top3: Array<Pick<CalculatedOffer, "retailerId" | "netPrice" | "condition">>;
};

export function InlineComparison({ top3 }: Props) {
  if (!top3.length) return null;
  return (
    <div className="mt-2 rounded-xl border border-line bg-mist p-3">
      <p className="mb-2 text-[11px] font-bold tracking-widest text-muted uppercase">
        Top 3
      </p>
      <ul className="space-y-1.5">
        {top3.map((row, i) => (
          <li
            key={row.retailerId}
            className="flex items-center justify-between text-sm"
          >
            <span className="font-semibold text-ink">
              {i + 1}. {getRetailer(row.retailerId).displayName}
            </span>
            <span className="tabular-nums font-bold">
              {formatCurrency(row.netPrice)}
            </span>
          </li>
        ))}
      </ul>
      <Link
        href="/"
        className="mt-2 inline-block text-xs font-bold text-link-blue hover:underline"
      >
        See full comparison
      </Link>
    </div>
  );
}
