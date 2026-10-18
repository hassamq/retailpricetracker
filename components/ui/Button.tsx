"use client";

import { cn } from "@/lib/format";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "blue" | "ghost" | "outline";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
};

const variants: Record<Variant, string> = {
  primary:
    "bg-ink text-paper hover:bg-[#363636] focus-visible:ring-ink",
  blue: "bg-brand-blue text-paper hover:bg-brand-navy focus-visible:ring-brand-blue",
  ghost: "bg-transparent text-ink hover:bg-mist focus-visible:ring-ink",
  outline:
    "bg-paper text-ink border border-ink hover:bg-mist focus-visible:ring-ink",
};

const sizes = {
  sm: "px-4 py-2 text-xs",
  md: "px-6 py-2.5 text-sm",
  lg: "px-8 py-3.5 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  disabled,
  ...props
}: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-bold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:opacity-40 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
