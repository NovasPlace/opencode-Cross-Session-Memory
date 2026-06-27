import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CrossSessionCausalStore } from '../src/cross-session-causal-store.js';

describe('CrossSessionCausalStore', () => {
  it('creates direct links and redacts evidence anchors/metadata before storage', async () => {
    let capturedParams: unknown[] = [];
    const pool = {
      query: async (_sql: string, params?: unknown[]) => {
        capturedParams = params ?? [];
        return {
          rows: [{
            id: 1,
            source_memory_id: 10,
            target_memory_id: 11,
            source_session_id: 'session-d',
            target_session_id: 'session-e',
            link_type: 'lesson_to_recall',
            link_status: 'direct',
            confidence: 0.9,
            evidence_anchors: params?.[7] ?? '[]',
            gap_kind: null,
            metadata: params?.[9] ?? '{}',
            created_at: '2026-06-27T00:00:00.000Z',
          }],
          rowCount: 1,
        };
      },
    };
    const store = new CrossSessionCausalStore(pool as any);
    const link = await store.createLink({
      sourceMemoryId: 10,
      targetMemoryId: 11,
      sourceSessionId: 'session-d',
      targetSessionId: 'session-e',
      linkType: 'lesson_to_recall',
      linkStatus: 'direct',
      confidence: 0.9,
      evidenceAnchors: ['used sk-proj-abcdefghijklmnopqrstuvwxyz123456', 'Session D cited memory #43871'],
      metadata: { raw: 'email me at dev@example.com' },
    });

    assert.equal(link.linkStatus, 'direct');
    const storedAnchors = JSON.parse(String(capturedParams[7])) as string[];
    const storedMetadata = JSON.parse(String(capturedParams[9])) as Record<string, string>;
    assert.ok(storedAnchors.some((anchor) => anchor.includes('[REDACTED')));
    assert.ok(String(storedMetadata.raw).includes('[REDACTED'));
  });

  it('lists links for narrative in created order', async () => {
    const pool = {
      query: async () => ({
        rows: [
          {
            id: 2,
            source_memory_id: null,
            target_memory_id: null,
            source_session_id: 'phase-21',
            target_session_id: 'phase-22',
            link_type: 'phase_transition',
            link_status: 'direct',
            confidence: 0.8,
            evidence_anchors: '["proof"]',
            gap_kind: null,
            metadata: '{}',
            created_at: '2026-06-27T00:00:00.000Z',
          },
        ],
        rowCount: 1,
      }),
    };
    const store = new CrossSessionCausalStore(pool as any);
    const links = await store.listLinksForNarrative();
    assert.equal(links.length, 1);
    assert.equal(links[0].targetSessionId, 'phase-22');
  });
});
