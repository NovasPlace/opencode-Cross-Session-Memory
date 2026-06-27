import type { DatabasePool } from '../types.js';

export async function initializeSessionSchema(pool: DatabasePool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      workspace_id TEXT,
      directory TEXT,
      title TEXT,
      name TEXT,
      summary TEXT,
      turn_count INTEGER NOT NULL DEFAULT 0,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ended_at TIMESTAMPTZ
    )
  `);

  await pool.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS workspace_id TEXT`);
  await pool.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS project_id TEXT`);
  await pool.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS directory TEXT`);
  await pool.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS title TEXT`);
  await pool.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS name TEXT`);
  await pool.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS summary TEXT`);
  await pool.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS turn_count INTEGER NOT NULL DEFAULT 0`);
  await pool.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'`);
  await pool.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`);
  await pool.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS memory_events (
      id BIGSERIAL PRIMARY KEY,
      channel TEXT NOT NULL,
      payload JSONB NOT NULL,
      session_id TEXT REFERENCES sessions(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS session_contexts (
      id BIGSERIAL PRIMARY KEY,
      session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
      project_id TEXT,
      context_brief TEXT NOT NULL,
      episodic_memories JSONB DEFAULT '[]',
      procedural_memories JSONB DEFAULT '[]',
      semantic_memories JSONB DEFAULT '[]',
      built_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '90 seconds')
    )
  `);
  await pool.query(`ALTER TABLE session_contexts ADD COLUMN IF NOT EXISTS project_id TEXT`);
  await pool.query(`ALTER TABLE session_contexts ADD COLUMN IF NOT EXISTS episodic_memories JSONB DEFAULT '[]'`);
  await pool.query(`ALTER TABLE session_contexts ADD COLUMN IF NOT EXISTS procedural_memories JSONB DEFAULT '[]'`);
  await pool.query(`ALTER TABLE session_contexts ADD COLUMN IF NOT EXISTS semantic_memories JSONB DEFAULT '[]'`);
  await pool.query(`ALTER TABLE session_contexts ADD COLUMN IF NOT EXISTS built_at TIMESTAMPTZ NOT NULL DEFAULT now()`);
  await pool.query(`ALTER TABLE session_contexts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '90 seconds')`);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_session_contexts_project ON session_contexts(project_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_memory_events_channel ON memory_events(channel)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_memory_events_created ON memory_events(created_at DESC)`);
}
