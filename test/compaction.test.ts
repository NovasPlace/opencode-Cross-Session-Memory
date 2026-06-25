import { describe, it } from 'node:test';
import { strictEqual, ok, deepStrictEqual } from 'node:assert/strict';
import { ContextCompactor } from '../dist/context-compactor.js';
import type { ToolCallRecord } from '../dist/types.js';

const CFG = {
  workingMemoryWindow: 2,
  minAgeMs: 0,
  maxOutputChars: 200,
  enabled: true,
};

function makeToolCall(opts: Partial<ToolCallRecord> & { tool: string }): ToolCallRecord {
  return {
    sessionId: 'test-session',
    timestamp: Date.now() - (opts.ageMs ?? 0),
    tool: opts.tool,
    args: opts.args,
    output: opts.output,
    error: opts.error,
    status: opts.status ?? 'completed',
  } as ToolCallRecord;
}

describe('ContextCompactor', () => {
  let contextCompactor: ContextCompactor;

  function makeCompactor() {
    return new ContextCompactor(CFG);
  }

  it('compacts old completed tool calls but keeps recent ones raw', () => {
    contextCompactor = makeCompactor();
    const now = Date.now();
    const toolCalls: ToolCallRecord[] = [
      makeToolCall({ tool: 'read', args: { filePath: 'a.ts' }, ageMs: 10000 }),
      makeToolCall({ tool: 'write', args: { filePath: 'b.ts' }, ageMs: 10000 }),
      makeToolCall({ tool: 'edit', args: { filePath: 'c.ts' }, ageMs: 500 }),
      makeToolCall({ tool: 'bash', args: { command: 'ls' }, ageMs: 500 }),
    ];

    const result = contextCompactor.compact(toolCalls);
    ok(result.compacted.includes('TOOL_REF'));
    strictEqual(result.result.compactedParts, 2);
    strictEqual(result.compactedCount, 2);
    ok(result.compacted.includes('TOOL_REF') && (result.compacted.includes('read') || result.compacted.includes('write')));
  });

  it('preserves running/pending tool calls regardless of age', () => {
    contextCompactor = makeCompactor();
    const toolCalls: ToolCallRecord[] = [
      makeToolCall({ tool: 'read', args: { filePath: 'a.ts' }, ageMs: 10000, status: 'running' }),
      makeToolCall({ tool: 'write', args: { filePath: 'b.ts' }, ageMs: 10000, status: 'pending' }),
    ];

    const result = contextCompactor.compact(toolCalls);
    strictEqual(result.compactedCount, 0);
    ok(result.compacted.includes('TOOL: read'));
    ok(result.compacted.includes('TOOL: write'));
  });

  it('preserves errors and warnings', () => {
    contextCompactor = makeCompactor();
    const toolCalls: ToolCallRecord[] = [
      makeToolCall({ tool: 'bash', args: { command: 'fail' }, ageMs: 10000, error: 'exit 1' }),
      makeToolCall({ tool: 'read', args: { filePath: 'a.ts' }, ageMs: 10000, output: 'warning: deprecated' }),
    ];

    const result = contextCompactor.compact(toolCalls);
    ok(result.compacted.includes('ERROR'));
    ok(result.compacted.includes('warning'));
  });

  it('keeps last N tool calls raw via workingMemoryWindow', () => {
    contextCompactor = makeCompactor();
    const toolCalls: ToolCallRecord[] = [
      makeToolCall({ tool: 'read', args: { filePath: 'a.ts' }, ageMs: 10000 }),
      makeToolCall({ tool: 'write', args: { filePath: 'b.ts' }, ageMs: 10000 }),
      makeToolCall({ tool: 'edit', args: { filePath: 'c.ts' }, ageMs: 10000 }),
    ];

    const result = contextCompactor.compact(toolCalls);
    strictEqual(result.compactedCount, 1);
  });

  it('disables compaction when enabled=false', () => {
    const disabledCompactor = new ContextCompactor({ ...CFG, enabled: false });
    const toolCalls: ToolCallRecord[] = [
      makeToolCall({ tool: 'read', args: { filePath: 'a.ts' }, ageMs: 10000 }),
    ];

    const result = disabledCompactor.compact(toolCalls);
    strictEqual(result.compactedCount, 0);
    ok(result.compacted.includes('TOOL: read'));
  });

  it('produces expandable refs for compacted tool calls', () => {
    contextCompactor = makeCompactor();
    const toolCalls: ToolCallRecord[] = [
      makeToolCall({ tool: 'read', args: { filePath: 'a.ts' }, ageMs: 10000 }),
      makeToolCall({ tool: 'write', args: { filePath: 'b.ts' }, ageMs: 10000 }),
      makeToolCall({ tool: 'edit', args: { filePath: 'c.ts' }, ageMs: 500 }),
      makeToolCall({ tool: 'bash', args: { command: 'ls' }, ageMs: 500 }),
    ];

    const result = contextCompactor.compact(toolCalls);
    ok(result.compacted.includes('TOOL_REF'));
    ok(result.compacted.includes('a.ts') || result.compacted.includes('b.ts'));
  });

  it('tracks cumulative stats', () => {
    const toolCalls: ToolCallRecord[] = [
      makeToolCall({ tool: 'read', args: { filePath: 'a.ts' }, ageMs: 10000 }),
      makeToolCall({ tool: 'write', args: { filePath: 'b.ts' }, ageMs: 10000 }),
      makeToolCall({ tool: 'edit', args: { filePath: 'c.ts' }, ageMs: 500 }),
      makeToolCall({ tool: 'bash', args: { command: 'ls' }, ageMs: 500 }),
    ];

    contextCompactor.compact(toolCalls, 'some input context that adds tokens');
    const stats = contextCompactor.getCompactionStats();
    ok(stats.totalCompactions >= 1);
    ok(stats.totalTokensSaved !== undefined);
    ok(stats.totalSemanticSignalsPreserved >= 0);
  });
});