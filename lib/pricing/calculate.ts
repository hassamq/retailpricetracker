import {
  retailersForVariant,
  type Retailer,
  type RetailerId,
} from "@/data/retailers";
import { getTradeInValue } from "@/data/trade-in";
import { roundCents } from "@/lib/format";
import type {
  CalculatedOffer,
  ExtractedOffer,
  MatchQuality,
} from "./types";
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
  /** Defaults to nationals (+ carriers when variant is cellular). */
  matrixRetailers?: Retailer[];
  variant?: Record<string, string>;
};

const QUALITY_SORT: Record<MatchQuality, number> = {
  exact: 0,
  carrier: 1,
  nearest: 2,
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
  const matrix =
    opts.matrixRetailers ?? retailersForVariant(opts.variant ?? {});

  const byRetailer = new Map<string, ExtractedOffer>();
  for (const e of extracted) {
    const prev = byRetailer.get(e.retailerId);
    if (!prev || qualityRank(e) < qualityRank(prev)) {
      byRetailer.set(e.retailerId, e);
    }
  }

  const calculated: CalculatedOffer[] = matrix.map((retailer) => {
    const offer = byRetailer.get(retailer.id);
    if (!offer) {
      return {
        retailerId: retailer.id,
        title: "No matching offer for this variant",
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
        matchQuality: "exact" as const,
        matchedVariant: null,
        netPrice: Number.POSITIVE_INFINITY,
        listed: false,
        matchable: false,
        membershipGated: false,
        isBestValue: false,
        isYourStore: retailer.id === opts.storeId,
        savingsVsMsrp: 0,
      };
    }

    const matchQuality = offer.matchQuality ?? "exact";
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
      matchQuality,
      matchedVariant: offer.matchedVariant ?? null,
      netPrice: net,
      listed: true,
      matchable: false,
      membershipGated,
      isBestValue: false,
      isYourStore: retailer.id === opts.storeId,
      savingsVsMsrp: roundCents(opts.msrp - net),
    };
  });

  // Exact first, then carrier, then nearest; within tier by net ascending
  calculated.sort((a, b) => {
    if (a.listed !== b.listed) return a.listed ? -1 : 1;
    const qa = QUALITY_SORT[a.matchQuality ?? "exact"];
    const qb = QUALITY_SORT[b.matchQuality ?? "exact"];
    if (qa !== qb) return qa - qb;
    if (a.netPrice !== b.netPrice) return a.netPrice - b.netPrice;
    const stockA = a.inStock === true ? 0 : 1;
    const stockB = b.inStock === true ? 0 : 1;
    if (stockA !== stockB) return stockA - stockB;
    return a.retailerId.localeCompare(b.retailerId);
  });

  // Best Value: lowest net among exact matches only (when any exact exists)
  const exactListed = calculated.filter(
    (row) => row.listed && (row.matchQuality ?? "exact") === "exact",
  );
  const bestPool = exactListed.length
    ? exactListed
    : calculated.filter((row) => row.listed);

  let bestValue: CalculatedOffer | null = null;
  for (const row of bestPool) {
    if (row.condition !== "new") continue;
    if (row.inStock === false) continue;
    if (row.membershipGated && !opts.haveMemberships) continue;
    bestValue = row;
    break;
  }

  if (bestValue) {
    bestValue.isBestValue = true;
  }

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

function qualityRank(offer: ExtractedOffer): number {
  return QUALITY_SORT[offer.matchQuality ?? "exact"];
}
