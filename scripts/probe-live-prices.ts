import { getProduct, buildSearchQuery } from "../data/products";
import { groundingPriceSearch } from "../lib/pricing/grounding";
import { fetchGoogleShopping } from "../lib/pricing/serpapi";
import { createGenAI, GEMINI_MODEL, isGenAIConfigured } from "../lib/ai/client";

async function main() {
  const product = getProduct("tab-s11-ultra");
  if (!product) throw new Error("missing product");
  const query = buildSearchQuery(product, {
    storage: "256GB",
    connectivity: "Wi-Fi",
    color: "Moonstone Gray",
  });

  console.log("query:", query);
  console.log("genai:", isGenAIConfigured());
  console.log("vertex env:", process.env.GOOGLE_GENAI_USE_VERTEXAI);
  console.log("serp key prefix:", (process.env.SERPAPI_KEY ?? "").slice(0, 8));

  if (process.env.SERPAPI_KEY) {
    try {
      const shopping = await fetchGoogleShopping(
        query,
        process.env.SERPAPI_KEY,
      );
      console.log(
        "serpapi listings:",
        shopping.listings.length,
        "error:",
        shopping.data.error ?? "none",
      );
    } catch (e) {
      console.log("serpapi throw:", e instanceof Error ? e.message : e);
    }
  }

  console.log("--- grounding ---");
  const t0 = Date.now();
  const listings = await groundingPriceSearch(product, query);
  console.log("grounding ms:", Date.now() - t0, "count:", listings.length);
  for (const l of listings) {
    console.log("-", l.source, l.price, (l.link || "").slice(0, 90));
  }

  // Raw Gemini call for debugging if grounding empty
  if (!listings.length && isGenAIConfigured()) {
    const ai = createGenAI();
    if (!ai) return;
    console.log("--- raw grounded generate ---");
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Current US retail prices for ${query}. Return JSON array only.`,
              },
            ],
          },
        ],
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.1,
        },
      });
      console.log("text:", (response.text ?? "").slice(0, 800));
      console.log(
        "groundingMetadata:",
        JSON.stringify(
          response.candidates?.[0]?.groundingMetadata ?? null,
        ).slice(0, 500),
      );
    } catch (e) {
      console.log("raw err:", e instanceof Error ? e.message : e);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
