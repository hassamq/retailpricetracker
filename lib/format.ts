export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatRelativeTime(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatClockTime(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}
