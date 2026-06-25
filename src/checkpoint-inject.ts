// Phase 4A — checkpoint injection policy
// Injects latest active checkpoint into system prompt during system.transform.
// Strict budget. Never injects if session is short. Never injects all checkpoints.
import { CheckpointStore } from './checkpoint-store.js';
import { CheckpointConfig } from './checkpoint-types.js';
import { estimateTokens } from './token-bucket-analyzer.js';
import { logCheckpointInjected } from './checkpoint-telemetry.js';

export interface CheckpointInjectDeps {
  store: CheckpointStore;
  config: CheckpointConfig;
}

/**
 * Build the checkpoint injection string for system prompt.
 * Returns null if no injection should occur.
 * Called from experimental.chat.system.transform hook.
 */
export async function buildCheckpointInjection(
  deps: CheckpointInjectDeps,
  sessionId: string,
): Promise<string | null> {
  if (!deps.config.enabled) return null;

  const active = await deps.store.getActiveCheckpoint(sessionId);
  if (!active) return null;

  // Budget check — truncate if needed
  let summary = active.summaryMarkdown;
  const tokens = estimateTokens(summary);
  if (tokens > deps.config.maxCheckpointInjectTokens) {
    // Truncate to character budget (4 chars per token heuristic)
    const maxChars = deps.config.maxCheckpointInjectTokens * 4;
    summary = summary.substring(0, maxChars) + '\n... [checkpoint truncated]';
  }

  const header = `[Session Checkpoint — ${active.checkpointId.substring(0, 8)} — ${active.createdAt.toISOString().substring(0, 19)}]`;
  const footer = `[End Checkpoint. Use expand_checkpoint_ref tool to recover full details.]`;

  const injection = `${header}\n${summary}\n${footer}`;

  logCheckpointInjected({
    sessionId,
    checkpointId: active.checkpointId,
    tokensInjected: estimateTokens(injection),
    budget: deps.config.maxCheckpointInjectTokens,
    skipped: false,
    reason: 'injected',
  });

  return injection;
}
