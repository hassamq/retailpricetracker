import { products } from "../data/products";
import { buildFixtureShoppingPayload } from "../lib/pricing/mock-data";
import { saveFixture } from "../lib/pricing/serpapi";

async function main() {
  for (const p of products) {
    const payload = buildFixtureShoppingPayload(p);
    await saveFixture(`shopping-${p.id}`, payload);
    console.log("fixture", p.id);
  }
}

main();
