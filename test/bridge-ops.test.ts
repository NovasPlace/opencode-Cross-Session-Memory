import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { listMemoriesOp, searchMemoriesOp } from '../dist/bridge-ops.js';

describe('bridge ops project fallback', () => {
  it('falls back from project to legacy for listMemoriesOp', async () => {
    const calls: string[] = [];
    const deps = {
      memoryManager: {
        async listMemories(input: { searchMode?: string }) {
          calls.push(input.searchMode ?? 'unset');
          return input.searchMode === 'legacy'
            ? [{ id: 1, content: 'legacy memory' }]
            : [];
        },
      },
      primingEngine: {},
      contextRecall: {},
      contextCompactor: {},
    } as any;

    const result = await listMemoriesOp(deps, { projectId: 'cross-session-memory' }, {});

    assert.equal(result.length, 1);
    assert.deepEqual(calls, ['project', 'legacy']);
  });

  it('falls back to global for searchMemoriesOp when project and legacy are empty', async () => {
    const calls: string[] = [];
    const deps = {
      memoryManager: {
        async searchMemories(input: { searchMode?: string }) {
          calls.push(input.searchMode ?? 'unset');
          return input.searchMode === 'global'
            ? [{ memory: { id: 7, content: 'global memory' }, score: 0.9 }]
            : [];
        },
      },
      primingEngine: {
        async cascadeFromMultiple() {
          return { memories: [] };
        },
      },
      contextRecall: {},
      contextCompactor: {},
    } as any;

    const result = await searchMemoriesOp(
      deps,
      { query: 'phases', projectId: 'cross-session-memory', limit: 5 },
      {},
    );

    assert.equal(result.results.length, 1);
    assert.deepEqual(calls, ['project', 'legacy', 'global']);
  });
});
