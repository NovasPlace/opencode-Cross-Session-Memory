import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runGovernorBenchmark } from '../dist/context-governor-benchmark.js';

describe('Phase 32 benchmark harness', () => {
  it('shows the governor reducing active context versus baseline', () => {
    const report = runGovernorBenchmark();
    assert.equal(report.governor.finalActiveTokens < report.baseline.finalActiveTokens, true);
    assert.equal(report.governor.totalInputTokens < report.baseline.totalInputTokens, true);
  });

  it('preserves continuity after destructive rebuild', () => {
    const report = runGovernorBenchmark();
    assert.equal(report.destructiveRebuild.continuitySurvived, true);
    assert.equal(report.destructiveRebuild.forgottenDecisionCount, 0);
    assert.equal(report.destructiveRebuild.finalBuildTestResult, 'failing error preserved');
  });

  it('keeps repeated work risk below baseline', () => {
    const report = runGovernorBenchmark();
    assert.equal(report.governor.repeatedWorkCount <= report.baseline.repeatedWorkCount, true);
  });
});
