import { Type, type FunctionDeclaration } from "@google/genai";
import { products, getProduct, type ProductCategory } from "@/data/products";
import { retailers, type RetailerId } from "@/data/retailers";
import { formatPromoForAssistant, promoCodes } from "@/data/promo-codes";
import { runPriceComparison } from "@/lib/pricing/engine";
import { resolveOfferUrl } from "@/data/retailers";

export const toolDeclarations: FunctionDeclaration[] = [
  {
    name: "search_catalog",
    description:
      "Search the Samsung product catalog by query and optional category.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING },
        category: {
          type: Type.STRING,
          enum: ["tab", "watch", "buds", "ring", "xr", "accessories"],
        },
      },
      required: ["query"],
    },
  },
  {
    name: "set_selection",
    description:
      "Update the wizard selection: product, variant fields, and optional store.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        productId: { type: Type.STRING },
        storage: { type: Type.STRING },
        connectivity: { type: Type.STRING },
        size: { type: Type.STRING },
        color: { type: Type.STRING },
        storeId: {
          type: Type.STRING,
          enum: ["bestbuy", "costco", "target", "walmart", "samsung", "amazon"],
        },
      },
    },
  },
  {
    name: "get_price_comparison",
    description:
      "Fetch computed, sorted price comparison. Never invent prices — always call this.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        productId: { type: Type.STRING },
        storage: { type: Type.STRING },
        connectivity: { type: Type.STRING },
        size: { type: Type.STRING },
        color: { type: Type.STRING },
        storeId: { type: Type.STRING },
      },
      required: ["productId"],
    },
  },
  {
    name: "check_price_match",
    description: "Return price-match eligibility verdict for a store.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        storeId: {
          type: Type.STRING,
          enum: ["bestbuy", "costco", "target", "walmart", "samsung", "amazon"],
        },
        productId: { type: Type.STRING },
        storage: { type: Type.STRING },
        connectivity: { type: Type.STRING },
        size: { type: Type.STRING },
        color: { type: Type.STRING },
      },
      required: ["storeId", "productId"],
    },
  },
  {
    name: "list_promo_codes",
    description:
      "List active demo promo codes with where/how to redeem. Always use this for coupon questions — never invent codes or redemption locations.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        category: {
          type: Type.STRING,
          enum: ["tab", "watch", "buds", "ring", "xr", "accessories"],
          description: "Optional category filter",
        },
      },
    },
  },
];

export type ToolName =
  | "search_catalog"
  | "set_selection"
  | "get_price_comparison"
  | "check_price_match"
  | "list_promo_codes";

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<{ result: unknown; clientAction?: Record<string, unknown> }> {
  switch (name) {
    case "search_catalog": {
      const query = String(args.query ?? "").toLowerCase();
      const category = args.category as ProductCategory | undefined;
      const hits = products
        .filter((p) => !category || p.category === category)
        .filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.id.includes(query) ||
            p.keySpecs.some((s) => s.toLowerCase().includes(query)),
        )
        .slice(0, 8)
        .map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          msrp: p.msrp,
          variants: p.variants,
        }));
      return { result: hits };
    }

    case "set_selection": {
      const productId = args.productId ? String(args.productId) : undefined;
      const product = productId ? getProduct(productId) : undefined;
      const clientAction = {
        type: "set_selection",
        productId,
        category: product?.category,
        variant: {
          storage: args.storage ? String(args.storage) : undefined,
          connectivity: args.connectivity
            ? String(args.connectivity)
            : undefined,
          size: args.size ? String(args.size) : undefined,
          color: args.color ? String(args.color) : undefined,
        },
        storeId: args.storeId as RetailerId | undefined,
      };
      return {
        result: { ok: true, applied: clientAction },
        clientAction,
      };
    }

    case "get_price_comparison": {
      const productId = String(args.productId);
      const variant: Record<string, string> = {};
      for (const k of ["storage", "connectivity", "size", "color"] as const) {
        if (args[k]) variant[k] = String(args[k]);
      }
      const comparison = await runPriceComparison({
        productId,
        variant,
        storeId: (args.storeId as RetailerId) || null,
      });
      const product = getProduct(productId);
      const productName = product?.name ?? "Samsung Galaxy";
      const listed = comparison.offers.filter((o) => o.listed);
      const top3 = listed.slice(0, 3);
      return {
        result: {
          source: comparison.source,
          updatedAt: comparison.updatedAt,
          productName,
          bestValue: comparison.bestValue
            ? {
                retailer: retailerLabel(comparison.bestValue.retailerId),
                netPrice: comparison.bestValue.netPrice,
                viewUrl: resolveOfferUrl(
                  comparison.bestValue.retailerId,
                  productName,
                  comparison.bestValue.url,
                ),
              }
            : null,
          top3: top3.map((o) => ({
            retailer: retailerLabel(o.retailerId),
            netPrice: o.netPrice,
            condition: o.condition,
            membershipRequired: o.membershipRequired,
            couponCode: o.couponCode,
            viewUrl: resolveOfferUrl(o.retailerId, productName, o.url),
          })),
          verdict: comparison.verdict,
        },
        clientAction: {
          type: "comparison_card",
          productId,
          top3,
          bestValue: comparison.bestValue,
        },
      };
    }

    case "check_price_match": {
      const productId = String(args.productId);
      const storeId = args.storeId as RetailerId;
      const variant: Record<string, string> = {};
      for (const k of ["storage", "connectivity", "size", "color"] as const) {
        if (args[k]) variant[k] = String(args[k]);
      }
      const comparison = await runPriceComparison({
        productId,
        variant,
        storeId,
      });
      return { result: comparison.verdict };
    }

    case "list_promo_codes": {
      const category = args.category as string | undefined;
      const active = promoCodes.filter(
        (p) => new Date(p.expiresAt).getTime() > Date.now(),
      );
      const filtered = category
        ? active.filter(
            (p) => !p.categories?.length || p.categories.includes(category as never),
          )
        : active;
      return {
        result: {
          note: "Always tell the user whereToUse / redeemAt for each code.",
          codes: filtered.map(formatPromoForAssistant),
        },
      };
    }

    default:
      return { result: { error: `Unknown tool: ${name}` } };
  }
}

export function retailerLabel(id: string): string {
  return retailers.find((r) => r.id === id)?.displayName ?? id;
}
