// Wiring pin for the catalog build target (Codex review of PR #57): with
// the root build target cached on default inputs/outputs, an elements-
// manifest change could replay a stale catalog build from cache, and
// run-many could order the generator before the elements build refreshes
// the manifest. Deliberately unmarked for traceability: this pins task
// wiring, not a feature scenario.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import test from 'node:test';

const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..');

test('catalog build target pins manifest inputs, generated outputs and the elements ordering edge', async () => {
  const pkg = JSON.parse(await readFile(join(repoRoot, 'packages/catalog/package.json'), 'utf8'));
  const build = pkg.nx.targets.build;
  assert.ok(
    build.inputs.includes('{workspaceRoot}/packages/elements/generated/custom-elements.json'),
    'the elements manifest must be a build input',
  );
  assert.ok(
    build.inputs.includes('!{projectRoot}/src/generated/**'),
    'the generated artifact must not invalidate its own build',
  );
  assert.ok(
    build.outputs.includes('{projectRoot}/src/generated'),
    'the generated artifact must be a declared cache output',
  );
  assert.ok(
    build.dependsOn.some(
      (dependency) =>
        typeof dependency === 'object' &&
        dependency.target === 'build' &&
        dependency.projects.includes('@kimen/elements'),
    ),
    'catalog build must order after the elements build',
  );
  assert.ok(pkg.scripts.build.startsWith('node scripts/generate-catalog.mjs'));
});
