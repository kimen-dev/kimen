import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createSizeLimitConfig,
  renderCompositeEntry,
  runSizeLimit,
} from '../../packages/elements/scripts/run-size-limit.mjs';

// @spec:018-project-integrity-hardening

const originalPath = process.env.PATH;
const originalCapture = process.env.KIMEN_SIZE_CAPTURE;
const originalExit = process.env.KIMEN_SIZE_EXIT;

afterEach(() => {
  process.env.PATH = originalPath;
  if (originalCapture === undefined) delete process.env.KIMEN_SIZE_CAPTURE;
  else process.env.KIMEN_SIZE_CAPTURE = originalCapture;
  if (originalExit === undefined) delete process.env.KIMEN_SIZE_EXIT;
  else process.env.KIMEN_SIZE_EXIT = originalExit;
});

const components = [
  { tag: 'ki-zeta', budgetGroup: 'default' },
  { tag: 'ki-beta', budgetGroup: 'paired' },
  { tag: 'ki-alpha', budgetGroup: 'paired' },
  { tag: 'ki-gamma', budgetGroup: 'default' },
];
const groups = [{ id: 'paired', members: ['ki-beta', 'ki-alpha'] }];

async function createSizeWorkspace({ inventory = components, budgetGroups = groups } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'elements-build-size-'));
  const bin = join(root, 'bin');
  const gateDir = join(root, 'scripts/gates');
  const projectRoot = join(root, 'packages/elements');
  const capturePath = join(root, 'captured-size-limit.json');
  await Promise.all([
    mkdir(bin, { recursive: true }),
    mkdir(gateDir, { recursive: true }),
    mkdir(projectRoot, { recursive: true }),
  ]);
  await writeFile(
    join(gateDir, 'check-component-inventory.mjs'),
    `process.stdout.write(${JSON.stringify(JSON.stringify({ inventory, groups: budgetGroups }))});\n`,
  );
  const pnpmPath = join(bin, 'pnpm');
  await writeFile(
    pnpmPath,
    [
      '#!/usr/bin/env node',
      "const { copyFileSync } = require('node:fs');",
      "const configIndex = process.argv.indexOf('--config');",
      'copyFileSync(process.argv[configIndex + 1], process.env.KIMEN_SIZE_CAPTURE);',
      'process.exit(Number(process.env.KIMEN_SIZE_EXIT ?? 0));',
      '',
    ].join('\n'),
  );
  await chmod(pnpmPath, 0o755);
  process.env.PATH = `${bin}:${originalPath}`;
  process.env.KIMEN_SIZE_CAPTURE = capturePath;
  return { root, capturePath };
}

describe('element size-budget mutation boundary', () => {
  it('renders a composite entry that imports and invokes every member in order', () => {
    expect(renderCompositeEntry(groups[0], '/workspace/elements')).toBe(
      [
        "import { defineCustomElement as define0 } from '/workspace/elements/dist/components/ki-beta.js';",
        "import { defineCustomElement as define1 } from '/workspace/elements/dist/components/ki-alpha.js';",
        '',
        'export function defineComposite(): void {',
        '  define0();',
        '  define1();',
        '}',
        '',
      ].join('\n'),
    );
  });

  it.each([
    undefined,
    null,
    {},
    { id: 'solo', members: [] },
    { id: 'solo', members: ['ki-a'] },
  ])('rejects an invalid composite group %#', (group) => {
    expect(() => renderCompositeEntry(group, '/workspace/elements')).toThrow(
      'Composite entry requires at least two component members',
    );
  });

  it('derives sorted standalone and composite checks with exact limits and paths', () => {
    const config = createSizeLimitConfig({
      components,
      groups,
      projectRoot: '/workspace/elements',
      compositeEntries: { paired: '/tmp/paired.ts' },
    });

    expect(config).toEqual([
      {
        name: 'paired marginal cost (runtime excluded)',
        path: '/tmp/paired.ts',
        ignore: ['@stencil/core'],
        limit: '9 KB',
      },
      {
        name: 'paired worst case (full Stencil runtime)',
        path: '/tmp/paired.ts',
        limit: '25 KB',
      },
      {
        name: 'ki-gamma marginal cost (runtime excluded)',
        path: '/workspace/elements/dist/components/ki-gamma.js',
        ignore: ['@stencil/core'],
        limit: '9 KB',
      },
      {
        name: 'ki-gamma worst case (full Stencil runtime)',
        path: '/workspace/elements/dist/components/ki-gamma.js',
        limit: '25 KB',
      },
      {
        name: 'ki-zeta marginal cost (runtime excluded)',
        path: '/workspace/elements/dist/components/ki-zeta.js',
        ignore: ['@stencil/core'],
        limit: '9 KB',
      },
      {
        name: 'ki-zeta worst case (full Stencil runtime)',
        path: '/workspace/elements/dist/components/ki-zeta.js',
        limit: '25 KB',
      },
    ]);
  });

  it('uses member paths when no generated composite entry is supplied', () => {
    const config = createSizeLimitConfig({ components, groups });

    expect(config[0].path).toEqual(['dist/components/ki-beta.js', 'dist/components/ki-alpha.js']);
  });

  it.each([
    [
      'ki-gamma',
      ['ki-gamma marginal cost (runtime excluded)', 'ki-gamma worst case (full Stencil runtime)'],
    ],
    [
      'ki-alpha',
      ['paired marginal cost (runtime excluded)', 'paired worst case (full Stencil runtime)'],
    ],
  ])('selects exactly the requested standalone or composite budget for %s', (onlyTag, names) => {
    expect(createSizeLimitConfig({ components, groups, onlyTag }).map(({ name }) => name)).toEqual(
      names,
    );
  });

  it.each([
    [{ components: undefined, groups }, 'requires arrays'],
    [{ components: [], groups }, 'requires a non-empty inventory'],
    [{ components, groups: undefined }, 'requires groups'],
  ])('rejects missing size-budget inputs: %s', (input) => {
    expect(() => createSizeLimitConfig(input)).toThrow(
      'Size budget derivation requires component inventory and groups',
    );
  });

  it('rejects duplicate components and duplicate groups', () => {
    expect(() =>
      createSizeLimitConfig({ components: [...components, components[0]], groups }),
    ).toThrow('Size budget inventory contains duplicate components');
    expect(() => createSizeLimitConfig({ components, groups: [...groups, groups[0]] })).toThrow(
      'Size budget configuration contains duplicate groups',
    );
  });

  it.each([
    [[{ id: 'broken', members: ['ki-alpha'] }], /must contain at least two members/u],
    [[{ id: 'broken' }], /must contain at least two members/u],
    [[{ id: 'paired', members: ['ki-alpha', 'ki-missing'] }], /unknown component ki-missing/u],
    [[{ id: 'other', members: ['ki-alpha', 'ki-beta'] }], /membership drifted for ki-alpha/u],
    [[{ id: 'paired', members: ['ki-alpha', 'ki-beta', 'ki-gamma'] }], /membership drifted/u],
  ])('rejects malformed composite membership %#', (invalidGroups, message) => {
    expect(() => createSizeLimitConfig({ components, groups: invalidGroups })).toThrow(message);
  });

  it('rejects a group that declares only part of its inventory membership', () => {
    const partialComponents = [...components, { tag: 'ki-delta', budgetGroup: 'paired' }];

    expect(() => createSizeLimitConfig({ components: partialComponents, groups })).toThrow(
      'Composite budget group membership is partial for paired',
    );
  });

  it('rejects orphaned budget groups and unknown requested components', () => {
    expect(() =>
      createSizeLimitConfig({
        components: [{ tag: 'ki-orphan', budgetGroup: 'missing' }],
        groups: [],
      }),
    ).toThrow('Unknown budget group missing for ki-orphan');
    expect(() => createSizeLimitConfig({ components, groups, onlyTag: 'ki-missing' })).toThrow(
      'Unknown component requested for size budget: ki-missing',
    );
  });

  it('runs the derived size-limit command and removes its temporary composite entry', async () => {
    const { root, capturePath } = await createSizeWorkspace();
    try {
      const config = await runSizeLimit({ workspaceRoot: root, onlyTag: 'ki-alpha' });
      const captured = JSON.parse(await readFile(capturePath, 'utf8'));

      expect(config).toHaveLength(2);
      expect(captured).toEqual(config);
      expect(config[0].path).toMatch(/paired-composite\.ts$/u);
      await expect(readFile(config[0].path, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('fails closed when the inventory gate exits non-zero', async () => {
    const root = await mkdtemp(join(tmpdir(), 'elements-build-size-gate-'));
    try {
      const gateDir = resolve(root, 'scripts/gates');
      await mkdir(resolve(root, 'packages/elements'), { recursive: true });
      await mkdir(gateDir, { recursive: true });
      await writeFile(
        resolve(gateDir, 'check-component-inventory.mjs'),
        "process.stderr.write('inventory denied'); process.exit(7);\n",
      );

      await expect(runSizeLimit({ workspaceRoot: root })).rejects.toThrow(
        'Component inventory gate failed: inventory denied',
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('fails closed when size-limit exits non-zero and still removes temporary files', async () => {
    const { root } = await createSizeWorkspace();
    process.env.KIMEN_SIZE_EXIT = '9';
    try {
      await expect(runSizeLimit({ workspaceRoot: root })).rejects.toThrow('size-limit exited 9');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
