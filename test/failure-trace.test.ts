import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FailureTraceStore, formatFailureTraceForInjection } from '../src/failure-trace-store.js';
import type { FailureTrace } from '../src/failure-trace-types.js';

function createMockPool(rows: Record<string, any>[]) {
  let insertCount = 0;
  return {
    query: async (sql: string, params?: any[]) => {
      if (sql.trim().toUpperCase().startsWith('INSERT')) {
        insertCount++;
        return { rows: [{ id: insertCount }], rowCount: 1 };
      }
      if (rows.length === 0) return { rows: [], rowCount: 0 };
      return { rows: [rows[0]], rowCount: 1 };
    },
  };
}

describe('FailureTraceStore', () => {
  it('stores a failed attempt trace', async () => {
    const pool = createMockPool([{ id: 1 }]);
    const store = new FailureTraceStore(pool);
    const trace = await store.store({
      problem: 'Connection timeout',
      attemptedAction: 'Increased pool size',
      result: 'failed',
      failureReason: 'Pool exhausted',
      correction: 'Added connection retry logic',
      lessonCreated: 'Always implement retry with exponential backoff',
      evidenceAnchors: ['anchor-1'],
      linkedPhase: '15',
      linkedCommit: 'abc123',
    });
    assert.equal(trace.id, 1);
    assert.equal(trace.problem, 'Connection timeout');
    assert.equal(trace.result, 'failed');
  });

  it('retrieves traces by problem keyword', async () => {
    const pool = createMockPool([{ id: 1, problem: 'Connection timeout', attempted_action: 'Increased pool size', result: 'failed', failure_reason: 'Pool exhausted', correction: 'Added retry', lesson_created: 'Use exponential backoff', later_behavior_change: 'All DB calls now use retry', evidence_anchors: '["anchor-1"]', linked_phase: 15, linked_commit: 'abc123', created_at: new Date(), updated_at: new Date(), created_by_session: 'ses-1', related_trace_ids: '[]' }]);
    const store = new FailureTraceStore(pool);
    const traces = await store.recallByProblem('timeout');
    assert.equal(traces.length, 1);
    assert.equal(traces[0].problem, 'Connection timeout');
  });

  it('retrieves traces linked to a phase', async () => {
    const pool = createMockPool([{ id: 2, problem: 'Migration failed', attempted_action: 'Manual schema edit', result: 'failed', failure_reason: 'Wrong order', correction: 'Use migration tool', lesson_created: 'Always use migration tool', later_behavior_change: 'CI enforces migration tool', evidence_anchors: '["anchor-2"]', linked_phase: 21, linked_commit: 'def456', created_at: new Date(), updated_at: new Date(), created_by_session: 'ses-2', related_trace_ids: '[]' }]);
    const store = new FailureTraceStore(pool);
    const traces = await store.recallByPhase(21);
    assert.equal(traces.length, 1);
    assert.equal(traces[0].linkedPhase, 21);
  });

  it('returns empty array when no traces match', async () => {
    const pool = createMockPool([]);
    const store = new FailureTraceStore(pool);
    const traces = await store.recallByProblem('nonexistent');
    assert.equal(traces.length, 0);
  });

it('redacts secrets in failure reason', async () => {
    const pool = createMockPool([{ id: 3, problem: 'Auth error', attempted_action: 'Used key', result: 'failed', failure_reason: 'sk-proj-abc123def456ghi789jkl012mno and ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef', correction: 'Use env vars', lesson_created: 'Never hardcode keys', later_behavior_change: 'Added secret scanning', evidence_anchors: '[]', linked_phase: 2, linked_commit: 'c3d4', created_at: new Date(), updated_at: new Date(), created_by_session: 'sess-3', related_trace_ids: '[]' }]);
    const store = new FailureTraceStore(pool);
    const trace = await store.recallByProblem('Auth');
    const formatted = formatFailureTraceForInjection(trace[0]);
    assert.ok(!formatted.includes('sk-proj-abc123def456ghi789jkl012mno'));
    assert.ok(!formatted.includes('ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef'));
    assert.ok(formatted.includes('[REDACTED'));
  });
});