# System Map

> Auto-generated architecture reference. Updated on file edits via `auto-docs` hook.

## Core

| File | Exports | Type | Role |
|------|---------|------|------|
| `src/prompt-message-sanitizer.ts` | PromptMessageLike, PromptNormalizationOptions, normalizePromptMessages | source | Module |
| `src/prompt-debug-log.ts` | writePromptDebugLog | source | Module |
| `src/codex-mcp-server.ts` | none | source | Module |
| `src/types.ts` | MemoryType, MemoryCandidateStatus, MemoryCandidate, MemoryApproval, TTLConfig, ProjectScope, ExtractorConfig, MemoryEmotion, MemorySource, SortBy, MemorySearchMode, Session, Memory, MemoryChunk, MemoryEvent, SessionContext, BudgetMode, ContextCompilerConfig, ContextCacheConfig, CompressedPartDetail, ContextCompilationEntry, ProviderPricing, CompactionReport, ToolDominanceTrendPoint, SessionAnalytics, AutoDocsConfig, PluginConfig, CompactorConfig, AssistantCompactorConfig, CompactionResult, CumulativeCompactionStats, CompactionQualityMetrics, CompactionQualityConfig, DEFAULT_COMPACTION_QUALITY_CONFIG, DistillerConfig, ToolCallRecord, ToolCallGroup, ToolCallSummary, ContextBrief, LoopDetectionResult, ContextPressureResult, RecallResult, MemorySaveOptions, MemorySearchOptions, MemoryListOptions, BackfillEmbeddingsOptions, BackfillEmbeddingsResult, DatabasePool, DatabaseClient, PruneRiskLevel, PruneSignal, PruneCandidate, PruneReport, PruneConfig, AlchemistLessonType, AlchemistSource, AlchemistIngest, ExtractedCapability, LessonTelemetry, AlchemistLesson, Blueprint, GapReport, AlchemistConfig, SelfContinuityConfidenceWeights, SelfContinuityConfig, DEFAULT_PRUNE_CONFIG | source | Context compaction engine |
| `src/types/opentui.d.ts` | createSignal, createEffect, onCleanup, createMemo, onMount, h, jsx, jsxs, Fragment, RGBA, Renderable, KeyEvent, SlotMode, CliRenderer, JSX, SolidPlugin, Binding, Keymap, KeyLike, KeySequencePart, KeyStringifyInput, StringifyOptions, stringifyKeySequence, stringifyKeyStroke, BindingConfig, BindingLookup, BindingValue, createBindingLookup, formatCommandBindings, formatKeySequence | types | Module |
| `src/tui.ts` | none | source | Module |
| `src/tools.ts` | memorySaveTool, memorySearchTool, memoryDeleteTool, memoryContextTool, memoryLessonTool, memoryListTool, memoryTranscriptTool, memoryCandidateListTool, memoryCandidateApproveTool, memoryCandidateRejectTool, memoryProjectListTool, memoryCleanupTool, memoryDistillTool, memoryDistilledViewTool, memoryCompactTool, runtimeStatusTool | source | Tool registration |
| `src/tool-distiller.ts` | ToolCallDistiller | source | Tool registration |
| `src/token-bucket-analyzer.ts` | BucketBreakdown, estimateTokens, estimatePartTokens, analyzeMessages, estimateSystemPrompt, formatBreakdown | source | Module |
| `src/subconscious.ts` | FileChangeEvent, SubconsciousWatcher | source | Module |
| `src/prune-scorer.ts` | pruneMemories, computeAgeDays_, computeEntityDensity_, isProtectedMemory_, computePruneScore_, buildReason_, classifyRisk_, buildPruneReport_ | source | Memory & recall subsystem |
| `src/priming-engine.ts` | CascadeResult, PrimingEngine | source | Module |
| `src/plugin-context.ts` | AutoCheckpointFn, PluginState, PluginContext | source | Module |
| `src/memory-manager.ts` | MemoryManager | source | Memory & recall subsystem |
| `src/memory-extractor.ts` | MemoryExtractor | source | Memory & recall subsystem |
| `src/maintenance-tools.ts` | memoryBackfillEmbeddingsTool | source | Tool registration |
| `src/loop-detector.ts` | ToolCall, LoopDetector | source | Module |
| `src/index.ts` | none | source | Module |
| `src/hybrid-search.ts` | HybridWeights, ftsSearch, vectorSearch, entityMatchBoost, reciprocalRankFusion, applyWeights, hybridSearch | source | Module |
| `src/hooks/tool-execute.ts` | createToolExecuteBeforeHook, createToolExecuteAfterHook | hooks | Hook handler |
| `src/hooks/system-transform.ts` | isGreetingLikeTurn, isWorkspaceFactTurn, createSystemTransformHook | hooks | Hook handler |
| `src/hooks/session-compaction.ts` | createSessionCompactingHook, createAutocontinueHook | hooks | Hook handler |
| `src/hooks/doc-analyzer.ts` | isIgnoredForAnalysis, isStubContent, updateDocContent, shouldSkipEntry, autoDocumentChange, reconcileSystemMap | hooks | Hook handler |
| `src/hooks/auto-docs.ts` | DEFAULT_AUTO_DOCS_CONFIG, queueDocUpdate, isIgnoredPath, flushDocUpdates, clearPendingUpdates, getPendingUpdates, resetFlushedFlag | hooks | Hook handler |
| `src/helpers/compaction-metrics.ts` | recordCompactionMetric, hasToolDiscardMarker | helpers | Context compaction engine |
| `src/helpers/auto-checkpoint.ts` | AutoCheckpointTrigger, AutoCheckpointContext, createAutoCheckpoint | helpers | Module |
| `src/goal-tools.ts` | GoalToolDeps, goalSetTool, goalUpdateTool, goalListTool | source | Tool registration |
| `src/git-watcher.ts` | GitCommit, GitRepoState, GitWatcher | source | Module |
| `src/embeddings.ts` | EMBEDDING_DIMENSIONS, EmbeddingChunk, EmbeddingConfig, EmbeddingGenerator | source | Module |
| `src/context-rollover-config.ts` | RolloverConfig, DEFAULT_ROLLOVER_CONFIG | source | Configuration |
| `src/context-review-tool.ts` | ContextReviewDeps, contextReviewTool | source | Tool registration |
| `src/context-recall.ts` | ContextRecallDaemon | source | Memory & recall subsystem |
| `src/context-pressure.ts` | Message, ContextPressure | source | Module |
| `src/context-compilation-log.ts` | logCompilation, getRecentCompilation, getCompilationHistory, pruneOldDetails | source | Module |
| `src/context-cache-tools.ts` | ContextCacheToolDeps, contextFetchTool, contextSearchTool, contextFetchFileRegionTool, contextFetchLastErrorTool, contextFetchDecisionLogTool | source | Tool registration |
| `src/context-cache-store.ts` | CacheKind, CacheItemInput, CacheItem, storeItem, fetchItem, searchItems, fetchFileReads, fetchLastError, fetchDecisions, countItems, pruneOldItems | source | Module |
| `src/context-cache-schema.ts` | initializeContextCacheSchema | source | SQL schema |
| `src/context-cache-runtime.ts` | CacheRuntimeConfig, CacheRuntimeResult, cacheOldContext | source | Module |
| `src/context-cache-manifest.ts` | ManifestEntry, ManifestResult, buildManifestFromRows, buildManifest | source | Module |
| `src/config.ts` | DEFAULT_CONFIG | source | Configuration |
| `src/concept-extractor.ts` | ExtractedConcept, ExtractionResult, extractConcepts, mergeConcepts | source | Module |
| `src/compaction-utils.ts` | hasOpenCodeDiscardMarker, isAlreadyCompacted, adaptiveWindow, isRecentEnough, collectToolParts, extractCriticalSignals, findMatchingGroup, extractFile, truncateInput, measureTotalChars | source | Module |
| `src/compaction-types.ts` | ToolPartLike, ToolPartLocation | source | Module |
| `src/compaction-tracker.ts` | ReprocessingEntry, CompactionTracker | source | Context compaction engine |
| `src/compaction-quality.ts` | extractEntities, extractDecisions, extractWarningsErrors, computeRetention, computeCompressionRatio, computeQualityScore, measureCompactionQuality, cosineSimilarity | source | Context compaction engine |
| `src/compaction-analytics.ts` | DEFAULT_PROVIDER_PRICING, CompactionAnalytics | source | Context compaction engine |
| `src/codex-bridge.ts` | CodexMemoryBridge | source | Memory & recall subsystem |
| `src/checkpoint-types.ts` | RawCaptureKind, SourceRef, CompactedRef, RawCaptureRecord, StoreRawInput, CheckpointRecord, CreateCheckpointInput, CheckpointTelemetry, ExpandedRef, CheckpointConfig, AutoCheckpointConfig, SessionMessage, SessionPart | source | Module |
| `src/checkpoint-tool.ts` | CheckpointToolDeps, createCheckpointTool, expandCheckpointRefTool, listCheckpointsTool | source | Tool registration |
| `src/checkpoint-telemetry.ts` | CheckpointCreatedEvent, CheckpointExpandedEvent, CheckpointListedEvent, CheckpointInjectedEvent, logCheckpointCreated, logCheckpointExpanded, logCheckpointListed, logCheckpointInjected, logCheckpointError | source | Module |
| `src/checkpoint-store.ts` | CheckpointStore | source | Module |
| `src/checkpoint-markdown.ts` | CheckpointSections, buildCheckpointMarkdown | source | Module |
| `src/checkpoint-inject.ts` | CheckpointInjectDeps, buildCheckpointInjection | source | Module |
| `src/checkpoint-capture.ts` | collectRawCaptures, estimateInputTokens | source | Module |
| `src/checkpoint-builder.ts` | BuildInput, BuildResult, buildCheckpoint | source | Module |
| `src/bridge-ops.ts` | BridgeDeps, BridgeContext, ContextBriefPayload, CompactionReportPayload, saveMemoryOp, searchMemoriesOp, listMemoriesOp, recallLessonsOp, getContextBriefOp, pruneMemoriesDryRunOp, backfillMissingEmbeddingsOp, getCompactionReportOp | source | Context compaction engine |
| `src/benchmark.ts` | authenticate, runBenchmarkSuite | source | Module |
| `src/assistant-text-compactor.ts` | AssistantCompactorConfig, AssistantCompactionResult, compactAssistantText | source | Context compaction engine |
| `src/alchemist.ts` | DEFAULT_ALCHEMIST_CONFIG, AlchemistEngine | source | Module |
| `src/cross-session-causal-types.ts` | CrossSessionLinkType, CrossSessionLinkStatus, CrossSessionGapKind, CrossSessionCausalLink, GrowthEvidence, StitchMemoryRecord, CrossSessionLinkInput, FailureTraceStitchResult | source | Memory & recall subsystem |
| `src/cross-session-causal-store.ts` | CrossSessionCausalStore | source | Module |
| `src/cross-session-causal-stitcher.ts` | CrossSessionCausalStitcher | source | Module |
| `src/cross-session-causal-schema.ts` | initializeCrossSessionCausalSchema | source | SQL schema |
| `src/failure-trace-types.ts` | FailureTraceStatus, FailureTrace, FailureTraceStorage, FailureTraceHydrationConfig, DEFAULT_FAILURE_TRACE_CONFIG | source | Module |
| `src/failure-trace-store.ts` | FailureTraceStore, formatFailureTraceForInjection | source | Module |
| `src/behavioral-growth-tracker.ts` | GrowthCategory, GrowthEventOutcome, GrowthEvent, GrowthMetrics, BehavioralGrowthTracker | source | Module |
| `src/behavioral-growth-tracker-types.ts` | GrowthCategory, GrowthEventOutcome, BaselineComparison, RecalledMemory, GrowthEvent, CategoryMetrics, GrowthMetrics, BehavioralGrowthTracker | source | Memory & recall subsystem |
| `src/behavioral-growth-tracker-impl.ts` | InMemoryBehavioralGrowthTracker | source | Memory & recall subsystem |
| `src/response-mode-selector.ts` | ResponseMode, ModeSelection, selectResponseMode, FormattedResponse, formatBasicResponse, formatDeepResponse, selectAndFormat | source | Module |
| `src/value-source-guard.ts` | ValueSource, TaggedValue, ValueSourceGuardResult, detectUnlabeledInferences, classifyValueClaim, guardValueSources | source | Module |
| `src/self-drift-types.ts` | DriftVerdict, DriftDimension, DriftDimensionScore, DriftResult, AnchorFixture, STABILITY_SIGNALS, DRIFT_SIGNALS, BOUNDARY_SIGNALS | source | Module |
| `src/self-drift-tracker.ts` | measureDrift | source | Module |
| `src/self-drift-anchors.ts` | SESSION_A_ANCHOR, SESSION_D_ANCHOR, SESSION_E_ANCHOR, ALL_ANCHORS | source | Module |
| `src/self-continuity-narrative-types.ts` | PhaseCausationNode, PhaseCausationLink, PhaseNarrativeResult | source | Module |
| `src/self-continuity-narrative-canonical.ts` | CANONICAL_STITCHES, CANONICAL_PHASES, CANONICAL_LINKS | source | Module |
| `src/self-continuity-narrative-format.ts` | detectNarrativeGaps, computeNarrativeConfidence, formatNarrativeText | source | Module |
| `src/self-continuity-phase-narrative.ts` | PhaseNarrativeBuilder, buildPhaseNarrative, formatPhaseNarrative | source | Module |
| `src/self-continuity-integration.ts` | IntegratedRecord, IntegratedRecallResult, IntegratedRecallOptions, HydrateFn, ThreadHydrateFn, SelfContinuityIntegration | source | Memory & recall subsystem |
| `src/self-continuity-hydrator.ts` | HydratedSelfContinuityRecord, HydrationResult, SelfContinuityHydrator | source | Module |
| `src/self-continuity-causal-thread.ts` | CausalRole, CausalLinkType, CausalThreadNode, CausalThreadGap, CausalThreadResult, HydratedCausalThread, HydrateCausalThreadOptions, classifyRole, CausalThreadHydrator, hydrateCausalThread | source | Module |
| `src/hydration-depth-types.ts` | HydrationDepthVerdict, HydrationDimension, HydrationDimensionScore, HydrationResult | source | Module |
| `src/hydration-depth-tracker.ts` | measureHydrationDepth | source | Module |
| `src/self-continuity-types.ts` | SelfContinuityTriggerType, SimilarityMethod, DriftLevel, IdentityDrift, SelfContinuityRecord, InjectionMode, SelfContinuityDebugTelemetry, ContinuityConfidenceInput, CONTINUITY_CONFIDENCE_WEIGHTS, SelfContinuityConfig, DEFAULT_SELF_CONTINUITY_CONFIG | source | Module |
| `src/self-continuity-schema.ts` | initializeSelfContinuitySchema | source | SQL schema |
| `src/self-continuity-generator.ts` | SelfContinuityGenerator | source | Module |
| `src/redactor.ts` | RedactCategory, PathMode, RedactorConfig, RedactionAudit, RedactionResult, DEFAULT_REDACTOR_CONFIG, Redactor, redact, redactObject | source | Module |
| `src/database.ts` | Database | source | PostgreSQL connection & schema |
| `src/schema/session-schema.ts` | initializeSessionSchema | schema | SQL schema |
| `src/schema/memory-schema.ts` | ensureEmbeddingColumnContract, initializeMemorySchema | schema | SQL schema |
| `src/schema/core-schema.ts` | initializeCoreSchema | schema | SQL schema |
| `src/schema/project-isolation-schema.ts` | migrateProjectIsolation | schema | SQL schema |
| `src/schema/index.ts` | initializeAllSchemas | schema | SQL schema |

## Context Pipeline

| File | Exports | Type | Role |
|------|---------|------|------|
| `src/context-compiler.ts` | CompileResult, formatLessonBlock, compileContextWithLessons, scoreCriticality, compileContext, formatStatusLine | source | Module |
| `src/context-compactor.ts` | ContextCompactor, createContextCompactor | source | Context compaction engine |
| `src/context-rollover.ts` | RolloverResult, performRollover | source | Module |
| `src/context-rollover-brief.ts` | ContinuationBrief, buildContinuationBrief | source | Module |
| `src/context-rollover-schema.ts` | initializeRolloverSchema, RolloverRecord, getRolloverRecord, upsertCumulativeTokens, recordRollover, setHardRolloverFlag, clearHardRolloverFlag | source | SQL schema |
| `src/context-compilation-schema.ts` | initializeContextCompilationSchema | source | SQL schema |

## Other Subsystems

| File | Exports | Type | Role |
|------|---------|------|------|
| `src/memory-graph.ts` | MemoryLink, RelatedMemory, initializeGraphSchema, inferLinkType, buildLinksForMemory, getRelatedMemories, findSharedEntities | source | Memory & recall subsystem |
| `src/recall-telemetry.ts` | RecallTelemetrySource, RecallTelemetryInput, initializeRecallTelemetrySchema, hashRecallQuery, recordRecallBatch, getRecallCounts | source | Memory & recall subsystem |
| `src/goal-schema.ts` | Goal, initializeGoalSchema, setActiveGoal, updateGoal, getActiveGoal, listGoals | source | SQL schema |
| `src/checkpoint-schema.ts` | CHECKPOINT_SCHEMA_VERSION, initializeCheckpointSchema | source | SQL schema |
