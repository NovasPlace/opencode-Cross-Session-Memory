# CHANGELOG_LIVE.md

## Development Log

### 2026-06-26 — Phase 19: Reproducible benchmark harness (305 tests, all green)
- `src/benchmark.ts` — standalone benchmark module with long-session simulation
- 877-message synthetic session (alternating user/assistant/tool-output turns)
- Metrics: baseline vs optimized tokens, reduction %, context multiplier, tool-output dominance, evidence signals retained, redaction audit
- Result: 591K → 49K tokens (91.6% reduction, 11.9x multiplier)
- `benchmark:long-session` script in package.json
- Build + full test suite green

### 2026-06-26 — Phase 18b: Fix context-rollover failures (305 tests, all green)
- Restored `performRollover` original signature `(pool, sessionId, messages, rawTotalTokens, cfg, redactor?)`
- Phase 18 redactor wiring had shifted parameter order, breaking 6 rollover tests
- Full suite now fully green: 305 pass, 0 fail

### 2026-06-26 — Phase 18: Privacy/redaction layer (305 tests)
- `src/redactor.ts` — standalone redaction module with configurable categories (secrets, emails, phones, IPs, URL creds, paths)
- Wired into all 6 storage paths: memory save, embeddings/chunks/concepts, checkpoints/raw captures, context cache, distilled summaries, Alchemist lessons
- Workspace-relative path normalization by default (not blind removal)
- Audit metadata with counts only, never raw values
- Fail-closed behavior on unexpected input
- 40 new tests (31 unit + 9 integration)

### 2026-06-26 — Phase 17: Repo hygiene + untested core module coverage (265 tests)
- Removed `src/index.ts.bak` from git; added `*.bak` to `.gitignore`
- Added `typecheck` and `verify` scripts to package.json
- Exported `inferLinkType` from memory-graph.ts for testability
- 41 new tests: memory-graph (8), concept-extractor (18), priming-engine (15)

### 2026-06-26 — Lesson-recall integration (224 tests)
- `AlchemistLesson` gains required `confidence` and `retention` fields
- `AlchemistEngine.store(lessons)` — bulk load for direct lesson injection
- `CompileResult.injectedLessons` — exposes which lessons were actually injected
- `rankLessons` filters by confidence >= 0.5
- `compileContextWithLessons()` closes the loop: past lesson → matching future task → injected into context
- 10 new integration tests
