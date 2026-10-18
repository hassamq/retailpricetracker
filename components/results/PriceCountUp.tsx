"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/format";
import { motion as motionTokens } from "@/lib/brand";

type Props = {
  value: number;
  className?: string;
};

export function PriceCountUp({ value, className }: Props) {
  const [display, setDisplay] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
  }, []);

  useEffect(() => {
    if (reduced || !Number.isFinite(value)) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const from = 0;
    const duration = motionTokens.priceCountMs;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced]);

  if (!Number.isFinite(value)) {
    return <span className={className}>—</span>;
  }

  return (
    <span className={`tabular-nums ${className ?? ""}`}>
      {formatCurrency(display)}
    </span>
  );
}
