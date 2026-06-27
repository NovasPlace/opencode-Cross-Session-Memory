import type {
  PhaseCausationLink,
  PhaseCausationNode,
  PhaseNarrativeResult,
} from './self-continuity-narrative-types.js';

export function detectNarrativeGaps(
  phases: PhaseCausationNode[],
  links: PhaseCausationLink[],
): string[] {
  const gaps: string[] = [];
  const phaseNums = phases.map(p => p.phase).sort((a, b) => a - b);
  const linkedPhases = new Set<number>();
  for (const link of links) {
    linkedPhases.add(link.fromPhase);
    linkedPhases.add(link.toPhase);
  }

  for (let i = 0; i < phaseNums.length - 1; i++) {
    const current = phaseNums[i];
    const next = phaseNums[i + 1];
    const hasLink = links.some(link => link.fromPhase === current && link.toPhase === next);
    if (!hasLink) {
      gaps.push(`No explicit causation link between Phase ${current} and Phase ${next}. The path between them is unknown.`);
    }
  }

  for (const phase of phases) {
    if (!linkedPhases.has(phase.phase) && phases.length > 1) {
      gaps.push(`Phase ${phase.phase} (${phase.name}) is present but has no causal links to other phases.`);
    }
  }

  return gaps;
}

export function computeNarrativeConfidence(
  phases: PhaseCausationNode[],
  links: PhaseCausationLink[],
  gaps: string[],
): number {
  if (phases.length === 0) return 0;
  if (phases.length === 1) return 0.5;
  const maxLinks = phases.length - 1;
  const linkRatio = Math.min(links.length / maxLinks, 1);
  const gapPenalty = Math.min(gaps.length * 0.1, 0.4);
  return Math.max(0.1, Math.min(0.95, 0.5 + linkRatio * 0.4 - gapPenalty));
}

export function formatNarrativeText(
  result: PhaseNarrativeResult,
  maxTokenBudget: number,
  approxCharsPerToken: number,
): string {
  const lines: string[] = ['[Phase Causal Narrative]'];

  for (const phase of result.phases) {
    lines.push('');
    lines.push(`Phase ${phase.phase}: ${phase.name}`);
    lines.push(`  Problem: ${phase.problem}`);
    lines.push(`  Action: ${phase.action}`);
    lines.push(`  Result: ${phase.result}`);
    lines.push(`  Led to: ${phase.downstreamChange}`);
  }

  if (result.links.length > 0) {
    lines.push('');
    lines.push('Causal links:');
    for (const link of result.links) {
      lines.push(`  Phase ${link.fromPhase} -> Phase ${link.toPhase} (${link.causationType}): ${link.summary}`);
    }
  }

  if (result.crossSessionLinks.length > 0) {
    lines.push('');
    lines.push('Cross-session causal stitching:');
    for (const link of result.crossSessionLinks) {
      lines.push(`  [${link.linkStatus.toUpperCase()}] ${link.sourceSessionId} -> ${link.targetSessionId} (${link.linkType}): ${link.evidenceAnchors.join(' | ')}`);
      if (link.gapKind) lines.push(`    gap_kind: ${link.gapKind}`);
    }
  }

  if (result.growthEvidence.length > 0) {
    lines.push('');
    lines.push('Growth evidence:');
    for (const evidence of result.growthEvidence) {
      lines.push(`  lesson_recalled=${evidence.lessonRecalled} behavior_changed=${evidence.behaviorChanged} confidence=${evidence.confidence.toFixed(2)}`);
      if (evidence.changedBehaviorSummary) lines.push(`    changed_behavior: ${evidence.changedBehaviorSummary}`);
      if (evidence.evidenceAnchor) lines.push(`    anchor: ${evidence.evidenceAnchor}`);
      if (evidence.missingEvidence.length > 0) lines.push(`    missing: ${evidence.missingEvidence.join('; ')}`);
    }
  }

  if (result.gaps.length > 0) {
    lines.push('');
    lines.push('Narrative gaps:');
    for (const gap of result.gaps) {
      lines.push(`  - ${gap}`);
    }
  }

  lines.push('');
  lines.push(`Narrative confidence: ${result.confidence.toFixed(2)}`);

  const raw = lines.join('\n');
  const maxChars = maxTokenBudget * approxCharsPerToken;
  return raw.length > maxChars
    ? raw.slice(0, maxChars) + '\n[narrative truncated to token budget]'
    : raw;
}
