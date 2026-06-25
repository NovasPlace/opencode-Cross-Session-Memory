/**
 * Phase 6: Context Manifest Builder
 *
 * Builds a compact index of cached context items that gets injected into the
 * prompt instead of the full content. The model uses this to decide what to
 * fetch via context_fetch / context_search tools.
 */
import { DatabasePool } from './types.js';
import { countItems } from './context-cache-store.js';

export interface ManifestEntry {
  displayId: string;
  kind: string;
  summary: string;
  tokens: number;
}

export interface ManifestResult {
  text: string;
  entriesIncluded: number;
  entriesTotal: number;
  estimatedTokens: number;
}

const HEADER = 'Cached context available (use context_fetch or context_search to retrieve full details):';
const FOOTER = 'Older context is available through context_search/context_fetch. Do not assume unavailable details; fetch them when needed.';

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function formatEntry(entry: ManifestEntry): string {
  return `- ${entry.displayId}: ${entry.summary}`;
}

/**
 * Build a manifest from a list of cache rows.
 * Rows must have: display_id, kind, summary, tokens
 */
export function buildManifestFromRows(
  rows: { display_id: string; kind: string; summary: string; tokens?: number | null }[],
  tokenBudget: number,
): ManifestResult {
  const entries: ManifestEntry[] = rows.map((r) => ({
    displayId: r.display_id,
    kind: r.kind,
    summary: r.summary,
    tokens: r.tokens ?? estimateTokens(r.summary),
  }));

  // Sort by recency (assumed already DESC by created_at from query)
  // Include as many as fit within the token budget
  const lines: string[] = [];
  let usedTokens = estimateTokens(HEADER) + estimateTokens(FOOTER);
  let included = 0;

  for (const entry of entries) {
    const line = formatEntry(entry);
    const lineTokens = estimateTokens(line);
    if (usedTokens + lineTokens > tokenBudget) break;
    lines.push(line);
    usedTokens += lineTokens;
    included++;
  }

  const text = included === 0
    ? ''
    : `${HEADER}\n${lines.join('\n')}\n${FOOTER}`;

  return {
    text,
    entriesIncluded: included,
    entriesTotal: entries.length,
    estimatedTokens: usedTokens,
  };
}

/**
 * Query the DB for all cache items for a session and build the manifest.
 */
export async function buildManifest(
  pool: DatabasePool,
  sessionId: string,
  tokenBudget: number,
): Promise<ManifestResult> {
  const total = await countItems(pool, sessionId);
  if (total === 0) {
    return { text: '', entriesIncluded: 0, entriesTotal: 0, estimatedTokens: 0 };
  }

  const res = await pool.query(
    `SELECT display_id, kind, summary, tokens
     FROM context_cache
     WHERE session_id = $1
     ORDER BY created_at DESC
     LIMIT 200`,
    [sessionId],
  );

  return buildManifestFromRows(
    res.rows as { display_id: string; kind: string; summary: string; tokens?: number | null }[],
    tokenBudget,
  );
}
