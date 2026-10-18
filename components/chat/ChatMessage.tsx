"use client";

import { cn } from "@/lib/format";
import { InlineComparison } from "./InlineComparison";
import type { CalculatedOffer } from "@/lib/pricing/types";

export type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  comparison?: Array<
    Pick<CalculatedOffer, "retailerId" | "netPrice" | "condition">
  >;
};

type Props = {
  message: ChatMsg;
};

export function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";
  return (
    <div
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
      role="listitem"
    >
      <div
        className={cn(
          "max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-ink text-paper"
            : "border border-line bg-paper text-ink",
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.comparison && (
          <InlineComparison top3={message.comparison} />
        )}
      </div>
    </div>
  );
}
