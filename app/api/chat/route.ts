import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createPartFromFunctionResponse,
  type Content,
  type Part,
} from "@google/genai";
import { createGenAI, GEMINI_MODEL, isGenAIConfigured } from "@/lib/ai/client";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { executeTool, toolDeclarations } from "@/lib/ai/tools";
import { getProduct } from "@/data/products";
import { getRetailer } from "@/data/retailers";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

const BodySchema = z.object({
  messages: z.array(MessageSchema).min(1).max(40),
  context: z
    .object({
      category: z.string().nullable().optional(),
      productId: z.string().nullable().optional(),
      variant: z.record(z.string(), z.string()).optional(),
      storeId: z.string().nullable().optional(),
    })
    .optional(),
});

function asResponseObject(result: unknown): Record<string, unknown> {
  if (result !== null && typeof result === "object" && !Array.isArray(result)) {
    return result as Record<string, unknown>;
  }
  return { output: result };
}

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  const limit = rateLimit(`chat:${ip}`, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many chat requests. Please wait a moment." },
      { status: 429 },
    );
  }

  const parsed = BodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!isGenAIConfigured()) {
    return await demoChatResponse(parsed.data);
  }

  const ai = createGenAI();
  if (!ai) return await demoChatResponse(parsed.data);

  const { messages, context } = parsed.data;
  const product = context?.productId
    ? getProduct(context.productId)
    : undefined;
  const store = context?.storeId
    ? getRetailer(context.storeId as Parameters<typeof getRetailer>[0])
    : undefined;

  const system = buildSystemPrompt({
    category: context?.category,
    productName: product?.name,
    variant: context?.variant,
    storeName: store?.displayName,
  });

  const contents: Content[] = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const clientActions: Record<string, unknown>[] = [];

  try {
    let response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: system,
        tools: [{ functionDeclarations: toolDeclarations }],
        temperature: 0.2,
      },
    });

    for (let round = 0; round < 4; round++) {
      const modelContent = response.candidates?.[0]?.content;
      const fnCalls = response.functionCalls ?? [];

      if (!fnCalls.length || !modelContent?.parts?.length) break;

      contents.push(modelContent);

      const responseParts: Part[] = [];
      for (const call of fnCalls) {
        const name = call.name ?? "";
        const args = (call.args ?? {}) as Record<string, unknown>;
        const { result, clientAction } = await executeTool(name, args);
        if (clientAction) clientActions.push(clientAction);
        responseParts.push(
          createPartFromFunctionResponse(
            call.id ?? name,
            name,
            asResponseObject(result),
          ),
        );
      }

      contents.push({
        role: "user",
        parts: responseParts,
      });

      response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config: {
          systemInstruction: system,
          tools: [{ functionDeclarations: toolDeclarations }],
          temperature: 0.2,
        },
      });
    }

    const text =
      response.text ??
      "I could not complete that request. Try selecting a product in the wizard.";

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "actions", actions: clientActions })}\n\n`,
          ),
        );
        const chunkSize = 24;
        for (let i = 0; i < text.length; i += chunkSize) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "text", text: text.slice(i, i + chunkSize) })}\n\n`,
            ),
          );
        }
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`),
        );
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[api/chat] falling back to local assistant", err);
    // Keep Assist usable when Gemini auth/network fails.
    return await demoChatResponse(parsed.data);
  }
}

async function demoChatResponse(data: z.infer<typeof BodySchema>) {
  const product = data.context?.productId
    ? getProduct(data.context.productId)
    : undefined;
  const last = data.messages[data.messages.length - 1]?.content ?? "";
  const actions: Record<string, unknown>[] = [];

  let text = product
    ? `Looking at the ${product.name}. Which ${[
        product.variants.storage && "storage",
        product.variants.connectivity && "connectivity",
        product.variants.size && "size",
      ]
        .filter(Boolean)
        .slice(0, 2)
        .join(" and ")} do you need?`
    : "Pick a product in the wizard, or ask for a price, coupon, or price-match check.";

  if (/coupon|promo|code/i.test(last)) {
    const { result } = await executeTool("list_promo_codes", {
      category: data.context?.category ?? product?.category,
    });
    const codes =
      result &&
      typeof result === "object" &&
      "codes" in result &&
      Array.isArray((result as { codes: unknown }).codes)
        ? (
            result as {
              codes: Array<{
                code: string;
                description: string;
                redeemAt: string[];
                whereToUse: string;
              }>;
            }
          ).codes
        : [];
    text =
      codes.length === 0
        ? "No active demo promo codes for this category right now."
        : [
            "Active demo codes:",
            ...codes.map(
              (c) =>
                `• ${c.code} — ${c.description}\n  Use at: ${c.redeemAt.join(", ")}\n  How: ${c.whereToUse}`,
            ),
          ].join("\n");
  } else if (/price|compare|best|cheapest|match/i.test(last) && product) {
    const { result, clientAction } = await executeTool("get_price_comparison", {
      productId: product.id,
      ...(data.context?.variant ?? {}),
      storeId: data.context?.storeId,
    });
    if (clientAction) actions.push(clientAction);
    const payload = result as {
      bestValue?: { retailer: string; netPrice: number } | null;
      top3?: Array<{ retailer: string; netPrice: number }>;
      verdict?: { summary?: string } | null;
    };
    if (payload.bestValue) {
      const lines = [
        `Best net: ${payload.bestValue.retailer} at $${payload.bestValue.netPrice.toFixed(2)}.`,
      ];
      if (payload.top3?.length) {
        lines.push(
          "Top 3:",
          ...payload.top3.map(
            (o, i) =>
              `${i + 1}. ${o.retailer} — $${o.netPrice.toFixed(2)}`,
          ),
        );
      }
      if (payload.verdict?.summary) lines.push(payload.verdict.summary);
      text = lines.join("\n");
    } else {
      text = "No confirmed in-stock offers yet. Try Refresh prices in the wizard.";
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "actions", actions })}\n\n`,
        ),
      );
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "text", text })}\n\n`,
        ),
      );
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`),
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}
