import path from 'node:path';
import readline from 'node:readline';
import { CodexMemoryBridge } from './codex-bridge.js';
import type { MemorySaveOptions, MemorySearchOptions, MemoryListOptions } from './types.js';

const SERVER_NAME = 'Cross-Session Memory Bridge';
const SERVER_VERSION = '1.0.0';
const DEFAULT_PROJECT_ID = path.basename(process.cwd()) || 'cross-session-memory';

type JsonRpcId = number | string;
type ToolArgs = Record<string, unknown>;

let bridgePromise: Promise<CodexMemoryBridge> | null = null;

const tools = [
  spec('save_memory', 'Persist a memory row for the active project.', ['content', 'type']),
  spec('search_memories', 'Search memories with bridge fallback behavior.', ['query']),
  spec('list_memories', 'List recent or important memories for a project.'),
  spec('get_context_brief', 'Build a compact context brief for a task.', ['task']),
  spec('recall_lessons', 'Recall lesson and procedural memories for a task.', ['task']),
  spec('prune_memories_dry_run', 'Preview prune candidates without mutating data.'),
  spec('backfill_missing_embeddings', 'Repair missing embeddings on demand.', ['limit']),
  spec('get_compaction_report', 'Fetch the latest compaction metric for a session.'),
];

function spec(name: string, description: string, required: string[] = []) {
  return {
    name,
    title: name,
    description,
    inputSchema: { type: 'object', properties: {}, required },
  };
}

function send(message: unknown): void {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function sendResult(id: JsonRpcId, result: unknown): void {
  send({ jsonrpc: '2.0', id, result });
}

function sendError(id: JsonRpcId, message: string): void {
  send({ jsonrpc: '2.0', id, error: { code: -32602, message } });
}

function textResult(payload: unknown) {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}

function requireString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string.`);
  }
  return value.trim();
}

function getBridge(): Promise<CodexMemoryBridge> {
  bridgePromise ??= CodexMemoryBridge.connect();
  return bridgePromise;
}

function defaultProjectRoot(value: unknown): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : DEFAULT_PROJECT_ID;
}

async function callTool(name: string, args: ToolArgs) {
  const bridge = await getBridge();
  if (name === 'save_memory') {
    const input: MemorySaveOptions & { projectRoot?: string; sessionId?: string } = {
      content: requireString(args.content, 'content'),
      type: requireString(args.type, 'type') as MemorySaveOptions['type'],
      tags: Array.isArray(args.tags) ? args.tags.filter((tag): tag is string => typeof tag === 'string') : undefined,
      importance: typeof args.importance === 'number' ? args.importance : undefined,
      source: typeof args.source === 'string' ? args.source as MemorySaveOptions['source'] : 'manual',
      metadata: typeof args.metadata === 'object' && args.metadata ? args.metadata as Record<string, unknown> : undefined,
      projectRoot: defaultProjectRoot(args.projectRoot),
      sessionId: typeof args.sessionId === 'string' ? args.sessionId : undefined,
    };
    return bridge.saveMemory(input);
  }
  if (name === 'search_memories') {
    const input: MemorySearchOptions & { sessionId?: string } = {
      query: requireString(args.query, 'query'),
      limit: typeof args.limit === 'number' ? args.limit : 5,
      projectId: defaultProjectRoot(args.projectId),
      searchMode: typeof args.searchMode === 'string' ? args.searchMode as MemorySearchOptions['searchMode'] : undefined,
      sessionId: typeof args.sessionId === 'string' ? args.sessionId : undefined,
    };
    return bridge.searchMemories(input);
  }
  if (name === 'list_memories') {
    const input: MemoryListOptions & { sessionId?: string } = {
      limit: typeof args.limit === 'number' ? args.limit : 10,
      projectId: defaultProjectRoot(args.projectId),
      type: typeof args.type === 'string' ? args.type as MemoryListOptions['type'] : undefined,
      sortBy: typeof args.sortBy === 'string' ? args.sortBy as MemoryListOptions['sortBy'] : undefined,
      searchMode: typeof args.searchMode === 'string' ? args.searchMode as MemoryListOptions['searchMode'] : undefined,
      sessionId: typeof args.sessionId === 'string' ? args.sessionId : undefined,
    };
    return bridge.listMemories(input);
  }
  if (name === 'get_context_brief') {
    return bridge.getContextBrief({
      task: requireString(args.task, 'task'),
      projectRoot: defaultProjectRoot(args.projectRoot),
      sessionId: typeof args.sessionId === 'string' ? args.sessionId : undefined,
    });
  }
  if (name === 'recall_lessons') {
    return bridge.recallLessons({
      task: requireString(args.task, 'task'),
      projectRoot: defaultProjectRoot(args.projectRoot),
      sessionId: typeof args.sessionId === 'string' ? args.sessionId : undefined,
      limit: typeof args.limit === 'number' ? args.limit : 5,
    });
  }
  if (name === 'prune_memories_dry_run') return bridge.pruneMemoriesDryRun();
  if (name === 'backfill_missing_embeddings') {
    return bridge.backfillMissingEmbeddings({
      limit: typeof args.limit === 'number' ? args.limit : 25,
      projectId: defaultProjectRoot(args.projectId),
      dryRun: args.dryRun === true,
    });
  }
  if (name === 'get_compaction_report') {
    return bridge.getCompactionReport(typeof args.sessionId === 'string' ? args.sessionId : undefined);
  }
  throw new Error(`Unknown tool: ${name}`);
}

async function handle(message: { id?: JsonRpcId; method?: string; params?: { name?: string; arguments?: ToolArgs; protocolVersion?: string } }) {
  if (message.method === 'initialize' && message.id !== undefined) {
    sendResult(message.id, {
      protocolVersion: message.params?.protocolVersion ?? '2025-11-25',
      capabilities: { tools: {} },
      serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      instructions: 'Cross-session memory tools backed by the existing Postgres bridge.',
    });
    return;
  }
  if (message.method === 'ping' && message.id !== undefined) return sendResult(message.id, {});
  if (message.method === 'tools/list' && message.id !== undefined) return sendResult(message.id, { tools });
  if (message.method === 'tools/call' && message.id !== undefined) {
    try {
      sendResult(message.id, textResult(await callTool(message.params?.name ?? '', message.params?.arguments ?? {})));
    } catch (error) {
      sendError(message.id, error instanceof Error ? error.message : String(error));
    }
    return;
  }
  if (message.id !== undefined) sendError(message.id, `Method not found: ${message.method ?? 'unknown'}`);
}

async function cleanup(): Promise<void> {
  if (!bridgePromise) return;
  const bridge = await bridgePromise;
  await bridge.disconnect();
}

const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
input.on('line', (line) => {
  if (!line.trim()) return;
  handle(JSON.parse(line) as { id?: JsonRpcId; method?: string; params?: { name?: string; arguments?: ToolArgs; protocolVersion?: string } })
    .catch((error: unknown) => send({ jsonrpc: '2.0', error: { code: -32603, message: String(error) } }));
});

process.on('SIGINT', () => cleanup().finally(() => process.exit(0)));
process.on('SIGTERM', () => cleanup().finally(() => process.exit(0)));
