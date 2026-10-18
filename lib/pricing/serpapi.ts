import { promises as fs } from "fs";
import path from "path";
import {
  isGoogleShoppingAggregatorUrl as isAggregatorUrl,
  isUsableListingUrl,
} from "@/data/retailers";
import {
  matchesVariant,
  type VariantFilter,
} from "./prefilter";
import type { RawListing } from "./types";

const SERPAPI_BASE = "https://serpapi.com/search.json";
const TIMEOUT_MS = 12_000;
const FIXTURE_DIR = path.join(process.cwd(), "fixtures", "serpapi");

export type SerpShoppingResponse = {
  shopping_results?: Array<Record<string, unknown>>;
  error?: string;
};

export type SerpImmersiveResponse = {
  product_results?: {
    title?: string;
    page_token?: string;
    stores?: Array<Record<string, unknown>>;
    serpapi_immersive_product_link?: string;
  };
  error?: string;
};

export type SerpProductResponse = {
  product_results?: {
    title?: string;
    page_token?: string;
    stores?: Array<Record<string, unknown>>;
    serpapi_immersive_product_link?: string;
  };
  error?: string;
};

export class SerpApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SerpApiError";
  }
}

async function fetchWithTimeout(
  url: string,
  timeoutMs = TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

export async function saveFixture(
  name: string,
  data: unknown,
): Promise<void> {
  try {
    await fs.mkdir(FIXTURE_DIR, { recursive: true });
    const file = path.join(FIXTURE_DIR, `${name}.json`);
    await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
  } catch {
    // non-fatal
  }
}

export async function loadFixture<T>(name: string): Promise<T | null> {
  try {
    const file = path.join(FIXTURE_DIR, `${name}.json`);
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Prefer a direct merchant URL over Google Shopping aggregator pages. */
export function pickMerchantLink(row: Record<string, unknown>): string {
  const link = String(row.link ?? "");
  const productLink = String(row.product_link ?? "");
  if (link && !isGoogleShoppingAggregatorUrl(link)) return link;
  if (productLink && !isGoogleShoppingAggregatorUrl(productLink)) {
    return productLink;
  }
  return link || productLink || "";
}

export function isGoogleShoppingAggregatorUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (!host.includes("google.")) return false;
    return (
      url.includes("ibp=oshop") ||
      url.includes("/shopping") ||
      url.includes("prds=")
    );
  } catch {
    return false;
  }
}

export function parseShoppingResults(
  data: SerpShoppingResponse,
): RawListing[] {
  const results = data.shopping_results ?? [];
  return results.map((r) => {
    const extensions = Array.isArray(r.extensions)
      ? (r.extensions as string[])
      : [];
    return {
      title: String(r.title ?? ""),
      source: String(r.source ?? ""),
      price:
        typeof r.extracted_price === "number"
          ? r.extracted_price
          : parsePrice(r.price),
      oldPrice:
        typeof r.extracted_old_price === "number"
          ? r.extracted_old_price
          : parsePrice(r.old_price),
      link: pickMerchantLink(r),
      extensions,
      delivery: r.delivery ? String(r.delivery) : null,
      thumbnail: r.thumbnail ? String(r.thumbnail) : null,
      productToken: r.immersive_product_page_token
        ? String(r.immersive_product_page_token)
        : null,
      secondHandCondition: r.second_hand_condition
        ? String(r.second_hand_condition)
        : null,
    };
  });
}

type ProductPickOpts = {
  modelTokens: string[];
  excludeKeywords?: string[];
  storage?: string;
  connectivity?: string;
};

function scoreShoppingProduct(
  r: Record<string, unknown>,
  opts: ProductPickOpts,
): number | null {
  const id = r.product_id ? String(r.product_id) : "";
  if (!id) return null;
  const title = String(r.title ?? "").toLowerCase();
  if (!opts.modelTokens.every((t) => title.includes(t.toLowerCase()))) {
    return null;
  }
  if (opts.excludeKeywords?.some((kw) => title.includes(kw.toLowerCase()))) {
    return null;
  }
  let score = 10;
  if (opts.storage && title.includes(opts.storage.toLowerCase())) score += 5;
  if (
    opts.connectivity &&
    title.includes(opts.connectivity.toLowerCase().replace("-", ""))
  ) {
    score += 5;
  }
  if (opts.connectivity?.toLowerCase() === "wi-fi") {
    // Hard-reject cellular-only catalog rows for Wi-Fi shoppers
    if (/\b5g\b/i.test(title) && !/wi-?fi/i.test(title)) return null;
    if (/t-mobile|verizon|at&t|unlocked carrier/i.test(title)) score -= 4;
    if (/wi-?fi/i.test(title)) score += 3;
  }
  if (opts.connectivity?.toLowerCase() === "5g") {
    // Hard-reject Wi-Fi-only catalog rows for 5G shoppers
    if (/wi-?fi/i.test(title) && !/\b5g\b/i.test(title)) return null;
    if (/5g/i.test(title)) score += 4;
  }
  if (r.multiple_sources === true) score += 2;
  if (r.immersive_product_page_token || r.serpapi_immersive_product_api) {
    score += 1;
  }
  return score;
}

/**
 * Pick the Google catalog product_id that best matches our configured product/variant.
 * Newer Shopping results often omit per-store links until this id is expanded.
 */
export function pickShoppingProductId(
  data: SerpShoppingResponse,
  opts: ProductPickOpts,
): string | null {
  return pickShoppingProductIds(data, opts, 1)[0] ?? null;
}

/** Top-N catalog ids so we can merge stores across close variant matches. */
export function pickShoppingProductIds(
  data: SerpShoppingResponse,
  opts: ProductPickOpts,
  limit = 3,
): string[] {
  const scored: Array<{ id: string; score: number }> = [];
  const seen = new Set<string>();

  for (const r of data.shopping_results ?? []) {
    const id = r.product_id ? String(r.product_id) : "";
    if (!id || seen.has(id)) continue;
    const score = scoreShoppingProduct(r, opts);
    if (score == null) continue;
    seen.add(id);
    scored.push({ id, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.id);
}

export function parseImmersiveStores(
  data: SerpImmersiveResponse,
): RawListing[] {
  const stores = data.product_results?.stores ?? [];
  const title = data.product_results?.title ?? "";
  return stores.map((s) => ({
    title: String(s.title ?? title),
    source: String(s.name ?? ""),
    price:
      typeof s.extracted_price === "number"
        ? s.extracted_price
        : parsePrice(s.price),
    oldPrice:
      typeof s.extracted_original_price === "number"
        ? s.extracted_original_price
        : parsePrice(s.original_price),
    link: String(s.link ?? ""),
    extensions: [
      ...(Array.isArray(s.details_and_offers)
        ? (s.details_and_offers as string[])
        : []),
      ...(s.tag ? [String(s.tag)] : []),
      ...(s.discount ? [String(s.discount)] : []),
    ],
    delivery: s.shipping ? String(s.shipping) : null,
    thumbnail: null,
    productToken: null,
    secondHandCondition: null,
  }));
}

function parsePrice(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  const n = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export async function fetchGoogleShopping(
  query: string,
  apiKey: string,
): Promise<{ data: SerpShoppingResponse; listings: RawListing[] }> {
  const params = new URLSearchParams({
    engine: "google_shopping",
    q: query,
    gl: "us",
    hl: "en",
    location: "United States",
    api_key: apiKey,
  });
  const res = await fetchWithTimeout(`${SERPAPI_BASE}?${params}`);
  const data = (await res.json()) as SerpShoppingResponse;

  if (data.error) {
    throw new SerpApiError(data.error);
  }

  // Only persist successful shopping payloads (never auth/error JSON).
  if ((data.shopping_results?.length ?? 0) > 0) {
    await saveFixture(`shopping-${slugify(query)}-${Date.now()}`, data);
  }

  return { data, listings: parseShoppingResults(data) };
}

export async function fetchImmersiveProduct(
  pageToken: string,
  apiKey: string,
): Promise<{ data: SerpImmersiveResponse; listings: RawListing[] }> {
  const params = new URLSearchParams({
    engine: "google_immersive_product",
    page_token: pageToken,
    more_stores: "true",
    api_key: apiKey,
  });
  const res = await fetchWithTimeout(`${SERPAPI_BASE}?${params}`, 20_000);
  const data = (await res.json()) as SerpImmersiveResponse;
  if (data.error) {
    throw new SerpApiError(data.error);
  }
  return { data, listings: parseImmersiveStores(data) };
}

/**
 * Expand a Google Shopping catalog product_id into per-store offers with
 * direct retailer product URLs (the links View buttons should open).
 */
export async function fetchProductStoreOffers(
  productId: string,
  apiKey: string,
): Promise<{ listings: RawListing[]; title: string }> {
  const params = new URLSearchParams({
    engine: "google_product",
    product_id: productId,
    gl: "us",
    hl: "en",
    api_key: apiKey,
  });
  const res = await fetchWithTimeout(`${SERPAPI_BASE}?${params}`, 20_000);
  const data = (await res.json()) as SerpProductResponse;
  if (data.error) {
    throw new SerpApiError(data.error);
  }

  const title = data.product_results?.title ?? "";
  let listings = parseImmersiveStores(data as SerpImmersiveResponse);

  const pageToken = data.product_results?.page_token;
  if (pageToken) {
    try {
      const immersive = await fetchImmersiveProduct(pageToken, apiKey);
      if (immersive.listings.length >= listings.length) {
        listings = immersive.listings;
      } else if (immersive.listings.length) {
        listings = [...listings, ...immersive.listings];
      }
    } catch {
      // keep google_product stores
    }
  }

  // Prefer catalog title so model-token prefilter matches truncated store titles
  listings = listings.map((l) => ({
    ...l,
    title: title || l.title,
  }));

  return { listings, title };
}

/**
 * For retailers still missing after catalog expansion, run a targeted Shopping
 * query ("… Best Buy") and keep a matching first-party offer with a PDP link.
 */
export async function fetchRetailerTargetedOffers(
  query: string,
  retailerQueries: Array<{ retailerId: string; searchName: string }>,
  apiKey: string,
  variant: VariantFilter = {},
): Promise<RawListing[]> {
  const out: RawListing[] = [];

  for (const { retailerId, searchName } of retailerQueries) {
    try {
      const shopping = await fetchGoogleShopping(
        `${query} ${searchName}`,
        apiKey,
      );
      const match = (shopping.data.shopping_results ?? []).find((r) => {
        const source = String(r.source ?? "").toLowerCase();
        const title = String(r.title ?? "");
        const link = pickMerchantLink(r);
        if (!sourceMatchesRetailer(source, retailerId)) return false;
        return matchesVariant(title, link, variant);
      });

      if (!match) continue;

      const productId = match.product_id ? String(match.product_id) : "";
      if (productId) {
        const stores = await fetchProductStoreOffers(productId, apiKey);
        const fromStores = stores.listings.find((l) => {
          if (!sourceMatchesRetailer(l.source.toLowerCase(), retailerId)) {
            return false;
          }
          return matchesVariant(
            l.title || String(match.title ?? query),
            l.link,
            variant,
          );
        });
        if (fromStores && isUsableListingUrl(fromStores.link)) {
          out.push({
            ...fromStores,
            title: fromStores.title || String(match.title ?? query),
          });
          continue;
        }
      }

      const link = pickMerchantLink(match);
      const price =
        typeof match.extracted_price === "number"
          ? match.extracted_price
          : parsePrice(match.price);
      if (price == null || !isUsableListingUrl(link)) continue;
      if (isAggregatorUrl(link)) continue;
      if (!matchesVariant(String(match.title ?? query), link, variant)) {
        continue;
      }

      out.push({
        title: String(match.title ?? query),
        source: String(match.source ?? searchName),
        price,
        oldPrice:
          typeof match.extracted_old_price === "number"
            ? match.extracted_old_price
            : parsePrice(match.old_price),
        link,
        extensions: Array.isArray(match.extensions)
          ? (match.extensions as string[])
          : [],
        delivery: match.delivery ? String(match.delivery) : null,
        thumbnail: null,
        productToken: null,
        secondHandCondition: null,
      });
    } catch (e) {
      console.warn(
        `[pricing] targeted search failed for ${retailerId}:`,
        e instanceof Error ? e.message : e,
      );
    }
  }

  return out;
}

function sourceMatchesRetailer(source: string, retailerId: string): boolean {
  if (retailerId === "bestbuy") {
    return source.includes("best buy") || source.includes("bestbuy");
  }
  if (retailerId === "amazon") {
    return source === "amazon" || source.startsWith("amazon.com");
  }
  if (retailerId === "walmart") {
    return source === "walmart" || source === "walmart.com";
  }
  if (retailerId === "target") return source.includes("target");
  if (retailerId === "costco") return source.includes("costco");
  if (retailerId === "samsung") return source.includes("samsung");
  return false;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60);
}
