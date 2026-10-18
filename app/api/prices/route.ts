import { NextResponse } from "next/server";
import { z } from "zod";
import { runPriceComparison } from "@/lib/pricing/engine";
import { canRefreshPrices, getClientIp, rateLimit } from "@/lib/rate-limit";

const BodySchema = z.object({
  productId: z.string().min(1),
  variant: z.record(z.string(), z.string()).default({}),
  storeId: z
    .enum(["bestbuy", "costco", "target", "walmart", "samsung", "amazon"])
    .nullable()
    .optional(),
  includeGiftCards: z.boolean().optional(),
  includeTradeIn: z.boolean().optional(),
  haveMemberships: z.boolean().optional(),
  promoDiscount: z.number().min(0).optional(),
  forceRefresh: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const limit = rateLimit(`prices:${ip}`, 30, 60_000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many requests. Try again shortly." },
        { status: 429 },
      );
    }

    const json = await request.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const body = parsed.data;
    if (body.forceRefresh && !canRefreshPrices(body.productId)) {
      return NextResponse.json(
        {
          error: "Refresh limited to once per product every 10 minutes.",
        },
        { status: 429 },
      );
    }

    const result = await runPriceComparison(body);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/prices]", err);
    // Never show a hard error screen — return empty structured payload
    return NextResponse.json(
      {
        productId: "",
        variant: {},
        offers: [],
        bestValue: null,
        verdict: null,
        source: "mock",
        updatedAt: new Date().toISOString(),
        resolvedRetailers: [],
        warning: "Pricing temporarily unavailable. Showing empty result.",
      },
      { status: 200 },
    );
  }
}
