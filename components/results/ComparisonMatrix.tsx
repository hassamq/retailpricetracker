"use client";

import type { CalculatedOffer } from "@/lib/pricing/types";
import { OfferRow } from "./OfferRow";

type Props = {
  offers: CalculatedOffer[];
  productId: string;
  includeGiftCards: boolean;
  includeTradeIn: boolean;
  promoDiscount: number;
  haveMemberships: boolean;
};

export function ComparisonMatrix({
  offers,
  productId,
  includeGiftCards,
  includeTradeIn,
  promoDiscount,
  haveMemberships,
}: Props) {
  return (
    <div
      className="overflow-hidden border border-line bg-paper"
      role="table"
      aria-label="Price comparison matrix"
    >
      <div
        className="hidden grid-cols-12 gap-2 border-b border-line bg-mist px-4 py-3 text-[11px] font-bold tracking-widest text-muted uppercase sm:grid"
        role="row"
      >
        <span className="col-span-1">Rank</span>
        <span className="col-span-3">Retailer</span>
        <span className="col-span-2 text-right">Base</span>
        <span className="col-span-2 text-right">Vs MSRP</span>
        <span className="col-span-2 text-right">Net</span>
        <span className="col-span-2 text-right">Stock / link</span>
      </div>
      {offers.map((offer, i) => (
        <OfferRow
          key={offer.retailerId}
          rank={i + 1}
          offer={offer}
          productId={productId}
          includeGiftCards={includeGiftCards}
          includeTradeIn={includeTradeIn}
          promoDiscount={promoDiscount}
          haveMemberships={haveMemberships}
        />
      ))}
    </div>
  );
}
