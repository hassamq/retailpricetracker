export type ProductCategory =
  | "tab"
  | "watch"
  | "buds"
  | "ring"
  | "xr"
  | "accessories";

export type Model3dType =
  | "tablet"
  | "watch"
  | "buds"
  | "ring"
  | "headset"
  | "pen"
  | "charger"
  | "case";

export type ProductColor = {
  name: string;
  hex: string;
};

export type ProductVariants = {
  storage?: string[];
  connectivity?: string[];
  size?: string[];
  colors: ProductColor[];
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  msrp: number;
  variants: ProductVariants;
  searchTemplate: string;
  excludeKeywords: string[];
  keySpecs: string[];
  modelTokens: string[];
  model3d: Model3dType;
  /** Official product shot from Samsung (local /public/products or remote CDN). */
  image: string;
  /** Optional color-specific shots keyed by color name. */
  imagesByColor?: Record<string, string>;
  glbPath?: string;
};

/**
 * Accessory-only / condition excludes.
 * Avoid bare words like "case" or "keyboard" — retailers often sell the tablet
 * bundled with a keyboard cover, and those must still show as prices.
 */
const COMMON_EXCLUDES = [
  "case only",
  "keyboard only",
  "cover only",
  "screen protector",
  "protective case",
  "renewed",
  "refurbished",
  "used",
  "for parts",
  "pre-owned",
  "compatible with",
  "replacement band",
  "folio only",
  "charger only",
  "sizing kit",
];

export const categoryLabels: Record<ProductCategory, string> = {
  tab: "Tab",
  watch: "Watch",
  buds: "Buds",
  ring: "Ring",
  xr: "XR",
  accessories: "Accessories",
};

export const products: Product[] = [
  // Galaxy Tab
  {
    id: "tab-s11-ultra",
    slug: "galaxy-tab-s11-ultra",
    name: "Galaxy Tab S11 Ultra",
    category: "tab",
    msrp: 1299.99,
    variants: {
      storage: ["256GB", "512GB", "1TB"],
      connectivity: ["Wi-Fi", "5G"],
      colors: [
        { name: "Moonstone Gray", hex: "#6B6E73" },
        { name: "Silver Shadow", hex: "#C0C4C8" },
      ],
    },
    searchTemplate: "Samsung Galaxy Tab S11 Ultra {storage} {connectivity}",
    excludeKeywords: COMMON_EXCLUDES,
    keySpecs: ['14.6" Dynamic AMOLED 2X', "Snapdragon 8 Elite", "S Pen included", "12,000 mAh"],
    modelTokens: ["Tab", "S11", "Ultra"],

    image: "/products/tab-s11-ultra.png",

    model3d: "tablet",
  },
  {
    id: "tab-s11-plus",
    slug: "galaxy-tab-s11-plus",
    name: "Galaxy Tab S11+",
    category: "tab",
    msrp: 999.99,
    variants: {
      storage: ["256GB", "512GB"],
      connectivity: ["Wi-Fi", "5G"],
      colors: [
        { name: "Moonstone Gray", hex: "#6B6E73" },
        { name: "Silver Shadow", hex: "#C0C4C8" },
      ],
    },
    searchTemplate: "Samsung Galaxy Tab S11+ {storage} {connectivity}",
    excludeKeywords: COMMON_EXCLUDES,
    keySpecs: ['12.4" Dynamic AMOLED 2X', "Snapdragon 8 Elite", "S Pen included", "10,090 mAh"],
    modelTokens: ["Tab", "S11+"],

    image: "/products/tab-s11-plus.png",

    model3d: "tablet",
  },
  {
    id: "tab-s11",
    slug: "galaxy-tab-s11",
    name: "Galaxy Tab S11",
    category: "tab",
    msrp: 799.99,
    variants: {
      storage: ["128GB", "256GB"],
      connectivity: ["Wi-Fi", "5G"],
      colors: [
        { name: "Graphite", hex: "#4A4A4A" },
        { name: "Silver", hex: "#C8C8C8" },
      ],
    },
    searchTemplate: "Samsung Galaxy Tab S11 {storage} {connectivity}",
    excludeKeywords: COMMON_EXCLUDES,
    keySpecs: ['11" Dynamic AMOLED 2X', "Snapdragon 8 Elite", "S Pen support", "8,000 mAh"],
    modelTokens: ["Tab", "S11"],

    image: "/products/tab-s11.png",

    model3d: "tablet",
  },
  {
    id: "tab-s10-fe",
    slug: "galaxy-tab-s10-fe",
    name: "Galaxy Tab S10 FE",
    category: "tab",
    msrp: 499.99,
    variants: {
      storage: ["128GB", "256GB"],
      connectivity: ["Wi-Fi", "5G"],
      colors: [
        { name: "Gray", hex: "#6E6E6E" },
        { name: "Blue", hex: "#5B7C99" },
        { name: "Lavender", hex: "#B8A9C9" },
      ],
    },
    searchTemplate: "Samsung Galaxy Tab S10 FE {storage} {connectivity}",
    excludeKeywords: [...COMMON_EXCLUDES, "Ultra", "Plus", "S10+"],
    keySpecs: ['10.9" LCD', "Exynos 1580", "S Pen included", "IP68"],
    modelTokens: ["Tab", "S10", "FE"],

    image: "/products/tab-s10-fe.png",

    model3d: "tablet",
  },

  // Galaxy Watch
  {
    id: "watch-ultra-2025",
    slug: "galaxy-watch-ultra",
    name: "Galaxy Watch Ultra",
    category: "watch",
    msrp: 649.99,
    variants: {
      size: ["47mm"],
      connectivity: ["Bluetooth", "LTE"],
      colors: [
        { name: "Titanium Gray", hex: "#8A8D91" },
        { name: "Titanium White", hex: "#E8E8E4" },
        { name: "Titanium Black", hex: "#2C2C2C" },
      ],
    },
    searchTemplate: "Samsung Galaxy Watch Ultra {size} {connectivity}",
    excludeKeywords: [...COMMON_EXCLUDES, "band", "strap", "charger"],
    keySpecs: ["47mm titanium", "Sapphire crystal", "100m water", "Wear OS"],
    modelTokens: ["Watch", "Ultra"],

    image: "/products/watch-ultra.png",

    model3d: "watch",
  },
  {
    id: "watch-classic",
    slug: "galaxy-watch-classic",
    name: "Galaxy Watch Classic",
    category: "watch",
    msrp: 449.99,
    variants: {
      size: ["43mm", "47mm"],
      connectivity: ["Bluetooth", "LTE"],
      colors: [
        { name: "Black", hex: "#1A1A1A" },
        { name: "Silver", hex: "#C0C0C0" },
      ],
    },
    searchTemplate: "Samsung Galaxy Watch Classic {size} {connectivity}",
    excludeKeywords: [...COMMON_EXCLUDES, "band", "strap", "charger", "Ultra"],
    keySpecs: ["Rotating bezel", "Sapphire crystal", "Wear OS", "BioActive sensor"],
    modelTokens: ["Watch", "Classic"],

    image: "/products/watch-classic.png",

    model3d: "watch",
  },
  {
    id: "watch7",
    slug: "galaxy-watch7",
    name: "Galaxy Watch7",
    category: "watch",
    msrp: 299.99,
    variants: {
      size: ["40mm", "44mm"],
      connectivity: ["Bluetooth", "LTE"],
      colors: [
        { name: "Green", hex: "#4A5D4E" },
        { name: "Cream", hex: "#E8DCC8" },
        { name: "Silver", hex: "#B8BCC0" },
      ],
    },
    searchTemplate: "Samsung Galaxy Watch7 {size} {connectivity}",
    excludeKeywords: [...COMMON_EXCLUDES, "band", "strap", "charger", "Ultra", "Classic"],
    keySpecs: ["Energy Score", "Sleep Apnea detect", "Wear OS", "Fast charging"],
    modelTokens: ["Watch7"],

    image: "/products/watch7.png",

    model3d: "watch",
  },

  // Galaxy Buds
  {
    id: "buds4-pro",
    slug: "galaxy-buds4-pro",
    name: "Galaxy Buds4 Pro",
    category: "buds",
    msrp: 249.99,
    variants: {
      colors: [
        { name: "Silver Shadow", hex: "#A8ACB0" },
        { name: "Graphite", hex: "#3D3D3D" },
        { name: "White", hex: "#F5F5F5" },
      ],
    },
    searchTemplate: "Samsung Galaxy Buds4 Pro",
    excludeKeywords: [...COMMON_EXCLUDES, "tips", "wing", "charging case only"],
    keySpecs: ["Adaptive ANC", "24-bit Hi-Fi", "IP57", "Galaxy AI"],
    modelTokens: ["Buds4", "Pro"],

    image: "/products/buds4-pro.png",

    model3d: "buds",
  },
  {
    id: "buds-fe2",
    slug: "galaxy-buds-fe2",
    name: "Galaxy Buds3 FE",
    category: "buds",
    msrp: 99.99,
    variants: {
      colors: [
        { name: "Graphite", hex: "#3D3D3D" },
        { name: "White", hex: "#F5F5F5" },
      ],
    },
    searchTemplate: "Samsung Galaxy Buds3 FE",
    excludeKeywords: [...COMMON_EXCLUDES, "Pro", "tips"],
    keySpecs: ["Active Noise Canceling", "Ambient mode", "IPX2", "Long battery"],
    modelTokens: ["Buds3", "FE"],

    image: "/products/buds-fe2.png",

    model3d: "buds",
  },
  {
    id: "buds3",
    slug: "galaxy-buds3",
    name: "Galaxy Buds4",
    category: "buds",
    msrp: 179.99,
    variants: {
      colors: [
        { name: "Silver", hex: "#C0C4C8" },
        { name: "White", hex: "#F5F5F5" },
      ],
    },
    searchTemplate: "Samsung Galaxy Buds4",
    excludeKeywords: [...COMMON_EXCLUDES, "Pro", "FE", "tips"],
    keySpecs: ["Blade design", "ANC", "360 Audio", "IP57"],
    modelTokens: ["Buds4"],

    image: "/products/buds3.png",

    model3d: "buds",
  },

  // Galaxy Ring
  {
    id: "galaxy-ring",
    slug: "galaxy-ring",
    name: "Galaxy Ring",
    category: "ring",
    msrp: 399.99,
    variants: {
      size: ["5", "6", "7", "8", "9", "10", "11", "12", "13"],
      colors: [
        { name: "Titanium Black", hex: "#2A2A2A" },
        { name: "Titanium Silver", hex: "#C8C8C8" },
        { name: "Titanium Gold", hex: "#C5A572" },
      ],
    },
    searchTemplate: "Samsung Galaxy Ring size {size}",
    excludeKeywords: [...COMMON_EXCLUDES, "charger only", "sizing kit"],
    keySpecs: ["Sleep & energy", "Titanium build", "Up to 7 days", "Water resistant"],
    modelTokens: ["Galaxy", "Ring"],

    image: "/products/galaxy-ring.png",

    model3d: "ring",
  },

  // Galaxy XR
  {
    id: "galaxy-xr",
    slug: "galaxy-xr",
    name: "Galaxy XR",
    category: "xr",
    msrp: 1799.99,
    variants: {
      storage: ["256GB", "512GB"],
      colors: [{ name: "Silver", hex: "#D0D4D8" }],
    },
    searchTemplate: "Samsung Galaxy XR {storage}",
    excludeKeywords: [...COMMON_EXCLUDES, "controller", "lens"],
    keySpecs: ["Micro-OLED dual display", "Spatial audio", "Hand tracking", "Android XR"],
    modelTokens: ["Galaxy", "XR"],

    image: "/products/galaxy-xr.png",

    model3d: "headset",
  },

  // Accessories
  {
    id: "s-pen-pro",
    slug: "s-pen-pro",
    name: "S Pen Pro",
    category: "accessories",
    msrp: 99.99,
    variants: {
      colors: [{ name: "Black", hex: "#1A1A1A" }],
    },
    searchTemplate: "Samsung S Pen Pro",
    excludeKeywords: ["refurbished", "used", "compatible", "third party", "for parts"],
    keySpecs: ["Bluetooth remote", "Air actions", "USB-C charge", "Universal"],
    modelTokens: ["S Pen", "Pro"],

    image: "",

    model3d: "pen",
  },
  {
    id: "45w-charger",
    slug: "45w-super-fast-charger",
    name: "45W Super Fast Charger",
    category: "accessories",
    msrp: 49.99,
    variants: {
      colors: [{ name: "Black", hex: "#1A1A1A" }],
    },
    searchTemplate: "Samsung 45W Super Fast Charger USB-C",
    excludeKeywords: ["refurbished", "used", "compatible", "third party", "cable only"],
    keySpecs: ["45W PD PPS", "USB-C", "Compact", "Official"],
    modelTokens: ["45W", "Super Fast", "Charger"],

    image: "",

    model3d: "charger",
  },
  {
    id: "clear-case-tab",
    slug: "clear-case-tab-s11",
    name: "Clear Case for Tab S11",
    category: "accessories",
    msrp: 59.99,
    variants: {
      colors: [
        { name: "Clear", hex: "#E8EEF4" },
        { name: "Black", hex: "#1A1A1A" },
      ],
    },
    searchTemplate: "Samsung Clear Case Galaxy Tab S11",
    excludeKeywords: ["refurbished", "used", "compatible", "third party", "keyboard"],
    keySpecs: ["Official Samsung", "Slim profile", "Drop protection", "Precise cutouts"],
    modelTokens: ["Clear", "Case", "Tab"],

    image: "",

    model3d: "case",
  },
];

export function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductsByCategory(category: ProductCategory): Product[] {
  return products.filter((p) => p.category === category);
}

export function buildSearchQuery(
  product: Product,
  variant: Record<string, string>,
): string {
  let query = product.searchTemplate;
  for (const [key, value] of Object.entries(variant)) {
    query = query.replace(`{${key}}`, value);
  }
  return query.replace(/\s*\{[^}]+\}\s*/g, " ").replace(/\s+/g, " ").trim();
}

export function formatMsrp(msrp: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(msrp);
}
