/**
 * Phase 5 Transparency Layer 3: Context Compilation Log Schema
 *
 * Stores per-call compilation stats forever; detailed JSONB prunable after N days.
 * Never stores raw compressed content — only metadata and summaries.
 */
import { DatabasePool } from './types.js';

const DDL = `
CREATE TABLE IF NOT EXISTS context_compilation_log (
  id              BIGSERIAL PRIMARY KEY,
  session_id      TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  mode            TEXT NOT NULL,
  budget          INT NOT NULL,
  before_tokens   INT NOT NULL,
  after_tokens    INT NOT NULL,
  parts_compressed INT NOT NULL DEFAULT 0,
  parts_pinned    INT NOT NULL DEFAULT 0,
  compressed_details JSONB,
  pinned_categories JSONB
);

CREATE INDEX IF NOT EXISTS idx_cclog_session_time
  ON context_compilation_log(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cclog_created
  ON context_compilation_log(created_at DESC);
`;

export async function initializeContextCompilationSchema(pool: DatabasePool): Promise<void> {
  await pool.query(DDL);
}
