/**
 * Estimated trade-in values for the demo. Labelled "estimated trade-in" in the UI.
 * Edit freely before a live interview.
 */

export type TradeInEstimate = {
  productId: string;
  label: string;
  value: number;
};

export const tradeInEstimates: TradeInEstimate[] = [
  { productId: "tab-s11-ultra", label: "Galaxy Tab S9 Ultra (good)", value: 350 },
  { productId: "tab-s11-plus", label: "Galaxy Tab S9+ (good)", value: 280 },
  { productId: "tab-s11", label: "Galaxy Tab S9 (good)", value: 220 },
  { productId: "tab-s10-fe", label: "Galaxy Tab S9 FE (good)", value: 150 },
  { productId: "watch-ultra-2025", label: "Galaxy Watch Ultra (prior)", value: 200 },
  { productId: "watch-classic", label: "Galaxy Watch6 Classic", value: 120 },
  { productId: "watch7", label: "Galaxy Watch6", value: 80 },
  { productId: "buds4-pro", label: "Galaxy Buds2 Pro", value: 40 },
  { productId: "buds3", label: "Galaxy Buds2", value: 25 },
  { productId: "galaxy-ring", label: "Prior generation ring", value: 75 },
  { productId: "galaxy-xr", label: "Compatible headset trade-in", value: 400 },
];

export function getTradeInValue(productId: string): number {
  return tradeInEstimates.find((t) => t.productId === productId)?.value ?? 0;
}

export function getTradeInLabel(productId: string): string | null {
  return tradeInEstimates.find((t) => t.productId === productId)?.label ?? null;
}
