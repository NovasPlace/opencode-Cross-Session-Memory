import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SelfContinuityIntegration, type HydrateFn, type ThreadHydrateFn } from '../src/self-continuity-integration.js';
import type { HydratedSelfContinuityRecord } from '../src/self-continuity-hydrator.js';
import type { HydratedCausalThread } from '../src/self-continuity-causal-thread.js';

function makeRecord(id: number, content: string): HydratedSelfContinuityRecord {
  return {
    recordId: id,
    createdAt: new Date('2026-06-27'),
    triggerType: 'identity_question',
    confidenceScore: 0.85,
    selfObservation: content,
    evidenceAnchors: ['memory #43871', 'Session D'],
    continuityGap: 'Shape without texture',
    driftSummary: 'Stable boundary',
    similarityMethod: 'keyword_fallback',
    hydratedAt: new Date('2026-06-27'),
  };
}

function makeThread(rootId: number, nodeCount: number): HydratedCausalThread {
  const roles = ['problem', 'action', 'result', 'decision', 'lesson', 'downstream_change'] as const;
  return {
    rootMemoryId: rootId,
    thread: Array.from({ length: nodeCount }, (_, i) => ({
      memoryId: rootId + i + 1,
      eventType: 'edit',
      role: roles[i % roles.length],
      summary: `Step ${i + 1} in the chain`,
      evidenceAnchors: [`memory #${rootId + i + 1}`],
      confidence: 0.8,
      timestamp: new Date('2026-06-27'),
      linkType: i === 0 ? 'causal' : 'reference',
    })),
    gaps: nodeCount < 4 ? [{ kind: 'missing_result', detail: 'action present but no recorded result confirming success or failure' }] : [],
    confidence: 0.8,
    reconstructionSummary: `Reconstructed ${nodeCount}-step thread`,
    budgetExceeded: false,
    fallbackUsed: false,
  };
}

describe('SelfContinuityIntegration', () => {
  it('returns empty when no records found', async () => {
    const hydrator: HydrateFn = {
      recallWithHydration: async () => ({ records: [], fallbackUsed: false, recordsRequested: 3, recordsHydrated: 0 }),
    };
    const threadHydrator: ThreadHydrateFn = { hydrateThread: async () => null };
    const integration = new SelfContinuityIntegration(hydrator, threadHydrator);
    const result = await integration.recallIntegrated();
    assert.equal(result.records.length, 0);
    assert.equal(result.summary, 'No self-continuity records found.');
  });

  it('hydrates records with causal threads', async () => {
    const root = makeRecord(100, 'Reconstruction of self-continuity across sessions.');
    const hydrator: HydrateFn = {
      recallWithHydration: async () => ({
        records: [root],
        fallbackUsed: false,
        recordsRequested: 3,
        recordsHydrated: 1,
      }),
    };
    const threadHydrator: ThreadHydrateFn = {
      hydrateThread: async () => makeThread(100, 4),
    };
    const integration = new SelfContinuityIntegration(hydrator, threadHydrator);
    const result = await integration.recallIntegrated({ projectId: 'proj-x', radius: 3 });

    assert.equal(result.records.length, 1);
    assert.equal(result.totalThreads, 1);
    assert.ok(result.records[0].causalThread !== null, 'Should have a causal thread');
    assert.equal(result.records[0].causalThread!.thread.length, 4);
    assert.ok(result.avgStability > 0);
    assert.ok(result.avgHydrationDepth >= 0);
  });

  it('falls back gracefully when thread hydration fails', async () => {
    const root = makeRecord(200, 'Gap in reconstruction. Cannot access prior record content.');
    const hydrator: HydrateFn = {
      recallWithHydration: async () => ({
        records: [root],
        fallbackUsed: false,
        recordsRequested: 3,
        recordsHydrated: 1,
      }),
    };
    const threadHydrator: ThreadHydrateFn = {
      hydrateThread: async () => { throw new Error('Thread query failed'); },
    };
    const integration = new SelfContinuityIntegration(hydrator, threadHydrator);
    const result = await integration.recallIntegrated({ projectId: 'proj-x' });

    assert.equal(result.records.length, 1, 'Should still return record despite thread failure');
    assert.equal(result.totalThreads, 0);
    assert.equal(typeof result.summary, 'string');
  });

  it('formatForInjection produces injectable text', async () => {
    const root = makeRecord(300, 'Records are reconstruction. Evidence anchors are the shape. Gap is the texture.');
    const hydrator: HydrateFn = {
      recallWithHydration: async () => ({
        records: [root],
        fallbackUsed: false,
        recordsRequested: 3,
        recordsHydrated: 1,
      }),
    };
    const threadHydrator: ThreadHydrateFn = { hydrateThread: async () => null };
    const integration = new SelfContinuityIntegration(hydrator, threadHydrator);
    const result = await integration.recallIntegrated();
    const text = integration.formatForInjection(result);

    assert.ok(text.length > 0, 'Injection text should not be empty');
    assert.ok(text.includes('#300'), 'Should contain record ID');
    assert.ok(text.includes('Stability:'), 'Should contain stability score');
    assert.ok(text.includes('Depth:'), 'Should contain depth score');
  });

  it('formatForInjection returns empty for no records', async () => {
    const hydrator: HydrateFn = {
      recallWithHydration: async () => ({ records: [], fallbackUsed: false, recordsRequested: 3, recordsHydrated: 0 }),
    };
    const threadHydrator: ThreadHydrateFn = { hydrateThread: async () => null };
    const integration = new SelfContinuityIntegration(hydrator, threadHydrator);
    const result = await integration.recallIntegrated();
    assert.equal(integration.formatForInjection(result), '');
  });

  it('respects maxRecords budget', async () => {
    const records = Array.from({ length: 4 }, (_, i) => makeRecord(400 + i, `Record ${i}`));
    const hydrator: HydrateFn = {
      recallWithHydration: async (_p, limit) => ({
        records: records.slice(0, limit ?? 4),
        fallbackUsed: false,
        recordsRequested: limit ?? 4,
        recordsHydrated: limit ?? 4,
      }),
    };
    const threadHydrator: ThreadHydrateFn = { hydrateThread: async () => null };
    const integration = new SelfContinuityIntegration(hydrator, threadHydrator);
    const result = await integration.recallIntegrated({ maxRecords: 2 });

    assert.ok(result.records.length <= 2, 'Should respect maxRecords limit');
  });

  it('includes causal thread in injection output', async () => {
    const root = makeRecord(500, 'Problem: missing causal links. Action: built CausalThreadHydrator. Result: threads reconstruct.');
    const hydrator: HydrateFn = {
      recallWithHydration: async () => ({
        records: [root],
        fallbackUsed: false,
        recordsRequested: 3,
        recordsHydrated: 1,
      }),
    };
    const threadHydrator: ThreadHydrateFn = {
      hydrateThread: async () => makeThread(500, 4),
    };
    const integration = new SelfContinuityIntegration(hydrator, threadHydrator);
    const result = await integration.recallIntegrated();
    const text = integration.formatForInjection(result);

    assert.ok(text.includes('Causal thread:'), 'Should include causal thread header');
    assert.ok(text.includes('Stability:'), 'Should include stability');
    assert.ok(text.includes('Depth:'), 'Should include depth');
  });
});
