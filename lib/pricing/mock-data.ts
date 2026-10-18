import type { Product } from "@/data/products";
import {
  getRetailerSearchUrl,
  retailers,
  type RetailerId,
} from "@/data/retailers";
import type { RawListing } from "./types";

/**
 * Generated mock listings that look like SerpApi shopping results.
 * Used only after live → cache → fixtures are exhausted.
 */
export function generateMockListings(product: Product): RawListing[] {
  const spreads: Partial<Record<RetailerId, number>> = {
    amazon: 0.88,
    bestbuy: 0.91,
    walmart: 0.9,
    target: 0.93,
    costco: 0.87,
    samsung: 0.95,
  };

  return retailers.map((r, i) => {
    const factor = spreads[r.id] ?? 0.92;
    const jitter = ((product.id.length + i * 7) % 17) - 8;
    const price = Math.round((product.msrp * factor + jitter) * 100) / 100;
    const oldPrice =
      r.id === "bestbuy" || r.id === "walmart"
        ? Math.round(product.msrp * 100) / 100
        : null;

    const extensions: string[] = [];
    if (r.id === "amazon") extensions.push("Prime", "Clip coupon");
    if (r.id === "costco") extensions.push("Membership price", "In stock");
    if (r.id === "target") extensions.push("Circle offer", "Order pickup");
    if (r.id === "bestbuy") extensions.push("Sale", "In stock");
    if (r.id === "walmart") extensions.push("Rollback", "Sold by Walmart");
    if (r.id === "samsung") extensions.push("Trade-in available");

    return {
      title: `${product.name} ${product.variants.storage?.[0] ?? ""} ${product.variants.connectivity?.[0] ?? ""}`.trim(),
      source: r.sourceMatchers[0],
      price,
      oldPrice,
      link: getRetailerSearchUrl(r.id, product.name),
      extensions,
      delivery: r.id === "amazon" ? "Free Prime delivery" : "Free shipping",
      thumbnail: null,
      productToken: null,
      secondHandCondition: null,
    };
  });
}

/** Realistic recorded-style fixture payload for development demos. */
export function buildFixtureShoppingPayload(product: Product) {
  const listings = generateMockListings(product);
  return {
    search_information: {
      query_displayed: product.searchTemplate,
      shopping_results_state: "Results for exact spelling",
    },
    shopping_results: listings.map((l, i) => ({
      position: i + 1,
      title: l.title,
      source: l.source,
      price: `$${l.price?.toFixed(2)}`,
      extracted_price: l.price,
      old_price: l.oldPrice ? `$${l.oldPrice.toFixed(2)}` : undefined,
      extracted_old_price: l.oldPrice ?? undefined,
      product_link: l.link,
      link: l.link,
      extensions: l.extensions,
      delivery: l.delivery,
      immersive_product_page_token: i === 0 ? `fixture-token-${product.id}` : undefined,
    })),
  };
}
