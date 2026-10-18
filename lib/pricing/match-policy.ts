import { getRetailer, type RetailerId } from "@/data/retailers";
import { formatCurrency } from "@/lib/format";
import type { CalculatedOffer, PriceMatchVerdict } from "./types";

export function evaluateMatchability(
  storeId: RetailerId,
  competitor: CalculatedOffer,
): boolean {
  const store = getRetailer(storeId);
  const policy = store.priceMatchPolicy;

  if (competitor.retailerId === storeId) return false;
  if (!policy.matches.includes(competitor.retailerId)) return false;
  if (!competitor.listed) return false;
  // Only exact variant matches are price-match eligible
  if ((competitor.matchQuality ?? "exact") !== "exact") return false;

  const ex = policy.exclusions;
  if (ex.openBox && competitor.condition === "open-box") return false;
  if (ex.outOfStock && competitor.inStock === false) return false;
  if (ex.membershipPricing && competitor.membershipRequired) return false;
  if (ex.marketplace) {
    // marketplace already filtered for Walmart/Amazon; still block if notes hint
    if (/marketplace|third.?party/i.test(competitor.notes ?? "")) return false;
  }
  if (ex.bundles && /bundle|with .+ gift/i.test(competitor.title)) return false;

  return true;
}

export function buildVerdict(
  storeId: RetailerId,
  bestValue: CalculatedOffer,
  all: CalculatedOffer[],
): PriceMatchVerdict {
  const store = getRetailer(storeId);
  const yourRow = all.find((o) => o.retailerId === storeId);

  if (bestValue.retailerId === storeId) {
    return {
      matchable: false,
      summary: `${store.displayName} already has the best value at ${formatCurrency(bestValue.netPrice)}.`,
      competitorId: null,
      competitorPrice: null,
      reason: "Your store is Best Value.",
    };
  }

  const canMatch = evaluateMatchability(storeId, bestValue);
  const competitorName = getRetailer(bestValue.retailerId).displayName;

  if (canMatch) {
    const stock =
      bestValue.inStock === false
        ? "out of stock"
        : bestValue.inStock === true
          ? "in stock"
          : "stock unknown";
    return {
      matchable: true,
      summary: `${store.displayName} can likely match ${formatCurrency(bestValue.netPrice)} from ${competitorName}. Sold by ${competitorName}, ${bestValue.condition}, ${stock}.`,
      competitorId: bestValue.retailerId,
      competitorPrice: bestValue.netPrice,
      reason: store.priceMatchPolicy.notes,
    };
  }

  // Explain why not
  let reason = store.priceMatchPolicy.notes;
  if (!store.priceMatchPolicy.matches.includes(bestValue.retailerId)) {
    reason = `${store.displayName} does not match ${competitorName}.`;
  } else if (bestValue.membershipRequired) {
    reason = `Not matchable: ${bestValue.membershipRequired} membership pricing is excluded.`;
  } else if (bestValue.condition === "open-box") {
    reason = "Not matchable: open-box is excluded.";
  } else if (bestValue.inStock === false) {
    reason = "Not matchable: competitor is out of stock.";
  }

  const yourPrice =
    yourRow?.listed && yourRow.netPrice < Infinity
      ? ` Your price: ${formatCurrency(yourRow.netPrice)}.`
      : "";

  return {
    matchable: false,
    summary: `${reason}${yourPrice}`,
    competitorId: bestValue.retailerId,
    competitorPrice: bestValue.netPrice,
    reason,
  };
}
