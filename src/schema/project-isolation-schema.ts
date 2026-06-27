import type { DatabasePool } from '../types.js';

export async function migrateProjectIsolation(pool: DatabasePool): Promise<void> {
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'memories' AND column_name = 'project_id'
      ) THEN
        ALTER TABLE memories ADD COLUMN project_id TEXT;
      END IF;
    END $$;
  `);

  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'session_contexts' AND column_name = 'project_id'
      ) THEN
        ALTER TABLE session_contexts ADD COLUMN project_id TEXT;
      END IF;
    END $$;
  `);

  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'memories' AND column_name = 'last_accessed_at'
      ) THEN
        ALTER TABLE memories ADD COLUMN last_accessed_at TIMESTAMPTZ;
      END IF;
    END $$;
  `);

  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'memories' AND column_name = 'access_count'
      ) THEN
        ALTER TABLE memories ADD COLUMN access_count INTEGER DEFAULT 0;
      END IF;
    END $$;
  `);

  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'memories' AND column_name = 'archived_at'
      ) THEN
        ALTER TABLE memories ADD COLUMN archived_at TIMESTAMPTZ;
      END IF;
    END $$;
  `);

  await pool.query(`
    UPDATE memories m
    SET project_id = s.project_id
    FROM sessions s
    WHERE m.project_id IS NULL
      AND m.session_id = s.id
      AND s.project_id IS NOT NULL
  `);

  await pool.query(`
    UPDATE session_contexts sc
    SET project_id = s.project_id
    FROM sessions s
    WHERE sc.project_id IS NULL
      AND sc.session_id = s.id
      AND s.project_id IS NOT NULL
  `);
}
