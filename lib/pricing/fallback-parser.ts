import {
  isGoogleShoppingAggregatorUrl,
  isUsableListingUrl,
  listingBelongsToRetailer,
} from "@/data/retailers";
import type { FilteredListing } from "./prefilter";
import type { ExtractedOffer } from "./types";

/**
 * Deterministic mapping when Gemini is unavailable.
 * Coupon / gift-card fields stay null — never invent them.
 */
export function fallbackParse(
  listings: FilteredListing[],
): ExtractedOffer[] {
  return listings.map((listing) => {
    const basePrice = listing.price ?? 0;
    const old = listing.oldPrice ?? null;
    const instantSavings =
      old != null && old > basePrice
        ? Math.round((old - basePrice) * 100) / 100
        : 0;

    const membershipRequired = detectMembership(listing.extensions, listing.retailerId);
    const inStock = detectStock(listing.extensions, listing.delivery);
    const url =
      isUsableListingUrl(listing.link) &&
      !isGoogleShoppingAggregatorUrl(listing.link) &&
      listingBelongsToRetailer(listing.retailerId, listing.link)
        ? listing.link
        : "";

    return {
      retailerId: listing.retailerId,
      title: listing.title,
      basePrice,
      instantSavings,
      couponCode: null,
      couponValue: null,
      giftCardValue: null,
      membershipRequired,
      condition: listing.condition,
      inStock,
      url,
      notes: listing.extensions.slice(0, 2).join(" · ") || null,
      matchQuality: listing.matchQuality,
      matchedVariant: listing.matchedVariant,
    };
  });
}

function detectMembership(
  extensions: string[],
  retailerId: string,
): string | null {
  const blob = extensions.join(" ").toLowerCase();
  if (retailerId === "costco") return "Costco";
  if (/prime|amazon prime/.test(blob)) return "Prime";
  if (/walmart\+/.test(blob)) return "Walmart+";
  if (/target circle|circle offer/.test(blob)) return "Target Circle";
  if (/totaltech|my best buy/.test(blob)) return "Totaltech";
  return null;
}

function detectStock(
  extensions: string[],
  delivery: string | null | undefined,
): boolean | null {
  const blob = `${extensions.join(" ")} ${delivery ?? ""}`.toLowerCase();
  if (/out of stock|unavailable/.test(blob)) return false;
  if (/in stock|pickup|delivery|ships/.test(blob)) return true;
  return null;
}
