import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, matchesGlob, relative, sep } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  formatEnvironment,
  lintPaths,
  parseArguments,
  projectRoots,
  runCli,
  selectAffected,
} from '../gates/select-affected.mjs';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

const ROOTS = new Map([
  ['@kimen/tokens', 'packages/tokens'],
  ['@kimen/elements', 'packages/elements'],
  ['@kimen/react', 'packages/react'],
  ['@kimen/catalog', 'packages/catalog'],
  ['@kimen/mcp-server', 'packages/mcp-server'],
  ['@kimen/docs', 'site/docs'],
  ['@kimen/nx-plugin', 'tools/kimen-plugin'],
]);
const exists = () => true;
const select = (files, affected = []) => selectAffected({ files, roots: ROOTS, affected, exists });

test('a documentation change affects no project and lints nothing', () => {
  assert.deepEqual(select(['docs/roadmap.md', 'README.md', '.specify/memory/constitution.md']), {
    scope: 'affected',
    projects: [],
    lintPaths: [],
  });
});

test('a plugin change affects no project and lints nothing', () => {
  assert.deepEqual(select(['plugins/kimen/skills/kimen-genui/SKILL.md']), {
    scope: 'affected',
    projects: [],
    lintPaths: [],
  });
});

// The static site belongs to no project, but the elements browser suite reads
// it (a declared test-browser input, checked below), so Nx reports elements
// and its dependents; the site's own scripts are linted beside their roots.
test('a static site change takes the projects Nx reports and lints the site', () => {
  assert.deepEqual(
    select(['site/index.html', 'site/landing.js'], ['@kimen/elements', '@kimen/react']),
    {
      scope: 'affected',
      projects: ['@kimen/elements', '@kimen/react'],
      lintPaths: ['packages/elements', 'packages/react', 'site'],
    },
  );
});

test('a docs site change affects the docs project alone', () => {
  assert.deepEqual(
    select(['site/docs/src/content/docs/guides/connect-agents.mdx'], ['@kimen/docs']),
    { scope: 'affected', projects: ['@kimen/docs'], lintPaths: ['site/docs'] },
  );
});

test('a change to repository scripts outside the gates lints their tree', () => {
  assert.deepEqual(select(['scripts/tests/ci-scope.test.mjs']).lintPaths, ['scripts']);
});

test('a component change takes the projects Nx reports and lints their roots', () => {
  const selection = select(
    ['packages/elements/src/components/ki-card/ki-card.tsx', 'llms-full.txt'],
    ['@kimen/elements', '@kimen/react', '@kimen/docs', '@kimen/elements'],
  );
  assert.deepEqual(selection, {
    scope: 'affected',
    projects: ['@kimen/docs', '@kimen/elements', '@kimen/react'],
    lintPaths: ['packages/elements', 'packages/react', 'site/docs'],
  });
});

test('shared infrastructure in the range selects the complete suite', () => {
  assert.deepEqual(select(['packages/tokens/src/color.json', 'nx.json'], ['@kimen/tokens']), {
    scope: 'full',
  });
});

test('a deleted code file outside every project is not linted', () => {
  assert.deepEqual(
    lintPaths({
      files: ['scripts/tests/removed.test.mjs'],
      roots: ROOTS,
      projects: [],
      exists: () => false,
    }),
    [],
  );
});

test('an unknown project from Nx stops the selection', () => {
  assert.throws(() => select(['README.md'], ['@kimen/unknown']), /unknown project/u);
});

test('a value that cannot travel as a list item selects the complete suite', () => {
  const roots = new Map([['odd', 'packages/odd,dir']]);
  assert.deepEqual(
    selectAffected({ files: ['packages/odd,dir/a.ts'], roots, affected: ['odd'], exists }),
    { scope: 'full' },
  );
});

test('the environment names the scope and both lists', () => {
  assert.equal(formatEnvironment({ scope: 'full' }), 'KIMEN_GATE_SCOPE=full\n');
  assert.equal(
    formatEnvironment({ scope: 'affected', projects: [], lintPaths: [] }),
    'KIMEN_GATE_SCOPE=affected\nKIMEN_AFFECTED_PROJECTS=\nKIMEN_AFFECTED_LINT_PATHS=\n',
  );
  assert.equal(
    formatEnvironment({
      scope: 'affected',
      projects: ['@kimen/catalog', '@kimen/elements'],
      lintPaths: ['packages/catalog', 'packages/elements'],
    }),
    'KIMEN_GATE_SCOPE=affected\nKIMEN_AFFECTED_PROJECTS=@kimen/catalog,@kimen/elements\nKIMEN_AFFECTED_LINT_PATHS=packages/catalog,packages/elements\n',
  );
});

test('the graph document gives every project its root', () => {
  const roots = projectRoots({
    graph: {
      nodes: {
        '@kimen/elements': { name: '@kimen/elements', data: { root: 'packages/elements' } },
      },
    },
  });
  assert.deepEqual([...roots], [['@kimen/elements', 'packages/elements']]);
  assert.throws(() => projectRoots({}), /no projects/u);
});

const BASE = 'b'.repeat(40);
const HEAD = 'c'.repeat(40);

function fakeTools({ files, affected = '[]', failNx = false }) {
  const calls = [];
  const execute = (command, args) => {
    calls.push([command, ...args].join(' '));
    if (command === 'git') return `${files.join('\n')}\n`;
    if (failNx) throw new Error('nx exploded');
    if (args[2] === 'graph') {
      const file = args[3].slice('--file='.length);
      const nodes = Object.fromEntries(
        [...ROOTS].map(([name, root]) => [name, { name, data: { root } }]),
      );
      writeFileSync(file, JSON.stringify({ graph: { nodes, dependencies: {} } }));
      return '';
    }
    return affected;
  };
  return { calls, execute };
}

async function cli(tools) {
  let stdout = '';
  let stderr = '';
  const selection = await runCli({
    arguments_: ['--base', BASE, '--head', HEAD],
    stdout: { write: (text) => (stdout += text) },
    stderr: { write: (text) => (stderr += text) },
    execute: tools.execute,
    exists,
  });
  return { selection, stdout, stderr };
}

test('Nx is asked with the change range explicit, never a default base', async () => {
  const tools = fakeTools({
    files: ['packages/tokens/src/color.json'],
    affected: '["@kimen/tokens","@kimen/elements"]',
  });
  const { stdout } = await cli(tools);
  assert.ok(
    tools.calls.includes(
      `pnpm exec nx show projects --affected --base=${BASE} --head=${HEAD} --json`,
    ),
    tools.calls.join('\n'),
  );
  assert.equal(
    stdout,
    'KIMEN_GATE_SCOPE=affected\nKIMEN_AFFECTED_PROJECTS=@kimen/elements,@kimen/tokens\nKIMEN_AFFECTED_LINT_PATHS=packages/elements,packages/tokens\n',
  );
});

test('shared infrastructure never consults Nx', async () => {
  const tools = fakeTools({ files: ['scripts/gates/gates-core.sh', 'README.md'] });
  const { stdout } = await cli(tools);
  assert.equal(stdout, 'KIMEN_GATE_SCOPE=full\n');
  assert.deepEqual(
    tools.calls.filter((call) => call.startsWith('pnpm')),
    [],
  );
});

test('a failing selection widens to the complete suite with a warning', async () => {
  const { stdout, stderr } = await cli(fakeTools({ files: ['README.md'], failNx: true }));
  assert.equal(stdout, 'KIMEN_GATE_SCOPE=full\n');
  assert.match(stderr, /::warning::.*complete suite.*nx exploded/u);
});

test('arguments are two full commit SHAs', () => {
  assert.deepEqual(parseArguments(['--base', BASE, '--head', HEAD]), { base: BASE, head: HEAD });
  assert.throws(() => parseArguments(['--base', 'origin/main', '--head', HEAD]), /40-character/u);
  assert.throws(() => parseArguments([]), /usage/u);
});

// Nx reaches the elements browser suite from a token change only because the
// graph says elements depends on tokens; this keeps that edge declared.
test('a token change reaches @kimen/elements through a declared dependency', async () => {
  const elements = JSON.parse(await read('packages/elements/package.json'));
  assert.ok(elements.nx.implicitDependencies.includes('@kimen/tokens'));
  assert.equal(elements.devDependencies['@kimen/tokens'], 'workspace:*');
});

// The affected scope runs the elements browser suite only when Nx reports
// @kimen/elements affected, so every file the suite reads from outside the
// package has to be an input Nx knows. The static site's page test and one
// catalog fixture are; the gates and their libraries are shared
// infrastructure, which always runs everything, and @kimen/tokens is a
// declared dependency.
test('every file the elements browser suite reads outside its package is a declared input', async () => {
  const repository = fileURLToPath(new URL('../../', import.meta.url));
  const elements = JSON.parse(await read('packages/elements/package.json'));
  const inputs = elements.nx.targets['test-browser'].inputs
    .filter((input) => input.startsWith('{workspaceRoot}/'))
    .map((input) => input.slice('{workspaceRoot}/'.length));
  const root = join(repository, 'packages/elements');
  const specs = (await readdir(root, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile() && /\.browser\.spec\.tsx?$/u.test(entry.name))
    .map((entry) => relative(root, join(entry.parentPath, entry.name)))
    .filter((path) => !path.split(sep).includes('node_modules'));
  assert.ok(specs.length > 100, 'the elements browser suite was not found');

  const outside = new Set();
  for (const spec of specs) {
    const source = await read(`packages/elements/${spec}`);
    for (const [, specifier] of source.matchAll(/['"]((?:\.\.\/)+[^'"?]+)/gu)) {
      const file = relative(
        repository,
        join(repository, 'packages/elements', dirname(spec), specifier),
      );
      if (!file.startsWith('packages/elements/')) outside.add(file);
    }
  }
  const undeclared = [...outside].filter(
    (file) =>
      !/^(?:scripts\/(?:gates|lib)\/|packages\/tokens\/)/u.test(file) &&
      !inputs.some((pattern) => matchesGlob(file, pattern)),
  );
  assert.ok(outside.has('site/index.html'), 'the static site page test was not found');
  assert.deepEqual(undeclared, []);
});
