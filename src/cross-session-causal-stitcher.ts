import type { FailureTrace } from './failure-trace-types.js';
import { SESSION_D_ANCHOR, SESSION_E_ANCHOR } from './self-drift-anchors.js';
import type {
  CrossSessionLinkInput,
  FailureTraceStitchResult,
  GrowthEvidence,
  StitchMemoryRecord,
} from './cross-session-causal-types.js';

export class CrossSessionCausalStitcher {
  stitchFailureTrace(trace: FailureTrace, laterMemories: StitchMemoryRecord[]): FailureTraceStitchResult {
    const recalled = findLessonRecall(trace, laterMemories);
    const changed = findBehaviorChange(trace, laterMemories);
    const links: CrossSessionLinkInput[] = [
      makeLink(trace, trace.createdBySession, 'diagnosis', 'failure_to_diagnosis', trace.diagnosis ? 'direct' : 'gap', trace.failureReason, trace.diagnosis),
      makeLink(trace, 'diagnosis', 'correction', 'diagnosis_to_correction', trace.correction ? 'direct' : 'gap', trace.diagnosis, trace.correction),
      makeLink(trace, 'correction', 'lesson', 'correction_to_lesson', trace.lessonCreated ? 'direct' : 'gap', trace.correction, trace.lessonCreated),
      makeRecallLink(trace, recalled),
      makeBehaviorLink(trace, recalled, changed),
      makeImprovementLink(trace, changed),
    ];
    return {
      links,
      growthEvidence: buildGrowthEvidence(recalled, changed),
    };
  }

  buildCanonicalProofChain(): CrossSessionLinkInput[] {
    return [
      {
        sourceMemoryId: 43871,
        targetMemoryId: 43871,
        sourceSessionId: SESSION_D_ANCHOR.sessionId,
        targetSessionId: SESSION_E_ANCHOR.sessionId,
        linkType: 'lesson_to_recall',
        linkStatus: 'direct',
        confidence: 0.92,
        evidenceAnchors: ['Session D cited memory #43871', 'Session E explicitly references Session D citing memory #43871'],
        metadata: { label: 'Session D -> Session E recursive reconstruction' },
      },
      {
        sourceMemoryId: 43871,
        targetMemoryId: undefined,
        sourceSessionId: SESSION_E_ANCHOR.sessionId,
        targetSessionId: 'phase-22',
        linkType: 'phase_transition',
        linkStatus: 'direct',
        confidence: 0.88,
        evidenceAnchors: ['recursive event recall PASS', 'A/D/E used as initial drift fixtures'],
        metadata: { label: 'Session E -> Phase 22 drift tracking' },
      },
      {
        sourceSessionId: 'phase-22',
        targetSessionId: 'phase-23',
        linkType: 'phase_transition',
        linkStatus: 'direct',
        confidence: 0.86,
        evidenceAnchors: ['stability metric exposed evidence fidelity gap'],
        metadata: { label: 'Phase 22 -> Phase 23 evidence hydration' },
      },
      {
        sourceSessionId: 'phase-23',
        targetSessionId: 'phase-24',
        linkType: 'phase_transition',
        linkStatus: 'direct',
        confidence: 0.84,
        evidenceAnchors: ['canonical content visible but path between records missing'],
        metadata: { label: 'Phase 23 -> Phase 24 causal thread hydration' },
      },
      {
        sourceSessionId: 'phase-24',
        targetSessionId: 'phase-25',
        linkType: 'phase_transition',
        linkStatus: 'direct',
        confidence: 0.82,
        evidenceAnchors: ['per-memory thread worked but depth remained low'],
        metadata: { label: 'Phase 24 -> Phase 25 hydration depth scoring' },
      },
      {
        sourceSessionId: 'phase-25',
        targetSessionId: 'phase-26',
        linkType: 'phase_transition',
        linkStatus: 'direct',
        confidence: 0.85,
        evidenceAnchors: ['depth metric proved need for unified injection path'],
        metadata: { label: 'Phase 25 -> Phase 26 integration' },
      },
      {
        sourceSessionId: 'phase-26',
        targetSessionId: 'phase-27',
        linkType: 'phase_transition',
        linkStatus: 'gap',
        confidence: 0.45,
        evidenceAnchors: ['record-level integration proved', 'per-phase growth arc still missing before narrative builder'],
        gapKind: 'missing_phase_proof',
        metadata: { label: 'Phase 26 -> Phase 27 narrative builder gap preserved' },
      },
    ];
  }
}

function makeLink(
  trace: FailureTrace,
  sourceSessionId: string,
  targetSessionId: string,
  linkType: CrossSessionLinkInput['linkType'],
  linkStatus: CrossSessionLinkInput['linkStatus'],
  fromValue?: string,
  toValue?: string,
): CrossSessionLinkInput {
  return {
    sourceSessionId,
    targetSessionId,
    sourceMemoryId: trace.id,
    targetMemoryId: trace.id,
    linkType,
    linkStatus,
    confidence: linkStatus === 'direct' ? 0.92 : 0.35,
    evidenceAnchors: [fromValue ?? 'missing evidence', toValue ?? 'missing evidence', ...trace.evidenceAnchors].filter(Boolean),
    gapKind: linkStatus === 'gap' ? 'missing_explicit_edge' : undefined,
    metadata: { traceId: trace.id, problem: trace.problem },
  };
}

function makeRecallLink(trace: FailureTrace, recalled?: StitchMemoryRecord): CrossSessionLinkInput {
  return {
    sourceSessionId: trace.createdBySession,
    targetSessionId: recalled?.sessionId ?? `${trace.createdBySession}-future`,
    sourceMemoryId: trace.id,
    targetMemoryId: recalled?.id,
    linkType: 'lesson_to_recall',
    linkStatus: recalled ? 'direct' : 'gap',
    confidence: recalled ? 0.87 : 0.3,
    evidenceAnchors: recalled ? [recalled.content, ...(recalled.metadata?.evidenceAnchors as string[] ?? [])] : ['later lesson recall not found'],
    gapKind: recalled ? undefined : 'missing_lesson_recall',
    metadata: { lesson: trace.lessonCreated ?? null },
  };
}

function makeBehaviorLink(trace: FailureTrace, recalled: StitchMemoryRecord | undefined, changed: StitchMemoryRecord | undefined): CrossSessionLinkInput {
  return {
    sourceSessionId: recalled?.sessionId ?? trace.createdBySession,
    targetSessionId: changed?.sessionId ?? `${trace.createdBySession}-future`,
    sourceMemoryId: recalled?.id ?? trace.id,
    targetMemoryId: changed?.id,
    linkType: 'recall_to_behavior_change',
    linkStatus: changed ? (recalled ? 'direct' : 'inferred') : 'gap',
    confidence: changed ? (recalled ? 0.84 : 0.65) : 0.25,
    evidenceAnchors: changed ? [changed.content] : ['changed behavior not proven'],
    gapKind: changed ? undefined : 'missing_behavior_change',
    metadata: { laterBehaviorChange: trace.laterBehaviorChange ?? null },
  };
}

function makeImprovementLink(trace: FailureTrace, changed?: StitchMemoryRecord): CrossSessionLinkInput {
  const improved = changed && /pass|green|avoid|prevent|stopped/i.test(changed.content);
  return {
    sourceSessionId: changed?.sessionId ?? trace.createdBySession,
    targetSessionId: changed?.sessionId ?? trace.createdBySession,
    sourceMemoryId: changed?.id ?? trace.id,
    targetMemoryId: changed?.id,
    linkType: 'behavior_change_to_improvement',
    linkStatus: improved ? 'direct' : 'gap',
    confidence: improved ? 0.8 : 0.2,
    evidenceAnchors: improved ? [changed.content] : ['no observable improvement signal'],
    gapKind: improved ? undefined : 'missing_improvement_signal',
    metadata: { traceId: trace.id },
  };
}

function buildGrowthEvidence(recalled?: StitchMemoryRecord, changed?: StitchMemoryRecord): GrowthEvidence {
  return {
    lessonRecalled: Boolean(recalled),
    behaviorChanged: Boolean(changed),
    changedBehaviorSummary: changed?.content,
    evidenceAnchor: changed?.content ?? recalled?.content,
    confidence: changed ? 0.82 : recalled ? 0.58 : 0.22,
    missingEvidence: [!recalled && 'lesson recall not observed', !changed && 'behavior change not observed'].filter(Boolean) as string[],
  };
}

function findLessonRecall(trace: FailureTrace, memories: StitchMemoryRecord[]): StitchMemoryRecord | undefined {
  return memories.find((memory) => trace.lessonCreated && memory.content.toLowerCase().includes(trace.lessonCreated.toLowerCase()));
}

function findBehaviorChange(trace: FailureTrace, memories: StitchMemoryRecord[]): StitchMemoryRecord | undefined {
  return memories.find((memory) => {
    const content = memory.content.toLowerCase();
    const correction = trace.correction?.toLowerCase() ?? '';
    const behavior = trace.laterBehaviorChange?.toLowerCase() ?? '';
    return (correction && content.includes(correction)) || (behavior && content.includes(behavior)) || /pass|green|avoid|prevent|retry/i.test(content);
  });
}
