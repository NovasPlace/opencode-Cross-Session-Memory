import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isGreetingLikeTurn } from '../dist/hooks/system-transform.js';

describe('system transform greeting guard', () => {
  it('detects short greeting turns', () => {
    assert.equal(isGreetingLikeTurn('hey'), true);
    assert.equal(isGreetingLikeTurn('Hello!'), true);
    assert.equal(isGreetingLikeTurn('good morning'), true);
  });

  it('does not flag real requests as greetings', () => {
    assert.equal(isGreetingLikeTurn('hey can you list my memories'), false);
    assert.equal(isGreetingLikeTurn('please save this preference'), false);
    assert.equal(isGreetingLikeTurn(''), false);
  });
});
