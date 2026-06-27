import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isOwnershipLimitedSchemaError } from '../dist/schema/schema-errors.js';

describe('schema ownership error classifier', () => {
  it('detects table ownership failures', () => {
    assert.equal(
      isOwnershipLimitedSchemaError({ code: '42501', message: 'must be owner of table sessions' }),
      true,
    );
  });

  it('detects relation ownership failures', () => {
    assert.equal(
      isOwnershipLimitedSchemaError({ code: '42501', message: 'must be owner of relation memory_recall_events' }),
      true,
    );
  });

  it('ignores unrelated postgres errors', () => {
    assert.equal(
      isOwnershipLimitedSchemaError({ code: '23505', message: 'duplicate key value violates unique constraint' }),
      false,
    );
  });
});
