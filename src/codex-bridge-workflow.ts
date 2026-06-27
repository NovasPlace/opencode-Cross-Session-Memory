import {
  getCompactionReportOp,
  getContextBriefOp,
  listMemoriesOp,
  saveMemoryOp,
  type BridgeDeps,
  type CompactionReportPayload,
  type ContextBriefPayload,
} from './bridge-ops.js';
import type { Memory, MemoryType } from './types.js';

export interface ResumeContextPayload extends ContextBriefPayload {
  sessionId: string;
  task: string;
  recent: Memory[];
}

export interface SyncTurnPayload {
  sessionId: string;
  channel: string;
  memory: Memory;
}

export interface HandoffSummaryPayload {
  sessionId: string;
  summary: string;
  context: ResumeContextPayload;
  compaction: CompactionReportPayload;
}

export async function resumeContextOp(
  deps: BridgeDeps,
  input: { projectRoot: string; task: string; sessionId: string; recentLimit?: number },
): Promise<ResumeContextPayload> {
  await deps.contextRecall.refreshSession(input.sessionId, input.projectRoot);
  const context = await getContextBriefOp(
    deps,
    input.task,
    { projectId: input.projectRoot, sessionId: input.sessionId },
  );
  const recent = await listMemoriesOp(
    deps,
    { projectId: input.projectRoot, sortBy: 'recent', limit: input.recentLimit ?? 5 },
    { projectId: input.projectRoot, sessionId: input.sessionId },
  );
  return { ...context, sessionId: input.sessionId, task: input.task, recent };
}

export async function syncTurnOp(
  deps: BridgeDeps,
  input: {
    projectRoot: string;
    sessionId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    memoryType?: MemoryType;
  },
): Promise<SyncTurnPayload> {
  const memory = await saveMemoryOp(deps, {
    content: `[${input.role}] ${input.content}`,
    type: input.memoryType ?? 'conversation',
    source: 'manual',
    tags: ['codex-bridge', input.role, ...(input.tags ?? [])],
    metadata: { role: input.role, syncedFrom: 'codex-mcp', ...(input.metadata ?? {}) },
    sessionId: input.sessionId,
  });
  const channel = 'codex_bridge.turn_synced';
  await deps.memoryManager.emitEvent(channel, {
    memoryId: memory.id,
    projectRoot: input.projectRoot,
    role: input.role,
  }, input.sessionId);
  return { sessionId: input.sessionId, channel, memory };
}

export async function handoffSummaryOp(
  deps: BridgeDeps,
  input: { projectRoot: string; task: string; sessionId: string; recentLimit?: number },
): Promise<HandoffSummaryPayload> {
  const context = await resumeContextOp(deps, input);
  const compaction = await getCompactionReportOp(deps, input.sessionId);
  const summary = formatHandoffSummary(context, compaction);
  return { sessionId: input.sessionId, summary, context, compaction };
}

function formatHandoffSummary(
  context: ResumeContextPayload,
  compaction: CompactionReportPayload,
): string {
  const lines = [
    `Project task: ${context.task}`,
    `Session: ${context.sessionId}`,
    '',
    'Context brief:',
    context.brief?.compressed ?? 'No cached context brief yet.',
    '',
    `Top lessons: ${preview(context.lessons)}`,
    `Active risks: ${preview(context.activeRisks)}`,
    `Recent memory: ${preview(context.recent)}`,
    compaction.available
      ? `Latest compaction saved ${String(compaction.metric?.tokens_saved ?? 0)} tokens.`
      : 'No compaction report available.',
  ];
  return lines.join('\n');
}

function preview(memories: Memory[]): string {
  if (memories.length === 0) return 'none';
  return memories
    .slice(0, 3)
    .map((memory) => memory.content.replace(/\s+/g, ' ').slice(0, 80))
    .join(' | ');
}
