import { AdaptiveContextGovernor } from './context-governor.js';
import { DEFAULT_GOVERNOR_CONFIG } from './context-governor-profiles.js';
import {
  buildScenario,
  clone,
  countTokens,
  evaluateContinuity,
  toolShare,
  type BenchmarkMessage,
  type ScenarioFacts,
} from './context-governor-benchmark-fixtures.js';
import type { ContextCompilerConfig } from './types.js';

export interface SessionRunMetrics {
  messageCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  finalActiveTokens: number;
  toolOutputShare: number;
  turnsBeforePressure: number;
  repeatedWorkCount: number;
  forgottenDecisionCount: number;
  continuitySurvived: boolean;
  finalBuildTestResult: string;
}

export interface GovernorBenchmarkReport {
  baseline: SessionRunMetrics;
  governor: SessionRunMetrics;
  destructiveRebuild: SessionRunMetrics;
  governorAction: string;
  targetBudget: number;
  continuityState: string;
}

const CONFIG: ContextCompilerConfig = {
  enabled: true,
  modes: { cheap: 35_000, normal: 60_000, deep: 100_000 },
  defaultMode: 'normal',
  recentTurnWindow: 3,
  statusInjection: true,
  statusPlacement: 'end',
  statusVerbosity: 'compact',
  logEnabled: false,
  logSummaryRetentionDays: null,
  logDetailsRetentionDays: 30,
  storeRawCompressedContent: false,
};

function simulateBaseline(messages: BenchmarkMessage[], budget: number, facts: ScenarioFacts): SessionRunMetrics {
  const active: BenchmarkMessage[] = [];
  let totalInputTokens = 0;
  let turnsBeforePressure = messages.length;
  for (let index = 0; index < messages.length; index++) {
    active.push(clone(messages[index]));
    const currentTokens = countTokens(active);
    totalInputTokens += currentTokens;
    if (currentTokens > budget && turnsBeforePressure === messages.length) turnsBeforePressure = index + 1;
  }
  return {
    messageCount: messages.length,
    totalInputTokens,
    totalOutputTokens: messages.filter((message) => message.info.role === 'assistant').reduce((sum, message) => sum + countTokens([message]), 0),
    finalActiveTokens: countTokens(active),
    toolOutputShare: toolShare(active),
    turnsBeforePressure,
    ...evaluateContinuity(active, facts),
  };
}

function simulateGovernor(messages: BenchmarkMessage[], budget: number, facts: ScenarioFacts): { metrics: SessionRunMetrics; action: string; state: string } {
  const governor = new AdaptiveContextGovernor(CONFIG, DEFAULT_GOVERNOR_CONFIG);
  const active: BenchmarkMessage[] = [];
  let totalInputTokens = 0;
  let turnsBeforePressure = messages.length;
  let lastAction = 'none';
  for (let index = 0; index < messages.length; index++) {
    active.push(clone(messages[index]));
    const result = governor.govern(active, 'balanced');
    totalInputTokens += result.metricsAfter.totalTokens;
    lastAction = result.decision.action;
    if (result.metricsAfter.totalTokens > budget && turnsBeforePressure === messages.length) turnsBeforePressure = index + 1;
  }
  const continuity = evaluateContinuity(active, facts);
  return {
    metrics: {
      messageCount: messages.length,
      totalInputTokens,
      totalOutputTokens: messages.filter((message) => message.info.role === 'assistant').reduce((sum, message) => sum + countTokens([message]), 0),
      finalActiveTokens: countTokens(active),
      toolOutputShare: toolShare(active),
      turnsBeforePressure,
      ...continuity,
    },
    action: lastAction,
    state: String(active[0]?.parts?.[0]?.text ?? '').slice(0, 220),
  };
}

function simulateDestructiveRebuild(messages: BenchmarkMessage[], budget: number, facts: ScenarioFacts): SessionRunMetrics {
  const governor = new AdaptiveContextGovernor(CONFIG, DEFAULT_GOVERNOR_CONFIG);
  const rebuilt = clone(messages);
  governor.govern(rebuilt, 'emergency');
  return {
    messageCount: rebuilt.length,
    totalInputTokens: countTokens(rebuilt),
    totalOutputTokens: rebuilt.filter((message) => message.info.role === 'assistant').reduce((sum, message) => sum + countTokens([message]), 0),
    finalActiveTokens: countTokens(rebuilt),
    toolOutputShare: toolShare(rebuilt),
    turnsBeforePressure: rebuilt.length,
    ...evaluateContinuity(rebuilt, facts),
  };
}

export function runGovernorBenchmark(turns = 180, budget = 60_000): GovernorBenchmarkReport {
  const { messages, facts } = buildScenario(turns);
  const baseline = simulateBaseline(messages, budget, facts);
  const governor = simulateGovernor(messages, budget, facts);
  const destructiveRebuild = simulateDestructiveRebuild(messages, budget, facts);
  return {
    baseline,
    governor: governor.metrics,
    destructiveRebuild,
    governorAction: governor.action,
    targetBudget: budget,
    continuityState: governor.state,
  };
}
