// Database connection and schema for Cross-Session Memory
// PostgreSQL with pgvector for semantic search

import pg from 'pg';
import { DatabasePool, PluginConfig } from './types.js';
import { initializeAllSchemas } from './schema/index.js';

const { Pool } = pg;

export class Database {
  private pool: DatabasePool | null = null;
  private config: PluginConfig;

  constructor(config: PluginConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      const pool = new Pool({
        connectionString: this.config.databaseUrl,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      await pool.query('SELECT NOW()');
      this.pool = pool as unknown as DatabasePool;
      console.log('[Database] Connected to PostgreSQL');
      try {
        await this.initializeSchema();
      } catch (error) {
        console.error('[Database] Schema initialization failed; continuing with existing database:', error);
      }
    } catch (error) {
      console.error('[Database] Connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.pool) return;
    await this.pool.end();
    this.pool = null;
    console.log('[Database] Disconnected from PostgreSQL');
  }

  private async initializeSchema(): Promise<void> {
    if (!this.pool) throw new Error('Database not connected');
    await initializeAllSchemas(this);
    console.log('[Database] Schema initialized');
  }

  getPool(): DatabasePool {
    if (!this.pool) throw new Error('Database not connected');
    return this.pool;
  }

  async close(): Promise<void> {
    if (!this.pool) return;
    await this.pool.end();
    this.pool = null;
  }
}
