"use client";

import { formatCurrency } from "@/lib/format";
import { getRetailer } from "@/data/retailers";
import { Tag } from "@/components/ui/Tag";
import { POLICY_FOOTNOTE } from "@/data/retailers";
import type { CalculatedOffer, PriceMatchVerdict } from "@/lib/pricing/types";
import { PriceCountUp } from "./PriceCountUp";

type Props = {
  bestValue: CalculatedOffer | null;
  verdict: PriceMatchVerdict | null;
  msrp: number;
  storeName: string;
};

export function VerdictCard({ bestValue, verdict, msrp, storeName }: Props) {
  if (!bestValue) {
    return (
      <div className="border border-line bg-paper p-6 sm:p-8">
        <h3 className="text-lg font-bold text-ink">No Best Value yet</h3>
        <p className="mt-2 text-sm text-muted">
          We could not confirm a new, in-stock offer across the six retailers.
        </p>
      </div>
    );
  }

  const retailer = getRetailer(bestValue.retailerId);
  const savings = Math.max(0, msrp - bestValue.netPrice);

  return (
    <div className="border border-line bg-paper p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <Tag tone="blue" className="mb-3">
            Best value
          </Tag>
          <p className="text-sm text-muted">{retailer.displayName}</p>
          <PriceCountUp
            value={bestValue.netPrice}
            className="mt-1 block text-4xl font-bold tracking-tight text-ink"
          />
          <p className="mt-2 text-sm font-medium text-success">
            Save {formatCurrency(savings)} vs MSRP {formatCurrency(msrp)}
          </p>
        </div>
        <div className="max-w-md bg-mist p-5">
          <p className="text-xs font-bold tracking-widest text-muted uppercase">
            Price match · {storeName}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink">
            {verdict?.summary ?? "Select your store to see match eligibility."}
          </p>
          {verdict && (
            <p className="mt-3 text-[11px] text-muted">
              {verdict.reason} {POLICY_FOOTNOTE}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
