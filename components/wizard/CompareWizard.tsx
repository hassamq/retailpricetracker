"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { StepIndicator } from "@/components/layout/StepIndicator";
import { CategoryTabs } from "./CategoryTabs";
import { ProductGrid } from "./ProductGrid";
import { VariantPicker, isVariantComplete } from "./VariantPicker";
import { StorePicker } from "./StorePicker";
import { Button } from "@/components/ui/Button";
import { useWizardStore, type WizardStep } from "@/lib/store";
import { getProduct } from "@/data/products";
import { getRetailer } from "@/data/retailers";
import { motion as motionTokens } from "@/lib/brand";
import { ResultsPanel } from "@/components/results/ResultsPanel";

type Props = {
  resultsSlot?: React.ReactNode;
};

export function CompareWizard({ resultsSlot }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const step = useWizardStore((s) => s.step);
  const setStep = useWizardStore((s) => s.setStep);
  const productId = useWizardStore((s) => s.productId);
  const variant = useWizardStore((s) => s.variant);
  const storeId = useWizardStore((s) => s.storeId);
  const category = useWizardStore((s) => s.category);
  const hydrateFromParams = useWizardStore((s) => s.hydrateFromParams);

  useEffect(() => {
    hydrateFromParams(searchParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (productId) params.set("product", productId);
    if (variant.storage) params.set("storage", variant.storage);
    if (variant.connectivity) params.set("connectivity", variant.connectivity);
    if (variant.size) params.set("size", variant.size);
    if (variant.color) params.set("color", variant.color);
    if (storeId) params.set("store", storeId);
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/", { scroll: false });
  }, [category, productId, variant, storeId, router]);

  const product = productId ? getProduct(productId) : undefined;
  const store = storeId ? getRetailer(storeId) : undefined;
  const variantReady = isVariantComplete(productId);

  const canNext = useMemo(() => {
    if (step === 1) return Boolean(productId);
    if (step === 2) return variantReady;
    if (step === 3) return true; // store is optional — Skip is allowed
    return false;
  }, [step, productId, variantReady]);

  const skipStore = useWizardStore((s) => s.skipStore);

  const goNext = () => {
    if (step === 3) {
      if (storeId) setStep(4);
      else skipStore();
      return;
    }
    if (step < 4 && canNext) setStep((step + 1) as WizardStep);
  };

  const goBack = () => {
    if (step > 1) setStep((step - 1) as WizardStep);
  };

  return (
    <div>
      <StepIndicator
        current={step}
        onJump={(s) => {
          if (s < step) setStep(s);
        }}
      />

      <div className="bg-paper">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: motionTokens.stepSlidePx }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -motionTokens.stepSlidePx }}
            transition={{
              duration: 0.35,
              ease: motionTokens.ease,
            }}
          >
            {step === 1 && (
              <section id="products">
                <Header
                  title="Select product"
                  subtitle="Choose a device for a cross-retailer price check"
                  meta={product?.name}
                />
                <div className="mb-8">
                  <CategoryTabs />
                </div>
                <ProductGrid />
              </section>
            )}

            {step === 2 && (
              <section>
                <Header
                  title="Configure"
                  subtitle="Pick the exact variant you need"
                  meta={
                    variant.color
                      ? [variant.storage, variant.connectivity, variant.size, variant.color]
                          .filter(Boolean)
                          .join(" · ")
                      : undefined
                  }
                />
                <VariantPicker />
              </section>
            )}

            {step === 3 && (
              <section>
                <Header
                  title="Select your store"
                  meta={store?.displayName}
                />
                <StorePicker />
              </section>
            )}

            {step === 4 && (
              <section>{resultsSlot ?? <ResultsPanel />}</section>
            )}
          </motion.div>
        </AnimatePresence>

        {step < 4 && (
          <div className="mt-10 flex items-center justify-between border-t border-line pt-6">
            <Button
              variant="ghost"
              onClick={goBack}
              disabled={step === 1}
              aria-label="Previous step"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
              Back
            </Button>
            <Button variant="primary" onClick={goNext} disabled={!canNext}>
              {step === 3 ? "Retrieve & compare" : "Continue"}
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Header({
  title,
  subtitle,
  meta,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-2 text-sm text-muted">{subtitle}</p>
        ) : null}
      </div>
      {meta && (
        <span className="shrink-0 text-sm font-semibold text-ink">{meta}</span>
      )}
    </div>
  );
}
