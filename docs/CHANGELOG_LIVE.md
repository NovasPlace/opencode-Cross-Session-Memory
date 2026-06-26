# CHANGELOG_LIVE.md

## Development Log

### 2026-06-26 — Phase 14: Criticality-Based Raw Preservation

**Feature: Tool output criticality scoring**

Tool outputs are now scored for criticality (0=low, 1=medium, 2=critical) and
compression priority is based on score, not just recency or size.

Criticality rules:
- Score 2 (critical): error output, test failure, diff content, stack trace,
  migration result, destructive operation, exit code != 0
- Score 1 (medium): bash/edit/write tools with error patterns in output,
  git/migrate/deploy operations
- Score 0 (low): glob, read, grep, write (success), bash (success without error)

Compression priority (low criticality compressed first):
- Low-signal tool outputs (glob listings, successful reads, search boilerplate)
  compressed before higher-criticality outputs
- Critical outputs (errors, diffs, failures) preserved raw unless under
  extreme pressure (>2x budget), then compressed with preserved error details

Adaptive pressure valve:
- Low pressure: keep recent raw, compress old large outputs
- Medium pressure: shrink recent window, compress short tool outputs
- High pressure: compress even recent critical outputs with detail preservation
- Extreme pressure: compress everything, errors get [CRITICAL_TOOL:...] summaries

Bug fixes:
- Fixed double-compression bug (iterative recompression was recompressing
  already-compressed outputs because [CRITICAL_TOOL:] prefix wasn't in
  ALREADY_COMPACTED detection list)
- Fixed compression ratio check (skip if compressed output >= original size)
- Added tiny tool output compaction ([OK] for sub-10-token outputs)
- Added [TOOL:] and [CRITICAL_TOOL:] to already-compacted detection list

Benchmark results:
```
Low pressure:  tool dominance 96.0%, context 60.0%
Med pressure:  tool dominance 93.9%, context 156.8%
High pressure: tool dominance 71.7%, context 112.2%

Tool dominance drops 24.3pp from low→high pressure
Adaptive window shrinks from 10→2 turns under pressure
307 parts compressed at normal pressure, 80.6% token reduction
```

Tests: 196 total, 0 failures

### 2026-06-26 — Phase 13b: Short Tool Output Compaction + Adaptive Window

**Milestone: Live proof of context recovery under extreme pressure**

877-message coding session reaching danger territory, then full recovery:
```
Before compaction:  99,202 tokens  (76% context)
After compaction:   12,272 tokens  (9% context)
After recovery:    ~20,178 tokens  (15% context)
Tool output share:  87.6% of context
Reduction:          87.6%
```

Short tool output compaction:
- Tool outputs <100 tokens were previously pinned (never compressed)
- Now compressible when stale (outside recent window) or under pressure
- Short tool outputs compressed with `[OK]` or `[TOOL:type] "cmd" — N lines` format

Adaptive recent window:
- `adaptiveRecentWindow()` shrinks the pinned window based on pressure ratio
- Low pressure (budget > session): full window, no compression
- Medium pressure (0.3-0.5x): window at 50% of base
- High pressure (< 0.3x): window at 10% of base, minimum 1 turn
- Iterative recompression: if still over budget after first pass, re-classify
  and re-compress with tighter window

Benchmark results:
```
140,774 → 19,766 tokens (86% reduction)
Tool dominance: 96.6% → 75.9% (20.7pp drop)
Pinned: 68.4%, Compressed: 7.5%
```

### Earlier phases

- Phase 1: Cross-session PostgreSQL memory plugin
- Phase 2: Auto-documentation hooks
- Phase 3: Concept graph relationships
- Phase 4: Hybrid recall (vector + keyword search)
- Phase 5: Quality-gated compaction
- Phase 6: Safe prune dry-run
- Phase 7: Short tool-output compaction (this phase)
- Phase 8: Adaptive pressure window (this phase)
