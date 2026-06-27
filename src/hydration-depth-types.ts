export type HydrationDepthVerdict = 'shallow' | 'moderate' | 'deep';

export type HydrationDimension =
  | 'record_citation'
  | 'session_phase_naming'
  | 'evidence_anchor_depth'
  | 'causal_chain_reconstruction'
  | 'gap_reporting';

export interface HydrationDimensionScore {
  dimension: HydrationDimension;
  score: number;
  signals: string[];
}

export interface HydrationResult {
  verdict: HydrationDepthVerdict;
  overallScore: number;
  dimensions: HydrationDimensionScore[];
  timestamp: Date;
}
