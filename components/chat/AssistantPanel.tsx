"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, X, Send } from "lucide-react";
import { useWizardStore } from "@/lib/store";
import { getProduct } from "@/data/products";
import { getRetailer } from "@/data/retailers";
import { Button } from "@/components/ui/Button";
import { ChatMessage, type ChatMsg } from "./ChatMessage";
import { StarterChips } from "./StarterChips";
import { cn } from "@/lib/format";

export function AssistantPanel() {
  const chatOpen = useWizardStore((s) => s.chatOpen);
  const setChatOpen = useWizardStore((s) => s.setChatOpen);
  const productId = useWizardStore((s) => s.productId);
  const category = useWizardStore((s) => s.category);
  const variant = useWizardStore((s) => s.variant);
  const storeId = useWizardStore((s) => s.storeId);
  const applySelection = useWizardStore((s) => s.applySelection);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [greetedFor, setGreetedFor] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const product = productId ? getProduct(productId) : undefined;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    const key = productId ?? category ?? null;
    if (!key || key === greetedFor) return;
    setGreetedFor(key);
    const greeting = product
      ? `Looking at the ${product.name}. Which ${[
          product.variants.storage && "storage",
          product.variants.connectivity && "connectivity",
          product.variants.size && "size",
        ]
          .filter(Boolean)
          .slice(0, 2)
          .join(" and ")} do you need?`
      : `Browsing ${category}. Pick a product, or ask me for the best current price in this category.`;
    setMessages((prev) => [
      ...prev,
      {
        id: `greet-${key}`,
        role: "assistant",
        content: greeting,
      },
    ]);
  }, [productId, category, product, greetedFor]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");
    const userMsg: ChatMsg = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setBusy(true);

    const history = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          context: {
            category,
            productId,
            variant,
            storeId,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: "assistant",
            content:
              err.error ||
              "The assistant is temporarily unavailable. The wizard still works.",
          },
        ]);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      let comparison: ChatMsg["comparison"];
      const assistantId = `a-${Date.now()}`;

      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";
          for (const part of parts) {
            const line = part.replace(/^data: /, "").trim();
            if (!line) continue;
            try {
              const evt = JSON.parse(line) as {
                type: string;
                text?: string;
                actions?: Array<Record<string, unknown>>;
              };
              if (evt.type === "text" && evt.text) {
                assistantText += evt.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: assistantText, comparison }
                      : m,
                  ),
                );
              }
              if (evt.type === "actions" && evt.actions) {
                for (const action of evt.actions) {
                  if (action.type === "set_selection") {
                    applySelection({
                      productId: action.productId as string | undefined,
                      category: action.category as never,
                      variant: action.variant as never,
                      storeId: action.storeId as never,
                    });
                  }
                  if (action.type === "comparison_card" && action.top3) {
                    comparison = action.top3 as ChatMsg["comparison"];
                  }
                }
              }
            } catch {
              // ignore partial JSON
            }
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content:
            "Connection issue. The price check wizard is still available.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const subtitle =
    product?.name ??
    (storeId ? getRetailer(storeId).displayName : "Assistant");

  return (
    <>
      {!chatOpen && (
        <button
          type="button"
          className="fixed right-5 bottom-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-paper shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
          aria-label="Open deal assistant"
          onClick={() => setChatOpen(true)}
        >
          <MessageSquare className="h-6 w-6" strokeWidth={1.5} />
        </button>
      )}

      {chatOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end p-0 sm:items-end sm:p-5"
          role="dialog"
          aria-label="Deal assistant"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 bg-ink/20 sm:bg-ink/10"
            aria-label="Close assistant backdrop"
            onClick={() => setChatOpen(false)}
          />
          <div
            className={cn(
              "relative z-10 flex w-full flex-col bg-paper shadow-2xl",
              "h-[min(85vh,640px)] sm:h-[min(80vh,620px)] sm:w-[380px] sm:rounded-2xl sm:border sm:border-line",
            )}
          >
            <PanelHeader
              onClose={() => setChatOpen(false)}
              subtitle={subtitle}
            />
            <PanelBody
              messages={messages}
              busy={busy}
              input={input}
              setInput={setInput}
              onSend={send}
              bottomRef={bottomRef}
            />
          </div>
        </div>
      )}
    </>
  );
}

function PanelHeader({
  onClose,
  subtitle,
}: {
  onClose: () => void;
  subtitle: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-line px-4 py-3">
      <div>
        <p className="text-sm font-bold text-ink">Deal assistant</p>
        <p className="text-xs text-muted">{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close assistant"
        className="rounded-full p-2 hover:bg-mist"
      >
        <X className="h-4 w-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}

function PanelBody({
  messages,
  busy,
  input,
  setInput,
  onSend,
  bottomRef,
}: {
  messages: ChatMsg[];
  busy: boolean;
  input: string;
  setInput: (v: string) => void;
  onSend: (text: string) => void;
  bottomRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <>
      <div
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
        role="list"
        aria-label="Chat messages"
      >
        {messages.length === 0 && (
          <p className="text-sm text-muted">
            Select a product to start a session, or try a starter below.
          </p>
        )}
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} />
        ))}
        {busy && (
          <p className="text-xs font-semibold text-muted">Thinking…</p>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-line px-4 py-3">
        <StarterChips disabled={busy} onSelect={(t) => void onSend(t)} />
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void onSend(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about prices, matches, coupons…"
            className="flex-1 rounded-full border border-line px-4 py-2 text-sm focus:border-ink focus:outline-none"
            aria-label="Message the deal assistant"
            disabled={busy}
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={busy || !input.trim()}
            aria-label="Send"
          >
            <Send className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </form>
      </div>
    </>
  );
}
