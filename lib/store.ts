"use client";

import { create } from "zustand";
import type { ProductCategory } from "@/data/products";
import type { RetailerId } from "@/data/retailers";

export type VariantSelection = {
  storage?: string;
  connectivity?: string;
  size?: string;
  color?: string;
};

export type PriceSource = "live" | "cache" | "fixture" | "mock";

export type WizardStep = 1 | 2 | 3 | 4;

type WizardState = {
  step: WizardStep;
  category: ProductCategory | null;
  productId: string | null;
  variant: VariantSelection;
  storeId: RetailerId | null;
  includeGiftCards: boolean;
  includeTradeIn: boolean;
  haveMemberships: boolean;
  promoCode: string | null;
  promoDiscount: number;
  priceSource: PriceSource | null;
  priceUpdatedAt: string | null;
  chatOpen: boolean;

  setStep: (step: WizardStep) => void;
  setCategory: (category: ProductCategory) => void;
  setProductId: (productId: string | null) => void;
  setVariant: (variant: Partial<VariantSelection>) => void;
  resetVariant: () => void;
  setStoreId: (storeId: RetailerId | null) => void;
  skipStore: () => void;
  setIncludeGiftCards: (v: boolean) => void;
  setIncludeTradeIn: (v: boolean) => void;
  setHaveMemberships: (v: boolean) => void;
  setPromo: (code: string | null, discount: number) => void;
  setPriceMeta: (source: PriceSource, updatedAt: string) => void;
  setChatOpen: (open: boolean) => void;
  applySelection: (opts: {
    productId?: string;
    variant?: Partial<VariantSelection>;
    storeId?: RetailerId;
    category?: ProductCategory;
  }) => void;
  hydrateFromParams: (params: URLSearchParams) => void;
};

export const useWizardStore = create<WizardState>((set, get) => ({
  step: 1,
  category: null,
  productId: null,
  variant: {},
  storeId: null,
  includeGiftCards: true,
  includeTradeIn: false,
  haveMemberships: true,
  promoCode: null,
  promoDiscount: 0,
  priceSource: null,
  priceUpdatedAt: null,
  chatOpen: false,

  setStep: (step) => set({ step }),
  setCategory: (category) => set({ category, step: 1 }),
  setProductId: (productId) =>
    set({
      productId,
      variant: {},
      step: productId ? 2 : 1,
    }),
  setVariant: (variant) =>
    set({ variant: { ...get().variant, ...variant } }),
  resetVariant: () => set({ variant: {} }),
  setStoreId: (storeId) => set({ storeId, step: storeId ? 4 : 3 }),
  skipStore: () => set({ storeId: null, step: 4 }),
  setIncludeGiftCards: (includeGiftCards) => set({ includeGiftCards }),
  setIncludeTradeIn: (includeTradeIn) => set({ includeTradeIn }),
  setHaveMemberships: (haveMemberships) => set({ haveMemberships }),
  setPromo: (promoCode, promoDiscount) => set({ promoCode, promoDiscount }),
  setPriceMeta: (priceSource, priceUpdatedAt) =>
    set({ priceSource, priceUpdatedAt }),
  setChatOpen: (chatOpen) => set({ chatOpen }),

  applySelection: ({ productId, variant, storeId, category }) => {
    const next: Partial<WizardState> = {};
    if (category) next.category = category;
    if (productId) {
      next.productId = productId;
      next.step = 2;
    }
    if (variant) next.variant = { ...get().variant, ...variant };
    if (storeId) {
      next.storeId = storeId;
      next.step = 4;
    }
    set(next);
  },

  hydrateFromParams: (params) => {
    const product = params.get("product");
    const store = params.get("store") as RetailerId | null;
    const storage = params.get("storage") ?? undefined;
    const connectivity = params.get("connectivity") ?? undefined;
    const size = params.get("size") ?? undefined;
    const color = params.get("color") ?? undefined;
    const category = params.get("category") as ProductCategory | null;

    const compare = params.get("compare") === "1";
    set({
      productId: product,
      storeId: store,
      category: category,
      variant: { storage, connectivity, size, color },
      // Store is optional — compare=1 (or a selected store) opens results
      step: product && (store || compare) ? 4 : product ? 2 : 1,
    });
  },
}));
