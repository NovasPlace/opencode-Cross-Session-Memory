/**
 * Phase 6 — Context Rollover: cumulative token tracker schema.
 * Tracks total token usage per session to trigger soft rollover.
 */
import { DatabasePool } from './types.js';

const CREATE_SQL = `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'context_rollover') THEN
    CREATE TABLE context_rollover (
      session_id           TEXT PRIMARY KEY,
      cumulative_tokens    BIGINT NOT NULL DEFAULT 0,
      last_rollover_at     BIGINT,
      rollover_count       INTEGER NOT NULL DEFAULT 0,
      last_brief_tokens    BIGINT,
      last_archived_tokens BIGINT,
      needs_hard_rollover  BOOLEAN NOT NULL DEFAULT FALSE,
      last_brief_text      TEXT,
      created_at           BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
      updated_at           BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
    );
  ELSE
    ALTER TABLE context_rollover ALTER COLUMN last_brief_tokens TYPE BIGINT;
    ALTER TABLE context_rollover ALTER COLUMN last_archived_tokens TYPE BIGINT;
    ALTER TABLE context_rollover ADD COLUMN IF NOT EXISTS needs_hard_rollover BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE context_rollover ADD COLUMN IF NOT EXISTS last_brief_text TEXT;
  END IF;
END $$;
`;

export async function initializeRolloverSchema(pool: DatabasePool): Promise<void> {
  await pool.query(CREATE_SQL);
}

export interface RolloverRecord {
  cumulative_tokens: number;
  last_rollover_at: number | null;
  rollover_count: number;
  last_brief_tokens: number | null;
  last_archived_tokens: number | null;
  needs_hard_rollover: boolean;
  last_brief_text: string | null;
}

export async function getRolloverRecord(
  pool: DatabasePool,
  sessionId: string,
): Promise<RolloverRecord> {
  const result = await pool.query(
    `SELECT cumulative_tokens, last_rollover_at, rollover_count,
            last_brief_tokens, last_archived_tokens,
            needs_hard_rollover, last_brief_text
     FROM context_rollover WHERE session_id = $1`,
    [sessionId],
  );
  if (result.rows.length === 0) {
    return {
      cumulative_tokens: 0,
      last_rollover_at: null,
      rollover_count: 0,
      last_brief_tokens: null,
      last_archived_tokens: null,
      needs_hard_rollover: false,
      last_brief_text: null,
    };
  }
  return result.rows[0] as RolloverRecord;
}

export async function upsertCumulativeTokens(
  pool: DatabasePool,
  sessionId: string,
  cumulativeTokens: number,
): Promise<void> {
  await pool.query(
    `INSERT INTO context_rollover (session_id, cumulative_tokens, updated_at)
     VALUES ($1, $2, (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT)
     ON CONFLICT (session_id)
     DO UPDATE SET cumulative_tokens = $2, updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT`,
    [sessionId, cumulativeTokens],
  );
}

export async function recordRollover(
  pool: DatabasePool,
  sessionId: string,
  briefTokens: number,
  archivedTokens: number,
): Promise<void> {
  await pool.query(
    `UPDATE context_rollover
     SET rollover_count = rollover_count + 1,
         last_rollover_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
         last_brief_tokens = $2::BIGINT,
         last_archived_tokens = $3::BIGINT,
         cumulative_tokens = $4::BIGINT,
         updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
     WHERE session_id = $1`,
    [sessionId, briefTokens, archivedTokens, briefTokens],
  );
}

export async function setHardRolloverFlag(
  pool: DatabasePool,
  sessionId: string,
  briefText: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO context_rollover (session_id, cumulative_tokens, needs_hard_rollover, last_brief_text)
     VALUES ($1, 0, TRUE, $2)
     ON CONFLICT (session_id)
     DO UPDATE SET needs_hard_rollover = TRUE, last_brief_text = $2`,
    [sessionId, briefText],
  );
}

export async function clearHardRolloverFlag(
  pool: DatabasePool,
  sessionId: string,
): Promise<void> {
  await pool.query(
    `UPDATE context_rollover
     SET needs_hard_rollover = FALSE,
         last_brief_text = NULL,
         updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
     WHERE session_id = $1`,
    [sessionId],
  );
}
