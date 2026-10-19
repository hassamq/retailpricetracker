import { getProduct, buildSearchQuery } from "@/data/products";
import { cache, cacheKey, PRICE_CACHE_TTL_MS } from "@/lib/cache";
import type { PriceSource } from "@/lib/store";
import {
  CARRIER_RETAILER_IDS,
  getRetailer,
  isCellularConnectivity,
  isGoogleShoppingAggregatorUrl,
  isUsableListingUrl,
  listingBelongsToRetailer,
  matchRetailerId,
  NATIONAL_RETAILER_IDS,
  retailersForVariant,
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
import {
  mergeFilteredByQuality,
  prefilterListings,
  uniqueRetailerCount,
  type FilteredListing,
} from "./prefilter";
import { buildNearestVariant } from "./variant-fallback";
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
const MAX_CARRIER_TARGETS = 3;
const MAX_NEAREST_TARGETS = 4;

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
  const cellular = isCellularConnectivity(input.variant.connectivity);

  let carrierRaw: RawListing[] = [];
  let nearestRaw: RawListing[] = [];

  if (!useMock) {
    // 1) SerpApi Google Shopping (primary multi-retailer live path)
    if (serpApiKey) {
      try {
        const shopping = await fetchGoogleShopping(query, serpApiKey);
        serpCalls += 1;
        listings = shopping.listings;
        if (listings.length) source = "live";

        // Limit catalog expansion — each call is slow and often empty;
        // prefer keeping broad shopping rows for nearest fills.
        const catalogIds = pickShoppingProductIds(
          shopping.data,
          {
            modelTokens: product.modelTokens,
            excludeKeywords: product.excludeKeywords,
            storage: input.variant.storage,
            connectivity: input.variant.connectivity,
          },
          1,
        );
        for (const catalogId of catalogIds) {
          if (serpCalls >= MAX_SERP_CALLS) break;
          try {
            const stores = await fetchProductStoreOffers(
              catalogId,
              serpApiKey,
            );
            serpCalls += 2;
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

        let exactFiltered = prefilterListings(
          listings,
          product,
          input.variant,
          { mode: "exact", matchQuality: "exact" },
        );

        if (
          uniqueRetailerCount(exactFiltered) < MIN_LIVE_RETAILERS &&
          serpCalls < MAX_SERP_CALLS
        ) {
          const token = listings.find((l) => l.productToken)?.productToken;
          if (token) {
            try {
              const immersive = await fetchImmersiveProduct(token, serpApiKey);
              serpCalls += 1;
              listings = [...immersive.listings, ...listings];
              exactFiltered = prefilterListings(
                listings,
                product,
                input.variant,
                { mode: "exact", matchQuality: "exact" },
              );
            } catch (e) {
              liveError =
                e instanceof Error
                  ? e.message
                  : "Immersive product fetch failed";
            }
          }
        }

        // Exact targeted fill for missing nationals
        exactFiltered = prefilterListings(listings, product, input.variant, {
          mode: "exact",
          matchQuality: "exact",
        });
        const haveExact = new Set(exactFiltered.map((l) => l.retailerId));
        const missingExact = NATIONAL_RETAILER_IDS.filter(
          (id) => !haveExact.has(id),
        ).map((id) => ({
          retailerId: id,
          searchName: getRetailer(id).displayName,
        }));
        if (missingExact.length && serpCalls < MAX_SERP_CALLS + 12) {
          try {
            const targeted = await fetchRetailerTargetedOffers(
              query,
              missingExact,
              serpApiKey,
              input.variant,
              { mode: "exact", expandStores: false },
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

        // Carrier tier (cellular variants only)
        if (cellular && serpCalls < MAX_SERP_CALLS + 8 + MAX_CARRIER_TARGETS) {
          const carrierQueries = CARRIER_RETAILER_IDS.slice(
            0,
            MAX_CARRIER_TARGETS,
          ).map((id) => ({
            retailerId: id,
            searchName: getRetailer(id).displayName,
          }));
          try {
            carrierRaw = await fetchRetailerTargetedOffers(
              query,
              carrierQueries,
              serpApiKey,
              input.variant,
              { mode: "exact", expandStores: false },
            );
            if (carrierRaw.length) source = "live";
          } catch (e) {
            console.warn(
              "[pricing] carrier fill failed:",
              e instanceof Error ? e.message : e,
            );
          }
        }

        // Nearest tier for still-missing nationals (any category)
        const afterExact = prefilterListings(
          listings,
          product,
          input.variant,
          { mode: "exact", matchQuality: "exact" },
        );
        const haveNationals = new Set(afterExact.map((l) => l.retailerId));
        const missingNearest = NATIONAL_RETAILER_IDS.filter(
          (id) => id !== "samsung" && !haveNationals.has(id),
        ).slice(0, MAX_NEAREST_TARGETS);

        if (
          missingNearest.length &&
          serpCalls < MAX_SERP_CALLS + 12 + MAX_CARRIER_TARGETS + 12
        ) {
          const { variant: nearestVariant } = buildNearestVariant(
            product,
            input.variant,
          );
          const nearestQuery = buildSearchQuery(product, nearestVariant);
          try {
            nearestRaw = await fetchRetailerTargetedOffers(
              nearestQuery,
              missingNearest.map((id) => ({
                retailerId: id,
                searchName: getRetailer(id).displayName,
              })),
              serpApiKey,
              nearestVariant,
              { mode: "nearest", expandStores: false },
            );
            if (nearestRaw.length) source = "live";
          } catch (e) {
            console.warn(
              "[pricing] nearest variant fill failed:",
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

    // 2) Verified retailer pages — fill any remaining gaps
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

    // 3) Gemini grounding for still-missing nationals (exact + nearest query)
    if (isGenAIConfigured()) {
      const covered = new Set(
        [
          ...prefilterListings(listings, product, input.variant, {
            mode: "exact",
            matchQuality: "exact",
          }),
          ...prefilterListings(nearestRaw, product, buildNearestVariant(product, input.variant).variant, {
            mode: "nearest",
            matchQuality: "nearest",
          }),
        ].map((l) => l.retailerId),
      );
      const stillMissing = NATIONAL_RETAILER_IDS.filter((id) => !covered.has(id));
      if (stillMissing.length) {
        try {
          const nearestQ = buildSearchQuery(
            product,
            buildNearestVariant(product, input.variant).variant,
          );
          const groundedExact = await groundingPriceSearch(product, query);
          const groundedNearest =
            nearestQ !== query
              ? await groundingPriceSearch(product, nearestQ)
              : [];
          const grounded = [...groundedExact, ...groundedNearest].filter(
            (raw) => {
              const id = matchRetailerId(raw.source);
              return Boolean(id) && stillMissing.includes(id!);
            },
          );
          if (grounded.length) {
            listings = [...listings, ...grounded];
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
  }

  // 4) Fixtures / generated mock (demo never hard-fails)
  if (!listings.length && !carrierRaw.length && !nearestRaw.length) {
    const fixtureName = `shopping-${product.id}`;
    const fixture =
      (await loadFixture<SerpShoppingResponse>(fixtureName)) ??
      (await ensureDefaultFixture(product.id));
    if (fixture) {
      listings = parseShoppingResults(fixture);
      source = useMock ? "mock" : "fixture";
    }
  }

  if (!listings.length && !carrierRaw.length && !nearestRaw.length) {
    listings = generateMockListings(product);
    source = "mock";
  }

  const exactFiltered = prefilterListings(listings, product, input.variant, {
    mode: "exact",
    matchQuality: "exact",
  });

  const carrierFiltered = prefilterListings(
    carrierRaw,
    product,
    input.variant,
    { mode: "exact", matchQuality: "carrier" },
  ).filter((l) => CARRIER_RETAILER_IDS.includes(l.retailerId));

  const { variant: nearestVariant } = buildNearestVariant(
    product,
    input.variant,
  );
  // Prefer dedicated nearest Serp hits; also reuse main shopping rows as nearest
  const nearestFiltered = mergeFilteredByQuality(
    prefilterListings(nearestRaw, product, nearestVariant, {
      mode: "nearest",
      matchQuality: "nearest",
    }),
    prefilterListings(listings, product, nearestVariant, {
      mode: "nearest",
      matchQuality: "nearest",
    }),
  ).filter((l) => {
    if (!NATIONAL_RETAILER_IDS.includes(l.retailerId)) return false;
    return !exactFiltered.some((e) => e.retailerId === l.retailerId);
  });

  let filtered: FilteredListing[] = mergeFilteredByQuality(
    exactFiltered,
    carrierFiltered,
    nearestFiltered,
  );

  if (!filtered.length) {
    filtered = prefilterListings(
      generateMockListings(product),
      product,
      input.variant,
      { mode: "exact", matchQuality: "exact" },
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
    variant: input.variant,
    matrixRetailers: retailersForVariant(input.variant),
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

function sanitizeOfferUrls<
  T extends { url: string; retailerId: string },
>(offers: T[]): T[] {
  return offers.map((offer) => {
    const url = offer.url?.trim() ?? "";
    if (
      isUsableListingUrl(url) &&
      !isGoogleShoppingAggregatorUrl(url) &&
      listingBelongsToRetailer(offer.retailerId as RetailerId, url)
    ) {
      return offer;
    }
    return { ...offer, url: "" };
  });
}

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
      matchQuality: o.matchQuality ?? "exact",
      matchedVariant: o.matchedVariant ?? null,
    }));

  const { offers, bestValue, verdict } = calculateOffers(extracted, {
    productId: product.id,
    msrp: product.msrp,
    storeId: input.storeId ?? null,
    includeGiftCards: input.includeGiftCards ?? true,
    includeTradeIn: input.includeTradeIn ?? false,
    haveMemberships: input.haveMemberships ?? true,
    promoDiscount: input.promoDiscount ?? 0,
    variant: input.variant,
    matrixRetailers: retailersForVariant(input.variant),
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
