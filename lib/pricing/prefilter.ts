import type { Product } from "@/data/products";
import {
  isGoogleShoppingAggregatorUrl,
  isUsableListingUrl,
  matchRetailerId,
  type RetailerId,
} from "@/data/retailers";
import type { RawListing } from "./types";

export type FilteredListing = RawListing & {
  retailerId: RetailerId;
  condition: "new" | "open-box";
};

export type VariantFilter = {
  storage?: string;
  connectivity?: string;
  color?: string;
};

const OPEN_BOX_RE = /open[\s-]?box|display model|demo unit/i;
const MARKETPLACE_HINTS = [
  /sold by (?!walmart|amazon|samsung)/i,
  /marketplace/i,
  /third[\s-]?party/i,
  /fulfilled by/i,
];

const STORAGE_TOKENS = [
  "64gb",
  "128gb",
  "256gb",
  "512gb",
  "1tb",
  "2tb",
] as const;

/**
 * Reject listings that clearly advertise a different storage/connectivity
 * than the shopper selected (e.g. Wi-Fi PDP when they asked for 5G).
 */
export function matchesVariant(
  title: string,
  link: string,
  variant: VariantFilter = {},
): boolean {
  const blob = `${title} ${link}`.toLowerCase();

  if (variant.storage) {
    const wanted = variant.storage.toLowerCase().replace(/\s+/g, "");
    const mentionsOtherStorage = STORAGE_TOKENS.some(
      (token) => token !== wanted && blob.includes(token),
    );
    if (mentionsOtherStorage && !blob.includes(wanted)) return false;
  }

  const connectivity = variant.connectivity?.toLowerCase().trim();
  if (connectivity === "5g") {
    const has5g = /\b5g\b/.test(blob);
    const hasWifi = /wi-?fi/.test(blob);
    // Explicit Wi-Fi SKU with no 5G signal is the wrong catalog row
    if (hasWifi && !has5g) return false;
  } else if (connectivity === "wi-fi" || connectivity === "wifi") {
    const has5g = /\b5g\b/.test(blob);
    const hasWifi = /wi-?fi/.test(blob);
    if (has5g && !hasWifi) return false;
  }

  return true;
}

export function prefilterListings(
  listings: RawListing[],
  product: Product,
  variant: VariantFilter = {},
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

    if (!matchesVariant(listing.title, listing.link, variant)) continue;

    const retailerId = matchRetailerId(listing.source);
    if (!retailerId) continue;

    // Walmart / Amazon: drop marketplace / 3P sellers (e.g. "Walmart - HotDeals")
    if (retailerId === "walmart" || retailerId === "amazon") {
      const source = listing.source.trim();
      if (/^(walmart|amazon)\s*[-–:]\s*.+/i.test(source)) {
        continue;
      }
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

  // Keep best offer per retailer: prefer a real PDP, then lowest price
  const best = new Map<RetailerId, FilteredListing>();
  for (const item of out) {
    const prev = best.get(item.retailerId);
    if (!prev || isPreferredListing(item, prev)) {
      best.set(item.retailerId, item);
    }
  }

  return Array.from(best.values());
}

function isPreferredListing(a: FilteredListing, b: FilteredListing): boolean {
  const aPdp = hasProductPage(a.link);
  const bPdp = hasProductPage(b.link);
  if (aPdp !== bPdp) return aPdp;
  return (a.price ?? Infinity) < (b.price ?? Infinity);
}

function hasProductPage(link: string): boolean {
  return isUsableListingUrl(link) && !isGoogleShoppingAggregatorUrl(link);
}

export function uniqueRetailerCount(listings: FilteredListing[]): number {
  return new Set(listings.map((l) => l.retailerId)).size;
}
