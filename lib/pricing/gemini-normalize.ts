import { z } from "zod";
import { createGenAI, GEMINI_MODEL, isVertexConfigured } from "@/lib/ai/client";
import type { FilteredListing } from "./prefilter";
import { fallbackParse } from "./fallback-parser";
import {
  ExtractedOfferSchema,
  type ExtractedOffer,
} from "./types";

const ResponseSchema = z.object({
  offers: z.array(ExtractedOfferSchema),
});

const SYSTEM = `You extract structured retail offer fields from Google Shopping listing text.
Rules:
- Use ONLY values present in the input. Never estimate or invent a price, coupon, gift card, or membership.
- If a field is unclear, use null.
- basePrice must be the listed price shown for that seller.
- instantSavings is an on-page discount already reflected or a clip coupon amount; otherwise 0.
- condition is "open-box" only when the listing explicitly says so; otherwise "new".
- retailerId must be one of: bestbuy, costco, target, walmart, samsung, amazon, att, tmobile, verizon.
Return JSON matching the schema.`;

export async function normalizeWithGemini(
  listings: FilteredListing[],
): Promise<ExtractedOffer[]> {
  if (!listings.length) return [];

  if (!isVertexConfigured()) {
    return fallbackParse(listings);
  }

  const ai = createGenAI();
  if (!ai) return fallbackParse(listings);

  const compact = listings.map((l) => ({
    retailerId: l.retailerId,
    title: l.title,
    seller: l.source,
    price: l.price,
    oldPrice: l.oldPrice ?? null,
    extensions: l.extensions,
    delivery: l.delivery ?? null,
    link: l.link,
    conditionHint: l.condition,
  }));

  try {
    const response = await Promise.race([
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Extract offers from these listings:\n${JSON.stringify(compact)}`,
              },
            ],
          },
        ],
        config: {
          systemInstruction: SYSTEM,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              offers: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    retailerId: { type: "string" },
                    title: { type: "string" },
                    basePrice: { type: "number" },
                    instantSavings: { type: "number" },
                    couponCode: { type: "string", nullable: true },
                    couponValue: { type: "number", nullable: true },
                    giftCardValue: { type: "number", nullable: true },
                    membershipRequired: { type: "string", nullable: true },
                    condition: { type: "string", enum: ["new", "open-box"] },
                    inStock: { type: "boolean", nullable: true },
                    url: { type: "string" },
                    notes: { type: "string", nullable: true },
                  },
                  required: [
                    "retailerId",
                    "title",
                    "basePrice",
                    "instantSavings",
                    "condition",
                    "url",
                  ],
                },
              },
            },
            required: ["offers"],
          },
          temperature: 0.1,
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Gemini timeout")), 8000),
      ),
    ]);

    const text = response.text ?? "";
    const parsed = ResponseSchema.safeParse(JSON.parse(text));
    if (!parsed.success) return fallbackParse(listings);

    return antiHallucinationFilter(parsed.data.offers, listings);
  } catch {
    return fallbackParse(listings);
  }
}

/** Discard entries whose basePrice does not appear in original SerpApi data for that seller. */
export function antiHallucinationFilter(
  offers: ExtractedOffer[],
  listings: FilteredListing[],
): ExtractedOffer[] {
  const allowed = new Map<string, Set<number>>();
  for (const l of listings) {
    if (l.price == null) continue;
    const set = allowed.get(l.retailerId) ?? new Set<number>();
    set.add(round2(l.price));
    if (l.oldPrice != null) set.add(round2(l.oldPrice));
    allowed.set(l.retailerId, set);
  }

  const meta = new Map<
    string,
    {
      matchQuality: FilteredListing["matchQuality"];
      matchedVariant: FilteredListing["matchedVariant"];
    }
  >(
    listings.map((l) => [
      l.retailerId,
      {
        matchQuality: l.matchQuality,
        matchedVariant: l.matchedVariant,
      },
    ]),
  );

  const kept: ExtractedOffer[] = [];
  for (const offer of offers) {
    const prices = allowed.get(offer.retailerId);
    if (!prices) continue;
    if (!prices.has(round2(offer.basePrice))) continue;
    const withMeta = {
      ...offer,
      ...meta.get(offer.retailerId),
    };
    const validated = ExtractedOfferSchema.safeParse(withMeta);
    if (validated.success) kept.push(validated.data);
  }

  // If Gemini dropped everything, fall back
  if (!kept.length) return fallbackParse(listings);
  return kept;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
