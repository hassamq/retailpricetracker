"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useWizardStore } from "@/lib/store";
import { formatCurrency } from "@/lib/format";

type Props = {
  productId: string;
  subtotal?: number;
};

export function PromoCodeInput({ productId, subtotal }: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [whereToUse, setWhereToUse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const promoCode = useWizardStore((s) => s.promoCode);
  const promoDiscount = useWizardStore((s) => s.promoDiscount);
  const setPromo = useWizardStore((s) => s.setPromo);

  const apply = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, productId, subtotal }),
      });
      const data = await res.json();
      if (!data.valid) {
        setError(data.error || "Invalid code");
        setWhereToUse(null);
        return;
      }
      setPromo(data.code, data.discount ?? 0);
      setWhereToUse(data.whereToUse ?? null);
      setCode("");
    } catch {
      setError("Could not validate code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-line bg-paper p-5">
      <p className="text-sm font-bold text-ink">Have a code?</p>
      {promoCode ? (
        <div className="mt-3 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-ink bg-mist px-3 py-1.5 text-sm font-bold text-ink">
            {promoCode}
            {promoDiscount > 0 && (
              <span className="font-semibold">
                −{formatCurrency(promoDiscount)}
              </span>
            )}
            <button
              type="button"
              aria-label="Remove promo code"
              onClick={() => {
                setPromo(null, 0);
                setWhereToUse(null);
              }}
              className="rounded-full p-0.5 hover:bg-paper"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
          {whereToUse && (
            <p className="text-xs leading-relaxed text-muted">{whereToUse}</p>
          )}
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter code"
            className="min-w-[160px] flex-1 rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold uppercase tracking-wide focus:border-ink focus:outline-none"
            aria-label="Promo code"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={apply}
            disabled={!code || loading}
          >
            Apply
          </Button>
        </div>
      )}
      {error && <p className="mt-2 text-xs font-semibold text-danger">{error}</p>}
      <p className="mt-2 text-[11px] text-muted">
        Demo codes — ask Assist for codes and where to redeem them.
      </p>
    </div>
  );
}
