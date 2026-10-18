import { cn } from "@/lib/format";
import type { CSSProperties, ReactNode } from "react";

type Tone = "default" | "blue" | "success" | "danger" | "muted" | "accent";

type Props = {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  style?: CSSProperties;
};

const tones: Record<Tone, string> = {
  default: "bg-mist text-ink",
  blue: "bg-ink text-paper",
  success: "bg-[#E8F5EE] text-success",
  danger: "bg-[#FCEAEA] text-danger",
  muted: "bg-mist text-muted",
  accent: "bg-soft-blue text-brand-blue",
};

export function Tag({ children, tone = "default", className, style }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        tones[tone],
        className,
      )}
      style={style}
    >
      {children}
    </span>
  );
}
