// Phase 4A — checkpoint telemetry
// Separate [Checkpoint] bucket. Never mixed with v1 compaction accounting.
// Logs to stdout (captured by OpenCode server.log), matching existing plugin pattern.

export interface CheckpointCreatedEvent {
  sessionId: string;
  checkpointId: string;
  sourceMessages: number;
  inputTokens: number;
  summaryTokens: number;
  refsPreserved: number;
  filesDetected: number;
  testsDetected: number;
  risksDetected: number;
  injectBudgetUsed: number;
  elapsedMs: number;
}

export interface CheckpointExpandedEvent {
  sessionId: string;
  refId: string;
  found: boolean;
  kind: string | null;
  tokenCount: number;
  elapsedMs: number;
}

export interface CheckpointListedEvent {
  sessionId: string;
  count: number;
  limit: number;
}

export interface CheckpointInjectedEvent {
  sessionId: string;
  checkpointId: string;
  tokensInjected: number;
  budget: number;
  skipped: boolean;
  reason: string;
}

export function logCheckpointCreated(e: CheckpointCreatedEvent): void {
  console.log(
    `[Checkpoint] created: session=${e.sessionId} id=${e.checkpointId} ` +
    `source_msgs=${e.sourceMessages} input_tokens=${e.inputTokens} ` +
    `summary_tokens=${e.summaryTokens} refs=${e.refsPreserved} ` +
    `files=${e.filesDetected} tests=${e.testsDetected} ` +
    `risks=${e.risksDetected} inject_used=${e.injectBudgetUsed} ` +
    `elapsed_ms=${e.elapsedMs}`,
  );
}

export function logCheckpointExpanded(e: CheckpointExpandedEvent): void {
  console.log(
    `[Checkpoint] expanded: session=${e.sessionId} ref=${e.refId} ` +
    `found=${e.found} kind=${e.kind ?? 'null'} ` +
    `tokens=${e.tokenCount} elapsed_ms=${e.elapsedMs}`,
  );
}

export function logCheckpointListed(e: CheckpointListedEvent): void {
  console.log(
    `[Checkpoint] listed: session=${e.sessionId} count=${e.count} limit=${e.limit}`,
  );
}

export function logCheckpointInjected(e: CheckpointInjectedEvent): void {
  console.log(
    `[Checkpoint] injected: session=${e.sessionId} id=${e.checkpointId} ` +
    `tokens=${e.tokensInjected} budget=${e.budget} ` +
    `skipped=${e.skipped} reason=${e.reason}`,
  );
}

export function logCheckpointError(operation: string, error: unknown): void {
  const msg = error instanceof Error ? error.message : String(error);
  console.log(`[Checkpoint] error: op=${operation} msg=${msg}`);
}
