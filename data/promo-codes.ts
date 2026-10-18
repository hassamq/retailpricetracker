import type { RetailerId } from "./retailers";
import { getRetailer } from "./retailers";

export type PromoType = "percent" | "fixed";

export type PromoCode = {
  code: string;
  type: PromoType;
  value: number;
  minimumSpend?: number;
  categories?: Array<"tab" | "watch" | "buds" | "ring" | "xr" | "accessories">;
  /** Retailers where this demo code can be applied at checkout. */
  redeemAt: RetailerId[];
  /** Short human instruction for where/how to use the code. */
  whereToUse: string;
  expiresAt: string;
  description: string;
};

export const promoCodes: PromoCode[] = [
  {
    code: "GALAXY50",
    type: "fixed",
    value: 50,
    minimumSpend: 200,
    redeemAt: ["samsung", "bestbuy"],
    whereToUse:
      "Enter GALAXY50 in the promo/coupon field at checkout on Samsung.com or Best Buy (orders $200+).",
    description: "$50 off orders $200+",
    expiresAt: "2027-12-31T23:59:59Z",
  },
  {
    code: "TAB10",
    type: "percent",
    value: 10,
    categories: ["tab"],
    redeemAt: ["samsung", "bestbuy", "amazon"],
    whereToUse:
      "Enter TAB10 at checkout on Samsung.com, Best Buy, or Amazon for Galaxy Tab only.",
    description: "10% off Galaxy Tab",
    expiresAt: "2027-12-31T23:59:59Z",
  },
  {
    code: "WATCH25",
    type: "fixed",
    value: 25,
    categories: ["watch"],
    minimumSpend: 250,
    redeemAt: ["samsung", "bestbuy"],
    whereToUse:
      "Enter WATCH25 at checkout on Samsung.com or Best Buy for Galaxy Watch ($250+).",
    description: "$25 off Galaxy Watch $250+",
    expiresAt: "2027-06-30T23:59:59Z",
  },
  {
    code: "BUDS15",
    type: "percent",
    value: 15,
    categories: ["buds"],
    redeemAt: ["samsung", "amazon", "bestbuy"],
    whereToUse:
      "Enter BUDS15 at checkout on Samsung.com, Amazon, or Best Buy for Galaxy Buds only.",
    description: "15% off Galaxy Buds",
    expiresAt: "2027-12-31T23:59:59Z",
  },
  {
    code: "EXPIRED20",
    type: "percent",
    value: 20,
    redeemAt: ["samsung"],
    whereToUse: "Expired — do not use.",
    description: "Expired demo code",
    expiresAt: "2024-01-01T00:00:00Z",
  },
];

export function findPromoCode(code: string): PromoCode | undefined {
  return promoCodes.find(
    (p) => p.code.toUpperCase() === code.trim().toUpperCase(),
  );
}

export function formatPromoForAssistant(promo: PromoCode) {
  return {
    code: promo.code,
    description: promo.description,
    type: promo.type,
    value: promo.value,
    minimumSpend: promo.minimumSpend ?? null,
    categories: promo.categories ?? ["all"],
    redeemAt: promo.redeemAt.map((id) => getRetailer(id).displayName),
    whereToUse: promo.whereToUse,
    expiresAt: promo.expiresAt,
  };
}
