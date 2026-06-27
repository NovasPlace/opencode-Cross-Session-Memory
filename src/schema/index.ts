import { initializeCheckpointSchema } from '../checkpoint-schema.js';
import { initializeContextCompilationSchema } from '../context-compilation-schema.js';
import { initializeContextCacheSchema } from '../context-cache-schema.js';
import { initializeRolloverSchema } from '../context-rollover-schema.js';
import { initializeCrossSessionCausalSchema } from '../cross-session-causal-schema.js';
import type { Database } from '../database.js';
import { initializeGoalSchema } from '../goal-schema.js';
import { initializeGraphSchema } from '../memory-graph.js';
import { initializeRecallTelemetrySchema } from '../recall-telemetry.js';
import { initializeSelfContinuitySchema } from '../self-continuity-schema.js';
import { initializeCoreSchema } from './core-schema.js';
import { initializeMemorySchema } from './memory-schema.js';
import { migrateProjectIsolation } from './project-isolation-schema.js';
import { initializeSessionSchema } from './session-schema.js';

export async function initializeAllSchemas(database: Database): Promise<void> {
  const pool = database.getPool();

  const steps: Array<[string, () => Promise<void>]> = [
    ['extension.vector', () => pool.query('CREATE EXTENSION IF NOT EXISTS vector').then(() => undefined)],
    ['session', () => initializeSessionSchema(pool)],
    ['memory', () => initializeMemorySchema(pool)],
    ['core', () => initializeCoreSchema(pool)],
    ['project-isolation', () => migrateProjectIsolation(pool)],
    ['checkpoint', () => initializeCheckpointSchema(pool)],
    ['context-compilation', () => initializeContextCompilationSchema(pool)],
    ['context-cache', () => initializeContextCacheSchema(pool)],
    ['rollover', () => initializeRolloverSchema(pool)],
    ['goal', () => initializeGoalSchema(pool)],
    ['recall-telemetry', () => initializeRecallTelemetrySchema(pool)],
    ['self-continuity', () => initializeSelfContinuitySchema(pool)],
    ['cross-session-causal', () => initializeCrossSessionCausalSchema(pool)],
    ['graph', () => initializeGraphSchema(database)],
  ];

  for (const [name, step] of steps) {
    try {
      await step();
    } catch (error) {
      console.error(`[Database] Schema step failed (${name}); continuing:`, error);
    }
  }
}
