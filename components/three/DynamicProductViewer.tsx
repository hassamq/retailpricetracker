"use client";

import dynamic from "next/dynamic";
import type { Model3dType } from "@/data/products";
import { ProductFallback } from "./ProductFallback";
import { Skeleton } from "@/components/ui/Skeleton";

const ProductViewer = dynamic(
  () =>
    import("./ProductViewer").then((m) => m.ProductViewer),
  {
    ssr: false,
    loading: () => <Skeleton className="h-48 w-full rounded-xl" />,
  },
);

type Props = {
  type: Model3dType;
  color: string;
  glbPath?: string;
  className?: string;
  autoRotate?: boolean;
  size?: "sm" | "md" | "lg";
};

export function DynamicProductViewer(props: Props) {
  return <ProductViewer {...props} />;
}

export function SafeProductPreview(props: Props) {
  return (
    <DynamicProductViewer
      {...props}
      // Fallback tree for environments without WebGL is handled inside ProductViewer
    />
  );
}

export function StaticPreviewFallback({
  type,
  color,
  className,
}: {
  type: Model3dType;
  color: string;
  className?: string;
}) {
  return <ProductFallback type={type} color={color} className={className} />;
}
