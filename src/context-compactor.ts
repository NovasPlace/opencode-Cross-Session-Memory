// ContextCompactor — Replace old tool-call output with distilled references.
// Runs inside experimental.chat.messages.transform BEFORE LLM conversion.

import { CompactorConfig, CompactionResult, CumulativeCompactionStats, ToolCallGroup } from './types.js';
import { CompactionTracker } from './compaction-tracker.js';
import { ToolPartLike, ToolPartLocation } from './compaction-types.js';
import {
  COMPACTED_MARKER,
  adaptiveWindow as adaptiveWindowFn,
  collectToolParts,
  isRecentEnough as isRecentEnoughFn,
  isAlreadyCompacted,
  hasOpenCodeDiscardMarker,
  extractCriticalSignals,
  findMatchingGroup,
  extractFile,
  truncateInput,
  measureTotalChars,
} from './compaction-utils.js';

const CHARS_PER_TOKEN = 4;

export class ContextCompactor {
  private config: CompactorConfig;
  private lastResult: CompactionResult | null = null;
  private cumulative: CumulativeCompactionStats = {
    totalCompactions: 0, totalPartsCompacted: 0, totalTokensSaved: 0,
    totalSemanticSignalsPreserved: 0, firstCompactedAt: null, lastCompactedAt: null,
  };
  private partCompactionCounts = new CompactionTracker();

  constructor(config: CompactorConfig) { this.config = config; }
  getLastResult(): CompactionResult | null { return this.lastResult; }
  getCumulativeStats(): CumulativeCompactionStats { return { ...this.cumulative }; }
  resetCumulative(): void {
    this.cumulative = { totalCompactions: 0, totalPartsCompacted: 0, totalTokensSaved: 0, totalSemanticSignalsPreserved: 0, firstCompactedAt: null, lastCompactedAt: null };
    this.partCompactionCounts.reset();
  }
  getReprocessingReport(): { partKey: string; compactCount: number }[] {
    return this.partCompactionCounts.getReprocessingReport();
  }
  /** Compact old tool parts in-place. Optional pressure 0-1 shrinks working window. */
  compact(messages: { parts: unknown[] }[], groups: ToolCallGroup[], pressure?: number): CompactionResult {
    const locations = collectToolParts(messages);
    const beforeChars = measureTotalChars(locations);
    if (!this.config.enabled || locations.length === 0) {
      return this.buildResult(locations.length, 0, locations.length, 0, beforeChars, beforeChars, 0);
    }
    const window = adaptiveWindowFn(this.config, pressure);
    const boundary = locations.length - window;
    let compacted = 0, skipped = 0, totalPreserved = 0;
    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i];
      const status = loc.part.state?.status;
      // Hard floor: running/pending parts are never compacted regardless of age or pressure.
      if (status === 'running' || status === 'pending') { skipped++; continue; }
      if (hasOpenCodeDiscardMarker(loc.part)) {
        // Discard marker means opencode's pruner cleared the original — but if we
        // already compacted this part (output/error starts with our marker), skip to
        // avoid reprocessing loops when the marker lingers in a field compactPart
        // doesn't replace (e.g. marker in error field of a completed part).
        const out = loc.part.state?.output ?? '';
        const err = loc.part.state?.error ?? '';
        if (out.startsWith(COMPACTED_MARKER) || err.startsWith(COMPACTED_MARKER)) { skipped++; continue; }
        const result = this.compactPart(loc, groups);
        compacted++; totalPreserved += result.preservedCount;
        continue;
      }
      if (i >= boundary && isRecentEnoughFn(this.config, loc.part)) { skipped++; continue; }
      if (isAlreadyCompacted(loc.part)) { skipped++; continue; }
      const result = this.compactPart(loc, groups);
      compacted++; totalPreserved += result.preservedCount;
    }
    const keptRaw = locations.length - compacted;
    const afterChars = measureTotalChars(locations);
    return this.buildResult(locations.length, compacted, keptRaw, skipped, beforeChars, afterChars, totalPreserved);
  }
  private compactPart(loc: ToolPartLocation, groups: ToolCallGroup[]): { preservedCount: number; originalSize: number; ref: string } {
    const { part } = loc;
    if (!part.state) return { preservedCount: 0, originalSize: 0, ref: '' };
    this.partCompactionCounts.record(`${loc.msgIndex}:${loc.partIndex}`);
    const originalOutput = part.state.output ?? '';
    const originalError = part.state.error ?? '';
    const originalSize = originalOutput.length + originalError.length;
    const preserved = extractCriticalSignals(originalOutput + '\n' + originalError);
    const ref = this.buildReference(part, groups, originalSize, preserved);
    if (part.state.status === 'completed') {
      part.state.output = ref;
    } else if (part.state.status === 'error' && part.state.error) {
      part.state.error = ref;
    }
    if (part.state.time?.compacted) delete part.state.time.compacted;
    if (this.config.truncateInput && part.state.input) part.state.input = truncateInput(part.state.input as Record<string, unknown>);
    return { preservedCount: preserved.length, originalSize, ref };
  }
  private buildReference(part: ToolPartLike, groups: ToolCallGroup[], originalSize: number, preserved: string[]): string {
    const file = extractFile(part);
    const originalTokens = Math.ceil(originalSize / CHARS_PER_TOKEN);
    const match = findMatchingGroup(groups, part.tool ?? 'tool', file);
    let base: string;
    if (match) {
      const outcome = match.outcome === 'success' ? 'OK' : match.outcome === 'failure' ? 'FAILED' : match.outcome;
      base = `${COMPACTED_MARKER} ${part.tool}${file ? ` ${file}` : ''} — ${outcome}: ${(match.proceduralInsight ?? match.intent).slice(0, 80)}`;
    } else {
      base = `${COMPACTED_MARKER} ${part.tool}${file ? ` ${file}` : ''} — output suppressed`;
    }
    base += ` (was ~${originalTokens} tok)`;
    if (preserved.length > 0) base += ' ⚠ ' + preserved.slice(0, 3).join(' | ');
    return base;
  }
  private buildResult(total: number, compacted: number, keptRaw: number, skipped: number, beforeChars: number, afterChars: number, preservedCount: number): CompactionResult {
    const beforeTokens = Math.ceil(beforeChars / CHARS_PER_TOKEN);
    const afterTokens = Math.ceil(afterChars / CHARS_PER_TOKEN);
    const tokensSaved = beforeTokens - afterTokens;
    const result: CompactionResult = {
      totalToolParts: total, compactedParts: compacted, keptRawParts: keptRaw, skippedParts: skipped,
      beforeChars, afterChars, beforeTokens, afterTokens, tokensSaved,
      savedPercent: beforeTokens > 0 ? Math.round((tokensSaved / beforeTokens) * 100) : 0,
      semanticSignalCountPreserved: preservedCount, compactedAt: new Date(),
    };
    this.lastResult = result;
    this.cumulative.totalCompactions++;
    this.cumulative.totalPartsCompacted += compacted;
    this.cumulative.totalTokensSaved += tokensSaved;
    this.cumulative.totalSemanticSignalsPreserved += preservedCount;
    const now = new Date();
    if (!this.cumulative.firstCompactedAt) this.cumulative.firstCompactedAt = now;
    this.cumulative.lastCompactedAt = now;
    return result;
  }
}
