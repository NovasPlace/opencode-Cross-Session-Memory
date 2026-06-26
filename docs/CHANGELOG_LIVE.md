# CHANGELOG_LIVE.md

## Development Log

### 2026-06-26 — Phase 17: Repo hygiene + untested core module coverage (265 tests)
- Removed `src/index.ts.bak` from git; added `*.bak` to `.gitignore`
- Added `typecheck` script (`tsc --noEmit`) and `verify` script (build + typecheck + full test suite)
- Exported `inferLinkType` from `memory-graph.ts` for direct testing
- Added 41 focused tests across 3 previously-untested core modules:
  - `concept-extractor.test.ts` (17 tests) — `extractConcepts` pattern matching + `mergeConcepts` dedup
  - `memory-graph.test.ts` (12 tests) — `inferLinkType` link-type classification (causal, reference, shared_entity, temporal)
  - `priming-engine.test.ts` (12 tests) — `cascade` traversal with mock DB (depth limits, cycle breaking, maxMemories) + `cascadeFromMultiple` dedup/sort

### 2026-06-26 — Lesson-recall integration (224 tests)
- `AlchemistLesson` gains required `confidence` and `retention` fields
- `AlchemistEngine.store(lessons)` bulk-loads lessons without synthesize()
- `CompileResult.injectedLessons` exposes which lessons were injected
- `rankLessons` filters by `confidence >= 0.5` threshold
- `compileContextWithLessons()` closes the loop: past lesson stored → matching future task → lesson appears in `injectedLessons` → context changes
- 10 integration tests proving lesson recall changes future context

### 2026-06-26 — Goal tools date fix
- Fixed `RangeError: Invalid time value` in goal tools by wrapping BIGINT date fields with `Number()` (pg driver returns BIGINT as strings)

### 2026-06-24 — Initial
- Cross-session memory plugin for opencode
