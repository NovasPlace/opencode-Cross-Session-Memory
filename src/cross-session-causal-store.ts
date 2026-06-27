import { redactObject } from './redactor.js';
import type { DatabasePool } from './types.js';
import type { CrossSessionCausalLink, CrossSessionLinkInput } from './cross-session-causal-types.js';

export class CrossSessionCausalStore {
  constructor(private pool: DatabasePool) {}

  async createLink(input: CrossSessionLinkInput): Promise<CrossSessionCausalLink> {
    const safe = sanitizeInput(input);
    const result = await this.pool.query(
      `INSERT INTO cross_session_causal_links
        (source_memory_id, target_memory_id, source_session_id, target_session_id,
         link_type, link_status, confidence, evidence_anchors, gap_kind, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        safe.sourceMemoryId ?? null,
        safe.targetMemoryId ?? null,
        safe.sourceSessionId,
        safe.targetSessionId,
        safe.linkType,
        safe.linkStatus,
        safe.confidence,
        JSON.stringify(safe.evidenceAnchors),
        safe.gapKind ?? null,
        JSON.stringify(safe.metadata),
      ],
    );
    return mapRow(result.rows[0]);
  }

  async listLinksForNarrative(limit = 50): Promise<CrossSessionCausalLink[]> {
    const result = await this.pool.query(
      `SELECT * FROM cross_session_causal_links
       ORDER BY created_at ASC
       LIMIT $1`,
      [limit],
    );
    return result.rows.map(mapRow);
  }

  async listLinksBySession(sessionId: string, limit = 50): Promise<CrossSessionCausalLink[]> {
    const result = await this.pool.query(
      `SELECT * FROM cross_session_causal_links
       WHERE source_session_id = $1 OR target_session_id = $1
       ORDER BY created_at ASC
       LIMIT $2`,
      [sessionId, limit],
    );
    return result.rows.map(mapRow);
  }
}

function sanitizeInput(input: CrossSessionLinkInput): CrossSessionLinkInput {
  const safeAnchors = redactObject(input.evidenceAnchors).result;
  const safeMetadata = redactObject(input.metadata ?? {}).result;
  return {
    ...input,
    evidenceAnchors: safeAnchors,
    metadata: safeMetadata,
  };
}

function mapRow(row: unknown): CrossSessionCausalLink {
  const value = row as Record<string, unknown>;
  return {
    id: value.id as number,
    sourceMemoryId: toNumber(value.source_memory_id),
    targetMemoryId: toNumber(value.target_memory_id),
    sourceSessionId: String(value.source_session_id),
    targetSessionId: String(value.target_session_id),
    linkType: value.link_type as CrossSessionCausalLink['linkType'],
    linkStatus: value.link_status as CrossSessionCausalLink['linkStatus'],
    confidence: Number(value.confidence ?? 0),
    evidenceAnchors: parseJsonArray(value.evidence_anchors),
    gapKind: value.gap_kind ? String(value.gap_kind) as CrossSessionCausalLink['gapKind'] : undefined,
    createdAt: String(value.created_at),
    metadata: parseJsonObject(value.metadata),
  };
}

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    try { return JSON.parse(value) as string[]; } catch { return [value]; }
  }
  return [];
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === 'string') {
    try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; }
  }
  return {};
}

function toNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}
