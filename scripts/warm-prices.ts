/**
 * Pre-fetch default variant prices for every product so the demo
 * runs off a warm cache. Usage: pnpm prices:warm
 */
import { products } from "../data/products";
import { runPriceComparison } from "../lib/pricing/engine";

async function main() {
  console.log(`Warming prices for ${products.length} products…`);
  for (const product of products) {
    const variant: Record<string, string> = {};
    if (product.variants.storage?.[0]) {
      variant.storage = product.variants.storage[0];
    }
    if (product.variants.connectivity?.[0]) {
      variant.connectivity = product.variants.connectivity[0];
    }
    if (product.variants.size?.[0]) {
      variant.size = product.variants.size[0];
    }
    if (product.variants.colors[0]) {
      variant.color = product.variants.colors[0].name;
    }

    try {
      const result = await runPriceComparison({
        productId: product.id,
        variant,
        forceRefresh: true,
      });
      console.log(
        `✓ ${product.name} · ${result.source} · ${result.resolvedRetailers.length} retailers`,
      );
    } catch (err) {
      console.error(`✗ ${product.name}`, err);
    }
  }
  console.log("Done.");
}

main();
