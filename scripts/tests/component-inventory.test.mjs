import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  characterizeLegacyRootExports,
  discoverComponents,
  FROZEN_LEGACY_ROOT,
  resolveComponentSubpaths,
  validateLegacyRootContract,
} from '../lib/component-inventory.mjs';

const workspaceRoot = fileURLToPath(new URL('../../', import.meta.url));

const classNameForTag = (tag) =>
  tag
    .split('-')
    .map((segment) => `${segment[0].toUpperCase()}${segment.slice(1)}`)
    .join('');

const componentSource = ({ tag, className = classNameForTag(tag), decorated = true }) =>
  `${decorated ? `@Component({ tag: '${tag}', shadow: true })\n` : ''}export class ${className} {}`;

const createFixture = async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'kimen-component-inventory-'));
  t.after(() => rm(root, { recursive: true, force: true }));
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
  },
) => {
  const componentDirectory = join(root, 'packages/elements/src/components', directory);
  await mkdir(componentDirectory, { recursive: true });

  if (source) {
    await writeFile(
      join(componentDirectory, `${directory}.tsx`),
      componentSource({ tag, className, decorated }),
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

test('discovers source-derived component entries in tag order', async (t) => {
  const root = await createFixture(t);
  await writeComponent(root, { directory: 'ki-zeta' });
  await writeComponent(root, { directory: 'ki-alpha' });

  assert.deepEqual(await discoverComponents({ workspaceRoot: root }), fixtureComponents);
});

test('component discovery fails closed on directory, module, tag, class, decorator, or test drift', async (t) => {
  const invalidCases = [
    {
      name: 'directory',
      options: { directory: 'button' },
      expected: /invalid component directory/i,
    },
    {
      name: 'module',
      options: { directory: 'ki-alpha', source: false },
      expected: /source module/i,
    },
    {
      name: 'tag',
      options: { directory: 'ki-alpha', tag: 'ki-beta' },
      expected: /decorator tag/i,
    },
    {
      name: 'class',
      options: { directory: 'ki-alpha', className: 'WrongName' },
      expected: /class name/i,
    },
    {
      name: 'decorator',
      options: { directory: 'ki-alpha', decorated: false },
      expected: /@Component/i,
    },
    {
      name: 'unit spec',
      options: { directory: 'ki-alpha', unitSpec: false },
      expected: /unit spec/i,
    },
    {
      name: 'browser spec',
      options: { directory: 'ki-alpha', browserSpec: false },
      expected: /browser spec/i,
    },
  ];

  for (const invalidCase of invalidCases) {
    await t.test(invalidCase.name, async (subtest) => {
      const root = await createFixture(subtest);
      await writeComponent(root, invalidCase.options);
      await assert.rejects(discoverComponents({ workspaceRoot: root }), invalidCase.expected);
    });
  }
});

test('resolves current explicit component exports and the safe ki-* wildcard', () => {
  const explicit = {
    '.': { types: './dist/types/index.d.ts', import: './dist/index.js' },
    './loader': { types: './loader/index.d.ts', import: './loader/index.js' },
    './ki-alpha': {
      types: './dist/components/ki-alpha.d.ts',
      import: './dist/components/ki-alpha.js',
    },
    './ki-zeta': {
      types: './dist/components/ki-zeta.d.ts',
      import: './dist/components/ki-zeta.js',
    },
  };
  const expected = [
    {
      publicSubpath: './ki-alpha',
      types: './dist/components/ki-alpha.d.ts',
      import: './dist/components/ki-alpha.js',
    },
    {
      publicSubpath: './ki-zeta',
      types: './dist/components/ki-zeta.d.ts',
      import: './dist/components/ki-zeta.js',
    },
  ];

  assert.deepEqual(resolveComponentSubpaths(explicit, fixtureComponents), expected);
  assert.deepEqual(
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
    expected,
  );
});

test('component subpath resolution rejects missing, orphaned, overlapping, and unsafe exports', () => {
  const alpha = fixtureComponents[0];
  const alphaExport = {
    types: './dist/components/ki-alpha.d.ts',
    import: './dist/components/ki-alpha.js',
  };

  assert.throws(
    () => resolveComponentSubpaths({ './ki-alpha': alphaExport }, fixtureComponents),
    /missing component export.*ki-zeta/i,
  );
  assert.throws(
    () =>
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
    /orphaned component export.*ki-orphan/i,
  );
  assert.throws(
    () =>
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
    /overlapping component exports/i,
  );
  assert.throws(
    () =>
      resolveComponentSubpaths(
        {
          './*': {
            types: './dist/components/*.d.ts',
            import: './dist/components/*.js',
          },
        },
        [alpha],
      ),
    /missing component export/i,
  );
  assert.throws(
    () =>
      resolveComponentSubpaths(
        {
          './ki-*': {
            types: './dist/*.d.ts',
            import: './dist/*.js',
          },
        },
        [alpha],
      ),
    /unsafe component wildcard/i,
  );
});

test('legacy-root characterization uses syntax, ignores comments, and sorts exports', () => {
  const sourceText = `
    // export * from './commented-runtime.js';
    /* export { Fake } from './commented.js'; */
    export type * from './zeta.js';
    export { KiZeta } from './zeta.js';
    export type { ZetaOptions } from './zeta.options.js';
    export { KiAlpha } from './alpha.js';
    export type * from './alpha.js';
  `;

  assert.deepEqual(characterizeLegacyRootExports(sourceText), {
    values: [
      { name: 'KiAlpha', from: './alpha.js' },
      { name: 'KiZeta', from: './zeta.js' },
    ],
    namedTypes: [{ name: 'ZetaOptions', from: './zeta.options.js' }],
    typeStars: ['./alpha.js', './zeta.js'],
  });
});

test('legacy-root characterization rejects runtime stars and ambiguous export forms', () => {
  for (const sourceText of [
    `export * from './runtime.js';`,
    `export * as Runtime from './runtime.js';`,
    `export { KiAlias as KiButton } from './button.js';`,
    `export { KiButton };`,
    `export default class KiButton {}`,
    `export { type KiButton } from './button.js';`,
  ]) {
    assert.throws(() => characterizeLegacyRootExports(sourceText), /legacy root/i);
  }
});

const frozenLegacyRoot = {
  values: [
    { name: 'KiAlert', from: './components/ki-alert/ki-alert.js' },
    { name: 'KiBadge', from: './components/ki-badge/ki-badge.js' },
    { name: 'KiButton', from: './components/ki-button/ki-button.js' },
    { name: 'KiCard', from: './components/ki-card/ki-card.js' },
    { name: 'KiCheckbox', from: './components/ki-checkbox/ki-checkbox.js' },
    { name: 'KiDialog', from: './components/ki-dialog/ki-dialog.js' },
    { name: 'KiInput', from: './components/ki-input/ki-input.js' },
    { name: 'KiList', from: './components/ki-list/ki-list.js' },
    { name: 'KiListItem', from: './components/ki-list-item/ki-list-item.js' },
    { name: 'KiOption', from: './components/ki-option/ki-option.js' },
    { name: 'KiProgress', from: './components/ki-progress/ki-progress.js' },
    { name: 'KiRadio', from: './components/ki-radio/ki-radio.js' },
    { name: 'KiRadioGroup', from: './components/ki-radio-group/ki-radio-group.js' },
    { name: 'KiSelect', from: './components/ki-select/ki-select.js' },
    { name: 'KiSwitch', from: './components/ki-switch/ki-switch.js' },
    { name: 'KiTab', from: './components/ki-tab/ki-tab.js' },
    { name: 'KiTabPanel', from: './components/ki-tab-panel/ki-tab-panel.js' },
    { name: 'KiTabs', from: './components/ki-tabs/ki-tabs.js' },
    { name: 'KiTextarea', from: './components/ki-textarea/ki-textarea.js' },
    { name: 'KiTooltip', from: './components/ki-tooltip/ki-tooltip.js' },
  ],
  namedTypes: [
    { name: 'KiAlertTone', from: './components/ki-alert/ki-alert.tone.js' },
    { name: 'KiProgressShape', from: './components/ki-progress/ki-progress.js' },
    {
      name: 'KiTooltipPlacement',
      from: './components/ki-tooltip/ki-tooltip.position.js',
    },
  ],
  typeStars: [
    './components/ki-badge/ki-badge.js',
    './components/ki-button/ki-button.js',
    './components/ki-card/ki-card.js',
    './components/ki-checkbox/ki-checkbox.js',
    './components/ki-dialog/ki-dialog.js',
    './components/ki-input/ki-input.js',
    './components/ki-list-item/ki-list-item.js',
    './components/ki-list/ki-list.js',
    './components/ki-option/ki-option.js',
    './components/ki-radio-group/ki-radio-group.js',
    './components/ki-radio/ki-radio.js',
    './components/ki-select/ki-select.js',
    './components/ki-switch/ki-switch.js',
    './components/ki-tab-panel/ki-tab-panel.js',
    './components/ki-tab/ki-tab.js',
    './components/ki-tabs/ki-tabs.js',
    './components/ki-textarea/ki-textarea.js',
  ],
};

const frozenDeprecatedRoot = {
  values: FROZEN_LEGACY_ROOT.values.map(({ name, from }) => ({ name, from })),
  namedTypes: FROZEN_LEGACY_ROOT.namedTypes.map(({ name, from }) => ({ name, from })),
  typeStars: [],
};

test('real legacy root remains frozen at 20 values and 12 explicitly deprecated types', async () => {
  const rootSource = await readFile(join(workspaceRoot, 'packages/elements/src/index.ts'), 'utf8');
  const characterization = characterizeLegacyRootExports(rootSource);

  assert.equal(characterization.values.length, 20);
  assert.equal(characterization.typeStars.length, 0);
  assert.equal(characterization.namedTypes.length, 12);
  assert.deepEqual(characterization, frozenDeprecatedRoot);
  assert.deepEqual(validateLegacyRootContract(rootSource), FROZEN_LEGACY_ROOT);

  const grown = characterizeLegacyRootExports(
    `${rootSource}\nexport { KiAvatar } from './components/ki-avatar/ki-avatar.js';\n`,
  );
  assert.notDeepEqual(grown, frozenDeprecatedRoot);
  assert.equal(grown.values.length, 21);
});

test('real component inventory and package exports have the same 25 direct subpaths', async () => {
  const components = await discoverComponents({ workspaceRoot });
  const packageJson = JSON.parse(
    await readFile(join(workspaceRoot, 'packages/elements/package.json'), 'utf8'),
  );
  const directSubpaths = resolveComponentSubpaths(packageJson.exports, components);

  assert.equal(components.length, 25);
  // Components born after the 018 root freeze ship ONLY via their direct
  // subpath: the frozen legacy root stays at 20 and is a strict subset of
  // the inventory (Fase N wave 1 adds ki-divider, ki-icon-button and
  // ki-status, specs 020-ki-divider, 022-ki-icon-button and 021-ki-status,
  // plus the ki-avatar + ki-avatar-group companion pair, spec 019-ki-avatar).
  const legacyTags = frozenLegacyRoot.values.map(({ from }) => from.split('/').at(-2)).sort();
  const inventoryTags = components.map(({ tag }) => tag);
  assert.deepEqual(
    inventoryTags.filter((tag) => legacyTags.includes(tag)),
    legacyTags,
  );
  assert.deepEqual(
    inventoryTags.filter((tag) => !legacyTags.includes(tag)),
    ['ki-avatar', 'ki-avatar-group', 'ki-divider', 'ki-icon-button', 'ki-status'],
  );
  assert.deepEqual(
    directSubpaths.map(({ publicSubpath }) => publicSubpath),
    components.map(({ publicSubpath }) => publicSubpath),
  );
});
