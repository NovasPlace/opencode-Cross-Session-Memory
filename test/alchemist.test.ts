import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AlchemistEngine, DEFAULT_ALCHEMIST_CONFIG } from '../dist/alchemist.js';
import type { AlchemistIngest } from '../dist/types.js';

describe('Alchemist', () => {
  function makeIngest(overrides: Partial<AlchemistIngest> = {}): AlchemistIngest {
    return {
      source: 'test_failure',
      content: 'Error: SQL placeholder bug at query.ts:42',
      metadata: { file: 'query.ts', line: 42 },
      timestamp: new Date(),
      ...overrides,
    };
  }

  it('1. ingests raw sources and returns extracted capabilities', () => {
    const a = new AlchemistEngine();
    const caps = a.ingest([makeIngest()]);
    assert.ok(Array.isArray(caps), 'ingest returns array');
  });

  it('2. extracts capabilities from repo scan', () => {
    const a = new AlchemistEngine();
    const caps = a.ingest([makeIngest({
      source: 'repo_scan',
      content: 'class UserService {\n  async createUser() {}\n  async deleteUser() {}\n}',
      metadata: { file: 'UserService.ts' },
    })]);
    assert.ok(caps.length > 0, 'should extract capabilities from repo');
  });

  it('3. detects anti-patterns from test failures', () => {
    const a = new AlchemistEngine();
    const caps = a.ingest([makeIngest({
      source: 'test_failure',
      content: 'Error: SQL placeholder bug - LIMIT filter reused parameter index',
      metadata: { file: 'query.ts' },
    })]);
    const anti = caps.filter(c => c.type === 'anti_pattern' || c.type === 'risk_rule');
    assert.ok(anti.length > 0, 'should detect anti-pattern from failure');
  });

  it('4. audits gaps against organism manifest', () => {
    const a = new AlchemistEngine(DEFAULT_ALCHEMIST_CONFIG);
    a.ingest([makeIngest({ source: 'repo_scan', content: 'function read() {}' })]);
    const report = a.audit();
    assert.ok(report !== undefined, 'audit returns a gap report');
    assert.ok(Array.isArray(report.missing), 'report.missing is array');
  });

  it('5. synthesizes lessons from patterns', () => {
    const a = new AlchemistEngine();
    a.ingest([makeIngest({
      source: 'session_trace',
      content: 'fixed SQL parameter reuse bug by resetting index counter after LIMIT clause',
      metadata: { file: 'query.ts' },
    })]);
    const report = a.audit();
    const lessons = a.synthesize(report);
    assert.ok(Array.isArray(lessons), 'synthesize returns lesson array');
  });

  it('6. generates blueprints from verified lessons', () => {
    const a = new AlchemistEngine();
    a.ingest([makeIngest({
      source: 'test_failure',
      content: 'assertion error: expected 200 got 500 - missing error handler',
      metadata: { file: 'server.ts' },
    })]);
    const report = a.audit();
    a.synthesize(report);
    const bp = a.generateBlueprints();
    assert.ok(Array.isArray(bp), 'generateBlueprints returns blueprint array');
  });

  it('7. stores and recalls lessons by type', () => {
    const a = new AlchemistEngine();
    a.ingest([makeIngest({
      source: 'session_trace',
      content: 'always check SQL parameter indexes when mixing LIMIT and WHERE',
      metadata: { file: 'query.ts' },
    })]);
    const report = a.audit();
    a.synthesize(report);
    const recalled = a.recall('SQL parameter');
    assert.ok(Array.isArray(recalled), 'recall returns array');
  });

  it('8. full pipeline: ingest-extract-audit-synthesize-blueprint-store-recall', () => {
    const a = new AlchemistEngine(DEFAULT_ALCHEMIST_CONFIG);
    const caps = a.ingest([makeIngest({
      source: 'test_failure',
      content: 'TypeError: Cannot read property of undefined - missing null check',
      metadata: { file: 'handler.ts', line: 15 },
    }), makeIngest({
      source: 'repo_scan',
      content: 'class DataProcessor {\n  process() {}\n  validate() {}\n}',
      metadata: { file: 'DataProcessor.ts' },
    })]);
    assert.ok(caps.length > 0, 'pipeline extracts capabilities');
    const report = a.audit();
    const lessons = a.synthesize(report);
    const bp = a.generateBlueprints();
    const recalled = a.recall('null check');
    assert.ok(recalled.length > 0 || lessons.length > 0, 'pipeline produces recallable lessons or blueprints');
  });
});
