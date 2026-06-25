# cross-session-memory

Cross-session memory plugin for OpenCode. Persists memories, checkpoints, and context across OpenCode sessions using PostgreSQL with pgvector.

## Features

- **Persistent Memory** - Save and recall memories across OpenCode sessions
- **Automatic Checkpointing** - Creates checkpoints on risky operations, session end, and context rollover
- **Context Compaction** - Automatically compacts long conversations with distillation
- **Semantic Search** - Vector-based memory search using pgvector
- **Multiple Memory Types** - conversation, workspace, repo, preference, lesson
- **Subconscious Processing** - Background distillation of tool calls into structured memories

## Installation

```bash
# Install globally
npm install -g @your-org/cross-session-memory

# Or install locally in your project
npm install @your-org/cross-session-memory
```

Then add to your `.opencode/opencode.json`:

```json
{
  "plugins": [
    {
      "name": "cross-session-memory",
      "path": "node_modules/@your-org/cross-session-memory"
    }
  ]
}
```

## Configuration

Configure via environment variables or `.opencode/cross-session-memory.json`:

```json
{
  "database": {
    "host": "localhost",
    "port": 5432,
    "database": "opencode_memory",
    "user": "opencode_memory",
    "password": "opencode_memory"
  },
  "embedding": {
    "provider": "openai",
    "model": "text-embedding-3-small",
    "apiKey": "your-api-key"
  },
  "retention": {
    "maxMemories": 50000,
    "maxCheckpoints": 500,
    "maxContextCache": 100000
  }
}
```

### Required: PostgreSQL with pgvector

```sql
CREATE DATABASE opencode_memory;
CREATE USER opencode_memory WITH PASSWORD 'opencode_memory';
GRANT ALL PRIVILEGES ON DATABASE opencode_memory TO opencode_memory;
\c opencode_memory
CREATE EXTENSION IF NOT EXISTS vector;
```

## Usage

The plugin provides these tools to OpenCode:

- `memory_save` - Save a memory
- `memory_search` - Search memories semantically
- `memory_list` - List recent memories
- `memory_delete` - Delete a memory

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm test

# Watch mode
npm run dev
```

## Database Schema

- `sessions` - OpenCode session tracking
- `memories` - Cross-session memories with embeddings
- `checkpoints` - Session checkpoints with full context
- `context_cache` - Cached context for rollover
- `distilled_summaries` - Compressed tool call summaries
- `goals` - Session goals
- `context_rollover` - Context compaction history

## License

MIT