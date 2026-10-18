import type { Product } from "@/data/products";
import { matchRetailerId, type RetailerId } from "@/data/retailers";
import type { RawListing } from "./types";

export type FilteredListing = RawListing & {
  retailerId: RetailerId;
  condition: "new" | "open-box";
};

const OPEN_BOX_RE = /open[\s-]?box|display model|demo unit/i;
const MARKETPLACE_HINTS = [
  /sold by (?!walmart|amazon|samsung)/i,
  /marketplace/i,
  /third[\s-]?party/i,
  /fulfilled by/i,
];

export function prefilterListings(
  listings: RawListing[],
  product: Product,
): FilteredListing[] {
  const min = product.msrp * 0.4;
  const max = product.msrp * 1.6;

  const out: FilteredListing[] = [];

  for (const listing of listings) {
    if (listing.price == null) continue;
    if (listing.price < min || listing.price > max) continue;

    const titleLower = listing.title.toLowerCase();
    if (
      product.excludeKeywords.some((kw) =>
        titleLower.includes(kw.toLowerCase()),
      )
    ) {
      continue;
    }

    // Require key model tokens in the title (all must match)
    const missingToken = product.modelTokens.some(
      (t) => !titleLower.includes(t.toLowerCase()),
    );
    if (missingToken) continue;

    const retailerId = matchRetailerId(listing.source);
    if (!retailerId) continue;

    // Walmart / Amazon: drop obvious marketplace
    if (retailerId === "walmart" || retailerId === "amazon") {
      const blob = `${listing.title} ${listing.source} ${listing.extensions.join(" ")}`;
      if (MARKETPLACE_HINTS.some((re) => re.test(blob))) continue;
      if (
        retailerId === "amazon" &&
        /sold by/i.test(blob) &&
        !/sold by (amazon|samsung)/i.test(blob)
      ) {
        continue;
      }
    }

    const condition: "new" | "open-box" =
      OPEN_BOX_RE.test(listing.title) ||
      OPEN_BOX_RE.test(listing.secondHandCondition ?? "") ||
      listing.extensions.some((e) => OPEN_BOX_RE.test(e))
        ? "open-box"
        : "new";

    out.push({ ...listing, retailerId, condition });
  }

  // Keep best (lowest) price per retailer when duplicates exist
  const best = new Map<RetailerId, FilteredListing>();
  for (const item of out) {
    const prev = best.get(item.retailerId);
    if (!prev || (item.price ?? Infinity) < (prev.price ?? Infinity)) {
      best.set(item.retailerId, item);
    }
  }

  return Array.from(best.values());
}

export function uniqueRetailerCount(listings: FilteredListing[]): number {
  return new Set(listings.map((l) => l.retailerId)).size;
}
