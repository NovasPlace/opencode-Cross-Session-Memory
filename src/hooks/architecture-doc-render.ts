import type { GraphNode } from './architecture-doc-graph.js';

export function renderArchitectureDoc(projectDir: string, graph: { nodes: GraphNode[]; dependents: Map<string, Set<string>>; edgeCount: number }): string {
  const critical = graph.nodes
    .map((node) => ({ ...node, downstream: graph.dependents.get(node.file) ?? new Set<string>() }))
    .filter((node) => !isGeneratedDoc(node.file))
    .sort((a, b) => b.downstream.size - a.downstream.size || a.file.localeCompare(b.file))
    .slice(0, 18);
  const entrypoints = critical.filter((node) => isEntrypoint(node.file) || node.downstream.size > 0).slice(0, 8);
  const hotSpots = critical.filter((node) => node.downstream.size >= 2).slice(0, 10);

  return [
    '# ARCHITECTURE.md',
    '',
    '> Auto-generated from the repo graph. Use README.md for setup and this doc for system shape, dependencies, and blast radius.',
    '',
    '## System Shape',
    `- Project root: \`${projectDir}\``,
    `- Code files indexed: ${graph.nodes.length}`,
    `- Dependency edges indexed: ${graph.edgeCount}`,
    '- README owns onboarding and setup.',
    '- ARCHITECTURE owns module flow and impact mapping.',
    '',
    '## Entry Points',
    ...renderNodeList(entrypoints, graph.dependents),
    '',
    '## High-Risk Surfaces',
    ...renderNodeList(hotSpots, graph.dependents, true),
    '',
    '## Dependency Map',
    ...renderNodeList(critical, graph.dependents),
    '',
    '## Removal Blast Radius',
    ...renderBlastRadius(critical, graph.dependents),
    '',
    '## Reading Order',
    '- README.md first for install, run, and verify.',
    '- ARCHITECTURE.md second for the live system shape.',
    '- SYSTEM_MAP.md for per-file inventory.',
    '- DECISIONS.md for trade-offs.',
    '- RUNBOOK.md for commands and maintenance.',
  ].join('\n');
}

function renderNodeList(nodes: Array<GraphNode & { downstream?: Set<string> }>, dependents: Map<string, Set<string>>, emphasizeRisk = false): string[] {
  if (nodes.length === 0) return ['- (none found)'];
  const lines: string[] = ['| File | Role | Upstream | Downstream | Impact |', '|------|------|----------|------------|--------|'];
  for (const node of nodes) {
    const downstream = node.downstream ?? dependents.get(node.file) ?? new Set<string>();
    lines.push(`| \`${node.file}\` | ${describeRole(node.file, node.exports)} | ${node.imports.slice(0, 4).join(', ') || 'none'} | ${[...downstream].slice(0, 4).join(', ') || 'none'} | ${describeImpact(node.file, downstream.size, emphasizeRisk)} |`);
  }
  return lines;
}

function renderBlastRadius(nodes: Array<GraphNode & { downstream?: Set<string> }>, dependents: Map<string, Set<string>>): string[] {
  const lines: string[] = [];
  for (const node of nodes.slice(0, 12)) {
    const downstream = node.downstream ?? dependents.get(node.file) ?? new Set<string>();
    if (downstream.size === 0) continue;
    const impacted = [...downstream].slice(0, 3).join(', ');
    lines.push(`- Removing \`${node.file}\` breaks ${downstream.size} dependents: ${impacted}${downstream.size > 3 ? ', ...' : ''}.`);
  }
  return lines.length > 0 ? lines : ['- No high-blast-radius nodes detected in the current scan.'];
}

function describeRole(file: string, exports: string[]): string {
  const lower = file.toLowerCase();
  if (lower.includes('hook')) return 'Hook';
  if (lower.includes('test')) return 'Test';
  if (lower.includes('schema')) return 'Schema';
  if (lower.includes('bridge')) return 'Bridge';
  if (lower.includes('tool')) return 'Tool';
  if (lower.includes('doc')) return 'Docs';
  if (exports.includes('Database')) return 'Database';
  if (exports.some((item) => item.includes('Compactor') || item.includes('Governor'))) return 'Context flow';
  if (exports.some((item) => item.includes('Memory') || item.includes('Recall'))) return 'Memory/Recall';
  return 'Module';
}

function describeImpact(file: string, downstreamCount: number, emphasizeRisk: boolean): string {
  if (downstreamCount === 0) return emphasizeRisk ? 'Low immediate blast radius' : 'Leaf node';
  if (downstreamCount >= 5) return `High blast radius (${downstreamCount})`;
  if (downstreamCount >= 2) return `Moderate blast radius (${downstreamCount})`;
  if (file.endsWith('index.ts') || file.endsWith('server.ts') || file.endsWith('bridge.ts')) return `Entry surface for ${downstreamCount} dependents`;
  return `Single dependent (${downstreamCount})`;
}

function isEntrypoint(file: string): boolean {
  const lower = file.toLowerCase();
  return lower.endsWith('/index.ts') || lower.endsWith('/index.js') || lower.includes('server') || lower.includes('bridge') || lower.includes('plugin');
}

function isGeneratedDoc(file: string): boolean {
  return file.endsWith('docs/ARCHITECTURE.md') || file.endsWith('docs/SYSTEM_MAP.md') || file.endsWith('docs/DECISIONS.md') || file.endsWith('docs/RUNBOOK.md') || file.endsWith('docs/CHANGELOG_LIVE.md');
}
