import type { IntegratedRecallResult } from './self-continuity-integration.js';

export type ResponseMode = 'basic' | 'deep';

export interface ModeSelection {
  mode: ResponseMode;
  reasons: string[];
  hasRecords: boolean;
  hasThreads: boolean;
  hasNarrative: boolean;
  avgDepth: number;
}

export function selectResponseMode(result: IntegratedRecallResult): ModeSelection {
  const reasons: string[] = [];
  const hasRecords = result.totalRecords > 0;
  const hasThreads = result.totalThreads > 0;
  const hasNarrative = result.phaseNarrative != null && result.phaseNarrative.links.length > 0;
  const avgDepth = result.avgHydrationDepth;

  if (!hasRecords) {
    reasons.push('no_records');
    return { mode: 'basic', reasons, hasRecords: false, hasThreads: false, hasNarrative: false, avgDepth: 0 };
  }

  reasons.push('records_available');

  if (hasThreads) reasons.push('causal_threads_available');
  if (hasNarrative) reasons.push('phase_narrative_available');
  if (avgDepth > 0.5) reasons.push('high_hydration_depth');

  if (hasThreads || hasNarrative || avgDepth > 0.5) {
    return { mode: 'deep', reasons, hasRecords, hasThreads, hasNarrative, avgDepth };
  }

  reasons.push('insufficient_depth_for_deep_mode');
  return { mode: 'basic', reasons, hasRecords, hasThreads, hasNarrative, avgDepth };
}

export interface FormattedResponse {
  mode: ResponseMode;
  content: string;
  modeReasons: string[];
}

export function formatBasicResponse(result: IntegratedRecallResult): FormattedResponse {
  const parts: string[] = [];

  parts.push('--- Self-Continuity: Basic Mode ---');
  parts.push(`Records found: ${result.totalRecords}`);
  parts.push(`Stability: ${result.avgStability.toFixed(2)} | Depth: ${result.avgHydrationDepth.toFixed(2)}`);

  for (const item of result.records) {
    parts.push(`\n[Record #${item.record.recordId} | ${item.record.triggerType}]`);
    parts.push(item.record.selfObservation);
    parts.push(`Gap: ${item.record.continuityGap}`);
  }

  return { mode: 'basic', content: parts.join('\n'), modeReasons: [] };
}

export function formatDeepResponse(result: IntegratedRecallResult): FormattedResponse {
  const parts: string[] = [];

  parts.push('--- Self-Continuity: Deep Mode ---');
  parts.push(`Records: ${result.totalRecords} | Threads: ${result.totalThreads} | Stability: ${result.avgStability.toFixed(2)} | Depth: ${result.avgHydrationDepth.toFixed(2)}`);

  for (const item of result.records) {
    parts.push(`\n[Record #${item.record.recordId} | ${item.record.triggerType} | confidence: ${item.record.confidenceScore}]`);
    parts.push(`Observation: ${item.record.selfObservation}`);
    parts.push(`Evidence anchors: ${item.record.evidenceAnchors.join(', ')}`);
    parts.push(`Gap: ${item.record.continuityGap}`);
    parts.push(`Drift: ${item.record.driftSummary}`);

    if (item.causalThread && item.causalThread.thread.length > 0) {
      parts.push('Causal thread:');
      for (const node of item.causalThread.thread) {
        parts.push(`  [${node.role}] ${node.summary}`);
      }
      if (item.causalThread.gaps.length > 0) {
        parts.push(`Thread gaps: ${item.causalThread.gaps.map((gap) => gap.detail).join('; ')}`);
      }
    }

    parts.push(`Stability: ${item.stabilityScore.toFixed(2)} | Hydration depth: ${item.hydrationDepthScore.toFixed(2)}`);
  }

  if (result.phaseNarrative) {
    parts.push(`\nPhase narrative (${result.phaseNarrative.links.length} link(s), confidence: ${result.phaseNarrative.confidence.toFixed(2)}):`);
    for (const link of result.phaseNarrative.links) {
      parts.push(`  Phase ${link.fromPhase} -> Phase ${link.toPhase} (${link.causationType}): ${link.summary}`);
    }
  }

  return { mode: 'deep', content: parts.join('\n'), modeReasons: [] };
}

export function selectAndFormat(result: IntegratedRecallResult): FormattedResponse {
  const selection = selectResponseMode(result);

  if (selection.mode === 'deep') {
    const response = formatDeepResponse(result);
    response.modeReasons = selection.reasons;
    return response;
  }

  const response = formatBasicResponse(result);
  response.modeReasons = selection.reasons;
  return response;
}
