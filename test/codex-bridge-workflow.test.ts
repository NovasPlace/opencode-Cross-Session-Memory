import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { CodexMemoryBridge } from '../dist/codex-bridge.js';
import type { PluginConfig } from '../dist/types.js';

const BASE_DB_URL = process.env.DATABASE_URL
  ?? 'postgresql://postgres:postgres@localhost:5432/cross_session_memory';

function buildUrl(dbUrl: string, dbName: string): string {
  const url = new URL(dbUrl);
  url.pathname = `/${dbName}`;
  return url.toString();
}

function adminUrl(dbUrl: string): string {
  const url = new URL(dbUrl);
  url.pathname = '/postgres';
  return url.toString();
}

function quote(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

describe('Codex bridge workflow tools', () => {
  const dbName = `cross_session_memory_codex_workflow_${Date.now()}`;
  const databaseUrl = buildUrl(BASE_DB_URL, dbName);
  const adminPool = new Pool({ connectionString: adminUrl(BASE_DB_URL) });
  const config: PluginConfig = {
    databaseUrl,
    embeddingModel: 'nomic-embed-text',
    embeddingApiUrl: process.env.OLLAMA_URL ?? 'http://localhost:11434',
  } as PluginConfig;

  let bridge: CodexMemoryBridge;

  before(async () => {
    await adminPool.query(`CREATE DATABASE ${quote(dbName)}`);
    bridge = await CodexMemoryBridge.connect(config);
  });

  after(async () => {
    await bridge.disconnect();
    await adminPool.query(
      `SELECT pg_terminate_backend(pid)
       FROM pg_stat_activity
       WHERE datname = $1
         AND pid <> pg_backend_pid()`,
      [dbName],
    );
    await adminPool.query(`DROP DATABASE ${quote(dbName)}`);
    await adminPool.end();
  });

  it('resumes context with recent memory and lesson recall', async () => {
    await bridge.saveMemory({
      projectRoot: 'workflow-project',
      content: 'Remember to check the bridge event stream before handoff.',
      type: 'lesson',
      tags: ['bridge'],
    });
    const resumed = await bridge.resumeContext({
      projectRoot: 'workflow-project',
      task: 'resume bridge workflow',
      recentLimit: 3,
    });

    assert.equal(resumed.sessionId.startsWith('codex-'), true);
    assert.equal(Array.isArray(resumed.recent), true);
    assert.ok(resumed.lessons.some((memory) => memory.content.includes('bridge event stream')));
  });

  it('syncs a turn into memory and emits a bridge event', async () => {
    const synced = await bridge.syncTurn({
      projectRoot: 'workflow-project',
      role: 'assistant',
      content: 'We added the repo-local marketplace wrapper.',
      tags: ['handoff'],
    });

    assert.equal(synced.channel, 'codex_bridge.turn_synced');
    assert.match(synced.memory.content, /\[assistant\]/);
  });

  it('builds a handoff summary with compaction status', async () => {
    const handoff = await bridge.getHandoffSummary({
      projectRoot: 'workflow-project',
      task: 'continue plugin install work',
    });

    assert.equal(handoff.sessionId.startsWith('codex-'), true);
    assert.match(handoff.summary, /Project task: continue plugin install work/);
    assert.match(handoff.summary, /Recent memory:/);
  });
});
