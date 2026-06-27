import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

type PromptMessageLike = {
  info?: Record<string, unknown> & { id?: string; role?: string; sessionID?: string };
  parts?: Array<Record<string, unknown>>;
};

function summarizePart(part: Record<string, unknown>, index: number) {
  return {
    index,
    type: part.type,
    id: part.id,
    sessionID: part.sessionID,
    messageID: part.messageID,
    textLength: typeof part.text === 'string' ? part.text.length : undefined,
    tool: part.tool,
    stateStatus: typeof part.state === 'object' && part.state ? (part.state as { status?: unknown }).status : undefined,
    metadataKeys: typeof part.metadata === 'object' && part.metadata
      ? Object.keys(part.metadata as Record<string, unknown>)
      : [],
  };
}

function summarizeMessage(message: PromptMessageLike, index: number) {
  return {
    index,
    id: message.info?.id,
    role: message.info?.role,
    sessionID: message.info?.sessionID,
    partCount: Array.isArray(message.parts) ? message.parts.length : -1,
    partTypes: Array.isArray(message.parts) ? message.parts.map((part) => String(part?.type ?? 'unknown')) : [],
    parts: Array.isArray(message.parts) ? message.parts.map((part, partIndex) => summarizePart(part, partIndex)) : [],
  };
}

export function writePromptDebugLog(
  cwd: string,
  stage: string,
  messages: PromptMessageLike[],
  extras: Record<string, unknown> = {},
): void {
  try {
    const dir = join(cwd, '.opencode', 'prompt-debug');
    mkdirSync(dir, { recursive: true });
    const file = join(dir, 'messages-transform.jsonl');
    appendFileSync(file, JSON.stringify({
      timestamp: new Date().toISOString(),
      stage,
      messageCount: messages.length,
      extras,
      messages: messages.map((message, index) => summarizeMessage(message, index)),
    }) + '\n');
  } catch {
    // Debug logging must never break the prompt path.
  }
}
