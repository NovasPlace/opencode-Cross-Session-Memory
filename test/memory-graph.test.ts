import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { inferLinkType } from '../dist/memory-graph.js';
import type { ExtractedConcept } from '../dist/concept-extractor.js';

function concept(type: ExtractedConcept['type'], value: string): ExtractedConcept {
  return { type, value, confidence: 0.9 };
}

describe('inferLinkType', () => {
  const now = new Date('2026-06-26T12:00:00Z');
  const later = new Date('2026-06-26T12:30:00Z');

  it('returns "causal" when error and file overlap', () => {
    const shared = [
      concept('error', 'null pointer exception'),
      concept('file', 'src/auth.ts'),
    ];
    const result = inferLinkType('fixed error', 'caused error', now, later, shared);
    assert.equal(result, 'causal');
  });

  it('returns "causal" even with time proximity if error+file present', () => {
    const shared = [
      concept('error', 'TypeError'),
      concept('file', 'src/db.ts'),
    ];
    const result = inferLinkType('a', 'b', now, now, shared);
    assert.equal(result, 'causal');
  });

  it('returns "reference" when decision overlap (no error+file)', () => {
    const shared = [concept('decision', 'Decided to use PostgreSQL.')];
    const result = inferLinkType('a', 'b', now, later, shared);
    assert.equal(result, 'reference');
  });

  it('returns "shared_entity" when only file overlap', () => {
    const shared = [concept('file', 'src/index.ts')];
    const result = inferLinkType('a', 'b', now, later, shared);
    assert.equal(result, 'shared_entity');
  });

  it('returns "shared_entity" when only function overlap', () => {
    const shared = [concept('function', 'compileContext')];
    const result = inferLinkType('a', 'b', now, later, shared);
    assert.equal(result, 'shared_entity');
  });

  it('returns "temporal" when time diff < 60s and no entity overlap', () => {
    const soon = new Date(now.getTime() + 30000);
    const result = inferLinkType('a', 'b', now, soon, []);
    assert.equal(result, 'temporal');
  });

  it('returns "temporal" when time diff is exactly 59s', () => {
    const soon = new Date(now.getTime() + 59000);
    const result = inferLinkType('a', 'b', now, soon, []);
    assert.equal(result, 'temporal');
  });

  it('returns "shared_entity" (default) when no overlap and time diff >= 60s', () => {
    const later60s = new Date(now.getTime() + 60001);
    const result = inferLinkType('a', 'b', now, later60s, []);
    assert.equal(result, 'shared_entity');
  });

  it('returns "shared_entity" (default) with empty shared array and large time gap', () => {
    const result = inferLinkType('a', 'b', now, later, []);
    assert.equal(result, 'shared_entity');
  });

  it('prefers causal over reference (error+file checked before decision)', () => {
    const shared = [
      concept('error', 'crash'),
      concept('file', 'src/app.ts'),
      concept('decision', 'Decided to refactor.'),
    ];
    const result = inferLinkType('a', 'b', now, later, shared);
    assert.equal(result, 'causal');
  });

  it('prefers reference over shared_entity (decision checked before file-only)', () => {
    const shared = [
      concept('decision', 'Decided to use Redis.'),
      concept('file', 'src/cache.ts'),
    ];
    const result = inferLinkType('a', 'b', now, later, shared);
    assert.equal(result, 'reference');
  });

  it('handles concept-type shared entities (not file/function/error/decision) as default', () => {
    const shared = [concept('concept', 'database')];
    const result = inferLinkType('a', 'b', now, now, shared);
    assert.equal(result, 'temporal');
  });
});
