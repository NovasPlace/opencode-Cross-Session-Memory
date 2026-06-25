/**
 * Phase 6: Context Cache Schema
 *
 * Stores full prior turns/tool outputs/file reads so they can be replaced
 * in the prompt with compact manifest entries and fetched on demand.
 *
 * Never stores content that was never in the prompt. Never stores secrets
 * beyond what the model already saw. Content is session-scoped.
 */
import { DatabasePool } from './types.js';

export async function initializeContextCacheSchema(pool: DatabasePool): Promise<void> {
  // DO block instead of CREATE TABLE IF NOT EXISTS: PG's IF NOT EXISTS does
  // not guard the identity sequence creation, causing a duplicate-key error
  // when the table already exists. Conditional creation avoids the conflict.
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'context_cache'
      ) THEN
        CREATE TABLE context_cache (
          id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          session_id   TEXT NOT NULL,
          display_id   TEXT NOT NULL,
          kind         TEXT NOT NULL,
          created_at   BIGINT NOT NULL,
          message_index INTEGER,
          summary      TEXT NOT NULL,
          content      TEXT NOT NULL,
          metadata     JSONB DEFAULT '{}'::jsonb,
          tokens       INTEGER,
          fetch_count  INTEGER DEFAULT 0,
          UNIQUE (session_id, display_id)
        );
      END IF;
    END $$;
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_context_cache_session
    ON context_cache (session_id)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_context_cache_session_kind
    ON context_cache (session_id, kind)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_context_cache_session_created
    ON context_cache (session_id, created_at DESC)
  `);
}
