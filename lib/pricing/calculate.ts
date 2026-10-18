import { retailers, type RetailerId } from "@/data/retailers";
import { getTradeInValue } from "@/data/trade-in";
import { roundCents } from "@/lib/format";
import type { CalculatedOffer, ExtractedOffer } from "./types";
import { evaluateMatchability, buildVerdict } from "./match-policy";
import type { PriceMatchVerdict } from "./types";

export type CalculateOptions = {
  productId: string;
  msrp: number;
  storeId: RetailerId | null;
  includeGiftCards: boolean;
  includeTradeIn: boolean;
  haveMemberships: boolean;
  promoDiscount?: number;
};

export function netPriceFor(
  offer: ExtractedOffer,
  opts: {
    includeGiftCards: boolean;
    includeTradeIn: boolean;
    tradeInValue: number;
    promoDiscount: number;
  },
): number {
  const net =
    offer.basePrice -
    (offer.instantSavings || 0) -
    (offer.couponValue || 0) -
    (opts.includeGiftCards ? offer.giftCardValue || 0 : 0) -
    (opts.includeTradeIn ? opts.tradeInValue : 0) -
    (opts.promoDiscount || 0);

  return roundCents(Math.max(0, net));
}

export function calculateOffers(
  extracted: ExtractedOffer[],
  opts: CalculateOptions,
): {
  offers: CalculatedOffer[];
  bestValue: CalculatedOffer | null;
  verdict: PriceMatchVerdict | null;
} {
  const tradeInValue = getTradeInValue(opts.productId);
  const byRetailer = new Map<string, ExtractedOffer>();
  for (const e of extracted) {
    byRetailer.set(e.retailerId, e);
  }

  const calculated: CalculatedOffer[] = retailers.map((retailer) => {
    const offer = byRetailer.get(retailer.id);
    if (!offer) {
      return {
        retailerId: retailer.id,
        title: "Not listed",
        basePrice: 0,
        instantSavings: 0,
        couponCode: null,
        couponValue: null,
        giftCardValue: null,
        membershipRequired: null,
        condition: "new" as const,
        inStock: null,
        url: "",
        notes: null,
        netPrice: Number.POSITIVE_INFINITY,
        listed: false,
        matchable: false,
        membershipGated: false,
        isBestValue: false,
        isYourStore: retailer.id === opts.storeId,
        savingsVsMsrp: 0,
      };
    }

    const membershipGated = Boolean(offer.membershipRequired);
    const net = netPriceFor(offer, {
      includeGiftCards: opts.includeGiftCards,
      includeTradeIn: opts.includeTradeIn,
      tradeInValue,
      promoDiscount: opts.promoDiscount ?? 0,
    });

    return {
      ...offer,
      retailerId: retailer.id,
      netPrice: net,
      listed: true,
      matchable: false,
      membershipGated,
      isBestValue: false,
      isYourStore: retailer.id === opts.storeId,
      savingsVsMsrp: roundCents(opts.msrp - net),
    };
  });

  // Sort: listed first by net ascending; unlisted at bottom
  calculated.sort((a, b) => {
    if (a.listed !== b.listed) return a.listed ? -1 : 1;
    if (a.netPrice !== b.netPrice) return a.netPrice - b.netPrice;
    const stockA = a.inStock === true ? 0 : 1;
    const stockB = b.inStock === true ? 0 : 1;
    if (stockA !== stockB) return stockA - stockB;
    return a.retailerId.localeCompare(b.retailerId);
  });

  // Best Value: lowest net that is new, in stock (or unknown), not membership-gated unless toggle on
  let bestValue: CalculatedOffer | null = null;
  for (const row of calculated) {
    if (!row.listed) continue;
    if (row.condition !== "new") continue;
    if (row.inStock === false) continue;
    if (row.membershipGated && !opts.haveMemberships) continue;
    bestValue = row;
    break;
  }

  if (bestValue) {
    bestValue.isBestValue = true;
  }

  // Matchability vs user's store
  if (opts.storeId && bestValue) {
    for (const row of calculated) {
      if (!row.listed) continue;
      row.matchable = evaluateMatchability(opts.storeId, row);
    }
  }

  const verdict =
    opts.storeId && bestValue
      ? buildVerdict(opts.storeId, bestValue, calculated)
      : null;

  return { offers: calculated, bestValue, verdict };
}
