"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { getProduct, categoryLabels } from "@/data/products";
import { getRetailer } from "@/data/retailers";
import { useWizardStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { Toggle } from "@/components/ui/Toggle";
import { ProductImage } from "@/components/ui/ProductImage";
import type { PriceComparisonResult } from "@/lib/pricing/types";
import { VerdictCard } from "./VerdictCard";
import { ComparisonMatrix } from "./ComparisonMatrix";
import { PromoCodeInput } from "./PromoCodeInput";
import { SourceLabel } from "./SourceLabel";
import { ResultsSkeleton } from "./ResultsSkeleton";
import { RetailerChecklist } from "./RetailerChecklist";

export function ResultsPanel() {
  const productId = useWizardStore((s) => s.productId);
  const variant = useWizardStore((s) => s.variant);
  const storeId = useWizardStore((s) => s.storeId);
  const includeGiftCards = useWizardStore((s) => s.includeGiftCards);
  const includeTradeIn = useWizardStore((s) => s.includeTradeIn);
  const haveMemberships = useWizardStore((s) => s.haveMemberships);
  const promoDiscount = useWizardStore((s) => s.promoDiscount);
  const setIncludeGiftCards = useWizardStore((s) => s.setIncludeGiftCards);
  const setIncludeTradeIn = useWizardStore((s) => s.setIncludeTradeIn);
  const setHaveMemberships = useWizardStore((s) => s.setHaveMemberships);
  const setPriceMeta = useWizardStore((s) => s.setPriceMeta);
  const setStep = useWizardStore((s) => s.setStep);

  const [data, setData] = useState<PriceComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const product = productId ? getProduct(productId) : undefined;
  const store = storeId ? getRetailer(storeId) : undefined;

  const fetchPrices = useCallback(
    async (forceRefresh = false) => {
      if (!productId) return;
      if (forceRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId,
            variant,
            storeId,
            includeGiftCards,
            includeTradeIn,
            haveMemberships,
            promoDiscount,
            forceRefresh,
          }),
        });
        const json = (await res.json()) as PriceComparisonResult & {
          error?: string;
        };
        if (json.error && res.status === 429) {
          setError(json.error);
          return;
        }
        setData(json);
        setPriceMeta(json.source, json.updatedAt);
      } catch {
        setError(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      productId,
      variant,
      storeId,
      includeGiftCards,
      includeTradeIn,
      haveMemberships,
      promoDiscount,
      setPriceMeta,
    ],
  );

  useEffect(() => {
    void fetchPrices(false);
  }, [fetchPrices]);

  if (!product) {
    return (
      <p className="text-sm text-muted">
        Complete the previous steps to compare prices.
      </p>
    );
  }

  const colorHex =
    product.variants.colors.find((c) => c.name === variant.color)?.hex ??
    product.variants.colors[0]?.hex ??
    "#6B6E73";

  const variantLabel = [
    variant.storage,
    variant.connectivity,
    variant.size,
    variant.color,
  ]
    .filter(Boolean)
    .join(" · ");

  if (loading && !data) {
    return <ResultsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-line pb-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="w-full max-w-[180px] shrink-0 overflow-hidden bg-mist">
            <ProductImage
              src={
                (variant.color && product.imagesByColor?.[variant.color]) ||
                product.image ||
                undefined
              }
              alt={product.name}
              model3d={product.model3d}
              colorHex={colorHex}
              size="sm"
              className="rounded-none"
              priority
            />
          </div>
          <div className="min-w-0 flex-1">
            <Tag tone="muted" className="mb-2 normal-case tracking-normal">
              {categoryLabels[product.category]}
            </Tag>
            <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {product.name}
            </h2>
            <p className="mt-1 text-sm text-muted">{variantLabel}</p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {store
                ? `Your store: ${store.displayName}`
                : "No store selected — price match tips are generic"}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {data && (
                <SourceLabel source={data.source} updatedAt={data.updatedAt} />
              )}
              {data && (
                <RetailerChecklist resolved={data.resolvedRetailers} />
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                New search
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void fetchPrices(true)}
                disabled={refreshing}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                  strokeWidth={1.5}
                />
                Refresh prices
              </Button>
            </div>
            {error && (
              <p className="mt-2 text-xs font-semibold text-danger">{error}</p>
            )}
          </div>
        </div>
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap gap-6 border border-line bg-mist px-5 py-4">
        <Toggle
          label="Count gift cards as savings"
          checked={includeGiftCards}
          onChange={setIncludeGiftCards}
        />
        <Toggle
          label="Include trade-in"
          checked={includeTradeIn}
          onChange={setIncludeTradeIn}
        />
        <Toggle
          label="I have memberships"
          checked={haveMemberships}
          onChange={setHaveMemberships}
        />
      </div>

      {data && (
        <>
          <VerdictCard
            bestValue={data.bestValue}
            verdict={data.verdict}
            msrp={product.msrp}
            storeName={store?.displayName ?? "Any store"}
          />

          <ComparisonMatrix
            offers={data.offers}
            productId={product.id}
            includeGiftCards={includeGiftCards}
            includeTradeIn={includeTradeIn}
            promoDiscount={promoDiscount}
            haveMemberships={haveMemberships}
          />

          <PromoCodeInput
            productId={product.id}
            subtotal={data.bestValue?.netPrice}
          />
        </>
      )}
    </div>
  );
}
