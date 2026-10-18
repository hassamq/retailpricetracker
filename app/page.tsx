import { Suspense } from "react";
import { CompareWizard } from "@/components/wizard/CompareWizard";
import { Skeleton } from "@/components/ui/Skeleton";
import { brand } from "@/lib/brand";

export const metadata = {
  title: `${brand.name} | Live Price Match & Comparison`,
  description: brand.subline,
};

export default function HomePage() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Price check
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted sm:text-base">
          Select a product, configure the variant, pick your store, then compare
          net prices lowest to highest.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="mx-auto h-8 w-96" />
            <Skeleton className="h-96 w-full" />
          </div>
        }
      >
        <CompareWizard />
      </Suspense>
    </div>
  );
}
