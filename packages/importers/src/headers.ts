export function pick(row: Record<string, unknown>, names: string[]): string {
  for (const name of names) {
    const hit = Object.entries(row).find(([key]) => normalizeHeader(key) === normalizeHeader(name));
    if (hit && hit[1] != null) return String(hit[1]).trim();
  }
  return "";
}

export function numeric(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeHeader(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
