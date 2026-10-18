export type RetailerId =
  | "bestbuy"
  | "costco"
  | "target"
  | "walmart"
  | "samsung"
  | "amazon";

export type PriceMatchPolicy = {
  matches: RetailerId[];
  exclusions: {
    marketplace: boolean;
    membershipPricing: boolean;
    openBox: boolean;
    bundles: boolean;
    outOfStock: boolean;
  };
  notes: string;
};

export type Retailer = {
  id: RetailerId;
  displayName: string;
  sourceMatchers: string[];
  membershipProgram: string | null;
  priceMatchPolicy: PriceMatchPolicy;
  accent: string;
  dealContext: string;
};

export const retailers: Retailer[] = [
  {
    id: "bestbuy",
    displayName: "Best Buy",
    sourceMatchers: ["Best Buy", "bestbuy.com", "BestBuy"],
    membershipProgram: "My Best Buy / Totaltech",
    accent: "#0046BE",
    dealContext: "Sale price, My Best Buy / Totaltech savings, open-box",
    priceMatchPolicy: {
      matches: ["amazon", "walmart", "target", "samsung"],
      exclusions: {
        marketplace: true,
        membershipPricing: true,
        openBox: true,
        bundles: true,
        outOfStock: true,
      },
      notes: "Typically matches identical new in-stock items sold by the competitor.",
    },
  },
  {
    id: "costco",
    displayName: "Costco",
    sourceMatchers: ["Costco", "costco.com", "Costco Wholesale"],
    membershipProgram: "Costco",
    accent: "#E31837",
    dealContext: "Warehouse price, instant rebates, bundled accessories",
    priceMatchPolicy: {
      matches: [],
      exclusions: {
        marketplace: true,
        membershipPricing: false,
        openBox: true,
        bundles: true,
        outOfStock: true,
      },
      notes: "Costco generally does not price-match other retailers.",
    },
  },
  {
    id: "target",
    displayName: "Target",
    sourceMatchers: ["Target", "target.com"],
    membershipProgram: "Target Circle",
    accent: "#CC0000",
    dealContext: "Target Circle offers, RedCard 5%, store pickup",
    priceMatchPolicy: {
      matches: ["amazon", "walmart", "bestbuy", "samsung"],
      exclusions: {
        marketplace: true,
        membershipPricing: true,
        openBox: true,
        bundles: true,
        outOfStock: true,
      },
      notes: "Circle offers and RedCard pricing are usually excluded from matches.",
    },
  },
  {
    id: "walmart",
    displayName: "Walmart",
    sourceMatchers: ["Walmart", "walmart.com"],
    membershipProgram: "Walmart+",
    accent: "#0071CE",
    dealContext: "Rollback, Walmart+ deals; sold-by-Walmart only",
    priceMatchPolicy: {
      matches: ["amazon", "target", "bestbuy", "samsung"],
      exclusions: {
        marketplace: true,
        membershipPricing: true,
        openBox: true,
        bundles: true,
        outOfStock: true,
      },
      notes: "Only matches items sold and shipped by Walmart (not marketplace).",
    },
  },
  {
    id: "samsung",
    displayName: "Samsung.com",
    sourceMatchers: ["Samsung", "samsung.com", "Samsung Electronics"],
    membershipProgram: null,
    accent: "#1428A0",
    dealContext: "Direct promos, trade-in credit, education/corporate discounts",
    priceMatchPolicy: {
      matches: [],
      exclusions: {
        marketplace: true,
        membershipPricing: true,
        openBox: true,
        bundles: false,
        outOfStock: true,
      },
      notes: "Samsung.com promotions are typically not matched by other stores.",
    },
  },
  {
    id: "amazon",
    displayName: "Amazon",
    sourceMatchers: ["Amazon", "amazon.com", "Amazon.com"],
    membershipProgram: "Prime",
    accent: "#FF9900",
    dealContext: "Prime price, clip coupons, Subscribe & Save; Amazon or Samsung only",
    priceMatchPolicy: {
      matches: [],
      exclusions: {
        marketplace: true,
        membershipPricing: false,
        openBox: true,
        bundles: true,
        outOfStock: true,
      },
      notes: "Amazon does not offer a general price-match program.",
    },
  },
];

export const POLICY_FOOTNOTE =
  "Policies change. Verify at the register.";

export function getRetailer(id: RetailerId): Retailer {
  const found = retailers.find((r) => r.id === id);
  if (!found) throw new Error(`Unknown retailer: ${id}`);
  return found;
}

/** True when a listing URL is a real product page (not empty / homepage / placeholder). */
export function isUsableListingUrl(url: string | null | undefined): boolean {
  if (!url || url === "#" || url === "/") return false;
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    if (host === "example.com" || host.endsWith(".example.com")) return false;
    if (host === "localhost" || host === "127.0.0.1") return false;
    // Bare retailer homepages are not product links
    const path = parsed.pathname.replace(/\/+$/, "");
    if (!path || path === "") return false;
    return true;
  } catch {
    return false;
  }
}

/** Google Shopping aggregator pages are not the retailer's product PDP. */
export function isGoogleShoppingAggregatorUrl(
  url: string | null | undefined,
): boolean {
  if (!url) return false;
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

/** Retailer search/product URL used when SerpApi/fixture links are missing. */
export function getRetailerSearchUrl(
  retailerId: RetailerId,
  query: string,
): string {
  const q = encodeURIComponent(query.trim() || "Samsung Galaxy");
  switch (retailerId) {
    case "bestbuy":
      return `https://www.bestbuy.com/site/searchpage.jsp?st=${q}`;
    case "amazon":
      return `https://www.amazon.com/s?k=${q}`;
    case "walmart":
      return `https://www.walmart.com/search?q=${q}`;
    case "target":
      return `https://www.target.com/s?searchTerm=${q}`;
    case "costco":
      return `https://www.costco.com/CatalogSearch?dept=All&keyword=${q}`;
    case "samsung":
      return `https://www.samsung.com/us/search/searchMain/?query=${q}`;
    default:
      return `https://www.google.com/search?q=${q}`;
  }
}

/**
 * Prefer the exact retailer product URL that produced the listed price.
 * Fall back to retailer search only when we don't have a real PDP link.
 */
export function resolveOfferUrl(
  retailerId: RetailerId,
  productName: string,
  listingUrl?: string | null,
): string {
  if (
    isUsableListingUrl(listingUrl) &&
    !isGoogleShoppingAggregatorUrl(listingUrl)
  ) {
    return listingUrl as string;
  }
  return getRetailerSearchUrl(retailerId, productName);
}

export function matchRetailerId(source: string): RetailerId | null {
  const normalized = source.toLowerCase();
  for (const retailer of retailers) {
    if (
      retailer.sourceMatchers.some((m) =>
        normalized.includes(m.toLowerCase()),
      )
    ) {
      return retailer.id;
    }
  }
  return null;
}
