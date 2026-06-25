/**
 * Permanent regression tests for context-compactor.
 *
 * These tests exist because two bugs were found and fixed in this component:
 *   1. Running/pending parts were being compacted (status guard was absent)
 *   2. Completed parts with stale discard markers in the error field reprocessed
 *      every cycle (isAlreadyCompacted was bypassed by hasOpenCodeDiscardMarker)
 *
 * Both bugs caused the cumulative compaction count to inflate by re-processing
 * the same parts across cycles. These tests reproduce the original conditions
 * and assert the fixes hold across multiple compaction cycles.
 *
 * Run:  node --experimental-strip-types --test test/compaction.test.ts
 * Or:   npm test
 */

import { describe, it } from 'node:test';
import { strictEqual, ok } from 'node:assert/strict';
import { ContextCompactor } from '../dist/context-compactor.js';

const CFG = {
  workingMemoryWindow: 2,
  minAgeMs: 60000,
  maxOutputChars: 120,
  enabled: true,
  truncateInput: false,
} as any;

const OLD_START = Date.now() - 120_000; // 2 min ago — fails isRecentEnough (60s threshold)

/** Build a minimal message with one tool part. */
function mkMsg(part: any): any {
  return { role: 'user', parts: [part] };
}

/** Build a tool part with the given status and fields. */
function mkPart(opts: {
  status: string;
  output?: string;
  error?: string;
  tool?: string;
  start?: number;
}): any {
  return {
    type: 'tool',
    tool: opts.tool ?? 'Bash',
    state: {
      status: opts.status,
      output: opts.output,
      error: opts.error,
      time: { start: opts.start ?? OLD_START },
    },
  };
}

/** Build an empty ToolCallGroup array (compactor handles missing groups gracefully). */
const NO_GROUPS: any[] = [];

/** Run N compaction cycles and return per-cycle stats + final output. */
function runCycles(
  compactor: ContextCompactor,
  messages: any[],
  groups: any[],
  n: number,
): any[] {
  const results: any[] = [];
  for (let i = 0; i < n; i++) {
    const r = compactor.compact(messages, groups);
    results.push({
      cycle: i + 1,
      compactedParts: r.compactedParts,
      keptRawParts: r.keptRawParts,
      skippedParts: r.skippedParts,
    });
  }
  return results;
}

describe('context-compactor regression tests', () => {

  it('test1: running part is skipped by status guard (not compacted)', () => {
    const compactor = new ContextCompactor(CFG);
    const part = mkPart({ status: 'running', output: 'building...' });
    const messages = [mkMsg(part)];

    const cycles = runCycles(compactor, messages, NO_GROUPS, 3);

    for (const c of cycles) {
      strictEqual(c.compactedParts, 0, `cycle ${c.cycle}: should not compact a running part`);
      strictEqual(c.skippedParts, 1, `cycle ${c.cycle}: should skip the running part`);
    }
    strictEqual(part.state.output, 'building...', 'output must be unchanged');
    strictEqual(compactor.getReprocessingReport().length, 0, 'no reprocessing');
  });

  it('test2: completed part with discard marker in output — no reprocessing after cycle 1', () => {
    const compactor = new ContextCompactor(CFG);
    const marker = '[Old tool result content cleared] original output here';
    const part = mkPart({ status: 'completed', output: marker });
    const messages = [mkMsg(part)];

    const cycles = runCycles(compactor, messages, NO_GROUPS, 3);

    strictEqual(cycles[0].compactedParts, 1, 'cycle 1: should compact');
    strictEqual(cycles[1].compactedParts, 0, 'cycle 2: should skip (already compacted)');
    strictEqual(cycles[2].compactedParts, 0, 'cycle 3: should skip (already compacted)');
    ok(part.state.output.startsWith('[COMPACTED]'), 'output should start with [COMPACTED]');
    strictEqual(compactor.getReprocessingReport().length, 0, 'no reprocessing');
  });

  it('test3: completed part with discard marker in ERROR field — no reprocessing after cycle 1', () => {
    const compactor = new ContextCompactor(CFG);
    const marker = '[Old tool result content cleared] original error here';
    const part = mkPart({ status: 'completed', output: 'some output', error: marker });
    const messages = [mkMsg(part)];

    const cycles = runCycles(compactor, messages, NO_GROUPS, 3);

    strictEqual(cycles[0].compactedParts, 1, 'cycle 1: should compact');
    strictEqual(cycles[1].compactedParts, 0, 'cycle 2: should skip (already compacted)');
    strictEqual(cycles[2].compactedParts, 0, 'cycle 3: should skip (already compacted)');
    ok(part.state.output.startsWith('[COMPACTED]'), 'output should start with [COMPACTED]');
    // The marker in error may persist, but the part should NOT be re-processed
    // because isAlreadyCompacted now checks output.startsWith(COMPACTED_MARKER)
    strictEqual(compactor.getReprocessingReport().length, 0, 'no reprocessing — the second bug is fixed');
  });

  it('test4: normal completed part — compacts once, skips on subsequent cycles', () => {
    const compactor = new ContextCompactor(CFG);
    const part = mkPart({ status: 'completed', output: 'A'.repeat(500) });
    const messages = [mkMsg(part)];

    const cycles = runCycles(compactor, messages, NO_GROUPS, 3);

    strictEqual(cycles[0].compactedParts, 1, 'cycle 1: should compact');
    strictEqual(cycles[1].compactedParts, 0, 'cycle 2: should skip (already compacted)');
    strictEqual(cycles[2].compactedParts, 0, 'cycle 3: should skip (already compacted)');
    ok(part.state.output.startsWith('[COMPACTED]'), 'output should start with [COMPACTED]');
    strictEqual(compactor.getReprocessingReport().length, 0, 'no reprocessing');
  });

  it('test5: pending part is skipped by status guard (not compacted)', () => {
    const compactor = new ContextCompactor(CFG);
    const part = mkPart({ status: 'pending' });
    const messages = [mkMsg(part)];

    const cycles = runCycles(compactor, messages, NO_GROUPS, 3);

    for (const c of cycles) {
      strictEqual(c.compactedParts, 0, `cycle ${c.cycle}: should not compact a pending part`);
      strictEqual(c.skippedParts, 1, `cycle ${c.cycle}: should skip the pending part`);
    }
    strictEqual(compactor.getReprocessingReport().length, 0, 'no reprocessing');
  });

  it('test6: completed part <60s old inside working window stays raw (recency guard)', () => {
    // This tests the SOFT recency window, not the hard status guard.
    // A completed part that finished 10s ago is inside the 60s threshold,
    // so isRecentEnough returns true and it should be skipped — even though
    // its status is 'completed' (not running/pending). This is the protection
    // most likely to silently regress during LOC-driven refactors.
    const recentStart = Date.now() - 10_000; // 10s ago — passes isRecentEnough
    const part = mkPart({
      status: 'completed',
      output: 'x'.repeat(500),
      tool: 'Read',
      start: recentStart,
    });
    const compactor = new ContextCompactor({ ...CFG } as any);
    const result = compactor.compact([mkMsg(part)], []);

    strictEqual(result.compactedParts, 0, 'recent completed part should NOT be compacted');
    strictEqual(result.skippedParts, 1, 'should be skipped by recency window');
    strictEqual(result.keptRawParts, 1, 'should be kept raw');
    // Output must be unchanged — no [COMPACTED] marker
    const out = part.state?.output ?? '';
    ok(!out.startsWith('[COMPACTED]'), 'output should not have COMPACTED marker');
    strictEqual(out, 'x'.repeat(500), 'output content must be byte-identical');
  });
});


