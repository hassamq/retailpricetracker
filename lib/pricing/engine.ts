import { getProduct, buildSearchQuery } from "@/data/products";
import { cache, cacheKey, PRICE_CACHE_TTL_MS } from "@/lib/cache";
import type { PriceSource } from "@/lib/store";
import { matchRetailerId, type RetailerId } from "@/data/retailers";
import {
  loadFixture,
  parseShoppingResults,
  saveFixture,
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
  const useMock = process.env.USE_MOCK_DATA === "true";

  if (!useMock) {
    // 1) Verified retailer APIs / product pages (most accurate — no SerpApi)
    try {
      const pageListings = await fetchRetailerLiveListings(product);
      if (pageListings.length) {
        listings = pageListings;
        source = "live";
      }
    } catch (e) {
      console.warn(
        "[pricing] retailer page fetch failed:",
        e instanceof Error ? e.message : e,
      );
    }

    // 2) Gemini grounding fills retailers not already verified (never overrides)
    if (
      uniqueRetailerCount(prefilterListings(listings, product)) <
        MIN_LIVE_RETAILERS &&
      isGenAIConfigured()
    ) {
      try {
        const grounded = await groundingPriceSearch(product, query);
        const verified = new Set(
          prefilterListings(listings, product).map((l) => l.retailerId),
        );
        const missing = grounded.filter((raw) => {
          const id = matchRetailerId(raw.source);
          return Boolean(id) && !verified.has(id!);
        });
        if (missing.length) {
          listings = [...listings, ...missing];
          source = "live";
        } else if (!listings.length) {
          liveError = "Grounding returned no usable retailer prices";
        }
      } catch (e) {
        liveError =
          e instanceof Error ? e.message : "Gemini grounding request failed";
        console.warn("[pricing] grounding failed:", liveError);
      }
    } else if (!listings.length && !isGenAIConfigured()) {
      liveError =
        "Gemini not configured (set GOOGLE_API_KEY) and no retailer pages matched";
    }
  }

  // 3) Fixtures / generated mock (demo never hard-fails)
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

  const filtered = prefilterListings(listings, product);
  const extracted = await normalizeWithGemini(
    filtered.length
      ? filtered
      : prefilterListings(generateMockListings(product), product),
  );

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
