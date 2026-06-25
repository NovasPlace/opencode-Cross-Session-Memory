/**
 * Goal Schema — explicit goal tracking for sessions.
 *
 * Goals are user-declared objectives that persist in the system prompt
 * and across sessions. Each session can have one active goal; history
 * is retained for recall.
 */
import { DatabasePool } from './types.js';

export interface Goal {
  id: string;
  session_id: string;
  description: string;
  status: 'active' | 'achieved' | 'abandoned';
  context: Record<string, unknown>;
  created_at: number;
  updated_at: number;
  achieved_at: number | null;
}

const CREATE_SQL = `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'goals'
  ) THEN
    CREATE TABLE goals (
      id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      session_id   TEXT NOT NULL,
      description  TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'achieved', 'abandoned')),
      context      JSONB NOT NULL DEFAULT '{}',
      created_at   BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
      updated_at   BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
      achieved_at  BIGINT
    );
    CREATE INDEX idx_goals_session ON goals(session_id);
    CREATE INDEX idx_goals_status ON goals(status);
    CREATE INDEX idx_goals_active ON goals(session_id, status)
      WHERE status = 'active';
  END IF;
END $$;`;

export async function initializeGoalSchema(pool: DatabasePool): Promise<void> {
  await pool.query(CREATE_SQL);
}

export async function setActiveGoal(
  pool: DatabasePool,
  sessionId: string,
  description: string,
  context?: Record<string, unknown>,
): Promise<Goal> {
  // Archive any existing active goal for this session
  await pool.query(
    `UPDATE goals
     SET status = 'abandoned', updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
     WHERE session_id = $1 AND status = 'active'`,
    [sessionId],
  );

  const result = await pool.query(
    `INSERT INTO goals (session_id, description, context)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [sessionId, description, JSON.stringify(context ?? {})],
  );
  return result.rows[0] as Goal;
}

export async function updateGoal(
  pool: DatabasePool,
  goalId: string,
  patch: { description?: string; status?: Goal['status']; context?: Record<string, unknown> },
): Promise<Goal | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (patch.description !== undefined) {
    sets.push(`description = $${idx++}`);
    params.push(patch.description);
  }
  if (patch.status !== undefined) {
    sets.push(`status = $${idx++}`);
    params.push(patch.status);
    if (patch.status === 'achieved' || patch.status === 'abandoned') {
      sets.push(`achieved_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT`);
    }
  }
  if (patch.context !== undefined) {
    sets.push(`context = $${idx++}`);
    params.push(JSON.stringify(patch.context));
  }
  if (sets.length === 0) return null;

  sets.push(`updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT`);
  params.push(goalId);

  const result = await pool.query(
    `UPDATE goals SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    params,
  );
  return (result.rows[0] as Goal) ?? null;
}

export async function getActiveGoal(
  pool: DatabasePool,
  sessionId: string,
): Promise<Goal | null> {
  const result = await pool.query(
    `SELECT * FROM goals WHERE session_id = $1 AND status = 'active'
     ORDER BY created_at DESC LIMIT 1`,
    [sessionId],
  );
  return (result.rows[0] as Goal) ?? null;
}

export async function listGoals(
  pool: DatabasePool,
  sessionId: string,
  opts?: { status?: string; limit?: number },
): Promise<Goal[]> {
  const conditions = ['session_id = $1'];
  const params: unknown[] = [sessionId];
  let idx = 2;

  if (opts?.status) {
    conditions.push(`status = $${idx++}`);
    params.push(opts.status);
  }

  const limit = Math.min(opts?.limit ?? 20, 100);
  const result = await pool.query(
    `SELECT * FROM goals WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC LIMIT $${idx}`,
    [...params, limit],
  );
  return result.rows as Goal[];
}
