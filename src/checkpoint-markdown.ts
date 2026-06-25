// Phase 4A — checkpoint markdown assembly
// Pure function: extracted sections → summary markdown.
// No LLM. Deterministic. Format per architect spec.
import { SourceRef, CompactedRef } from './checkpoint-types.js';

/** Extracted sections from session messages. */
export interface CheckpointSections {
  goal: string;
  constraints: string[];
  currentState: string[];
  completedWork: string[];
  decisions: string[];
  files: Array<{ path: string; note: string }>;
  tests: string[];
  risks: string[];
  nextSteps: string[];
  refs: SourceRef[];
  compactedRefs: CompactedRef[];
}

/** Build the checkpoint summary markdown from extracted sections. */
export function buildCheckpointMarkdown(s: CheckpointSections): string {
  const lines: string[] = [];
  lines.push('## Goal');
  lines.push(`- ${s.goal || '(not detected)'}`);
  lines.push('');
  lines.push('## Constraints & Preferences');
  s.constraints.length > 0
    ? s.constraints.forEach(c => lines.push(`- ${c}`))
    : lines.push('- (none detected)');
  lines.push('');
  lines.push('## Current State');
  s.currentState.length > 0
    ? s.currentState.forEach(c => lines.push(`- ${c}`))
    : lines.push('- (not yet determined)');
  lines.push('');
  lines.push('## Completed Work');
  s.completedWork.length > 0
    ? s.completedWork.forEach(c => lines.push(`- ${c}`))
    : lines.push('- (none detected)');
  lines.push('');
  lines.push('## Decisions');
  s.decisions.length > 0
    ? s.decisions.forEach(d => lines.push(`- ${d}`))
    : lines.push('- (none detected)');
  lines.push('');
  lines.push('## Active Files / Components');
  s.files.length > 0
    ? s.files.forEach(f => lines.push(`- \`${f.path}\`: ${f.note}`))
    : lines.push('- (none detected)');
  lines.push('');
  lines.push('## Tool / Test Evidence');
  s.tests.length > 0
    ? s.tests.forEach(t => lines.push(`- ${t}`))
    : lines.push('- (none detected)');
  lines.push('');
  lines.push('## Risks / Blockers');
  s.risks.length > 0
    ? s.risks.forEach(r => lines.push(`- ${r}`))
    : lines.push('- (none detected)');
  lines.push('');
  lines.push('## Next Steps');
  if (s.nextSteps.length > 0) {
    s.nextSteps.forEach((n, i) => lines.push(`${i + 1}. ${n}`));
  } else {
    lines.push('1. (not yet determined)');
  }
  lines.push('');
  lines.push('## Recoverable References');
  if (s.compactedRefs.length > 0) {
    s.compactedRefs.forEach(r => lines.push(`- ${r.marker}: ${r.expandHint}`));
  } else {
    lines.push('- (no compacted refs in this checkpoint)');
  }
  return lines.join('\n');
}
