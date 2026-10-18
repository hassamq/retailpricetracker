"use client";

import { useState } from "react";
import { ChevronDown, Copy, Check, ExternalLink } from "lucide-react";
import { getProduct } from "@/data/products";
import { getRetailer, resolveOfferUrl } from "@/data/retailers";
import { Tag } from "@/components/ui/Tag";
import { PriceCountUp } from "./PriceCountUp";
import { CalcBreakdown } from "./CalcBreakdown";
import { formatCurrency, cn } from "@/lib/format";
import type { CalculatedOffer } from "@/lib/pricing/types";

type Props = {
  rank: number;
  offer: CalculatedOffer;
  productId: string;
  includeGiftCards: boolean;
  includeTradeIn: boolean;
  promoDiscount: number;
  haveMemberships: boolean;
};

export function OfferRow({
  rank,
  offer,
  productId,
  includeGiftCards,
  includeTradeIn,
  promoDiscount,
  haveMemberships,
}: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const retailer = getRetailer(offer.retailerId);
  const product = getProduct(productId);
  const viewUrl = resolveOfferUrl(
    offer.retailerId,
    product?.name ?? "Samsung Galaxy",
    offer.url,
  );
  const greyed =
    offer.membershipGated && !haveMemberships && offer.listed;

  if (!offer.listed) {
    return (
      <div className="flex items-center gap-3 border-t border-line px-4 py-4 text-sm opacity-60">
        <span className="w-8 tabular-nums text-muted">{rank}</span>
        <span className="font-bold text-ink">{retailer.displayName}</span>
        <span className="text-muted">Not listed</span>
      </div>
    );
  }

  const copyCode = async () => {
    if (!offer.couponCode) return;
    await navigator.clipboard.writeText(offer.couponCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className={cn(
        "border-t border-line",
        offer.isBestValue && "bg-mist",
        offer.isYourStore && "ring-2 ring-inset ring-ink",
        greyed && "opacity-50",
      )}
    >
      <div className="flex flex-col gap-4 px-4 py-4 sm:grid sm:grid-cols-12 sm:items-center sm:gap-2">
        <div className="flex items-start justify-between gap-3 sm:col-span-4 sm:block">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="hidden font-bold tabular-nums text-muted sm:inline">
                {offer.isBestValue ? (
                  <Tag tone="blue">Best</Tag>
                ) : (
                  rank
                )}
              </span>
              <span className="font-bold text-ink">{retailer.displayName}</span>
              {offer.isYourStore && <Tag tone="accent">Your store</Tag>}
              {offer.isBestValue && (
                <span className="sm:hidden">
                  <Tag tone="blue">Best value</Tag>
                </span>
              )}
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-muted">{offer.title}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {offer.couponCode && (
                <button
                  type="button"
                  onClick={copyCode}
                  className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2 py-0.5 text-[11px] font-bold"
                >
                  {copied ? (
                    <Check className="h-3 w-3" strokeWidth={1.5} />
                  ) : (
                    <Copy className="h-3 w-3" strokeWidth={1.5} />
                  )}
                  {offer.couponCode}
                </button>
              )}
              {offer.giftCardValue ? (
                <Tag tone="success">${offer.giftCardValue} gift card</Tag>
              ) : null}
              {offer.membershipRequired && (
                <Tag tone="muted">{offer.membershipRequired}</Tag>
              )}
              {offer.condition === "open-box" && (
                <Tag tone="danger">Open-box</Tag>
              )}
              {offer.matchable && (
                <Tag tone="accent">Matchable at your store</Tag>
              )}
            </div>
          </div>
          <span className="shrink-0 text-right sm:hidden">
            <p className="text-xs text-muted">Net</p>
            <PriceCountUp
              value={offer.netPrice}
              className="text-base font-bold text-ink"
            />
          </span>
        </div>

        <div className="hidden text-right sm:col-span-2 sm:block">
          <p className="text-xs text-muted">Base</p>
          <p className="tabular-nums font-semibold">
            {formatCurrency(offer.basePrice)}
          </p>
        </div>

        <div className="hidden text-right sm:col-span-2 sm:block">
          <p className="text-xs text-muted">Savings</p>
          <p className="tabular-nums font-semibold text-success">
            {offer.savingsVsMsrp > 0
              ? `−${formatCurrency(offer.savingsVsMsrp)}`
              : "—"}
          </p>
        </div>

        <div className="hidden text-right sm:col-span-2 sm:block">
          <p className="text-xs text-muted">Net</p>
          <PriceCountUp
            value={offer.netPrice}
            className="text-base font-bold text-ink"
          />
        </div>

        <div className="flex items-center justify-between gap-2 sm:col-span-2 sm:justify-end">
          <span className="text-xs text-muted">
            {offer.inStock === true
              ? "In stock"
              : offer.inStock === false
                ? "Out of stock"
                : "Stock n/a"}
          </span>
          <div className="flex items-center gap-2">
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-ink bg-ink px-3 py-1.5 text-xs font-bold text-paper transition-colors hover:bg-[#363636]"
            >
              View
              <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
            </a>
            <button
              type="button"
              aria-expanded={open}
              aria-label="Show calculation"
              onClick={() => setOpen((v) => !v)}
              className="rounded-full p-1.5 hover:bg-mist"
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted transition-transform",
                  open && "rotate-180",
                )}
                strokeWidth={1.5}
              />
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4">
          <CalcBreakdown
            offer={offer}
            productId={productId}
            includeGiftCards={includeGiftCards}
            includeTradeIn={includeTradeIn}
            promoDiscount={promoDiscount}
          />
        </div>
      )}
    </div>
  );
}
