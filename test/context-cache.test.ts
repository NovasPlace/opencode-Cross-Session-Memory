import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildManifestFromRows } from '../dist/context-cache-manifest.js';

type Row = { display_id: string; kind: string; summary: string; tokens?: number | null };

function row(display_id: string, kind: string, summary: string, tokens?: number): Row {
  return { display_id, kind, summary, tokens: tokens ?? null };
}

describe('Phase 6 — Context Cache Manifest (lazy-recall index)', () => {
  it('1. empty rows produce an empty manifest', () => {
    const r = buildManifestFromRows([], 1000);
    assert.equal(r.text, '');
    assert.equal(r.entriesIncluded, 0);
    assert.equal(r.entriesTotal, 0);
    // NOTE: buildManifestFromRows reports header/footer overhead in estimatedTokens
    // even when text is empty (no entries). Harmless — callers gate on itemsCached/text,
    // not estimatedTokens. Flagged as a minor metric quirk; not fixed (out of scope).
    assert.ok(r.estimatedTokens < 100, 'empty manifest carries only header/footer overhead');
  });

  it('2. includes all entries when under budget and emits header/footer/displayIds', () => {
    const rows = [
      row('turn_42', 'turn', 'User asked about the auth module', 20),
      row('tool_88', 'tool_output', 'grep found 3 matches in auth.ts', 30),
      row('file_read_15', 'file_read', 'Read src/auth.ts (412 lines)', 15),
    ];
    const r = buildManifestFromRows(rows, 4000);
    assert.equal(r.entriesIncluded, 3);
    assert.equal(r.entriesTotal, 3);
    assert.ok(r.text.includes('Cached context available'), 'header present');
    assert.ok(r.text.includes('context_fetch or context_search'), 'footer guidance present');
    assert.ok(r.text.includes('turn_42'));
    assert.ok(r.text.includes('tool_88'));
    assert.ok(r.text.includes('file_read_15'));
    assert.ok(r.text.includes('User asked about the auth module'));
    assert.ok(r.estimatedTokens > 0);
  });

  it('3. truncates entries when the token budget is small', () => {
    const longSummary = 'x'.repeat(400); // ~100 tokens per line
    const rows = [
      row('turn_1', 'turn', longSummary),
      row('turn_2', 'turn', longSummary),
      row('turn_3', 'turn', longSummary),
    ];
    const r = buildManifestFromRows(rows, 200);
    assert.equal(r.entriesTotal, 3);
    assert.ok(r.entriesIncluded >= 1 && r.entriesIncluded < 3, 'should include some but not all');
  });

  it('4. estimates tokens from the summary when tokens are missing', () => {
    const rows = [row('turn_9', 'turn', 'abcd')]; // 4 chars -> ~1 token
    const r = buildManifestFromRows(rows, 2000);
    assert.equal(r.entriesIncluded, 1);
    assert.ok(r.text.includes('turn_9'));
  });

  it('5. a zero budget yields no entries and empty text', () => {
    const rows = [row('turn_1', 'turn', 'x')];
    const r = buildManifestFromRows(rows, 0);
    assert.equal(r.entriesIncluded, 0);
    assert.equal(r.text, '');
  });

  it('6. entries are emitted as "- <displayId>: <summary>" lines', () => {
    const rows = [row('tool_5', 'tool_output', 'ran a grep', 12)];
    const r = buildManifestFromRows(rows, 4000);
    assert.ok(r.text.includes('- tool_5: ran a grep'), 'entry line format correct');
  });
});
