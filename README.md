# RetailPriceTracker.com

Live price-match & comparison portal for retail staff and shoppers.

Compare six national retailers (Best Buy, Costco, Target, Walmart, Samsung.com, Amazon), normalize offers with Gemini, sort by net effective price, and check price-match eligibility for the store you are in.

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS (custom tokens)
- React Three Fiber + drei
- Framer Motion, Zustand, Zod
- SerpApi (Google Shopping + Immersive Product)
- Gemini via Vertex AI (`@google/genai`)

## Quick start

```bash
pnpm install
pnpm approve-builds --all -y   # pnpm 12 build scripts
cp .env.example .env.local
pnpm prices:warm               # warm cache + fixtures (mock-safe)
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

With empty keys, `USE_MOCK_DATA=true` runs the full UI on recorded fixtures — the demo never hard-fails.

## Environment

| Variable | Required | Notes |
|---|---|---|
| `SERPAPI_KEY` | for live prices | Free tier ~100 searches/mo — cache is aggressive |
| `GOOGLE_API_KEY` / Vertex project | for Gemini normalize + chat | Falls back to deterministic parser |
| `USE_MOCK_DATA` | `true` for offline | Forces fixtures/mock pipeline |

## Demo tips (interview)

1. Walk the 4-step wizard: product → variant → store → results
2. Toggle gift cards / trade-in / memberships and watch sort + Best Value update
3. Apply promo `GALAXY50` or expired `EXPIRED20`
4. Open the deal assistant (right dock)

## Scripts

- `pnpm dev` — Turbopack dev server
- `pnpm build` / `pnpm start` — production
- `pnpm prices:warm` — pre-fetch default variants
- `pnpm fixtures:generate` — rebuild SerpApi-shaped fixtures

## Disclaimer

Independent demo. Not affiliated with Samsung Electronics or the listed retailers. Verify prices at checkout.
