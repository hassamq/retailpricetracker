import { NextResponse } from "next/server";
import { z } from "zod";
import { findPromoCode } from "@/data/promo-codes";
import { getProduct, type ProductCategory } from "@/data/products";

const BodySchema = z.object({
  code: z.string().min(1).max(40),
  productId: z.string().optional(),
  subtotal: z.number().positive().optional(),
});

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { code, productId, subtotal } = parsed.data;
  const promo = findPromoCode(code);

  if (!promo) {
    return NextResponse.json(
      { valid: false, error: "Code not recognized." },
      { status: 200 },
    );
  }

  if (new Date(promo.expiresAt).getTime() < Date.now()) {
    return NextResponse.json(
      { valid: false, error: "This code has expired." },
      { status: 200 },
    );
  }

  let category: ProductCategory | undefined;
  if (productId) {
    const product = getProduct(productId);
    category = product?.category;
  }

  if (
    promo.categories?.length &&
    category &&
    !promo.categories.includes(category)
  ) {
    return NextResponse.json(
      {
        valid: false,
        error: `This code does not apply to ${category} products.`,
      },
      { status: 200 },
    );
  }

  if (
    promo.minimumSpend != null &&
    subtotal != null &&
    subtotal < promo.minimumSpend
  ) {
    return NextResponse.json(
      {
        valid: false,
        error: `Minimum spend of $${promo.minimumSpend.toFixed(2)} required.`,
      },
      { status: 200 },
    );
  }

  let discount = 0;
  if (promo.type === "fixed") {
    discount = promo.value;
  } else if (promo.type === "percent" && subtotal != null) {
    discount = Math.round(subtotal * (promo.value / 100) * 100) / 100;
  }

  return NextResponse.json({
    valid: true,
    code: promo.code,
    type: promo.type,
    value: promo.value,
    discount,
    description: promo.description,
    whereToUse: promo.whereToUse,
    redeemAt: promo.redeemAt,
    footnote: "Demo codes — verify at checkout.",
  });
}
