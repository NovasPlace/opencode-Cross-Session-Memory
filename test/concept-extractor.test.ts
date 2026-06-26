import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractConcepts, mergeConcepts } from '../dist/concept-extractor.js';

describe('extractConcepts', () => {
  it('extracts file paths', () => {
    const result = extractConcepts('Edited src/alchemist.ts and test/lesson-recall.test.ts');
    const files = result.concepts.filter(c => c.type === 'file');
    assert.ok(files.length >= 2, `expected >=2 file concepts, got ${files.length}`);
    assert.ok(files.some(f => f.value === 'src/alchemist.ts'));
    assert.ok(files.some(f => f.value === 'test/lesson-recall.test.ts'));
    assert.ok(files.every(f => f.confidence === 0.9));
    assert.deepEqual(result.filePaths, files.map(f => f.value));
  });

  it('deduplicates file paths', () => {
    const result = extractConcepts('Fixed src/index.ts and src/index.ts again');
    const files = result.concepts.filter(c => c.type === 'file');
    assert.equal(files.length, 1);
  });

  it('extracts function names from declarations', () => {
    const result = extractConcepts('export function compileContextWithLessons() and const store = () => {}');
    const fns = result.concepts.filter(c => c.type === 'function');
    assert.ok(fns.some(f => f.value === 'compileContextWithLessons'));
    assert.ok(fns.some(f => f.value === 'store'));
    assert.ok(fns.every(f => f.confidence === 0.8));
  });

  it('extracts error messages', () => {
    const result = extractConcepts('Error: cannot read property name of undefined at auth.ts:42');
    const errors = result.concepts.filter(c => c.type === 'error');
    assert.ok(errors.length >= 1);
    assert.ok(errors[0].value.includes('cannot read property'));
    assert.ok(errors.every(e => e.confidence === 0.85));
  });

  it('extracts decisions', () => {
    const result = extractConcepts('Decided to use PostgreSQL for persistence. Chose to implement hybrid search.');
    const decisions = result.concepts.filter(c => c.type === 'decision');
    assert.ok(decisions.length >= 1);
    assert.ok(decisions.some(d => d.value.toLowerCase().includes('decided')));
    assert.ok(decisions.every(d => d.confidence === 0.7));
  });

  it('extracts tool references', () => {
    const result = extractConcepts('Used memory_search to find context_compact results');
    const tools = result.concepts.filter(c => c.type === 'tool');
    assert.ok(tools.length >= 2);
    assert.ok(tools.some(t => t.value === 'memory_search'));
    assert.ok(tools.some(t => t.value === 'context_compact'));
    assert.ok(tools.every(t => t.confidence === 0.95));
  });

  it('extracts dependencies from import statements', () => {
    const result = extractConcepts("import { Database } from 'pg'; import { Database } from 'better-sqlite3'");
    const deps = result.concepts.filter(c => c.type === 'dependency');
    assert.ok(deps.some(d => d.value === 'pg'));
    assert.ok(deps.some(d => d.value === 'better-sqlite3'));
    assert.ok(deps.every(d => !d.value.startsWith('.') && !d.value.startsWith('/')));
  });

  it('does not extract relative imports as dependencies', () => {
    const result = extractConcepts("import { foo } from './local' and from '../parent'");
    const deps = result.concepts.filter(c => c.type === 'dependency');
    assert.equal(deps.length, 0);
  });

  it('extracts general technical concepts', () => {
    const result = extractConcepts('Implemented async await pattern with database queries and vector embedding search');
    const concepts = result.concepts.filter(c => c.type === 'concept');
    const values = concepts.map(c => c.value);
    assert.ok(values.includes('async'));
    assert.ok(values.includes('await'));
    assert.ok(values.includes('database'));
    assert.ok(values.includes('vector'));
    assert.ok(values.includes('embedding'));
    assert.ok(concepts.every(c => c.confidence === 0.6));
  });

  it('deduplicates concepts by type+value', () => {
    const result = extractConcepts('async async async database database');
    const concepts = result.concepts.filter(c => c.type === 'concept');
    const asyncCount = concepts.filter(c => c.value === 'async').length;
    const dbCount = concepts.filter(c => c.value === 'database').length;
    assert.equal(asyncCount, 1);
    assert.equal(dbCount, 1);
  });

  it('returns empty arrays for empty string', () => {
    const result = extractConcepts('');
    assert.equal(result.concepts.length, 0);
    assert.deepEqual(result.filePaths, []);
    assert.deepEqual(result.functionNames, []);
    assert.deepEqual(result.errorMessages, []);
    assert.deepEqual(result.decisions, []);
    assert.deepEqual(result.toolsUsed, []);
    assert.deepEqual(result.dependencies, []);
  });

  it('includes context around extracted concepts', () => {
    const text = 'We should fix the error in src/memory-graph.ts file';
    const result = extractConcepts(text);
    const fileConcept = result.concepts.find(c => c.type === 'file');
    assert.ok(fileConcept);
    assert.ok(fileConcept.context!.length > 0);
    assert.ok(fileConcept.context!.includes('src/memory-graph.ts'));
  });
});

describe('mergeConcepts', () => {
  it('returns newConcepts when existing is undefined', () => {
    const newConcepts = [
      { type: 'file' as const, value: 'src/index.ts', confidence: 0.9 },
      { type: 'function' as const, value: 'main', confidence: 0.8 },
    ];
    const merged = mergeConcepts(undefined, newConcepts);
    assert.equal(merged.length, 2);
    assert.deepEqual(merged, newConcepts);
  });

  it('merges non-overlapping concepts', () => {
    const existing = [
      { type: 'file' as const, value: 'src/a.ts', confidence: 0.9 },
    ];
    const newConcepts = [
      { type: 'file' as const, value: 'src/b.ts', confidence: 0.9 },
    ];
    const merged = mergeConcepts(existing, newConcepts);
    assert.equal(merged.length, 2);
  });

  it('deduplicates by type+value', () => {
    const existing = [
      { type: 'file' as const, value: 'src/a.ts', confidence: 0.9 },
      { type: 'function' as const, value: 'main', confidence: 0.8 },
    ];
    const newConcepts = [
      { type: 'file' as const, value: 'src/a.ts', confidence: 0.9 },
      { type: 'error' as const, value: 'null pointer', confidence: 0.85 },
    ];
    const merged = mergeConcepts(existing, newConcepts);
    assert.equal(merged.length, 3);
    assert.ok(merged.some(c => c.type === 'file' && c.value === 'src/a.ts'));
    assert.ok(merged.some(c => c.type === 'function' && c.value === 'main'));
    assert.ok(merged.some(c => c.type === 'error' && c.value === 'null pointer'));
  });

  it('returns existing unchanged when newConcepts are all duplicates', () => {
    const existing = [
      { type: 'file' as const, value: 'src/a.ts', confidence: 0.9 },
    ];
    const newConcepts = [
      { type: 'file' as const, value: 'src/a.ts', confidence: 0.9 },
    ];
    const merged = mergeConcepts(existing, newConcepts);
    assert.equal(merged.length, 1);
  });

  it('handles both empty', () => {
    const merged = mergeConcepts([], []);
    assert.equal(merged.length, 0);
  });
});
