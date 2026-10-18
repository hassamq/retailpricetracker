import type { Model3dType } from "@/data/products";
import { cn } from "@/lib/format";

type Props = {
  type: Model3dType;
  color?: string;
  className?: string;
};

const shapes: Record<Model3dType, string> = {
  tablet: "rounded-lg aspect-[10/14] w-16",
  watch: "rounded-full aspect-square w-14",
  buds: "rounded-2xl aspect-[5/4] w-16",
  ring: "rounded-full aspect-square w-12 ring-4 ring-inset",
  headset: "rounded-3xl aspect-[16/9] w-20",
  pen: "rounded-full aspect-[1/8] w-3 h-20",
  charger: "rounded-xl aspect-square w-12",
  case: "rounded-lg aspect-[10/14] w-14",
};

export function ProductFallback({ type, color = "#6B6E73", className }: Props) {
  return (
    <div
      className={cn("flex items-center justify-center", className)}
      aria-hidden
    >
      <div
        className={cn("border border-black/10 shadow-sm", shapes[type])}
        style={{
          background:
            type === "ring"
              ? `radial-gradient(circle at center, transparent 35%, ${color} 36%)`
              : `linear-gradient(145deg, ${color} 0%, #1a1a1a 100%)`,
        }}
      />
    </div>
  );
}
