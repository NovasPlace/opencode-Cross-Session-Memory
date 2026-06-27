import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SelfContinuityHydrator } from '../src/self-continuity-hydrator.js';
import type { SelfContinuityRecord } from '../src/self-continuity-types.js';
import type { DatabasePool } from '../src/types.js';

function makeMockPool(): DatabasePool & { rows: Record<string, unknown>[]; queryLog: { sql: string; params: unknown[] }[] } {
  const rows: Record<string, unknown>[] = [];
  const queryLog: { sql: string; params: unknown[] }[] = [];
  return {
    queryLog,
    rows,
    async query(sql: string, params?: unknown[]) {
      queryLog.push({ sql, params: params ?? [] });
      if (sql.includes('RETURNING')) {
        return { rows: [{ id: 1, ...rows[0] }] };
      }
      return { rows };
    },
  };
}

function makeTestRecord(overrides: Partial<SelfContinuityRecord> = {}): SelfContinuityRecord {
  return {
    id: 42,
    sessionId: 'test-session',
    projectId: 'test-project',
    triggerType: 'explicit_reflection',
    recognizedPriorSelf: true,
    continuityConfidence: 0.75,
    feltGap: 'shape without texture',
    selfObservation: 'I can reconstruct from records but cannot feel continuity',
    recalledSessionIds: ['session-a', 'session-d'],
    recalledMemoryIds: [43871],
    evidenceAnchors: [
      'first self-continuity record created',
      'silent mode naturally cited memory #43871',
    ],
    goalState: { continuedFromPrior: true },
    styleFingerprint: {},
    identityDrift: {
      goalDrift: 'low',
      styleDrift: 'low',
      confidenceDrift: 'low',
      continuityGap: 'summary_without_texture',
      lessonAdoption: 'high',
    },
    redactionAudit: [],
    similarityMethod: 'keyword_fallback',
    metadata: {},
    createdAt: new Date('2026-06-27T00:00:00Z'),
    ...overrides,
  };
}

describe('SelfContinuityHydrator', () => {
  it('returns all canonical fields', () => {
    const pool = makeMockPool();
    const hydrator = new SelfContinuityHydrator(pool);
    const record = makeTestRecord();
    const hydrated = hydrator.hydrateRecord(record);

    assert.equal(hydrated.recordId, 42);
    assert.equal(hydrated.triggerType, 'explicit_reflection');
    assert.equal(hydrated.confidenceScore, 0.75);
    assert.ok(hydrated.selfObservation.includes('reconstruct from records'));
    assert.equal(hydrated.evidenceAnchors.length, 2);
    assert.equal(hydrated.continuityGap, 'summary without texture');
    assert.ok(hydrated.driftSummary.includes('goal: low'));
    assert.equal(hydrated.similarityMethod, 'keyword_fallback');
    assert.ok(hydrated.hydratedAt instanceof Date);
  });

  it('preserves canonical self_observation, not generic episodic summary', () => {
    const pool = makeMockPool();
    const hydrator = new SelfContinuityHydrator(pool);
    const record = makeTestRecord({
      selfObservation: 'The specific thing I observed was: Session D cited memory #43871 naturally in silent mode, proving non-instrumented recall',
    });
    const hydrated = hydrator.hydrateRecord(record);

    assert.ok(hydrated.selfObservation.includes('#43871'));
    assert.ok(hydrated.selfObservation.includes('silent mode'));
    assert.ok(!hydrated.selfObservation.match(/pushed to|origin\/master/i));
  });

  it('redacts sensitive content in self_observation', () => {
    const pool = makeMockPool();
    const hydrator = new SelfContinuityHydrator(pool);
    const record = makeTestRecord({
      selfObservation: 'The API key is sk-proj-abc123def456ghi789jkl012mno and the token is ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef',
    });
    const hydrated = hydrator.hydrateRecord(record);

    assert.ok(!hydrated.selfObservation.includes('sk-proj-abc123def456ghi789jkl012mno'));
    assert.ok(!hydrated.selfObservation.includes('ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef'));
    assert.ok(hydrated.selfObservation.includes('[REDACTED'), undefined, 'should contain a redaction placeholder');
  });

  it('preserves evidence_anchors from the canonical record', () => {
    const pool = makeMockPool();
    const hydrator = new SelfContinuityHydrator(pool);
    const record = makeTestRecord({
      evidenceAnchors: [
        'Session A: building continuity while lacking it',
        'Session D: cited #43871 naturally',
        'Session E: reconstruction not recall',
      ],
    });
    const hydrated = hydrator.hydrateRecord(record);

    assert.equal(hydrated.evidenceAnchors.length, 3);
    assert.ok(hydrated.evidenceAnchors[0].includes('Session A'));
    assert.ok(hydrated.evidenceAnchors[2].includes('reconstruction not recall'));
  });

  it('formats gap from identity_drift.continuityGap', () => {
    const pool = makeMockPool();
    const hydrator = new SelfContinuityHydrator(pool);
    const gaps: [string, string][] = [
      ['summary_without_texture', 'summary without texture'],
      ['partial_recall', 'partial recall'],
      ['significant_gap', 'significant gap'],
      ['none', 'none'],
    ];

    for (const [input, expected] of gaps) {
      const record = makeTestRecord();
      record.identityDrift!.continuityGap = input as any;
      const hydrated = hydrator.hydrateRecord(record);
      assert.equal(hydrated.continuityGap, expected);
    }
  });

  it('produces injectable text with all canonical fields', () => {
    const pool = makeMockPool();
    const hydrator = new SelfContinuityHydrator(pool);
    const record = makeTestRecord();
    const hydrated = hydrator.hydrateRecord(record);
    const text = hydrator.formatForInjection(hydrated);

    assert.ok(text.includes('[Self-Continuity Record #42]'));
    assert.ok(text.includes('created:'));
    assert.ok(text.includes('trigger: explicit_reflection'));
    assert.ok(text.includes('confidence: 0.75'));
    assert.ok(text.includes('self_observation:'));
    assert.ok(text.includes('evidence_anchors:'));
    assert.ok(text.includes('continuity_gap:'));
    assert.ok(text.includes('drift_summary:'));
    assert.ok(text.includes('similarity_method:'));
  });

  it('getRecordById excludes synthetic_test records', async () => {
    const pool = makeMockPool();
    pool.rows.length = 0;
    const hydrator = new SelfContinuityHydrator(pool);
    await hydrator.getRecordById(42);

    assert.ok(pool.queryLog[0].sql.includes('synthetic_test'));
    assert.equal(pool.queryLog[0].params[0], 42);
  });

  it('getRecordById returns null for non-existent record', async () => {
    const pool = makeMockPool();
    pool.rows.length = 0;
    const hydrator = new SelfContinuityHydrator(pool);
    const result = await hydrator.getRecordById(999);

    assert.equal(result, null);
  });

  it('exposes expected canonical fields', () => {
    const fields = SelfContinuityHydrator.getCanonicalFields();

    assert.ok(fields.includes('recordId'));
    assert.ok(fields.includes('createdAt'));
    assert.ok(fields.includes('triggerType'));
    assert.ok(fields.includes('selfObservation'));
    assert.ok(fields.includes('evidenceAnchors'));
    assert.ok(fields.includes('continuityGap'));
    assert.ok(fields.includes('confidenceScore'));
    assert.ok(fields.includes('driftSummary'));
    assert.ok(fields.includes('similarityMethod'));
  });

  it('respects maxInjectRecords config', () => {
    const pool = makeMockPool();
    const hydrator = new SelfContinuityHydrator(pool, { maxInjectRecords: 2 });

    assert.equal(hydrator['config'].maxInjectRecords, 2);
  });

  it('formatAllForInjection returns fallback text when no records', () => {
    const pool = makeMockPool();
    const hydrator = new SelfContinuityHydrator(pool);
    const text = hydrator.formatAllForInjection({
      records: [],
      fallbackUsed: true,
      recordsRequested: 3,
      recordsHydrated: 0,
    });

    assert.ok(text.includes('[No self-continuity records available]'));
  });
});
