import type { CrossSessionLinkInput, GrowthEvidence } from './cross-session-causal-types.js';

export interface PhaseCausationNode {
  phase: number;
  name: string;
  problem: string;
  action: string;
  result: string;
  downstreamChange: string;
  timestamp?: string;
}

export interface PhaseCausationLink {
  fromPhase: number;
  toPhase: number;
  causationType: 'exposed_gap' | 'proved_prerequisite' | 'direct_fix' | 'refined_capability';
  summary: string;
}

export interface PhaseNarrativeResult {
  phases: PhaseCausationNode[];
  links: PhaseCausationLink[];
  crossSessionLinks: CrossSessionLinkInput[];
  growthEvidence: GrowthEvidence[];
  narrative: string;
  gaps: string[];
  confidence: number;
}
