"use client";

import { Chip } from "@/components/ui/Chip";

const STARTERS = [
  "Best price on Galaxy Buds right now",
  "Can Best Buy match Amazon on the Watch Ultra?",
  "Any coupons for the Tab S11?",
];

type Props = {
  onSelect: (text: string) => void;
  disabled?: boolean;
};

export function StarterChips({ onSelect, disabled }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {STARTERS.map((s) => (
        <Chip key={s} disabled={disabled} onClick={() => onSelect(s)} className="text-xs">
          {s}
        </Chip>
      ))}
    </div>
  );
}
