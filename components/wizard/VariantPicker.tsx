"use client";

import { getProduct } from "@/data/products";
import { useWizardStore } from "@/lib/store";
import { Chip } from "@/components/ui/Chip";
import { ProductImage } from "@/components/ui/ProductImage";

export function VariantPicker() {
  const productId = useWizardStore((s) => s.productId);
  const variant = useWizardStore((s) => s.variant);
  const setVariant = useWizardStore((s) => s.setVariant);
  const product = productId ? getProduct(productId) : undefined;

  if (!product) {
    return (
      <p className="text-sm text-muted">Select a product to configure options.</p>
    );
  }

  const colorHex =
    product.variants.colors.find((c) => c.name === variant.color)?.hex ??
    product.variants.colors[0]?.hex;

  const imageSrc =
    (variant.color && product.imagesByColor?.[variant.color]) ||
    product.image ||
    undefined;

  const sections: Array<{
    key: "storage" | "connectivity" | "size";
    label: string;
    options?: string[];
  }> = [
    { key: "storage", label: "Storage", options: product.variants.storage },
    {
      key: "connectivity",
      label: "Connectivity",
      options: product.variants.connectivity,
    },
    { key: "size", label: "Size", options: product.variants.size },
  ];

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <div className="bg-mist p-6 lg:col-span-5">
        <ProductImage
          src={imageSrc}
          alt={product.name}
          model3d={product.model3d}
          colorHex={colorHex}
          size="lg"
          className="rounded-none bg-transparent"
          priority
        />
      </div>

      <div className="space-y-7 lg:col-span-7">
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-ink">
            {product.name}
          </h3>
          <p className="mt-2 text-sm text-muted">
            {product.keySpecs.join(" · ")}
          </p>
        </div>

        {sections.map(
          (section) =>
            section.options &&
            section.options.length > 0 && (
              <div key={section.key}>
                <p className="mb-2 text-xs font-bold tracking-widest text-muted uppercase">
                  {section.label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {section.options.map((opt) => (
                    <Chip
                      key={opt}
                      selected={variant[section.key] === opt}
                      onClick={() => setVariant({ [section.key]: opt })}
                    >
                      {opt}
                    </Chip>
                  ))}
                </div>
              </div>
            ),
        )}

        <div>
          <p className="mb-2 text-xs font-bold tracking-widest text-muted uppercase">
            Color
          </p>
          <div className="flex flex-wrap gap-2">
            {product.variants.colors.map((c) => (
              <Chip
                key={c.name}
                selected={variant.color === c.name}
                onClick={() => setVariant({ color: c.name })}
                className="gap-2"
              >
                <span
                  className="h-3 w-3 rounded-full border border-black/10"
                  style={{ backgroundColor: c.hex }}
                  aria-hidden
                />
                {c.name}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function isVariantComplete(productId: string | null): boolean {
  if (!productId) return false;
  const product = getProduct(productId);
  if (!product) return false;
  const variant = useWizardStore.getState().variant;
  if (product.variants.storage && !variant.storage) return false;
  if (product.variants.connectivity && !variant.connectivity) return false;
  if (product.variants.size && !variant.size) return false;
  if (product.variants.colors.length && !variant.color) return false;
  return true;
}
