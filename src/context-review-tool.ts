/**
 * Phase 5 Transparency Layer 2: context_review tool
 *
 * Agent-callable tool that shows what the context compiler compressed
 * in the most recent API call. Supports summary / top / full detail levels.
 */
import { tool } from '@opencode-ai/plugin/tool';
import { DatabasePool } from './types.js';
import { getRecentCompilation } from './context-compilation-log.js';
import type { ContextCompilationEntry, CompressedPartDetail } from './types.js';

export interface ContextReviewDeps {
  pool: DatabasePool;
}

type DetailLevel = 'summary' | 'top' | 'full';

/** Format the header + stats + pinned categories. */
function formatSummary(entry: ContextCompilationEntry): string[] {
  const reduction = entry.beforeTokens > 0
    ? Math.round((1 - entry.afterTokens / entry.beforeTokens) * 100)
    : 0;
  const lines: string[] = [
    'Context Compiler — most recent call',
    '====================================',
    `Mode: ${entry.mode} | Budget: ${entry.budget.toLocaleString()} tokens`,
    `Before: ${entry.beforeTokens.toLocaleString()} → After: ${entry.afterTokens.toLocaleString()} (${reduction}% reduction)`,
    `Parts: ${entry.partsCompressed} compressed, ${entry.partsPinned} pinned`,
  ];
  if (entry.pinnedCategories) {
    lines.push('', 'Pinned categories:');
    for (const [cat, count] of Object.entries(entry.pinnedCategories)) {
      lines.push(`  ${cat}: ${count}`);
    }
  }
  const highRisk = (entry.compressedDetails ?? []).filter(d => d.risk === 'high');
  lines.push('', `⚠ High-risk compressions: ${highRisk.length}`);
  return lines;
}

/** Format a single compressed part detail. */
function formatDetail(d: CompressedPartDetail, idx: number): string[] {
  const riskIcon = d.risk === 'high' ? '⚠' : d.risk === 'medium' ? '◆' : '·';
  return [
    `${idx}. [${d.kind}] ${d.source || '(no source)'} — ${d.beforeTokens} → ${d.afterTokens} tok [${riskIcon} ${d.risk}]`,
    `   reason: ${d.reason} | signals: ${d.preservedSignals.join(', ')}`,
  ];
}

/** Format top N biggest cuts by beforeTokens descending. */
function formatTopCuts(details: CompressedPartDetail[], limit: number): string[] {
  const sorted = [...details].sort((a, b) => b.beforeTokens - a.beforeTokens);
  const lines: string[] = ['', `Top ${Math.min(limit, sorted.length)} biggest cuts:`];
  sorted.slice(0, limit).forEach((d, i) => lines.push(...formatDetail(d, i + 1)));
  return lines;
}

/** Format all compressed parts. */
function formatAllDetails(details: CompressedPartDetail[]): string[] {
  const lines: string[] = ['', `All compressed parts (${details.length}):`];
  details.forEach((d, i) => lines.push(...formatDetail(d, i + 1)));
  return lines;
}

/** /context_review — shows what the context compiler compressed. */
export function contextReviewTool(deps: ContextReviewDeps) {
  return tool({
    description: 'Review what the context compiler compressed in the most recent API call. Shows budget status, pinned categories, and compressed parts with risk labels.',
    args: {
      detail: tool.schema.string().optional().describe('Detail level: "summary" (stats only), "top" (stats + biggest cuts), "full" (everything). Default: summary'),
      limit: tool.schema.number().optional().describe('Max number of cuts to show in "top" mode. Default: 10'),
    },
    async execute(args, context) {
      try {
        const sid = context.sessionID;
        const entry = await getRecentCompilation(deps.pool, sid);
        if (!entry) {
          return {
            title: 'No compilation data',
            output: 'No context compilation data available yet for this session. The compiler logs after each API call once it runs.',
          };
        }
        const level: DetailLevel = (args.detail as DetailLevel) ?? 'summary';
        const limit = args.limit ?? 10;
        const lines = formatSummary(entry);
        if (level === 'top' || level === 'full') {
          const details = entry.compressedDetails ?? [];
          if (level === 'top') {
            lines.push(...formatTopCuts(details, limit));
          } else {
            lines.push(...formatAllDetails(details));
          }
        }
        return {
          title: `Context review: ${entry.mode} ${entry.beforeTokens.toLocaleString()}→${entry.afterTokens.toLocaleString()}`,
          output: lines.join('\n'),
          metadata: {
            mode: entry.mode, budget: entry.budget,
            beforeTokens: entry.beforeTokens, afterTokens: entry.afterTokens,
            partsCompressed: entry.partsCompressed, partsPinned: entry.partsPinned,
          },
        };
      } catch (error) {
        return {
          title: 'Context review failed',
          output: `Failed to query compilation log: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
  });
}
