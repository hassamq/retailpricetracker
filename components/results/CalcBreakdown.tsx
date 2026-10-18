"use client";

import { formatCurrency } from "@/lib/format";
import type { CalculatedOffer } from "@/lib/pricing/types";
import { getTradeInValue, getTradeInLabel } from "@/data/trade-in";

type Props = {
  offer: CalculatedOffer;
  productId: string;
  includeGiftCards: boolean;
  includeTradeIn: boolean;
  promoDiscount: number;
};

export function CalcBreakdown({
  offer,
  productId,
  includeGiftCards,
  includeTradeIn,
  promoDiscount,
}: Props) {
  const tradeIn = includeTradeIn ? getTradeInValue(productId) : 0;
  const tradeLabel = getTradeInLabel(productId);

  const rows: { label: string; value: number; sign: "-" | "+" | "=" }[] = [
    { label: "Base price", value: offer.basePrice, sign: "+" },
  ];
  if (offer.instantSavings > 0) {
    rows.push({ label: "Instant savings", value: offer.instantSavings, sign: "-" });
  }
  if (offer.couponValue) {
    rows.push({
      label: offer.couponCode ? `Coupon ${offer.couponCode}` : "Coupon",
      value: offer.couponValue,
      sign: "-",
    });
  }
  if (includeGiftCards && offer.giftCardValue) {
    rows.push({ label: "Gift card", value: offer.giftCardValue, sign: "-" });
  }
  if (tradeIn > 0) {
    rows.push({
      label: `Est. trade-in${tradeLabel ? ` (${tradeLabel})` : ""}`,
      value: tradeIn,
      sign: "-",
    });
  }
  if (promoDiscount > 0) {
    rows.push({ label: "Promo code", value: promoDiscount, sign: "-" });
  }

  return (
    <div className="rounded-xl bg-mist px-4 py-3 text-sm">
      <p className="mb-2 text-xs font-bold tracking-widest text-muted uppercase">
        Calculation
      </p>
      <ul className="space-y-1.5">
        {rows.map((row) => (
          <li key={row.label} className="flex justify-between gap-4">
            <span className="text-muted">{row.label}</span>
            <span className="tabular-nums font-semibold text-ink">
              {row.sign === "-" ? "−" : ""}
              {formatCurrency(row.value)}
            </span>
          </li>
        ))}
        <li className="flex justify-between gap-4 border-t border-line pt-2 font-bold">
          <span>Net price</span>
          <span className="tabular-nums">{formatCurrency(offer.netPrice)}</span>
        </li>
      </ul>
    </div>
  );
}
