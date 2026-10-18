import { GoogleGenAI } from "@google/genai";

/**
 * Gemini is available when either:
 * - Google AI Studio API key (GOOGLE_API_KEY), or
 * - Vertex AI with a Cloud project (OAuth / ADC — API keys alone are not enough)
 */
export function isGenAIConfigured(): boolean {
  if (process.env.USE_MOCK_DATA === "true") return false;
  if (process.env.GOOGLE_API_KEY) return true;
  return Boolean(
    process.env.GOOGLE_CLOUD_PROJECT &&
      process.env.GOOGLE_GENAI_USE_VERTEXAI === "true",
  );
}

/** @deprecated Prefer isGenAIConfigured — kept for existing imports */
export function isVertexConfigured(): boolean {
  return isGenAIConfigured();
}

export function createGenAI(): GoogleGenAI | null {
  if (!isGenAIConfigured()) return null;

  const project = process.env.GOOGLE_CLOUD_PROJECT?.trim();
  const wantVertex =
    process.env.GOOGLE_GENAI_USE_VERTEXAI === "true" && Boolean(project);

  // Vertex requires OAuth / ADC. An API key alone hits aiplatform with 401.
  // Prefer Google AI Studio when only GOOGLE_API_KEY is present.
  if (wantVertex && project) {
    return new GoogleGenAI({
      vertexai: true,
      project,
      location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
    });
  }

  if (process.env.GOOGLE_API_KEY) {
    return new GoogleGenAI({
      apiKey: process.env.GOOGLE_API_KEY,
      vertexai: false,
    });
  }

  return null;
}

/** Prefer env override; flash-latest has broader free-tier availability. */
export const GEMINI_MODEL =
  process.env.GEMINI_MODEL?.trim() || "gemini-flash-latest";
