import type { Product } from "@/data/products";
import {
  isGoogleShoppingAggregatorUrl,
  isUsableListingUrl,
  matchRetailerId,
  type RetailerId,
} from "@/data/retailers";
import type { MatchQuality, MatchedVariant, RawListing } from "./types";

export type VariantMatchMode = "exact" | "nearest";

export type FilteredListing = RawListing & {
  retailerId: RetailerId;
  condition: "new" | "open-box";
  matchQuality: MatchQuality;
  matchedVariant: MatchedVariant | null;
};

export type VariantFilter = {
  storage?: string;
  connectivity?: string;
  color?: string;
  size?: string;
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
 * Reject listings that clearly advertise a different storage/connectivity/size
 * than the shopper selected. Nearest mode keeps storage/size when stated but
 * allows alternate connectivity (Wi‑Fi↔5G, Bluetooth↔LTE).
 */
export function matchesVariant(
  title: string,
  link: string,
  variant: VariantFilter = {},
  mode: VariantMatchMode = "exact",
): boolean {
  const blob = `${title} ${link}`.toLowerCase();

  if (variant.storage) {
    const wanted = variant.storage.toLowerCase().replace(/\s+/g, "");
    const mentionsOtherStorage = STORAGE_TOKENS.some(
      (token) => token !== wanted && blob.includes(token),
    );
    if (mentionsOtherStorage && !blob.includes(wanted)) return false;
  }

  if (variant.size) {
    const wantedSize = normalizeSize(variant.size);
    const mentioned = [...blob.matchAll(/(\d{2})\s?mm/g)].map((m) => m[1]);
    if (
      wantedSize &&
      mentioned.length > 0 &&
      !mentioned.some((mm) => mm === wantedSize)
    ) {
      return false;
    }
  }

  if (mode === "nearest") {
    return true;
  }

  const connectivity = variant.connectivity?.toLowerCase().trim();
  if (connectivity === "5g") {
    const has5g = /\b5g\b/.test(blob);
    const hasWifi = /wi-?fi/.test(blob);
    if (hasWifi && !has5g) return false;
  } else if (connectivity === "wi-fi" || connectivity === "wifi") {
    const has5g = /\b5g\b/.test(blob);
    const hasWifi = /wi-?fi/.test(blob);
    if (has5g && !hasWifi) return false;
  } else if (connectivity === "lte") {
    const hasLte = /\blte\b|\bcellular\b|\b4g\b/.test(blob);
    const bluetoothOnly =
      /bluetooth/.test(blob) && !hasLte && !/\b5g\b/.test(blob);
    if (bluetoothOnly) return false;
  } else if (connectivity === "bluetooth") {
    const hasLte = /\blte\b/.test(blob);
    const hasBt = /bluetooth|\bbt\b/.test(blob);
    if (hasLte && !hasBt) return false;
  }

  return true;
}

/** Infer what variant the listing actually describes (for nearest badges). */
export function inferMatchedVariant(
  title: string,
  link: string,
  requested: VariantFilter = {},
): MatchedVariant {
  const blob = `${title} ${link}`.toLowerCase();
  const matched: MatchedVariant = {};

  const storageHit = STORAGE_TOKENS.find((token) => blob.includes(token));
  if (storageHit) {
    matched.storage = storageHit.replace("gb", "GB").replace("tb", "TB");
  } else if (requested.storage) {
    matched.storage = requested.storage;
  }

  if (/\b5g\b/.test(blob)) {
    matched.connectivity = "5G";
  } else if (/\blte\b/.test(blob)) {
    matched.connectivity = "LTE";
  } else if (/wi-?fi/.test(blob)) {
    matched.connectivity = "Wi-Fi";
  } else if (/bluetooth/.test(blob)) {
    matched.connectivity = "Bluetooth";
  } else if (requested.connectivity) {
    matched.connectivity = requested.connectivity;
  }

  const sizeMm = blob.match(/(\d{2})\s?mm/);
  if (sizeMm) {
    matched.size = `${sizeMm[1]}mm`;
  } else if (requested.size) {
    matched.size = requested.size;
  }

  if (requested.color) {
    const color = requested.color.toLowerCase();
    if (blob.includes(color)) matched.color = requested.color;
  }

  return matched;
}

function normalizeSize(size: string): string | null {
  const m = size.toLowerCase().match(/(\d{2})\s?mm/);
  if (m) return m[1];
  if (/^\d{1,2}$/.test(size.trim())) return null; // ring sizes — don't use mm rule
  return null;
}

export function prefilterListings(
  listings: RawListing[],
  product: Product,
  variant: VariantFilter = {},
  opts: {
    mode?: VariantMatchMode;
    matchQuality?: MatchQuality;
  } = {},
): FilteredListing[] {
  const mode = opts.mode ?? "exact";
  const matchQuality =
    opts.matchQuality ?? (mode === "nearest" ? "nearest" : "exact");
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

    const missingToken = product.modelTokens.some(
      (t) => !titleLower.includes(t.toLowerCase()),
    );
    if (missingToken) continue;

    if (!matchesVariant(listing.title, listing.link, variant, mode)) continue;

    const retailerId = matchRetailerId(listing.source);
    if (!retailerId) continue;

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

    const matchedVariant = inferMatchedVariant(
      listing.title,
      listing.link,
      variant,
    );

    out.push({
      ...listing,
      retailerId,
      condition,
      matchQuality,
      matchedVariant,
    });
  }

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
  const qualityRank = (q: MatchQuality) =>
    q === "exact" ? 0 : q === "carrier" ? 1 : 2;
  const qa = qualityRank(a.matchQuality);
  const qb = qualityRank(b.matchQuality);
  if (qa !== qb) return qa < qb;

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

/** Merge buckets: keep better matchQuality per retailer. */
export function mergeFilteredByQuality(
  ...groups: FilteredListing[][]
): FilteredListing[] {
  const best = new Map<RetailerId, FilteredListing>();
  for (const group of groups) {
    for (const item of group) {
      const prev = best.get(item.retailerId);
      if (!prev || isPreferredListing(item, prev)) {
        best.set(item.retailerId, item);
      }
    }
  }
  return Array.from(best.values());
}
