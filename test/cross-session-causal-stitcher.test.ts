import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CrossSessionCausalStitcher } from '../src/cross-session-causal-stitcher.js';
import { PhaseNarrativeBuilder } from '../src/self-continuity-phase-narrative.js';
import type { FailureTrace } from '../src/failure-trace-types.js';

function makeTrace(): FailureTrace {
  return {
    id: 77,
    problem: 'Loop detected while rereading the same file',
    attemptedAction: 'Re-read src/self-continuity-integration.ts',
    result: 'failed',
    failureReason: 'Repeated read did not add new evidence',
    diagnosis: 'Missing guard against duplicate reads',
    correction: 'Add read dedupe check before reopening the same file',
    lessonCreated: 'Avoid repeated reads when the file was already inspected',
    laterBehaviorChange: 'Future sessions skip duplicate reads and move to the next source',
    evidenceAnchors: ['loop detected', 'duplicate read avoided'],
    createdAt: '2026-06-27T00:00:00.000Z',
    createdBySession: 'session-failure',
    relatedTraceIds: [],
  };
}

describe('CrossSessionCausalStitcher', () => {
  it('creates direct failure -> correction -> lesson -> behavior-change chains when evidence exists', () => {
    const stitcher = new CrossSessionCausalStitcher();
    const result = stitcher.stitchFailureTrace(makeTrace(), [
      { id: 90, sessionId: 'session-future', content: 'Avoid repeated reads when the file was already inspected' },
      { id: 91, sessionId: 'session-future', content: 'Future sessions skip duplicate reads and all tests pass green' },
    ]);

    assert.equal(result.links.length, 6);
    assert.ok(result.links.some((link) => link.linkType === 'lesson_to_recall' && link.linkStatus === 'direct'));
    assert.ok(result.links.some((link) => link.linkType === 'recall_to_behavior_change' && link.linkStatus === 'direct'));
    assert.ok(result.growthEvidence.lessonRecalled);
    assert.ok(result.growthEvidence.behaviorChanged);
  });

  it('preserves inferred and gap links instead of silently smoothing them over', () => {
    const stitcher = new CrossSessionCausalStitcher();
    const result = stitcher.stitchFailureTrace(makeTrace(), [
      { id: 92, sessionId: 'session-future', content: 'All tests pass green after the retry policy change' },
    ]);

    assert.ok(result.links.some((link) => link.linkType === 'lesson_to_recall' && link.linkStatus === 'gap'));
    assert.ok(result.links.some((link) => link.linkType === 'recall_to_behavior_change' && link.linkStatus === 'inferred'));
    assert.ok(result.links.some((link) => link.gapKind === 'missing_lesson_recall'));
    assert.equal(result.growthEvidence.lessonRecalled, false);
  });

  it('reconstructs Session D -> Session E -> Phase 22 as a canonical cross-session proof chain', () => {
    const stitcher = new CrossSessionCausalStitcher();
    const links = stitcher.buildCanonicalProofChain();

    assert.ok(links.some((link) => link.sourceSessionId === 'session-d' && link.targetSessionId === 'session-e'));
    assert.ok(links.some((link) => link.sourceSessionId === 'session-e' && link.targetSessionId === 'phase-22'));
    assert.ok(links.some((link) => link.targetSessionId === 'phase-27' && link.linkStatus === 'gap'));
  });

  it('feeds cross-session links into PhaseNarrativeBuilder injection output with direct/inferred/gap labels', () => {
    const stitcher = new CrossSessionCausalStitcher();
    const links = stitcher.buildCanonicalProofChain();
    const builder = new PhaseNarrativeBuilder({
      phases: [{ phase: 21, name: 'P21', problem: 'a', action: 'b', result: 'c', downstreamChange: 'd' }],
      links: [],
      crossSessionLinks: links,
      growthEvidence: [{
        lessonRecalled: true,
        behaviorChanged: true,
        changedBehaviorSummary: 'duplicate reads avoided',
        evidenceAnchor: 'loop detected -> duplicate read avoided',
        confidence: 0.9,
        missingEvidence: [],
      }],
    });
    const result = builder.buildNarrative();

    assert.ok(result.narrative.includes('[DIRECT]'));
    assert.ok(result.narrative.includes('[GAP]'));
    assert.ok(result.narrative.includes('Growth evidence:'));
    assert.ok(result.narrative.includes('duplicate reads avoided'));
  });
});
