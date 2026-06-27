export type CrossSessionLinkType =
  | 'phase_transition'
  | 'failure_to_diagnosis'
  | 'diagnosis_to_correction'
  | 'correction_to_lesson'
  | 'lesson_to_recall'
  | 'recall_to_behavior_change'
  | 'behavior_change_to_improvement';

export type CrossSessionLinkStatus = 'direct' | 'inferred' | 'gap';

export type CrossSessionGapKind =
  | 'missing_explicit_edge'
  | 'missing_lesson_recall'
  | 'missing_behavior_change'
  | 'missing_improvement_signal'
  | 'missing_phase_proof';

export interface CrossSessionCausalLink {
  id: number;
  sourceMemoryId?: number;
  targetMemoryId?: number;
  sourceSessionId: string;
  targetSessionId: string;
  linkType: CrossSessionLinkType;
  linkStatus: CrossSessionLinkStatus;
  confidence: number;
  evidenceAnchors: string[];
  gapKind?: CrossSessionGapKind;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface GrowthEvidence {
  lessonRecalled: boolean;
  behaviorChanged: boolean;
  changedBehaviorSummary?: string;
  evidenceAnchor?: string;
  confidence: number;
  missingEvidence: string[];
}

export interface StitchMemoryRecord {
  id?: number;
  sessionId: string;
  content: string;
  createdAt?: string;
  linkedPhase?: number;
  metadata?: Record<string, unknown>;
}

export interface CrossSessionLinkInput {
  sourceMemoryId?: number;
  targetMemoryId?: number;
  sourceSessionId: string;
  targetSessionId: string;
  linkType: CrossSessionLinkType;
  linkStatus: CrossSessionLinkStatus;
  confidence: number;
  evidenceAnchors: string[];
  gapKind?: CrossSessionGapKind;
  metadata?: Record<string, unknown>;
}

export interface FailureTraceStitchResult {
  links: CrossSessionLinkInput[];
  growthEvidence: GrowthEvidence;
}
