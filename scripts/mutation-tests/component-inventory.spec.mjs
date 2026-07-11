import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, onTestFinished } from 'vitest';

import {
  characterizeLegacyRootExports,
  discoverComponentInventory,
  discoverComponents,
  FROZEN_LEGACY_ROOT,
  readBudgetGroups,
  resolveComponentSubpaths,
  validateLegacyRootContract,
  validatePackageExportContract,
} from '../lib/component-inventory.mjs';

// @spec:018-project-integrity-hardening

const workspaceRoot = fileURLToPath(new URL('../../', import.meta.url));

const classNameForTag = (tag) =>
  tag
    .split('-')
    .map((segment) => `${segment[0].toUpperCase()}${segment.slice(1)}`)
    .join('');

const componentSource = ({ tag, className = classNameForTag(tag), decorated = true }) =>
  `${decorated ? `@Component({ tag: '${tag}', shadow: true })\n` : ''}export class ${className} {}`;

const createFixture = async () => {
  const root = await mkdtemp(join(tmpdir(), 'kimen-component-mutation-'));
  onTestFinished(() => rm(root, { recursive: true, force: true }));
  return root;
};

const writeComponent = async (
  root,
  {
    directory,
    tag = directory,
    className = classNameForTag(tag),
    decorated = true,
    source = true,
    unitSpec = true,
    browserSpec = true,
    sourceText,
  },
) => {
  const componentDirectory = join(root, 'packages/elements/src/components', directory);
  await mkdir(componentDirectory, { recursive: true });

  if (source) {
    await writeFile(
      join(componentDirectory, `${directory}.tsx`),
      sourceText ?? componentSource({ tag, className, decorated }),
      'utf8',
    );
  }
  if (unitSpec) {
    await writeFile(join(componentDirectory, `${directory}.spec.tsx`), '// unit\n', 'utf8');
  }
  if (browserSpec) {
    const browserFile = join(
      root,
      'packages/elements/browser-tests',
      `${directory}.browser.spec.ts`,
    );
    await mkdir(dirname(browserFile), { recursive: true });
    await writeFile(browserFile, '// browser\n', 'utf8');
  }
};

const fixtureComponents = [
  {
    tag: 'ki-alpha',
    className: 'KiAlpha',
    sourceModule: 'packages/elements/src/components/ki-alpha/ki-alpha.tsx',
    unitSpec: 'packages/elements/src/components/ki-alpha/ki-alpha.spec.tsx',
    browserSpec: 'packages/elements/browser-tests/ki-alpha.browser.spec.ts',
    distModule: './dist/components/ki-alpha.js',
    publicSubpath: './ki-alpha',
  },
  {
    tag: 'ki-zeta',
    className: 'KiZeta',
    sourceModule: 'packages/elements/src/components/ki-zeta/ki-zeta.tsx',
    unitSpec: 'packages/elements/src/components/ki-zeta/ki-zeta.spec.tsx',
    browserSpec: 'packages/elements/browser-tests/ki-zeta.browser.spec.ts',
    distModule: './dist/components/ki-zeta.js',
    publicSubpath: './ki-zeta',
  },
];

const alphaExport = {
  types: './dist/components/ki-alpha.d.ts',
  import: './dist/components/ki-alpha.js',
};

describe('component inventory mutation boundary', () => {
  it('@spec:018 S3 discovers source-derived component entries in tag order', async () => {
    const root = await createFixture();
    await writeComponent(root, { directory: 'ki-zeta' });
    await writeComponent(root, { directory: 'ki-alpha' });

    await expect(discoverComponents({ workspaceRoot: root })).resolves.toEqual(fixtureComponents);
  });

  it.each([
    ['directory', { directory: 'button' }, /invalid component directory/i],
    ['module', { directory: 'ki-alpha', source: false }, /source module/i],
    ['tag', { directory: 'ki-alpha', tag: 'ki-beta' }, /decorator tag/i],
    ['class', { directory: 'ki-alpha', className: 'WrongName' }, /class name/i],
    ['decorator', { directory: 'ki-alpha', decorated: false }, /@Component/i],
    ['unit spec', { directory: 'ki-alpha', unitSpec: false }, /unit spec/i],
    ['browser spec', { directory: 'ki-alpha', browserSpec: false }, /browser spec/i],
  ])('@spec:018 S3 fails closed on %s drift', async (_name, options, expected) => {
    const root = await createFixture();
    await writeComponent(root, options);

    await expect(discoverComponents({ workspaceRoot: root })).rejects.toThrow(expected);
  });

  it.each([
    ['', /non-empty workspaceRoot/i],
    [undefined, /non-empty workspaceRoot/i],
  ])('@spec:018 S3 rejects invalid workspace root %#', async (workspaceRootInput, expected) => {
    await expect(discoverComponents({ workspaceRoot: workspaceRootInput })).rejects.toThrow(
      expected,
    );
  });

  it('@spec:018 S3 rejects an empty or unreadable component directory', async () => {
    const root = await createFixture();
    await expect(discoverComponents({ workspaceRoot: root })).rejects.toThrow(
      /cannot read component directory/i,
    );
    await mkdir(join(root, 'packages/elements/src/components'), { recursive: true });
    await expect(discoverComponents({ workspaceRoot: root })).rejects.toThrow(
      /no component directories/i,
    );
  });

  it.each([
    ['bare decorator', '@Component\nexport class KiAlpha {}', /expected a call/i],
    [
      'two decorators',
      "@Component({ tag: 'ki-alpha' })\n@Component({ tag: 'ki-alpha' })\nexport class KiAlpha {}",
      /multiple @Component/i,
    ],
    [
      'two classes',
      "@Component({ tag: 'ki-alpha' })\nexport class KiAlpha {}\n@Component({ tag: 'ki-alpha' })\nexport class KiAlphaTwo {}",
      /exactly one @Component class/i,
    ],
    ['not exported', "@Component({ tag: 'ki-alpha' })\nclass KiAlpha {}", /must be exported/i],
    ['anonymous class', "@Component({ tag: 'ki-alpha' })\nexport default class {}", /class name/i],
    ['no args', '@Component()\nexport class KiAlpha {}', /one object argument/i],
    [
      'two tag properties',
      "@Component({ tag: 'ki-alpha', 'tag': 'ki-alpha' })\nexport class KiAlpha {}",
      /decorator tag/i,
    ],
    ['non-string tag', '@Component({ tag: true })\nexport class KiAlpha {}', /expected a string/i],
    ['invalid syntax', '@Component({\nexport class KiAlpha {}', /cannot parse/i],
  ])('@spec:018 S3 rejects %s source', async (_name, sourceText, expected) => {
    const root = await createFixture();
    await writeComponent(root, { directory: 'ki-alpha', sourceText });

    await expect(discoverComponents({ workspaceRoot: root })).rejects.toThrow(expected);
  });

  it('@spec:018 S3 resolves exact explicit exports and the single safe wildcard', () => {
    const explicit = {
      '.': { types: './dist/types/index.d.ts', import: './dist/index.js' },
      './loader': { types: './loader/index.d.ts', import: './loader/index.js' },
      './ki-alpha': alphaExport,
      './ki-zeta': {
        types: './dist/components/ki-zeta.d.ts',
        import: './dist/components/ki-zeta.js',
      },
    };
    const expected = [
      { publicSubpath: './ki-alpha', ...alphaExport },
      {
        publicSubpath: './ki-zeta',
        types: './dist/components/ki-zeta.d.ts',
        import: './dist/components/ki-zeta.js',
      },
    ];

    expect(resolveComponentSubpaths(explicit, fixtureComponents)).toEqual(expected);
    expect(
      resolveComponentSubpaths(
        {
          '.': explicit['.'],
          './loader': explicit['./loader'],
          './ki-*': {
            types: './dist/components/ki-*.d.ts',
            import: './dist/components/ki-*.js',
          },
        },
        fixtureComponents,
      ),
    ).toEqual(expected);
  });

  it('@spec:018 S3 rejects invalid, empty, inconsistent, or duplicate inventories', () => {
    expect(() => resolveComponentSubpaths({}, [])).toThrow(/at least one component/i);
    expect(() => resolveComponentSubpaths({}, [null])).toThrow(/invalid component inventory/i);
    expect(() =>
      resolveComponentSubpaths({}, [{ ...fixtureComponents[0], publicSubpath: './ki-wrong' }]),
    ).toThrow(/inconsistent component inventory/i);
    expect(() =>
      resolveComponentSubpaths({}, [fixtureComponents[0], fixtureComponents[0]]),
    ).toThrow(/duplicate component inventory/i);
    expect(() => resolveComponentSubpaths(null, fixtureComponents)).toThrow(
      /package exports must be an object/i,
    );
  });

  it('@spec:018 S3 rejects missing, orphaned, overlapping, and unsafe exports', () => {
    const alpha = fixtureComponents[0];

    expect(() =>
      resolveComponentSubpaths({ './ki-alpha': alphaExport }, fixtureComponents),
    ).toThrow(/missing component export.*ki-zeta/i);
    expect(() =>
      resolveComponentSubpaths(
        {
          './ki-alpha': alphaExport,
          './ki-zeta': {
            types: './dist/components/ki-zeta.d.ts',
            import: './dist/components/ki-zeta.js',
          },
          './ki-orphan': {
            types: './dist/components/ki-orphan.d.ts',
            import: './dist/components/ki-orphan.js',
          },
        },
        fixtureComponents,
      ),
    ).toThrow(/orphaned component export.*ki-orphan/i);
    expect(() =>
      resolveComponentSubpaths(
        {
          './ki-*': {
            types: './dist/components/ki-*.d.ts',
            import: './dist/components/ki-*.js',
          },
          './ki-alpha': alphaExport,
        },
        [alpha],
      ),
    ).toThrow(/overlapping component exports/i);
    expect(() =>
      resolveComponentSubpaths(
        { './*': { types: './dist/components/*.d.ts', import: './dist/components/*.js' } },
        [alpha],
      ),
    ).toThrow(/missing component export/i);
    expect(() =>
      resolveComponentSubpaths({ './ki-*': { types: './dist/*.d.ts', import: './dist/*.js' } }, [
        alpha,
      ]),
    ).toThrow(/unsafe component wildcard/i);
  });

  it.each([
    ['non-object', null],
    ['extra condition', { ...alphaExport, default: './dist/components/ki-alpha.js' }],
    ['wrong type target', { ...alphaExport, types: './dist/components/wrong.d.ts' }],
    ['wrong import target', { ...alphaExport, import: './dist/components/wrong.js' }],
  ])('@spec:018 S3 rejects %s direct export targets', (_name, target) => {
    expect(() =>
      resolveComponentSubpaths({ './ki-alpha': target }, [fixtureComponents[0]]),
    ).toThrow(/component export.*(?:conditional types\/import targets|direct component module)/i);
  });

  it('@spec:018 S3 characterizes only explicit legacy re-exports and sorts them', () => {
    const sourceText = `
      // export * from './commented-runtime.js';
      /* export { Fake } from './commented.js'; */
      export type * from './zeta.js';
      export { KiZeta } from './zeta.js';
      export type { ZetaOptions } from './zeta.options.js';
      export { KiAlpha } from './alpha.js';
      export type * from './alpha.js';
    `;

    expect(characterizeLegacyRootExports(sourceText)).toEqual({
      values: [
        { name: 'KiAlpha', from: './alpha.js' },
        { name: 'KiZeta', from: './zeta.js' },
      ],
      namedTypes: [{ name: 'ZetaOptions', from: './zeta.options.js' }],
      typeStars: ['./alpha.js', './zeta.js'],
    });
  });

  it.each([
    [`export * from './runtime.js';`, /runtime star/i],
    [`export * as Runtime from './runtime.js';`, /ambiguous namespace/i],
    [`export { KiAlias as KiButton } from './button.js';`, /aliased or mixed-type/i],
    [`export { KiButton };`, /local or non-literal/i],
    [`export default class KiButton {}`, /non-re-export/i],
    [`export { type KiButton } from './button.js';`, /aliased or mixed-type/i],
    [`export {} from './button.js';`, /ambiguous namespace or empty/i],
    [`export { KiButton } from source;`, /cannot parse|local or non-literal/i],
    [`export { KiButton } from './a.js';\nexport { KiButton } from './b.js';`, /more than once/i],
    [`export type * from './a.js';\nexport type * from './a.js';`, /repeats a type-star/i],
  ])('@spec:018 S3 rejects ambiguous legacy root form %#', (sourceText, expected) => {
    expect(() => characterizeLegacyRootExports(sourceText)).toThrow(expected);
  });

  it('@spec:018 S3 rejects non-text legacy source', () => {
    expect(() => characterizeLegacyRootExports(null)).toThrow(/source must be text/i);
  });

  it('@spec:018 S3 keeps the real root at its frozen cardinalities and direct roster', async () => {
    const rootSource = await readFile(
      join(workspaceRoot, 'packages/elements/src/index.ts'),
      'utf8',
    );
    const characterization = characterizeLegacyRootExports(rootSource);
    const components = await discoverComponents({ workspaceRoot });
    const packageJson = JSON.parse(
      await readFile(join(workspaceRoot, 'packages/elements/package.json'), 'utf8'),
    );

    expect(characterization.values).toHaveLength(20);
    expect(characterization.typeStars).toHaveLength(0);
    expect(characterization.namedTypes).toHaveLength(12);
    expect(validateLegacyRootContract(rootSource)).toEqual(FROZEN_LEGACY_ROOT);
    expect(components).toHaveLength(20);
    expect(
      resolveComponentSubpaths(packageJson.exports, components).map((entry) => entry.publicSubpath),
    ).toEqual(components.map((entry) => entry.publicSubpath));
  });

  it('@spec:018 S12 derives module exports, tokens, and default budget from source', async () => {
    const root = await createFixture();
    await writeComponent(root, {
      directory: 'ki-alpha',
      sourceText:
        "export type KiAlphaSize = 'md';\n@Component({ tag: 'ki-alpha' })\nexport class KiAlpha {}",
    });
    const tokenDirectory = join(root, 'packages/tokens/tokens/component');
    const groupsPath = join(root, 'packages/elements/size-limit/groups.json');
    await mkdir(tokenDirectory, { recursive: true });
    await mkdir(dirname(groupsPath), { recursive: true });
    await writeFile(
      join(tokenDirectory, 'alpha.tokens.json'),
      JSON.stringify({ ki: { alpha: { color: { $value: '{ki.text.base}' } } } }),
      'utf8',
    );
    await writeFile(groupsPath, JSON.stringify({ schemaVersion: 1, groups: [] }), 'utf8');

    const inventory = await discoverComponentInventory({ workspaceRoot: root });

    expect(inventory).toHaveLength(1);
    expect(inventory[0].moduleExports).toEqual({
      values: ['KiAlpha'],
      types: ['KiAlphaSize'],
    });
    expect(inventory[0].tokenSources).toEqual([
      'packages/tokens/tokens/component/alpha.tokens.json',
    ]);
    expect(inventory[0].budgetGroup).toBe('default');
  });

  it('@spec:018 S12 validates the only safe package export shape', () => {
    const valid = {
      '.': { types: './dist/types/index.d.ts', import: './dist/index.js' },
      './loader': { types: './loader/index.d.ts', import: './loader/index.js' },
      './ki-*': {
        types: './dist/components/ki-*.d.ts',
        import: './dist/components/ki-*.js',
      },
    };

    expect(validatePackageExportContract(valid)).toBe(true);
    expect(() =>
      validatePackageExportContract({ ...valid, './internal': './dist/internal.js' }),
    ).toThrow(/unexpected auxiliary/i);
    expect(() =>
      validatePackageExportContract({
        ...valid,
        './ki-*': { types: './dist/*.d.ts', import: './dist/*.js' },
      }),
    ).toThrow(/unsafe component wildcard/i);
  });

  it('@spec:018 S12 rejects duplicate composite membership', async () => {
    const root = await createFixture();
    const groupsPath = join(root, 'packages/elements/size-limit/groups.json');
    await mkdir(dirname(groupsPath), { recursive: true });
    await writeFile(
      groupsPath,
      JSON.stringify({
        schemaVersion: 1,
        groups: [
          { id: 'ki-first', members: ['ki-alpha', 'ki-beta'] },
          { id: 'ki-second', members: ['ki-alpha', 'ki-gamma'] },
        ],
      }),
      'utf8',
    );

    await expect(readBudgetGroups({ workspaceRoot: root })).rejects.toThrow(
      /more than one budget group.*ki-alpha/i,
    );
  });
});
