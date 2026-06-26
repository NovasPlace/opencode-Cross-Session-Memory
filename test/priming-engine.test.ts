import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PrimingEngine } from '../dist/priming-engine.js';
import type { Memory } from '../dist/types.js';

function makeMemoryRow(id: number, linked: number[], importance: number = 0.5): Record<string, unknown> {
  return {
    id,
    session_id: 'sess-1',
    memory_type: 'repo',
    content: `memory ${id}`,
    importance,
    emotion: 'neutral',
    confidence: 0.8,
    source: 'auto',
    tags: ['test'],
    linked_memory_ids: linked,
    metadata: {},
    created_at: new Date('2026-06-26T10:00:00Z'),
    updated_at: new Date('2026-06-26T10:00:00Z'),
    accessed_at: new Date('2026-06-26T11:00:00Z'),
    access_count: 1,
  };
}

function makeMockDb(rowsById: Record<number, Record<string, unknown>>): { getPool: () => { query: (sql: string, params: (number|string)[]) => Promise<{ rows: Record<string, unknown>[] }> } } {
  return {
    getPool: () => ({
      query: async (_sql: string, params: (number|string)[]) => {
        const id = params[0] as number;
        const row = rowsById[id];
        if (!row) return { rows: [] };
        return { rows: [row] };
      },
    }),
  };
}

describe('PrimingEngine.cascade', () => {
  it('returns just the seed when it has no linked memories', async () => {
    const db = makeMockDb({ 1: makeMemoryRow(1, []) });
    const engine = new PrimingEngine(db as any, 2, 20);
    const result = await engine.cascade(1);
    assert.equal(result.memories.length, 1);
    assert.equal(result.memories[0].id, 1);
    assert.equal(result.visited.size, 1);
  });

  it('traverses one level of linked memories', async () => {
    const db = makeMockDb({
      1: makeMemoryRow(1, [2, 3]),
      2: makeMemoryRow(2, []),
      3: makeMemoryRow(3, []),
    });
    const engine = new PrimingEngine(db as any, 2, 20);
    const result = await engine.cascade(1);
    assert.equal(result.memories.length, 3);
    assert.ok(result.memories.some(m => m.id === 1));
    assert.ok(result.memories.some(m => m.id === 2));
    assert.ok(result.memories.some(m => m.id === 3));
    assert.equal(result.visited.size, 3);
  });

  it('traverses multiple levels (depth 2)', async () => {
    const db = makeMockDb({
      1: makeMemoryRow(1, [2]),
      2: makeMemoryRow(2, [3]),
      3: makeMemoryRow(3, []),
    });
    const engine = new PrimingEngine(db as any, 2, 20);
    const result = await engine.cascade(1);
    assert.equal(result.memories.length, 3);
    assert.ok(result.visited.has(3));
  });

  it('does not traverse beyond maxDepth', async () => {
    const db = makeMockDb({
      1: makeMemoryRow(1, [2]),
      2: makeMemoryRow(2, [3]),
      3: makeMemoryRow(3, []),
    });
    const engine = new PrimingEngine(db as any, 1, 20);
    const result = await engine.cascade(1);
    assert.equal(result.memories.length, 2);
    assert.ok(result.memories.some(m => m.id === 1));
    assert.ok(result.memories.some(m => m.id === 2));
    assert.ok(!result.visited.has(3));
  });

  it('breaks cycles via visited set', async () => {
    const db = makeMockDb({
      1: makeMemoryRow(1, [2]),
      2: makeMemoryRow(2, [1]),
    });
    const engine = new PrimingEngine(db as any, 5, 20);
    const result = await engine.cascade(1);
    assert.equal(result.memories.length, 2);
    assert.equal(result.visited.size, 2);
  });

  it('respects maxMemories limit', async () => {
    const rows: Record<number, Record<string, unknown>> = {};
    for (let i = 1; i <= 10; i++) {
      rows[i] = makeMemoryRow(i, i < 10 ? [i + 1] : []);
    }
    const db = makeMockDb(rows);
    const engine = new PrimingEngine(db as any, 10, 3);
    const result = await engine.cascade(1);
    assert.ok(result.memories.length <= 3);
    assert.equal(result.memories[0].id, 1);
  });

  it('returns empty when seed does not exist', async () => {
    const db = makeMockDb({});
    const engine = new PrimingEngine(db as any, 2, 20);
    const result = await engine.cascade(999);
    assert.equal(result.memories.length, 0);
    assert.ok(result.visited.has(999));
  });

  it('handles self-referential memory (links to itself)', async () => {
    const db = makeMockDb({ 1: makeMemoryRow(1, [1]) });
    const engine = new PrimingEngine(db as any, 5, 20);
    const result = await engine.cascade(1);
    assert.equal(result.memories.length, 1);
  });
});

describe('PrimingEngine.cascadeFromMultiple', () => {
  it('deduplicates overlapping cascades', async () => {
    const db = makeMockDb({
      1: makeMemoryRow(1, [3]),
      2: makeMemoryRow(2, [3]),
      3: makeMemoryRow(3, []),
    });
    const engine = new PrimingEngine(db as any, 2, 20);
    const result = await engine.cascadeFromMultiple([1, 2]);
    assert.equal(result.memories.length, 3);
    const ids = result.memories.map(m => m.id);
    assert.ok(ids.includes(1));
    assert.ok(ids.includes(2));
    assert.ok(ids.includes(3));
    const count3 = ids.filter(x => x === 3).length;
    assert.equal(count3, 1);
  });

  it('sorts by importance descending', async () => {
    const db = makeMockDb({
      1: makeMemoryRow(1, [], 0.3),
      2: makeMemoryRow(2, [], 0.9),
      3: makeMemoryRow(3, [], 0.5),
    });
    const engine = new PrimingEngine(db as any, 0, 20);
    const result = await engine.cascadeFromMultiple([1, 2, 3]);
    assert.equal(result.memories.length, 3);
    assert.equal(result.memories[0].id, 2);
    assert.equal(result.memories[1].id, 3);
    assert.equal(result.memories[2].id, 1);
  });

  it('sorts by recency when importance is equal', async () => {
    const rows: Record<number, Record<string, unknown>> = {
      1: { ...makeMemoryRow(1, [], 0.5), accessed_at: new Date('2026-06-20T00:00:00Z') },
      2: { ...makeMemoryRow(2, [], 0.5), accessed_at: new Date('2026-06-26T00:00:00Z') },
      3: { ...makeMemoryRow(3, [], 0.5), accessed_at: new Date('2026-06-23T00:00:00Z') },
    };
    const db = makeMockDb(rows);
    const engine = new PrimingEngine(db as any, 0, 20);
    const result = await engine.cascadeFromMultiple([1, 2, 3]);
    assert.equal(result.memories.length, 3);
    assert.equal(result.memories[0].id, 2);
    assert.equal(result.memories[1].id, 3);
    assert.equal(result.memories[2].id, 1);
  });

  it('handles empty seed list', async () => {
    const db = makeMockDb({});
    const engine = new PrimingEngine(db as any, 2, 20);
    const result = await engine.cascadeFromMultiple([]);
    assert.equal(result.memories.length, 0);
    assert.equal(result.visited.size, 0);
  });
});
