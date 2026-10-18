import Link from "next/link";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/format";

type Props = {
  href?: string;
  className?: string;
  invert?: boolean;
};

export function Wordmark({ href = "/", className, invert }: Props) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-baseline gap-1.5", className)}
      aria-label={brand.name}
    >
      <span
        className={cn(
          "text-[1.35rem] font-bold tracking-tight uppercase sm:text-[1.5rem]",
          invert ? "text-paper" : "text-ink",
        )}
      >
        {brand.wordmarkPrefix}
      </span>
      <span
        className={cn(
          "text-[1.35rem] font-light tracking-tight sm:text-[1.5rem]",
          invert ? "text-paper/70" : "text-muted",
        )}
      >
        {brand.wordmarkSuffix}
      </span>
    </Link>
  );
}
