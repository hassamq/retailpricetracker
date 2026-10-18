/**
 * Brand tokens and wordmark. Swap licensed assets here when provided.
 * Do not load official Samsung logos or SamsungOne from third-party CDNs.
 */

export const brand = {
  name: "RetailPriceTracker",
  domain: "retailpricetracker.com",
  wordmarkPrefix: "Retail",
  wordmarkSuffix: "PriceTracker",
  tagline: "Live Price Check.",
  subline:
    "Compare six retailers in seconds, sorted lowest to highest, with coupons and price-match eligibility built in.",
  disclaimer:
    "Prices and promotions are pulled from public listings and may change. Verify at checkout. RetailPriceTracker.com is an independent tool and is not affiliated with Samsung Electronics or the listed retailers.",
} as const;

/** Clean retail palette (deep blue + B/W/gray). */
export const colors = {
  ink: "#000000",
  paper: "#FFFFFF",
  mist: "#F7F7F7",
  line: "#E6E6E6",
  muted: "#555555",
  brandBlue: "#1428A0",
  brandNavy: "#0C1050",
  linkBlue: "#2189FF",
  success: "#218358",
  danger: "#C4161C",
  softBlue: "#EEF1FA",
  softTeal: "#F7F7F7",
  softSand: "#F7F7F7",
  softLilac: "#F7F7F7",
  accentTeal: "#1428A0",
  accentCoral: "#000000",
  surfaceAlt: "#F7F7F7",
} as const;

/** Uniform product-surface accents. */
export const categoryAccents: Record<
  string,
  { bg: string; chip: string; label: string }
> = {
  tab: { bg: "#F7F7F7", chip: "#000000", label: "Tab" },
  watch: { bg: "#F7F7F7", chip: "#000000", label: "Watch" },
  buds: { bg: "#F7F7F7", chip: "#000000", label: "Buds" },
  ring: { bg: "#F7F7F7", chip: "#000000", label: "Ring" },
  xr: { bg: "#F7F7F7", chip: "#000000", label: "XR" },
  accessories: { bg: "#F7F7F7", chip: "#000000", label: "Accessories" },
};

export const motion = {
  ease: [0.22, 1, 0.36, 1] as const,
  fadeUpMs: 500,
  fadeUpY: 16,
  stepSlidePx: 24,
  colorTweenMs: 300,
  priceCountMs: 400,
  idleResumeMs: 4000,
} as const;

export const radii = {
  card: "0.5rem",
  cardLg: "0.75rem",
  input: "0.5rem",
  pill: "9999px",
} as const;
