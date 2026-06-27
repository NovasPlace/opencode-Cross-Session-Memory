import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { normalizePromptMessages } from '../dist/prompt-message-sanitizer.js';

describe('prompt message sanitizer', () => {
  it('converts system brief messages into assistant turns', () => {
    const result = normalizePromptMessages(
      [{ info: { role: 'system', sessionID: 'sess-1' }, parts: [{ type: 'text', text: 'brief' }] }] as any,
      { cwd: '/tmp', root: '/tmp' },
    );

    assert.equal(result.convertedSystemMessages, 1);
    assert.equal(result.droppedMessages, 0);
    assert.equal(result.messages.length, 1);
    assert.equal(result.messages[0].info?.role, 'assistant');
    assert.equal(result.messages[0].info?.sessionID, 'sess-1');
    assert.equal(result.messages[0].info?.parentID, '');
    assert.equal(result.messages[0].info?.modelID, 'synthetic');
    assert.equal(result.messages[0].parts?.[0]?.type, 'text');
    assert.equal(result.messages[0].parts?.[0]?.sessionID, 'sess-1');
    assert.equal(result.messages[0].parts?.[0]?.messageID, result.messages[0].info?.id);
    assert.match(String(result.messages[0].parts?.[0]?.id), /-text-0$/);
  });

  it('drops messages without a usable role or parts', () => {
    const result = normalizePromptMessages(
      [{ info: { role: 'tool', sessionID: 'sess-1' }, parts: [] }] as any,
      { cwd: '/tmp', root: '/tmp' },
    );

    assert.equal(result.messages.length, 0);
    assert.equal(result.droppedMessages, 1);
  });

  it('drops messages whose parts stay unusable after normalization', () => {
    const result = normalizePromptMessages(
      [{ info: { role: 'assistant', sessionID: 'sess-1' }, parts: [{ type: 'text' }] }] as any,
      { cwd: '/tmp', root: '/tmp' },
    );

    assert.equal(result.messages.length, 0);
    assert.equal(result.droppedMessages, 1);
  });

  it('drops assistant patch parts that cannot be forwarded to the model prompt', () => {
    const result = normalizePromptMessages(
      [{ info: { role: 'assistant', sessionID: 'sess-1' }, parts: [{ type: 'patch', hash: 'abc' }] }] as any,
      { cwd: '/tmp', root: '/tmp' },
    );

    assert.equal(result.messages.length, 0);
    assert.equal(result.droppedMessages, 1);
  });
});
