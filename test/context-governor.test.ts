import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AdaptiveContextGovernor } from '../dist/context-governor.js';
import { DEFAULT_GOVERNOR_CONFIG } from '../dist/context-governor-profiles.js';
import type { ContextCompilerConfig } from '../dist/types.js';

const COMPILER_CONFIG: ContextCompilerConfig = {
  enabled: true,
  modes: { cheap: 35_000, normal: 60_000, deep: 100_000 },
  defaultMode: 'normal',
  recentTurnWindow: 3,
  statusInjection: true,
  statusPlacement: 'end',
  statusVerbosity: 'compact',
  logEnabled: false,
  logSummaryRetentionDays: null,
  logDetailsRetentionDays: 30,
  storeRawCompressedContent: false,
};

function text(text: string) {
  return { type: 'text' as const, text };
}

function tool(output: string) {
  return { type: 'tool' as const, tool: 'bash', state: { status: 'completed', output, input: { command: 'npm test' } } };
}

function msg(role: string, parts: any[]) {
  return { info: { role }, parts };
}

function longToolMessages(count: number, size: number) {
  return Array.from({ length: count }, (_, index) =>
    msg('assistant', [tool(`tool ${index}: ${'x'.repeat(size)}`)]));
}

describe('AdaptiveContextGovernor', () => {
  it('leaves low-pressure sessions alone', () => {
    const governor = new AdaptiveContextGovernor(COMPILER_CONFIG, DEFAULT_GOVERNOR_CONFIG);
    const messages = [msg('user', [text('small turn')]), msg('assistant', [text('small reply')])];
    const result = governor.govern(messages, 'balanced');
    assert.equal(result.decision.action, 'none');
    assert.equal(result.metricsAfter.totalTokens <= result.decision.budget, true);
  });

  it('compacts old tool calls when projected size crosses the 50k threshold', () => {
    const governor = new AdaptiveContextGovernor(COMPILER_CONFIG, DEFAULT_GOVERNOR_CONFIG);
    const messages = [msg('user', [text('continue')]), ...longToolMessages(37, 5000)];
    const result = governor.govern(messages, 'balanced');
    assert.equal(result.decision.action, 'compact_old_tool_calls');
    assert.equal(result.compileResult?.partsCompressed ? result.compileResult.partsCompressed > 0 : false, true);
  });

  it('replaces older history with checkpoint refs at the 60k threshold', () => {
    const governor = new AdaptiveContextGovernor(COMPILER_CONFIG, DEFAULT_GOVERNOR_CONFIG);
    const messages = [msg('user', [text('resume')]), ...longToolMessages(48, 5000)];
    const result = governor.govern(messages, 'balanced');
    const firstText = String(messages[0].parts?.[0]?.text ?? '');
    assert.equal(result.decision.action, 'checkpoint_refs_only');
    assert.match(firstText, /\[CHECKPOINT_REF\]/);
    assert.equal(result.rebuildApplied, true);
  });

  it('keeps goal, phase, files, failing test, and next step during emergency rebuild', () => {
    const governor = new AdaptiveContextGovernor(COMPILER_CONFIG, DEFAULT_GOVERNOR_CONFIG);
    const messages = [
      msg('assistant', [text('Goal: Implement Phase 32 governor')]),
      msg('assistant', [text('Phase: 32')]),
      msg('assistant', [text('Files: src/context-governor.ts, test/context-governor.test.ts')]),
      msg('assistant', [text('Failed test: benchmark continuity mismatch')]),
      ...longToolMessages(120, 5000),
      msg('assistant', [text('Next step: preserve checkpoint refs during rebuild')]),
    ];
    const result = governor.govern(messages, 'balanced');
    const distilled = String(messages[0].parts?.[0]?.text ?? '');
    assert.equal(result.decision.action, 'emergency_context_rebuild');
    assert.match(distilled, /Goal: Implement Phase 32 governor/);
    assert.match(distilled, /Phase: 32/);
    assert.match(distilled, /Files: src\/context-governor\.ts/);
    assert.match(distilled, /Failed test: benchmark continuity mismatch/);
    assert.match(distilled, /Next step: preserve checkpoint refs during rebuild/);
  });
});
