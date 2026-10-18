import { z } from "zod";
import type { RetailerId } from "@/data/retailers";
import type { PriceSource } from "@/lib/store";

export const RawListingSchema = z.object({
  title: z.string(),
  source: z.string(),
  price: z.number().nullable(),
  oldPrice: z.number().nullable().optional(),
  link: z.string().optional().default(""),
  extensions: z.array(z.string()).optional().default([]),
  delivery: z.string().nullable().optional(),
  thumbnail: z.string().nullable().optional(),
  productToken: z.string().nullable().optional(),
  secondHandCondition: z.string().nullable().optional(),
});

export type RawListing = z.infer<typeof RawListingSchema>;

export const ExtractedOfferSchema = z.object({
  retailerId: z.string(),
  title: z.string(),
  basePrice: z.number(),
  instantSavings: z.number().default(0),
  couponCode: z.string().nullable(),
  couponValue: z.number().nullable(),
  giftCardValue: z.number().nullable(),
  membershipRequired: z.string().nullable(),
  condition: z.enum(["new", "open-box"]),
  inStock: z.boolean().nullable(),
  url: z.string(),
  notes: z.string().nullable(),
});

export type ExtractedOffer = z.infer<typeof ExtractedOfferSchema>;

export type CalculatedOffer = ExtractedOffer & {
  retailerId: RetailerId;
  netPrice: number;
  listed: boolean;
  matchable: boolean;
  membershipGated: boolean;
  isBestValue: boolean;
  isYourStore: boolean;
  savingsVsMsrp: number;
};

export type PriceMatchVerdict = {
  matchable: boolean;
  summary: string;
  competitorId: RetailerId | null;
  competitorPrice: number | null;
  reason: string;
};

export type PriceComparisonResult = {
  productId: string;
  variant: Record<string, string>;
  offers: CalculatedOffer[];
  bestValue: CalculatedOffer | null;
  verdict: PriceMatchVerdict | null;
  source: PriceSource;
  updatedAt: string;
  resolvedRetailers: RetailerId[];
};
