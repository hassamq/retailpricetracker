import type { Product } from "@/data/products";
import { isCellularConnectivity } from "@/data/retailers";

/**
 * Build a relaxed variant used for the "nearest" retailer fill pass.
 * Works for every product category — not tablet-only:
 * - Cellular (5G / LTE) → product's base connectivity (Wi‑Fi / Bluetooth / …)
 * - Otherwise drop color so more national PDPs can match
 * - Always returns a variant so missing nationals still get a targeted Serp pass
 */
export function buildNearestVariant(
  product: Product,
  variant: Record<string, string>,
): { variant: Record<string, string>; badgeConnectivity: string | null } {
  const connectivityOptions = product.variants.connectivity ?? [];
  const selected = variant.connectivity?.trim();

  if (selected && isCellularConnectivity(selected)) {
    const base = connectivityOptions.find(
      (option) => !isCellularConnectivity(option),
    );
    if (base) {
      return {
        variant: { ...variant, connectivity: base },
        badgeConnectivity: base,
      };
    }
  }

  // Color is the most common false-negative for buds / phones / rings
  if (variant.color) {
    const { color: _color, ...rest } = variant;
    return {
      variant: rest,
      badgeConnectivity: selected ?? null,
    };
  }

  return {
    variant: { ...variant },
    badgeConnectivity: selected ?? null,
  };
}
