import { createGenAI, GEMINI_MODEL, isGenAIConfigured } from "@/lib/ai/client";
import type { Product } from "@/data/products";
import { matchRetailerId } from "@/data/retailers";
import type { RawListing } from "./types";

/**
 * Gemini Google Search grounding — primary live price source.
 * Uses Google AI Studio (API key) or Vertex AI depending on env.
 * Only keeps rows with an explicit numeric price in a sane MSRP band.
 */
export async function groundingPriceSearch(
  product: Product,
  query: string,
): Promise<RawListing[]> {
  if (!isGenAIConfigured()) return [];

  const ai = createGenAI();
  if (!ai) return [];

  let response;
  try {
    response = await Promise.race([
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Find CURRENT US retail prices for: ${query} (new condition only).
Only Best Buy, Costco, Target, Walmart (sold by Walmart), Samsung.com, or Amazon (sold by Amazon or Samsung).
Exclude marketplace 3P sellers, international imports, renewed, and open-box.
Return JSON array only, no markdown: [{"retailer":"...","title":"...","price":123.45,"url":"...","notes":"..."}]
If a price is not clearly stated, omit that retailer. Do not invent prices.`,
              },
            ],
          },
        ],
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.1,
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Grounding timeout")), 25000),
      ),
    ]);
  } catch (e) {
    const message = formatGenAIError(e);
    console.warn("[pricing] grounding request failed:", message);
    throw new Error(message);
  }

  const text = response.text ?? "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.warn(
      "[pricing] grounding: no JSON array in model text:",
      text.slice(0, 200),
    );
    return [];
  }

  const rows = JSON.parse(jsonMatch[0]) as Array<{
    retailer?: string;
    title?: string;
    price?: number;
    url?: string;
    notes?: string;
  }>;

  const listings: RawListing[] = [];
  for (const row of rows) {
    if (typeof row.price !== "number" || !Number.isFinite(row.price)) continue;
    const retailerId = matchRetailerId(row.retailer ?? "");
    if (!retailerId) continue;
    if (row.price < product.msrp * 0.4 || row.price > product.msrp * 1.6) {
      continue;
    }
    listings.push({
      title: row.title || product.name,
      source: row.retailer || retailerId,
      price: row.price,
      oldPrice: null,
      link: row.url || "",
      extensions: row.notes
        ? [row.notes, "Via search grounding"]
        : ["Via search grounding"],
      delivery: null,
      thumbnail: null,
      productToken: null,
      secondHandCondition: null,
    });
  }
  return listings;
}

function formatGenAIError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const raw = error.message;
  try {
    const parsed = JSON.parse(raw) as {
      error?: { code?: number; message?: string; status?: string };
    };
    const inner = parsed.error;
    if (inner?.message) {
      return `${inner.status ?? "ERROR"} ${inner.code ?? ""}: ${inner.message}`.trim();
    }
  } catch {
    // not JSON
  }
  return raw;
}
