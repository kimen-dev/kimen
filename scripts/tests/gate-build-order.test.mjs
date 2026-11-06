import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

// Gates that analyse the whole repository against the workspace packages'
// published types (`exports.types` -> `dist/*.d.ts`) or generated output.
// They see every project, so the build before them has to cover every
// project: an affected-only build leaves e.g. `@kimen/catalog` without dist
// when a dependency update does not touch it, and type-aware lint then
// reports its imports as error-typed values.
const REPOSITORY_WIDE = [
  /pnpm run lint$/u,
  /pnpm run typecheck$/u,
  /pnpm run deadcode$/u,
  /pnpm run check:api$/u,
  /check-generated-sync\.mjs \w+$/u,
];
const WORKSPACE_BUILD = /pnpm exec nx run-many -t build$/u;

function gateCommands(source, runner) {
  const prefix = new RegExp(`^${runner} (\\S+) (.+)$`, 'u');
  return source
    .split('\n')
    .map((line) => prefix.exec(line.trim()))
    .filter(Boolean)
    .map(([, name, command]) => ({ name, command }));
}

for (const [path, runner] of [
  ['scripts/gates/gates-core.sh', 'run_core_gate'],
  ['scripts/gates/gates-dependencies.sh', 'run_dependency_gate'],
]) {
  test(`${path} builds every project before repository-wide gates`, async () => {
    const gates = gateCommands(await read(path), runner);
    const repositoryWide = gates.filter(({ command }) =>
      REPOSITORY_WIDE.some((pattern) => pattern.test(command)),
    );
    assert.ok(repositoryWide.length > 0, `${path}: no repository-wide gates found`);

    const build = gates.findIndex(({ command }) => WORKSPACE_BUILD.test(command));
    assert.notEqual(build, -1, `${path}: no gate builds every workspace project`);

    for (const gate of repositoryWide) {
      assert.ok(
        gates.indexOf(gate) > build,
        `${path}: ${gate.name} runs before the workspace build`,
      );
    }
  });
}
