/**
 * Regression tests for assistant-text-compactor.
 *
 * Tests that:
 *   1. Recent assistant messages are protected (not compressed)
 *   2. Old large text parts are compressed, risk lines preserved
 *   3. No compaction when config is disabled
 *   4. Before/after token counts are accurate
 *
 * Run:  node --experimental-strip-types --test test/assistant-compactor.test.ts
 * Or:   npm test
 */

import { describe, it } from 'node:test';
import { strictEqual, ok } from 'node:assert/strict';
import { compactAssistantText } from '../dist/assistant-text-compactor.js';
import type { AssistantCompactorConfig } from '../dist/assistant-text-compactor.js';

function mkAssistantMsg(textParts: string[], assistantIndex = 0) {
  const ts = Date.now() - (10 - assistantIndex) * 60000;
  return {
    info: { role: 'assistant', time: { created: ts } },
    parts: textParts.map(t => ({ type: 'text', text: t })),
  };
}

const asstCfg: AssistantCompactorConfig = {
  enabled: true,
  workingAssistantWindow: 2,
  minTokens: 50,
  maxOutputChars: 300,
};

describe('assistant-text-compactor regression tests', () => {
  it('test7: recent assistant messages are protected (not compressed)', () => {
    const msgs = [
      mkAssistantMsg(['This is an older assistant message with enough text to trigger compaction. '.repeat(10)], 0),
      mkAssistantMsg(['Second older message with plenty of content to be worth compressing. '.repeat(10)], 1),
      mkAssistantMsg(['Recent message one.'], 2),
      mkAssistantMsg(['Recent message two.'], 3),
    ];

    const result = compactAssistantText(msgs, asstCfg);

    strictEqual(result.partsCompacted, 2, 'old large messages should be compacted');
    strictEqual(result.messagesScanned, 4, 'all 4 assistant messages scanned');

    ok(!msgs[2].parts[0].text.includes('[COMPACTED_ASSISTANT]'), 'message 2 should be untouched');
    ok(!msgs[3].parts[0].text.includes('[COMPACTED_ASSISTANT]'), 'message 3 should be untouched');
  });

  it('test8: old large text part is compressed, preserves risk lines', () => {
    const longText = 'This is verbose explanation text. '.repeat(50)
      + '\nMayday: critical failure detected\n'
      + 'More filler text here. '.repeat(20);

    const msgs = [
      mkAssistantMsg([longText], 0),
      mkAssistantMsg(['recent one'], 1),
      mkAssistantMsg(['recent two'], 2),
    ];

    const result = compactAssistantText(msgs, asstCfg);

    ok(result.partsCompacted >= 1, 'should compact the old large text part');
    ok(result.tokensSaved > 0, 'should save tokens');

    const compactedText = msgs[0].parts[0].text;
    ok(compactedText.includes('[COMPACTED_ASSISTANT]'), 'should have COMPACTED_ASSISTANT marker');
    ok(compactedText.includes('Mayday'), 'should preserve Mayday line');
  });

  it('test9: no compaction when config is disabled', () => {
    const longText = 'Verbose text. '.repeat(100);
    const msgs = [
      mkAssistantMsg([longText], 0),
      mkAssistantMsg(['r1'], 1),
      mkAssistantMsg(['r2'], 2),
    ];

    const result = compactAssistantText(msgs, { ...asstCfg, enabled: false });
    strictEqual(result.partsCompacted, 0, 'nothing should be compacted when disabled');
  });

  it('test10: assistant compactor reports accurate before/after counts', () => {
    const textA = 'A'.repeat(600);
    const textB = 'B'.repeat(600);

    const msgs = [
      mkAssistantMsg([textA], 0),
      mkAssistantMsg([textB], 1),
      mkAssistantMsg(['recent'], 2),
      mkAssistantMsg(['recent'], 3),
    ];

    const result = compactAssistantText(msgs, asstCfg);

    ok(result.beforeTokens > result.afterTokens, 'before should exceed after');
    ok(result.savedPercent > 0, 'should report positive savings percentage');
    strictEqual(result.messagesScanned, 4, 'should scan all 4 assistant messages');
  });
});
