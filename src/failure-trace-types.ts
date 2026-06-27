export type FailureTraceStatus = 'failed' | 'partial' | 'succeeded' | 'abandoned';

export interface FailureTrace {
  id: number;
  problem: string;
  attemptedAction: string;
  result: FailureTraceStatus;
  failureReason?: string;
  diagnosis?: string;
  correction?: string;
  lessonCreated?: string;
  laterBehaviorChange?: string;
  evidenceAnchors: string[];
  linkedPhase?: number;
  linkedCommit?: string;
  createdAt: string;
  createdBySession: string;
  relatedTraceIds: number[];
}

export interface FailureTraceStorage {
  store(trace: Omit<FailureTrace, 'id' | 'createdAt'>): Promise<FailureTrace>;
  recallByProblem(problemPattern: string, limit?: number): Promise<FailureTrace[]>;
  recallBySession(sessionId: string, limit?: number): Promise<FailureTrace[]>;
  recallByPhase(phase: number, limit?: number): Promise<FailureTrace[]>;
  recallRelated(traceId: number, limit?: number): Promise<FailureTrace[]>;
  linkToMilestone(traceId: number, milestoneId: string): Promise<void>;
  getTracesForNarrative(limit?: number): Promise<FailureTrace[]>;
}

export interface FailureTraceHydrationConfig {
  maxTracesInjected: number;
  maxTokensPerTrace: number;
  includePartial: boolean;
  includeAbandoned: boolean;
}

export const DEFAULT_FAILURE_TRACE_CONFIG: FailureTraceHydrationConfig = {
  maxTracesInjected: 3,
  maxTokensPerTrace: 500,
  includePartial: true,
  includeAbandoned: false,
};