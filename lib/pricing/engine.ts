import { getProduct, buildSearchQuery } from "@/data/products";
import { cache, cacheKey, PRICE_CACHE_TTL_MS } from "@/lib/cache";
import type { PriceSource } from "@/lib/store";
import {
  getRetailer,
  isGoogleShoppingAggregatorUrl,
  isUsableListingUrl,
  matchRetailerId,
  type RetailerId,
} from "@/data/retailers";
import {
  fetchGoogleShopping,
  fetchImmersiveProduct,
  fetchProductStoreOffers,
  fetchRetailerTargetedOffers,
  loadFixture,
  parseShoppingResults,
  pickShoppingProductIds,
  saveFixture,
  SerpApiError,
  type SerpShoppingResponse,
} from "./serpapi";
import { prefilterListings, uniqueRetailerCount } from "./prefilter";
import { normalizeWithGemini } from "./gemini-normalize";
import { calculateOffers } from "./calculate";
import { generateMockListings, buildFixtureShoppingPayload } from "./mock-data";
import { groundingPriceSearch } from "./grounding";
import { fetchRetailerLiveListings } from "./retailer-live";
import { isGenAIConfigured } from "@/lib/ai/client";
import type { PriceComparisonResult, RawListing } from "./types";

export type EngineInput = {
  productId: string;
  variant: Record<string, string>;
  storeId?: RetailerId | null;
  includeGiftCards?: boolean;
  includeTradeIn?: boolean;
  haveMemberships?: boolean;
  promoDiscount?: number;
  forceRefresh?: boolean;
};

const MIN_LIVE_RETAILERS = 4;
const MAX_SERP_CALLS = 4;

export async function runPriceComparison(
  input: EngineInput,
): Promise<PriceComparisonResult> {
  const product = getProduct(input.productId);
  if (!product) {
    throw new Error(`Unknown product: ${input.productId}`);
  }

  const key = cacheKey(input.productId, input.variant);

  if (!input.forceRefresh) {
    const cached = await cache.get<PriceComparisonResult>(key);
    if (cached) {
      return recomputeFromCached(cached, input);
    }
  }

  const query = buildSearchQuery(product, input.variant);
  let listings: RawListing[] = [];
  let source: PriceSource = "mock";
  let liveError: string | null = null;
  let serpCalls = 0;
  const serpApiKey = process.env.SERPAPI_KEY?.trim() ?? "";
  const useMock = process.env.USE_MOCK_DATA === "true";

  if (!useMock) {
    // 1) SerpApi Google Shopping (primary multi-retailer live path)
    if (serpApiKey) {
      try {
        const shopping = await fetchGoogleShopping(query, serpApiKey);
        serpCalls += 1;
        listings = shopping.listings;
        if (listings.length) source = "live";

        // Expand top catalog matches → per-store offers with direct PDP links
        const catalogIds = pickShoppingProductIds(
          shopping.data,
          {
            modelTokens: product.modelTokens,
            excludeKeywords: product.excludeKeywords,
            storage: input.variant.storage,
            connectivity: input.variant.connectivity,
          },
          2,
        );
        for (const catalogId of catalogIds) {
          if (serpCalls >= MAX_SERP_CALLS) break;
          try {
            const stores = await fetchProductStoreOffers(
              catalogId,
              serpApiKey,
            );
            serpCalls += 2; // google_product (+ optional immersive)
            if (stores.listings.length) {
              listings = [...stores.listings, ...listings];
              source = "live";
            }
          } catch (e) {
            liveError =
              e instanceof Error
                ? e.message
                : "Product store expansion failed";
            console.warn("[pricing] product stores failed:", liveError);
          }
        }

        let filtered = prefilterListings(listings, product, input.variant);

        if (
          uniqueRetailerCount(filtered) < MIN_LIVE_RETAILERS &&
          serpCalls < MAX_SERP_CALLS
        ) {
          const token = listings.find((l) => l.productToken)?.productToken;
          if (token) {
            try {
              const immersive = await fetchImmersiveProduct(token, serpApiKey);
              serpCalls += 1;
              listings = [...immersive.listings, ...listings];
              filtered = prefilterListings(listings, product, input.variant);
            } catch (e) {
              liveError =
                e instanceof Error
                  ? e.message
                  : "Immersive product fetch failed";
            }
          }
        }

        // Targeted retailer searches for still-missing national retailers
        filtered = prefilterListings(listings, product, input.variant);
        const have = new Set(filtered.map((l) => l.retailerId));
        const missing = (
          ["bestbuy", "amazon", "target", "costco", "walmart", "samsung"] as const
        )
          .filter((id) => !have.has(id))
          .slice(0, 4)
          .map((id) => ({
            retailerId: id,
            searchName: getRetailer(id).displayName,
          }));
        if (missing.length && serpCalls < MAX_SERP_CALLS + 8) {
          try {
            const targeted = await fetchRetailerTargetedOffers(
              query,
              missing,
              serpApiKey,
              input.variant,
            );
            if (targeted.length) {
              listings = [...listings, ...targeted];
              source = "live";
            }
          } catch (e) {
            console.warn(
              "[pricing] targeted retailer fill failed:",
              e instanceof Error ? e.message : e,
            );
          }
        }
      } catch (e) {
        liveError =
          e instanceof SerpApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "SerpApi request failed";
        console.warn("[pricing] SerpApi live failed:", liveError);
        listings = [];
      }
    } else {
      liveError = "SERPAPI_KEY not set";
    }

    // 2) Verified retailer pages/APIs — fill gaps; prefer these over Serp when both exist
    if (
      uniqueRetailerCount(
        prefilterListings(listings, product, input.variant),
      ) < MIN_LIVE_RETAILERS
    ) {
      try {
        const pageListings = await fetchRetailerLiveListings(product);
        if (pageListings.length) {
          listings = mergePreferringVerified(listings, pageListings);
          source = "live";
        }
      } catch (e) {
        console.warn(
          "[pricing] retailer page fetch failed:",
          e instanceof Error ? e.message : e,
        );
      }
    }

    // 3) Gemini grounding for remaining retailers (never overrides verified/Serp)
    if (
      uniqueRetailerCount(
        prefilterListings(listings, product, input.variant),
      ) < MIN_LIVE_RETAILERS &&
      isGenAIConfigured()
    ) {
      try {
        const grounded = await groundingPriceSearch(product, query);
        const have = new Set(
          prefilterListings(listings, product, input.variant).map(
            (l) => l.retailerId,
          ),
        );
        const missing = grounded.filter((raw) => {
          const id = matchRetailerId(raw.source);
          return Boolean(id) && !have.has(id!);
        });
        if (missing.length) {
          listings = [...listings, ...missing];
          source = "live";
        } else if (!listings.length && !liveError) {
          liveError = "Grounding returned no usable retailer prices";
        }
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Gemini grounding request failed";
        console.warn("[pricing] grounding failed:", msg);
        if (!listings.length) liveError = msg;
      }
    }
  }

  // 4) Fixtures / generated mock (demo never hard-fails)
  if (!listings.length) {
    const fixtureName = `shopping-${product.id}`;
    const fixture =
      (await loadFixture<SerpShoppingResponse>(fixtureName)) ??
      (await ensureDefaultFixture(product.id));
    if (fixture) {
      listings = parseShoppingResults(fixture);
      source = useMock ? "mock" : "fixture";
    }
  }

  if (!listings.length) {
    listings = generateMockListings(product);
    source = "mock";
  }

  let filtered = prefilterListings(listings, product, input.variant);
  if (!filtered.length) {
    filtered = prefilterListings(
      generateMockListings(product),
      product,
      input.variant,
    );
    if (source === "live") source = "mock";
  }
  const extracted = sanitizeOfferUrls(await normalizeWithGemini(filtered));

  const { offers, bestValue, verdict } = calculateOffers(extracted, {
    productId: product.id,
    msrp: product.msrp,
    storeId: input.storeId ?? null,
    includeGiftCards: input.includeGiftCards ?? true,
    includeTradeIn: input.includeTradeIn ?? false,
    haveMemberships: input.haveMemberships ?? true,
    promoDiscount: input.promoDiscount ?? 0,
  });

  const result: PriceComparisonResult = {
    productId: product.id,
    variant: input.variant,
    offers,
    bestValue,
    verdict,
    source,
    updatedAt: new Date().toISOString(),
    resolvedRetailers: offers
      .filter((o) => o.listed)
      .map((o) => o.retailerId),
  };

  if (liveError && source !== "live") {
    console.warn(
      `[pricing] serving ${source} data; live unavailable (${liveError})`,
    );
  }

  await cache.set(key, result, PRICE_CACHE_TTL_MS);
  return result;
}

function sanitizeOfferUrls<T extends { url: string }>(offers: T[]): T[] {
  return offers.map((offer) => {
    const url = offer.url?.trim() ?? "";
    if (
      isUsableListingUrl(url) &&
      !isGoogleShoppingAggregatorUrl(url)
    ) {
      return offer;
    }
    return { ...offer, url: "" };
  });
}

/** Prefer later (verified page) listings when the same retailer appears twice. */
function mergePreferringVerified(
  existing: RawListing[],
  verified: RawListing[],
): RawListing[] {
  const verifiedIds = new Set(
    verified
      .map((l) => matchRetailerId(l.source))
      .filter((id): id is RetailerId => Boolean(id)),
  );
  const kept = existing.filter((l) => {
    const id = matchRetailerId(l.source);
    return !id || !verifiedIds.has(id);
  });
  return [...kept, ...verified];
}

function recomputeFromCached(
  cached: PriceComparisonResult,
  input: EngineInput,
): PriceComparisonResult {
  const product = getProduct(input.productId);
  if (!product) return { ...cached, source: "cache" };

  const extracted = cached.offers
    .filter((o) => o.listed)
    .map((o) => ({
      retailerId: o.retailerId,
      title: o.title,
      basePrice: o.basePrice,
      instantSavings: o.instantSavings,
      couponCode: o.couponCode,
      couponValue: o.couponValue,
      giftCardValue: o.giftCardValue,
      membershipRequired: o.membershipRequired,
      condition: o.condition,
      inStock: o.inStock,
      url: o.url,
      notes: o.notes,
    }));

  const { offers, bestValue, verdict } = calculateOffers(extracted, {
    productId: product.id,
    msrp: product.msrp,
    storeId: input.storeId ?? null,
    includeGiftCards: input.includeGiftCards ?? true,
    includeTradeIn: input.includeTradeIn ?? false,
    haveMemberships: input.haveMemberships ?? true,
    promoDiscount: input.promoDiscount ?? 0,
  });

  return {
    ...cached,
    offers,
    bestValue,
    verdict,
    source: "cache",
  };
}

async function ensureDefaultFixture(productId: string) {
  const product = getProduct(productId);
  if (!product) return null;
  const payload = buildFixtureShoppingPayload(product);
  await saveFixture(`shopping-${product.id}`, payload);
  return payload as SerpShoppingResponse;
}
