import Link from "next/link";
import { brand } from "@/lib/brand";
import { nationalRetailers } from "@/data/retailers";
import { categoryLabels, products } from "@/data/products";
import { Wordmark } from "./Wordmark";

export function Footer() {
  const categories = Object.entries(categoryLabels);

  return (
    <footer className="mt-auto border-t border-line bg-paper">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:px-10">
        <div className="lg:col-span-4">
          <Wordmark />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted">
            Price check for retail staff and shoppers. Six national retailers,
            net effective pricing, and price-match eligibility.
          </p>
        </div>

        <div className="lg:col-span-2">
          <h3 className="text-xs font-bold tracking-widest text-ink uppercase">
            Products
          </h3>
          <ul className="mt-4 space-y-2.5">
            {categories.map(([id, label]) => (
              <li key={id}>
                <Link
                  href={`/?category=${id}`}
                  className="text-sm text-muted transition-colors hover:text-ink"
                >
                  {label}
                  <span className="ml-1 text-xs text-[#AAAAAA]">
                    ({products.filter((p) => p.category === id).length})
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-3">
          <h3 className="text-xs font-bold tracking-widest text-ink uppercase">
            Retailers
          </h3>
          <ul className="mt-4 space-y-2.5">
            {nationalRetailers.map((r) => (
              <li key={r.id} className="text-sm text-muted">
                {r.displayName}
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-3">
          <h3 className="text-xs font-bold tracking-widest text-ink uppercase">
            About this demo
          </h3>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Built for a dealership interview walkthrough. Uses Gemini search
            grounding for live prices when a key is present; otherwise runs
            on recorded sample data so the demo never breaks.
          </p>
        </div>
      </div>

      <div className="border-t border-line bg-mist">
        <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10">
          <p className="text-xs leading-relaxed text-muted">{brand.disclaimer}</p>
        </div>
      </div>
    </footer>
  );
}
