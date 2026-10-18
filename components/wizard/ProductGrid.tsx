"use client";

import { getProductsByCategory, formatMsrp, type Product } from "@/data/products";
import { useWizardStore } from "@/lib/store";
import { cn } from "@/lib/format";
import { ProductImage } from "@/components/ui/ProductImage";

type Props = {
  onSelect?: (product: Product) => void;
};

export function ProductGrid({ onSelect }: Props) {
  const category = useWizardStore((s) => s.category) ?? "tab";
  const productId = useWizardStore((s) => s.productId);
  const setProductId = useWizardStore((s) => s.setProductId);
  const setCategory = useWizardStore((s) => s.setCategory);

  const items = getProductsByCategory(category);

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((product) => {
        const selected = product.id === productId;
        return (
          <button
            key={product.id}
            type="button"
            onClick={() => {
              setCategory(product.category);
              setProductId(product.id);
              onSelect?.(product);
            }}
            className={cn(
              "group flex flex-col text-left transition-opacity",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4",
              selected ? "opacity-100" : "hover:opacity-90",
            )}
            aria-pressed={selected}
          >
            <div
              className={cn(
                "mb-4 overflow-hidden bg-mist transition-shadow",
                selected && "ring-2 ring-ink ring-offset-2",
              )}
            >
              <ProductImage
                src={product.image || undefined}
                alt={product.name}
                model3d={product.model3d}
                colorHex={product.variants.colors[0]?.hex}
                size="sm"
                className="rounded-none bg-mist"
              />
            </div>
            <div className="mt-auto space-y-1">
              <h3 className="text-sm font-bold leading-snug text-ink">
                {product.name}
              </h3>
              <p className="text-base font-bold tabular-nums text-ink">
                {formatMsrp(product.msrp)}
              </p>
              <p className="text-[11px] text-muted">MSRP · starting</p>
              <span
                className={cn(
                  "mt-3 inline-flex rounded-full px-5 py-2 text-xs font-bold transition-colors",
                  selected
                    ? "bg-ink text-paper"
                    : "border border-ink bg-paper text-ink group-hover:bg-ink group-hover:text-paper",
                )}
              >
                {selected ? "Selected" : "Select"}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
