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
        Live · updated {formatClockTime(updatedAt)} · verified retailer pages
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
      Sample data · live prices need Gemini (GOOGLE_API_KEY or Vertex)
    </span>
  );
}
