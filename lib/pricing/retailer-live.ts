import type { Product } from "@/data/products";
import type { RetailerId } from "@/data/retailers";
import type { RawListing } from "./types";

const TIMEOUT_MS = 10_000;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

/** Target Redsky public key embedded in target.com storefront requests. */
const TARGET_REDSKY_KEY = "ff457966e64d5e877fdbad070f276d18ecec4a01";
const TARGET_STORE_ID = "3991";

type LiveCatalogEntry = {
  samsungUrl?: string;
  targetTcin?: string;
  bestbuySku?: string;
  bestbuyUrl?: string;
  amazonAsin?: string;
  walmartItemId?: string;
};

/**
 * Known US product identifiers for live price lookups.
 * Prefer official / first-party listings over marketplace imports.
 */
const LIVE_CATALOG: Record<string, LiveCatalogEntry> = {
  "tab-s11-ultra": {
    samsungUrl:
      "https://www.samsung.com/us/tablets/galaxy-tab-s11/buy/galaxy-tab-s11-ultra-256gb-gray-wi-fi-sku-sm-x930nzaaxar/",
    targetTcin: "1009779791",
    bestbuySku: "11956847",
    bestbuyUrl:
      "https://www.bestbuy.com/product/samsung-galaxy-tab-s11-ultra-14-6-256gb-wi-fi-with-s-pen-gray/JJGRF39W23/sku/11956847",
  },
  "tab-s11": {
    samsungUrl:
      "https://www.samsung.com/us/tablets/galaxy-tab-s11/buy/galaxy-tab-s11-128gb-gray-wi-fi-sku-sm-x730nzaaxar/",
  },
  "tab-s11-plus": {
    samsungUrl: "https://www.samsung.com/us/tablets/galaxy-tab-s11/buy/",
  },
  "buds4-pro": {
    samsungUrl: "https://www.samsung.com/us/audio/galaxy-buds4-pro/",
  },
  "watch-ultra-2025": {
    samsungUrl: "https://www.samsung.com/us/watches/galaxy-watch-ultra/",
  },
  "galaxy-ring": {
    samsungUrl: "https://www.samsung.com/us/rings/galaxy-ring/",
  },
};

async function fetchText(
  url: string,
  init?: RequestInit,
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/json",
        "Accept-Language": "en-US,en;q=0.9",
        ...(init?.headers ?? {}),
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonLdPrices(html: string): Array<{
  price: number;
  currency?: string;
  availability?: string;
}> {
  const out: Array<{ price: number; currency?: string; availability?: string }> =
    [];
  const re =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    try {
      const data = JSON.parse(match[1]) as unknown;
      const stack: unknown[] = Array.isArray(data) ? [...data] : [data];
      while (stack.length) {
        const node = stack.pop();
        if (!node || typeof node !== "object") continue;
        if (Array.isArray(node)) {
          stack.push(...node);
          continue;
        }
        const obj = node as Record<string, unknown>;
        if (obj.offers) {
          const offers = Array.isArray(obj.offers) ? obj.offers : [obj.offers];
          for (const offer of offers) {
            if (!offer || typeof offer !== "object") continue;
            const o = offer as Record<string, unknown>;
            const price = Number(o.price);
            if (Number.isFinite(price) && price > 0) {
              out.push({
                price,
                currency: o.priceCurrency
                  ? String(o.priceCurrency)
                  : undefined,
                availability: o.availability
                  ? String(o.availability)
                  : undefined,
              });
            }
          }
        }
        for (const v of Object.values(obj)) {
          if (v && typeof v === "object") stack.push(v);
        }
      }
    } catch {
      // ignore bad JSON-LD blocks
    }
  }
  return out;
}

function parseEmbeddedPrices(html: string): number[] {
  const prices: number[] = [];
  const patterns = [
    /"currentPrice"\s*:\s*([0-9]+(?:\.[0-9]{2})?)/g,
    /"customerPrice"\s*:\s*([0-9]+(?:\.[0-9]{2})?)/g,
    /"salePrice"\s*:\s*([0-9]+(?:\.[0-9]{2})?)/g,
    /"price"\s*:\s*([0-9]+(?:\.[0-9]{2})?)/g,
    /property=["']product:price:amount["'][^>]*content=["']([0-9.]+)["']/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > 5) prices.push(n);
    }
  }
  return prices;
}

function pickPrice(candidates: number[], product: Product): number | null {
  const min = product.msrp * 0.4;
  const max = product.msrp * 1.6;
  const inRange = candidates.filter((p) => p >= min && p <= max);
  if (!inRange.length) return null;
  inRange.sort(
    (a, b) => Math.abs(a - product.msrp) - Math.abs(b - product.msrp),
  );
  return inRange[0] ?? null;
}

function listing(
  product: Product,
  retailerId: RetailerId,
  source: string,
  price: number,
  url: string,
  extensions: string[],
): RawListing {
  return {
    title: product.name,
    source,
    price,
    oldPrice: null,
    link: url,
    extensions,
    delivery: null,
    thumbnail: null,
    productToken: null,
    secondHandCondition: null,
  };
}

async function fetchSamsungListing(
  product: Product,
  url: string,
): Promise<RawListing | null> {
  const html = await fetchText(url);
  if (!html) return null;

  const ld = parseJsonLdPrices(html);
  const price = pickPrice(
    [...ld.map((x) => x.price), ...parseEmbeddedPrices(html)],
    product,
  );
  if (price == null) return null;

  const availability = ld[0]?.availability ?? "";
  const extensions = ["Live page", "Sold by Samsung"];
  if (/InStock/i.test(availability)) extensions.unshift("In stock");

  return listing(product, "samsung", "Samsung", price, url, extensions);
}

async function fetchTargetListing(
  product: Product,
  tcin: string,
): Promise<RawListing | null> {
  const url =
    `https://redsky.target.com/redsky_aggregations/v1/web/pdp_client_v1` +
    `?key=${TARGET_REDSKY_KEY}&tcin=${encodeURIComponent(tcin)}` +
    `&pricing_store_id=${TARGET_STORE_ID}&has_pricing_store_id=true`;

  const text = await fetchText(url, {
    headers: { Accept: "application/json" },
  });
  if (!text) return null;

  try {
    const data = JSON.parse(text) as {
      data?: {
        product?: {
          price?: { current_retail?: number };
          item?: {
            product_description?: { title?: string };
            product_vendors?: Array<{ vendor_name?: string }>;
            enrichment?: { buy_url?: string };
          };
        };
      };
    };
    const productNode = data.data?.product;
    const price = Number(productNode?.price?.current_retail);
    if (!Number.isFinite(price) || pickPrice([price], product) == null) {
      return null;
    }

    const vendor =
      productNode?.item?.product_vendors?.[0]?.vendor_name?.trim() || "";
    const buyUrl =
      productNode?.item?.enrichment?.buy_url ||
      `https://www.target.com/p/A-${tcin}`;
    const isMarketplace =
      Boolean(vendor) && !/^target$/i.test(vendor) && !/^samsung$/i.test(vendor);

    const extensions = ["Live API"];
    if (isMarketplace) {
      // Price-match policies usually exclude marketplace — keep the price
      // but flag it so matchability stays accurate.
      extensions.push(`Marketplace: ${vendor}`, "third-party");
    } else if (vendor) {
      extensions.push(`Sold by ${vendor}`);
    }

    return listing(product, "target", "Target", price, buyUrl, extensions);
  } catch {
    return null;
  }
}

/**
 * Best Buy Developer API (optional). Free key:
 * https://developer.bestbuy.com/
 */
async function fetchBestBuyListing(
  product: Product,
  sku: string,
  fallbackUrl?: string,
): Promise<RawListing | null> {
  const apiKey = process.env.BESTBUY_API_KEY?.trim();
  if (apiKey) {
    const apiUrl =
      `https://api.bestbuy.com/v1/products/${encodeURIComponent(sku)}.json` +
      `?apiKey=${encodeURIComponent(apiKey)}` +
      `&show=sku,name,salePrice,regularPrice,onlineAvailability,url`;
    const text = await fetchText(apiUrl, {
      headers: { Accept: "application/json" },
    });
    if (text) {
      try {
        const data = JSON.parse(text) as {
          salePrice?: number;
          regularPrice?: number;
          onlineAvailability?: boolean;
          url?: string;
          name?: string;
        };
        const price = Number(data.salePrice ?? data.regularPrice);
        if (Number.isFinite(price) && pickPrice([price], product) != null) {
          const extensions = ["Live API", "Sold by Best Buy"];
          if (data.onlineAvailability) extensions.unshift("In stock");
          return listing(
            product,
            "bestbuy",
            "Best Buy",
            price,
            data.url ||
              fallbackUrl ||
              `https://www.bestbuy.com/site/sku/${sku}.p?skuId=${sku}`,
            extensions,
          );
        }
      } catch {
        // fall through to HTML
      }
    }
  }

  if (!fallbackUrl) return null;
  const html = await fetchText(fallbackUrl);
  if (!html) return null;

  const price = pickPrice(
    [
      ...parseJsonLdPrices(html).map((x) => x.price),
      ...parseEmbeddedPrices(html),
    ],
    product,
  );
  if (price == null) return null;

  return listing(product, "bestbuy", "Best Buy", price, fallbackUrl, [
    "Live page",
    "Sold by Best Buy",
  ]);
}

/**
 * Fetch live prices from retailer APIs / product pages.
 * These are preferred over Gemini grounding for accuracy.
 */
export async function fetchRetailerLiveListings(
  product: Product,
): Promise<RawListing[]> {
  const catalog = LIVE_CATALOG[product.id];
  if (!catalog) return [];

  const tasks: Array<Promise<RawListing | null>> = [];

  if (catalog.samsungUrl) {
    tasks.push(fetchSamsungListing(product, catalog.samsungUrl));
  }
  if (catalog.targetTcin) {
    tasks.push(fetchTargetListing(product, catalog.targetTcin));
  }
  if (catalog.bestbuySku) {
    tasks.push(
      fetchBestBuyListing(product, catalog.bestbuySku, catalog.bestbuyUrl),
    );
  }

  const results = await Promise.all(tasks);
  return results.filter((x): x is RawListing => Boolean(x));
}
