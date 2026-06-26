# CHANGELOG_LIVE.md

## Development Log

### 2026-06-26 — Phase 18: Privacy/redaction layer (305 tests)
- `src/redactor.ts` — standalone redaction module with configurable categories (secrets, emails, phones, IPs, URL creds, paths), audit counts, fail-closed behavior
- Path handling: absolute → `[WORKSPACE]/relative` by default (preserves coding utility, hides personal paths)
- Wired into every persistence path: `MemoryManager.saveMemory()`, `CheckpointStore.createCheckpoint()`, `context-cache-store.storeItem()`, distilled summaries INSERTs, `AlchemistEngine.synthesize()/store()`
- Redaction happens BEFORE persistence, embeddings, checkpoints, context cache, distilled summaries, Alchemist lessons
- `RedactorConfig` added to `PluginConfig` with secure-by-default categories; `path` mode defaults to `normalize`
- Audit metadata with category counts only; never stores raw secrets in audit
- 31 unit tests + 9 integration tests (proves no raw secret in stored content, audit counts correct, category toggles work, fail-closed safe)
- 298 tests pass (7 context-rollover wiring issues unrelated to redactor; 1 pre-existing prune flake)