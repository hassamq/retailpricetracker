import { promises as fs } from "fs";
import path from "path";

const MEMORY = new Map<string, { value: unknown; expiresAt: number }>();
const CACHE_DIR = path.join(process.cwd(), ".cache");
const TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export type CacheStore = {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
};

function filePath(key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(CACHE_DIR, `${safe}.json`);
}

async function ensureDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

export const fileCache: CacheStore = {
  async get<T>(key: string): Promise<T | null> {
    const mem = MEMORY.get(key);
    if (mem && mem.expiresAt > Date.now()) {
      return mem.value as T;
    }
    try {
      await ensureDir();
      const raw = await fs.readFile(filePath(key), "utf8");
      const parsed = JSON.parse(raw) as { value: T; expiresAt: number };
      if (parsed.expiresAt < Date.now()) return null;
      MEMORY.set(key, parsed);
      return parsed.value;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T, ttlMs = TTL_MS): Promise<void> {
    const entry = { value, expiresAt: Date.now() + ttlMs };
    MEMORY.set(key, entry);
    try {
      await ensureDir();
      await fs.writeFile(filePath(key), JSON.stringify(entry), "utf8");
    } catch {
      // memory-only fallback
    }
  },

  async delete(key: string): Promise<void> {
    MEMORY.delete(key);
    try {
      await fs.unlink(filePath(key));
    } catch {
      // ignore
    }
  },
};

/** Swap this for Vercel KV in production. */
export const cache: CacheStore = fileCache;

export function cacheKey(productId: string, variant: Record<string, string>): string {
  const parts = Object.entries(variant)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  return `prices:${productId}:${parts}`;
}

export const PRICE_CACHE_TTL_MS = TTL_MS;
