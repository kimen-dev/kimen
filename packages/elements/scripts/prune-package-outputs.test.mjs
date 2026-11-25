import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { prunePackageOutputs } from './prune-package-outputs.mjs';

const workspaceRoot = fileURLToPath(new URL('../../..', import.meta.url));
const map = (sources) =>
  JSON.stringify({ version: 3, sources, sourcesContent: sources.map(() => ''), mappings: '' });

const fixture = {
  'package.json': JSON.stringify({
    name: '@kimen/elements',
    files: ['dist/index.js', 'dist/components', 'dist/types', '!dist/components/skip.js', 'NOTICE'],
    types: 'dist/types/index.d.ts',
    exports: {
      '.': { types: './dist/types/index.d.ts', import: './dist/index.js' },
      './components/*.js': { types: './dist/components/*.d.ts', import: './dist/components/*.js' },
    },
  }),
  NOTICE: 'notices\n',
  'dist/index.js': "export * from './components/index.js';\n",
  // A re-export module: its map names no source.
  'dist/components/index.js': "export * from './a.js';\n//# sourceMappingURL=index.js.map\n",
  'dist/components/index.js.map': JSON.stringify({
    version: 3,
    sources: [],
    names: [],
    mappings: '',
  }),
  'dist/components/a.js': 'export const a = 1;\n//# sourceMappingURL=a.js.map\n',
  'dist/components/a.js.map': map(['../../src/a.ts']),
  'dist/components/a.d.ts': "export * from '../types/components/a/a';\n",
  'dist/components/skip.js': 'export {};\n',
  'dist/types/index.d.ts': "export { A } from './components/a/a';\n",
  'dist/types/components/a/a.d.ts':
    "import type { Used } from './helper-used';\nexport declare const A: Used;\n",
  'dist/types/components/a/helper-used.d.ts': 'export type Used = number;\n',
  'dist/types/components/a/helper-unused.d.ts': 'export declare const helper: () => void;\n',
  'dist/types/utils/unused.d.ts': 'export declare const unused: string;\n',
  'dist/cjs/unpublished.js.map': JSON.stringify({ version: 3, sources: [], mappings: '' }),
};

async function writeFixture(t) {
  const packageRoot = await mkdtemp(join(tmpdir(), 'kimen-prune-outputs-'));
  t.after(() => rm(packageRoot, { force: true, recursive: true }));
  for (const [path, contents] of Object.entries(fixture)) {
    await mkdir(dirname(join(packageRoot, path)), { recursive: true });
    await writeFile(join(packageRoot, path), contents);
  }
  return packageRoot;
}

const exists = (path) =>
  access(path).then(
    () => true,
    () => false,
  );

test('removes the declarations no public declaration reaches and the maps that map no source', async (t) => {
  const packageRoot = await writeFixture(t);

  const report = await prunePackageOutputs({ packageRoot, workspaceRoot });

  assert.deepEqual(report, { declarations: 2, maps: 1, published: 10 });
  for (const path of [
    'dist/types/components/a/helper-unused.d.ts',
    'dist/types/utils',
    'dist/components/index.js.map',
  ]) {
    assert.equal(await exists(join(packageRoot, path)), false, `${path} must be removed`);
  }
  for (const path of [
    'dist/types/index.d.ts',
    'dist/types/components/a/a.d.ts',
    'dist/types/components/a/helper-used.d.ts',
    'dist/components/a.js.map',
    // Outside what the package publishes, or excluded from it: never touched.
    'dist/cjs/unpublished.js.map',
    'dist/components/skip.js',
  ]) {
    assert.equal(await exists(join(packageRoot, path)), true, `${path} must stay`);
  }
  assert.equal(
    await readFile(join(packageRoot, 'dist/components/index.js'), 'utf8'),
    "export * from './a.js';\n",
  );
  assert.match(
    await readFile(join(packageRoot, 'dist/components/a.js'), 'utf8'),
    /sourceMappingURL=a\.js\.map/u,
  );
});

test('a second pass removes nothing', async (t) => {
  const packageRoot = await writeFixture(t);
  await prunePackageOutputs({ packageRoot, workspaceRoot });

  assert.deepEqual(await prunePackageOutputs({ packageRoot, workspaceRoot }), {
    declarations: 0,
    maps: 0,
    published: 10,
  });
});
