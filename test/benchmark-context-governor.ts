import { runGovernorBenchmark } from '../src/context-governor-benchmark.js';

function pct(before: number, after: number): string {
  return before > 0 ? (((before - after) / before) * 100).toFixed(1) : '0.0';
}

function main() {
  const report = runGovernorBenchmark();
  console.log(`baseline_input=${report.baseline.totalInputTokens}`);
  console.log(`governor_input=${report.governor.totalInputTokens}`);
  console.log(`baseline_active=${report.baseline.finalActiveTokens}`);
  console.log(`governor_active=${report.governor.finalActiveTokens}`);
  console.log(`governor_saved_pct=${pct(report.baseline.totalInputTokens, report.governor.totalInputTokens)}`);
  console.log(`governor_action=${report.governorAction}`);
  console.log(`baseline_pressure_turn=${report.baseline.turnsBeforePressure}`);
  console.log(`governor_pressure_turn=${report.governor.turnsBeforePressure}`);
  console.log(`baseline_repeated_work=${report.baseline.repeatedWorkCount}`);
  console.log(`governor_repeated_work=${report.governor.repeatedWorkCount}`);
  console.log(`baseline_forgotten_decisions=${report.baseline.forgottenDecisionCount}`);
  console.log(`governor_forgotten_decisions=${report.governor.forgottenDecisionCount}`);
  console.log(`destructive_rebuild_continuity=${report.destructiveRebuild.continuitySurvived}`);
  console.log(`destructive_rebuild_result=${report.destructiveRebuild.finalBuildTestResult}`);
  console.log(`continuity_state=${report.continuityState}`);
}

main();
