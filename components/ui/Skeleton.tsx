import { cn } from "@/lib/format";

type Props = {
  className?: string;
};

export function Skeleton({ className }: Props) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-mist",
        className,
      )}
      aria-hidden
    />
  );
}
