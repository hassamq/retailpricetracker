"use client";

import type { PriceSource } from "@/lib/store";
import { formatClockTime, formatRelativeTime } from "@/lib/format";

type Props = {
  source: PriceSource;
  updatedAt: string;
};

export function SourceLabel({ source, updatedAt }: Props) {
  if (source === "live") {
    return (
      <span className="text-xs font-semibold text-success">
        Live · updated {formatClockTime(updatedAt)}
      </span>
    );
  }
  if (source === "cache") {
    return (
      <span className="text-xs font-semibold text-muted">
        Cached · {formatRelativeTime(updatedAt)}
      </span>
    );
  }
  return (
    <span className="text-xs font-semibold text-muted">
      Sample data · add SERPAPI_KEY for live retail prices
    </span>
  );
}
