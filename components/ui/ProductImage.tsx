"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/format";
import { ProductFallback } from "@/components/three/ProductFallback";
import type { Model3dType } from "@/data/products";

type Props = {
  src?: string;
  alt: string;
  model3d: Model3dType;
  colorHex?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "hero";
  priority?: boolean;
};

const sizes = {
  sm: "aspect-square h-auto min-h-[160px]",
  md: "h-48",
  lg: "h-72",
  hero: "h-[280px] sm:h-[360px]",
};

export function ProductImage({
  src,
  alt,
  model3d,
  colorHex = "#6B6E73",
  className,
  size = "md",
  priority,
}: Props) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex w-full items-center justify-center bg-mist",
          sizes[size],
          className,
        )}
      >
        <ProductFallback type={model3d} color={colorHex} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-mist",
        sizes[size],
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes="(max-width: 768px) 50vw, 320px"
        className="object-contain p-3 transition-transform duration-300 group-hover:scale-[1.03]"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
