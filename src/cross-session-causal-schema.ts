import type { DatabasePool } from './types.js';

export async function initializeCrossSessionCausalSchema(pool: DatabasePool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cross_session_causal_links (
      id SERIAL PRIMARY KEY,
      source_memory_id BIGINT REFERENCES memories(id) ON DELETE CASCADE,
      target_memory_id BIGINT REFERENCES memories(id) ON DELETE CASCADE,
      source_session_id TEXT NOT NULL,
      target_session_id TEXT NOT NULL,
      link_type TEXT NOT NULL CHECK (link_type IN (
        'phase_transition',
        'failure_to_diagnosis',
        'diagnosis_to_correction',
        'correction_to_lesson',
        'lesson_to_recall',
        'recall_to_behavior_change',
        'behavior_change_to_improvement'
      )),
      link_status TEXT NOT NULL CHECK (link_status IN ('direct', 'inferred', 'gap')),
      confidence REAL NOT NULL DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
      evidence_anchors JSONB NOT NULL DEFAULT '[]',
      gap_kind TEXT CHECK (gap_kind IN (
        'missing_explicit_edge',
        'missing_lesson_recall',
        'missing_behavior_change',
        'missing_improvement_signal',
        'missing_phase_proof'
      )),
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_cross_session_links_source_session ON cross_session_causal_links(source_session_id);
    CREATE INDEX IF NOT EXISTS idx_cross_session_links_target_session ON cross_session_causal_links(target_session_id);
    CREATE INDEX IF NOT EXISTS idx_cross_session_links_status ON cross_session_causal_links(link_status);
    CREATE INDEX IF NOT EXISTS idx_cross_session_links_type ON cross_session_causal_links(link_type);
    CREATE INDEX IF NOT EXISTS idx_cross_session_links_source_memory ON cross_session_causal_links(source_memory_id);
    CREATE INDEX IF NOT EXISTS idx_cross_session_links_target_memory ON cross_session_causal_links(target_memory_id);
  `);
}
