import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  selectResponseMode,
  formatBasicResponse,
  formatDeepResponse,
  selectAndFormat,
} from '../src/response-mode-selector.js';
import type { IntegratedRecallResult } from '../src/self-continuity-integration.js';
import type { IntegratedRecord } from '../src/self-continuity-integration.js';
import type { PhaseNarrativeResult } from '../src/self-continuity-phase-narrative.js';
import type { HydratedSelfContinuityRecord } from '../src/self-continuity-hydrator.js';
import type { HydratedCausalThread } from '../src/self-continuity-causal-thread.js';

function makeRecord(overrides: Partial<HydratedSelfContinuityRecord> = {}): HydratedSelfContinuityRecord {
  return {
    recordId: overrides.recordId ?? 1,
    createdAt: overrides.createdAt ?? new Date('2026-06-27'),
    triggerType: overrides.triggerType ?? 'user_prompt',
    confidenceScore: overrides.confidenceScore ?? 0.8,
    selfObservation: overrides.selfObservation ?? 'test observation',
    evidenceAnchors: overrides.evidenceAnchors ?? ['anchor-a'],
    continuityGap: overrides.continuityGap ?? 'test gap',
    driftSummary: overrides.driftSummary ?? 'no drift',
    similarityMethod: overrides.similarityMethod ?? 'keyword_fallback',
    hydratedAt: overrides.hydratedAt ?? new Date('2026-06-27'),
  };
}

function makeThread(): HydratedCausalThread {
  return {
    rootMemoryId: 1,
    thread: [
      { memoryId: 1, eventType: 'repo', role: 'action', summary: 'Built the hydrator', evidenceAnchors: ['e1'], confidence: 0.9, timestamp: '2026-06-27' },
      { memoryId: 2, eventType: 'repo', role: 'result', summary: 'Tests pass', evidenceAnchors: ['e2'], confidence: 0.85, timestamp: '2026-06-27' },
    ],
    gaps: [],
    confidence: 0.85,
    reconstructionSummary: 'Clean causal chain',
    budgetExceeded: false,
    fallbackUsed: false,
  };
}

function makeIntegratedRecord(thread: HydratedCausalThread | null = null): IntegratedRecord {
  return {
    record: makeRecord(),
    causalThread: thread,
    stabilityScore: 0.85,
    hydrationDepthScore: thread ? 0.7 : 0.3,
  };
}

function makeEmptyResult(): IntegratedRecallResult {
  return {
    records: [],
    totalRecords: 0,
    totalThreads: 0,
    avgStability: 0,
    avgHydrationDepth: 0,
    phaseNarrative: null,
    summary: 'No self-continuity records found.',
    tokenBudget: 3000,
  };
}

function makeBasicResult(): IntegratedRecallResult {
  const rec = makeIntegratedRecord(null);
  return {
    records: [rec],
    totalRecords: 1,
    totalThreads: 0,
    avgStability: rec.stabilityScore,
    avgHydrationDepth: rec.hydrationDepthScore,
    phaseNarrative: null,
    summary: 'Hydrated 1 record.',
    tokenBudget: 2600,
  };
}

function makeDeepResult(): IntegratedRecallResult {
  const rec = makeIntegratedRecord(makeThread());
  const narrative: PhaseNarrativeResult = {
    phases: [],
    links: [{
      fromPhase: 21,
      toPhase: 22,
      causationType: 'exposed_gap',
      summary: 'Phase 21 led to Phase 22 because silent recall exposed the need for drift tracking.',
    }],
    narrative: 'Phase 21 led to Phase 22.',
    gaps: [],
    confidence: 0.9,
  };
  return {
    records: [rec],
    totalRecords: 1,
    totalThreads: 1,
    avgStability: rec.stabilityScore,
    avgHydrationDepth: rec.hydrationDepthScore,
    phaseNarrative: narrative,
    summary: 'Hydrated 1 record with 1 thread.',
    tokenBudget: 2400,
  };
}

describe('ResponseModeSelector', () => {
  describe('selectResponseMode', () => {
    it('returns basic for empty result', () => {
      const result = selectResponseMode(makeEmptyResult());
      assert.equal(result.mode, 'basic');
      assert.ok(result.reasons.includes('no_records'));
    });

    it('returns basic for record without threads or narrative', () => {
      const result = selectResponseMode(makeBasicResult());
      assert.equal(result.mode, 'basic');
      assert.ok(result.reasons.includes('insufficient_depth_for_deep_mode'));
    });

    it('returns deep when causal threads available', () => {
      const result = selectResponseMode(makeDeepResult());
      assert.equal(result.mode, 'deep');
      assert.ok(result.reasons.includes('causal_threads_available'));
      assert.ok(result.reasons.includes('phase_narrative_available'));
    });

    it('returns deep when high hydration depth', () => {
      const rec = makeIntegratedRecord(null);
      rec.hydrationDepthScore = 0.7;
      const r: IntegratedRecallResult = {
        records: [rec],
        totalRecords: 1,
        totalThreads: 0,
        avgStability: 0.85,
        avgHydrationDepth: 0.7,
        phaseNarrative: null,
        summary: 'Hydrated 1 record.',
        tokenBudget: 2600,
      };
      const result = selectResponseMode(r);
      assert.equal(result.mode, 'deep');
      assert.ok(result.reasons.includes('high_hydration_depth'));
    });
  });

  describe('formatBasicResponse', () => {
    it('includes record info but no causal threads', () => {
      const response = formatBasicResponse(makeBasicResult());
      assert.equal(response.mode, 'basic');
      assert.ok(response.content.includes('Records found: 1'));
      assert.ok(response.content.includes('test observation'));
      assert.ok(!response.content.includes('Causal thread:'));
    });
  });

  describe('formatDeepResponse', () => {
    it('includes causal threads and narrative', () => {
      const response = formatDeepResponse(makeDeepResult());
      assert.equal(response.mode, 'deep');
      assert.ok(response.content.includes('Causal thread:'));
      assert.ok(response.content.includes('[action] Built the hydrator'));
      assert.ok(response.content.includes('Phase narrative'));
      assert.ok(response.content.includes('Phase 21'));
    });
  });

  describe('selectAndFormat', () => {
    it('auto-selects basic for empty result', () => {
      const response = selectAndFormat(makeEmptyResult());
      assert.equal(response.mode, 'basic');
      assert.ok(response.content.includes('Basic Mode'));
    });

    it('auto-selects deep when context is rich', () => {
      const response = selectAndFormat(makeDeepResult());
      assert.equal(response.mode, 'deep');
      assert.ok(response.content.includes('Deep Mode'));
      assert.ok(response.content.includes('Causal thread:'));
    });
  });
});
