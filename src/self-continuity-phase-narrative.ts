import type { CrossSessionLinkInput, GrowthEvidence } from './cross-session-causal-types.js';
import {
  CANONICAL_LINKS,
  CANONICAL_PHASES,
  CANONICAL_STITCHES,
} from './self-continuity-narrative-canonical.js';
import {
  computeNarrativeConfidence,
  detectNarrativeGaps,
  formatNarrativeText,
} from './self-continuity-narrative-format.js';
import type {
  PhaseCausationLink,
  PhaseCausationNode,
  PhaseNarrativeResult,
} from './self-continuity-narrative-types.js';

export type {
  PhaseCausationLink,
  PhaseCausationNode,
  PhaseNarrativeResult,
} from './self-continuity-narrative-types.js';

export class PhaseNarrativeBuilder {
  private phases: PhaseCausationNode[];
  private links: PhaseCausationLink[];
  private crossSessionLinks: CrossSessionLinkInput[];
  private growthEvidence: GrowthEvidence[];
  private maxTokenBudget: number;
  private approxCharsPerToken: number;

  constructor(options?: {
    phases?: PhaseCausationNode[];
    links?: PhaseCausationLink[];
    crossSessionLinks?: CrossSessionLinkInput[];
    growthEvidence?: GrowthEvidence[];
    maxTokenBudget?: number;
  }) {
    this.phases = options?.phases ?? CANONICAL_PHASES;
    this.links = options?.links ?? CANONICAL_LINKS;
    this.crossSessionLinks = options?.crossSessionLinks ?? CANONICAL_STITCHES;
    this.growthEvidence = options?.growthEvidence ?? [];
    this.maxTokenBudget = options?.maxTokenBudget ?? 2000;
    this.approxCharsPerToken = 4;
  }

  buildNarrative(fromPhase?: number, toPhase?: number): PhaseNarrativeResult {
    const start = fromPhase ?? this.phases[0]?.phase ?? 21;
    const end = toPhase ?? this.phases[this.phases.length - 1]?.phase ?? 27;
    const selectedPhases = this.phases.filter(phase => phase.phase >= start && phase.phase <= end);
    const selectedLinks = this.links.filter(
      link => link.fromPhase >= start && link.toPhase <= end,
    );
    const gaps = detectNarrativeGaps(selectedPhases, selectedLinks);
    const confidence = computeNarrativeConfidence(selectedPhases, selectedLinks, gaps);
    const result: PhaseNarrativeResult = {
      phases: selectedPhases,
      links: selectedLinks,
      crossSessionLinks: this.crossSessionLinks,
      growthEvidence: this.growthEvidence,
      narrative: '',
      gaps,
      confidence,
    };

    result.narrative = formatNarrativeText(
      result,
      this.maxTokenBudget,
      this.approxCharsPerToken,
    );
    return result;
  }

  formatForInjection(result: PhaseNarrativeResult): string {
    return result.narrative;
  }
}

export function buildPhaseNarrative(fromPhase?: number, toPhase?: number): PhaseNarrativeResult {
  return new PhaseNarrativeBuilder().buildNarrative(fromPhase, toPhase);
}

export function formatPhaseNarrative(result: PhaseNarrativeResult): string {
  return result.narrative;
}
