import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { buildGraph } from './architecture-doc-graph.js';
import { renderArchitectureDoc } from './architecture-doc-render.js';

export async function reconcileArchitectureDoc(docsDir: string, projectDir: string): Promise<{ wrote: boolean; fileCount: number; edgeCount: number }> {
  const graph = await buildGraph(projectDir);
  const content = renderArchitectureDoc(projectDir, graph);
  const architecturePath = join(docsDir, 'ARCHITECTURE.md');
  await fs.mkdir(dirname(architecturePath), { recursive: true });
  const existing = await readIfExists(architecturePath);
  if (existing !== content) {
    await fs.writeFile(architecturePath, content, 'utf-8');
    return { wrote: true, fileCount: graph.nodes.length, edgeCount: graph.edgeCount };
  }
  return { wrote: false, fileCount: graph.nodes.length, edgeCount: graph.edgeCount };
}

async function readIfExists(file: string): Promise<string> {
  try {
    return await fs.readFile(file, 'utf-8');
  } catch {
    return '';
  }
}
