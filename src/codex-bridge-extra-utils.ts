export function requireSession(sessionId: string | undefined): string {
  if (!sessionId) throw new Error('sessionId is required for this tool.');
  return sessionId;
}

export function requireString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`${name} must be a non-empty string.`);
  return value.trim();
}

export function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

export function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' ? value : fallback;
}

export function asLimit(value: unknown, fallback: number): number {
  const n = asNumber(value, fallback);
  return Number.isFinite(n) ? Math.max(1, Math.min(n, 100)) : fallback;
}

export function asStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : undefined;
}

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

export function asMessages(value: unknown): Array<{ role: string; content: string }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const message = item as Record<string, unknown>;
    const role = asString(message.role);
    const content = asString(message.content);
    return role && content ? [{ role, content }] : [];
  });
}
