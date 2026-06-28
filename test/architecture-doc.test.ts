import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';

import { reconcileArchitectureDoc } from '../dist/hooks/architecture-doc.js';

describe('architecture doc generator', () => {
  let root = '';

  before(async () => {
    root = await mkdtemp(join(tmpdir(), 'csm-arch-doc-'));
    await fs.mkdir(join(root, 'src'), { recursive: true });
    await fs.mkdir(join(root, 'docs'), { recursive: true });
    await fs.writeFile(join(root, 'src', 'b.ts'), 'export function buildThing() { return 1; }\n', 'utf-8');
    await fs.writeFile(join(root, 'src', 'a.ts'), "import { buildThing } from './b.js';\nexport const value = buildThing();\n", 'utf-8');
    await fs.writeFile(join(root, 'src', 'index.ts'), "import './a.js';\nexport const entry = true;\n", 'utf-8');
  });

  after(async () => {
    if (root) {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it('renders upstream, downstream, and blast-radius notes', async () => {
    const result = await reconcileArchitectureDoc(join(root, 'docs'), root);
    const content = await fs.readFile(join(root, 'docs', 'ARCHITECTURE.md'), 'utf-8');

    assert.equal(result.wrote, true);
    assert.match(content, /# ARCHITECTURE\.md/);
    assert.match(content, /src\/b\.ts/);
    assert.match(content, /src\/a\.ts/);
    assert.match(content, /Dependency Map/);
    assert.match(content, /Removal Blast Radius/);
    assert.match(content, /breaks 1 dependents/);
  });
});
