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
  if (source === "fixture") {
    return (
      <span className="text-xs font-semibold text-muted">
        Sample data · live lookup returned no offers
      </span>
    );
  }
  return (
    <span className="text-xs font-semibold text-muted">
      Sample data · set SERPAPI_KEY and USE_MOCK_DATA=false
    </span>
  );
}
