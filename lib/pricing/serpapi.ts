import { promises as fs } from "fs";
import path from "path";
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
    stores?: Array<Record<string, unknown>>;
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
      link: String(r.product_link ?? r.link ?? ""),
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
  const res = await fetchWithTimeout(`${SERPAPI_BASE}?${params}`);
  const data = (await res.json()) as SerpImmersiveResponse;
  if (data.error) {
    throw new SerpApiError(data.error);
  }
  return { data, listings: parseImmersiveStores(data) };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60);
}
