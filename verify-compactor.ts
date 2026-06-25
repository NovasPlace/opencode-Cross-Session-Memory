// verify-compactor.ts — Self-contained verification of ContextCompactor + ToolCallDistiller
// Run: npx tsx verify-compactor.ts   (or compile and run with node)
// Proves: distillation groups, compaction replaces old output, tokens are saved,
//         recent parts kept raw, adaptive window shrinks under pressure, cumulative tracks.

import { ToolCallDistiller } from './src/tool-distiller.js';
import { ContextCompactor } from './src/context-compactor.js';
import { ToolCallRecord, ToolCallGroup } from './src/types.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}`);
    failed++;
  }
}

// ── Build realistic mock tool parts matching opencode ToolPart shape ──
function makeToolPart(tool: string, output: string, ageMs: number, file?: string): unknown {
  return {
    type: 'tool',
    tool,
    callID: `call_${Math.random().toString(36).slice(2, 8)}`,
    state: {
      status: 'completed',
      input: file ? { filePath: `C:/project/src/${file}` } : { command: 'npm test' },
      output,
      title: `${tool} result`,
      metadata: {},
      time: { start: Date.now() - ageMs, end: Date.now() - ageMs + 100 },
    },
  };
}

function makeMessages(parts: unknown[]): { parts: unknown[] }[] {
  return [{ parts }];
}

// ── Test 1: Distiller groups consecutive tool calls ──
console.log('\n=== Test 1: ToolCallDistiller grouping ===');

const distillerConfig = {
  enabled: true,
  groupWindowMs: 30000,
  maxSummaryLength: 200,
  maxContextSummaries: 10,
  minCallsForGroup: 2,
  autoSaveAsMemory: false,
};

const distiller = new ToolCallDistiller(distillerConfig);

const records: ToolCallRecord[] = [
  { tool: 'read', args: { filePath: 'auth.ts' }, output: 'file contents...', timestamp: Date.now() - 5000, sessionId: 's1', filePath: 'auth.ts' },
  { tool: 'read', args: { filePath: 'auth.ts' }, output: 'file contents...', timestamp: Date.now() - 4000, sessionId: 's1', filePath: 'auth.ts' },
  { tool: 'edit', args: { filePath: 'auth.ts' }, output: 'edited', timestamp: Date.now() - 3000, sessionId: 's1', filePath: 'auth.ts' },
  { tool: 'bash', args: { command: 'npm test' }, output: 'all tests passed', timestamp: Date.now() - 2000, sessionId: 's1' },
];

for (const r of records) distiller.record(r);
const summary = distiller.distill();

assert(summary.groups.length >= 1, `distiller produced groups (got ${summary.groups.length})`);
assert(summary.totalCallsSummarized >= 3, `most calls summarized (got ${summary.totalCallsSummarized})`);
assert(summary.compressed.includes('=== TOOL CALL DISTILLATION ==='), 'compressed summary has header');
assert(summary.groups.some((g: ToolCallGroup) => g.filesChanged.includes('auth.ts')), 'group captured auth.ts file change');

// ── Test 2: Compactor replaces old tool output ──
console.log('\n=== Test 2: Compactor replaces old tool parts ===');

const compactorConfig = {
  enabled: true,
  workingMemoryWindow: 2,
  minAgeMs: 1000,
  maxOutputChars: 120,
  truncateInput: true,
};

const compactor = new ContextCompactor(compactorConfig);

// 5 tool parts: 3 old (large output), 2 recent (small output)
const bigOutput = 'X'.repeat(4000); // ~1000 tokens each
const oldParts = [
  makeToolPart('read', bigOutput, 60000, 'auth.ts'),
  makeToolPart('read', bigOutput, 55000, 'config.ts'),
  makeToolPart('bash', bigOutput, 50000),
];
const recentParts = [
  makeToolPart('read', 'small recent output', 500, 'index.ts'),
  makeToolPart('edit', 'small edit output', 200, 'index.ts'),
];

const messages = makeMessages([...oldParts, ...recentParts]);
const groups = distiller.currentGroups;

const result = compactor.compact(messages, groups);

assert(result.totalToolParts === 5, `found 5 tool parts (got ${result.totalToolParts})`);
assert(result.compactedParts === 3, `compacted 3 old parts (got ${result.compactedParts})`);
assert(result.keptRawParts === 2, `kept 2 recent raw (got ${result.keptRawParts})`);
assert(result.tokensSaved > 2000, `saved significant tokens (got ~${result.tokensSaved})`);
assert(result.savedPercent > 50, `saved >50% (got ${result.savedPercent}%)`);

// Verify old parts were actually replaced
const compactedPart = (messages[0].parts[0] as { state: { output: string } });
assert(compactedPart.state.output.startsWith('[COMPACTED]'), `old output replaced with [COMPACTED] marker`);
assert(!compactedPart.state.output.includes('XXXX'), `old output content is gone`);

// Verify recent parts were NOT replaced
const recentPart = (messages[0].parts[3] as { state: { output: string } });
assert(recentPart.state.output === 'small recent output', `recent output kept raw`);

// ── Test 3: Already-compacted parts are skipped ──
console.log('\n=== Test 3: Idempotency — already compacted parts skipped ===');

const result2 = compactor.compact(messages, groups);
assert(result2.compactedParts === 0, `second pass compacts 0 new parts (got ${result2.compactedParts})`);
assert(result2.skippedParts >= 3, `old parts skipped on second pass (got ${result2.skippedParts})`);

// ── Test 4: Adaptive window shrinks under pressure ──
console.log('\n=== Test 4: Adaptive working memory window ===');

function freshParts(count: number): unknown[] {
  const parts: unknown[] = [];
  for (let i = 0; i < count; i++) {
    parts.push(makeToolPart('read', bigOutput, 60000 - i * 100, `file${i}.ts`));
  }
  return parts;
}

const compactor2 = new ContextCompactor(compactorConfig);
const lowPressure = compactor2.compact(makeMessages(freshParts(20)), groups, 0.1);
assert(lowPressure.keptRawParts <= 2, `low pressure keeps <=2 raw (got ${lowPressure.keptRawParts})`);

const compactor3 = new ContextCompactor(compactorConfig);
const highPressure = compactor3.compact(makeMessages(freshParts(20)), groups, 0.9);
assert(highPressure.compactedParts >= 17, `high pressure compacts more (got ${highPressure.compactedParts})`);
assert(highPressure.keptRawParts <= 3, `high pressure keeps fewer raw (got ${highPressure.keptRawParts})`);

// ── Test 5: Cumulative stats accumulate ──
console.log('\n=== Test 5: Cumulative savings tracking ===');

const compactor4 = new ContextCompactor(compactorConfig);
const stats0 = compactor4.getCumulativeStats();
assert(stats0.totalCompactions === 0, `initial cumulative is zero`);

compactor4.compact(makeMessages(freshParts(10)), groups, 0.5);
compactor4.compact(makeMessages(freshParts(10)), groups, 0.5);

const stats1 = compactor4.getCumulativeStats();
assert(stats1.totalCompactions === 2, `cumulative tracked 2 compactions (got ${stats1.totalCompactions})`);
assert(stats1.totalTokensSaved > 0, `cumulative tokens saved > 0 (got ~${stats1.totalTokensSaved})`);
assert(stats1.firstCompactedAt !== null, `firstCompactedAt is set`);
assert(stats1.lastCompactedAt !== null, `lastCompactedAt is set`);

// ── Test 6: Distilled reference includes outcome from matching group ──
console.log('\n=== Test 6: Compacted reference includes distilled outcome ===');

const compactor5 = new ContextCompactor(compactorConfig);
const refParts = makeMessages([makeToolPart('edit', bigOutput, 60000, 'auth.ts')]);
const refResult = compactor5.compact(refParts, groups);
const refOutput = (refParts[0].parts[0] as { state: { output: string } }).state.output;
assert(refOutput.includes('[COMPACTED]'), `reference has COMPACTED marker`);
assert(refOutput.includes('auth.ts') || refOutput.includes('edit'), `reference includes tool/file info`);
assert(refOutput.includes('tok'), `reference includes original token count`);

// ── Test 7: Plugin compaction must not trigger OpenCode's discard path ──
console.log('\n=== Test 7: Compacted reference survives provider conversion ===');

const compactor6 = new ContextCompactor(compactorConfig);
const canonicalParts = makeMessages([makeToolPart('read', bigOutput, 60000, 'auth.ts')]);
compactor6.compact(canonicalParts, groups);
const canonicalPart = canonicalParts[0].parts[0] as { state: { output: string; time: { compacted?: number } } };
assert(canonicalPart.state.output.startsWith('[COMPACTED]'), `compacted reference stays in output`);
assert(canonicalPart.state.time.compacted === undefined, `time.compacted is not set by plugin compaction`);

// ── Test 8: Parts already compacted by opencode are skipped ──
console.log('\n=== Test 8: Replace opencode discard marker ===');

const compactor7 = new ContextCompactor(compactorConfig);
const preCompacted = makeToolPart('read', bigOutput, 60000, 'config.ts');
(preCompacted as { state: { time: { compacted?: number } } }).state.time.compacted = Date.now() - 1000;
(preCompacted as { state: { output: string } }).state.output = '[Old tool result content cleared]';
const preCompactedMsgs = makeMessages([preCompacted]);
const preResult = compactor7.compact(preCompactedMsgs, groups);
const repairedPart = preCompactedMsgs[0].parts[0] as { state: { output: string; time: { compacted?: number } } };
assert(preResult.compactedParts === 1, `discard marker part repaired (got ${preResult.compactedParts})`);
assert(repairedPart.state.output.startsWith('[COMPACTED]'), `discard marker replaced with durable reference`);
assert(!repairedPart.state.output.includes('[Old tool result content cleared]'), `old discard marker removed`);
assert(repairedPart.state.time.compacted === undefined, `time.compacted removed from repaired part`);

const recentDiscard = makeToolPart('read', '[Old tool result content cleared]', 100, 'recent.ts');
(recentDiscard as { state: { time: { compacted?: number } } }).state.time.compacted = Date.now();
const recentDiscardMsgs = makeMessages([makeToolPart('read', 'fresh raw output', 100, 'raw.ts'), recentDiscard]);
const recentDiscardResult = compactor7.compact(recentDiscardMsgs, groups);
const recentDiscardPart = recentDiscardMsgs[0].parts[1] as { state: { output: string; time: { compacted?: number } } };
assert(recentDiscardResult.compactedParts === 1, `recent discard marker repaired inside working window`);
assert(recentDiscardPart.state.output.startsWith('[COMPACTED]'), `recent discard marker replaced`);
assert(recentDiscardPart.state.time.compacted === undefined, `recent time.compacted removed`);

// ── Test 9: Critical signals are preserved in compacted reference ──
console.log('\n=== Test 9: Critical-signal preservation (semantic loss prevention) ===');

const compactor8 = new ContextCompactor(compactorConfig);
const riskyOutput = 'X'.repeat(3000) + '\nWarning: jwt.verify() signature deprecated in v4.0\n' + 'Y'.repeat(500) + '\nline 42: clockTolerance not set\n';
const riskyParts = makeMessages([makeToolPart('read', riskyOutput, 60000, 'auth.ts')]);
compactor8.compact(riskyParts, groups);
const riskyRef = (riskyParts[0].parts[0] as { state: { output: string } }).state.output;
assert(riskyRef.includes('⚠'), `reference includes preserved-signals marker`);
assert(riskyRef.includes('Warning') || riskyRef.includes('warning'), `deprecation warning preserved`);
assert(riskyRef.includes('line 42') || riskyRef.includes('clockTolerance'), `line-number signal preserved`);
assert(!riskyRef.includes('XXXX'), `bulk noise content is gone`);

// ── Summary ──
console.log('\n=== VERIFICATION SUMMARY ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failed > 0) {
  console.error('VERIFICATION FAILED');
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED');
  process.exit(0);
}
