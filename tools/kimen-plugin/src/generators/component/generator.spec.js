// @spec:018-project-integrity-hardening#S12
// @spec:068-component-discovery
const assert = require('node:assert/strict');
const test = require('node:test');

const { createTreeWithEmptyWorkspace } = require('@nx/devkit/testing');

const componentGenerator = require('./generator.js');

const tag = 'ki-avatar';
const feature = '018-project-integrity-hardening';
const componentRoot = `packages/elements/src/components/${tag}`;
const browserSpec = `${componentRoot}/${tag}.browser.spec.ts`;
const tokenSource = 'packages/tokens/tokens/component/avatar.tokens.json';
const legacyRoot = [
  "export { KiButton } from './components/ki-button/ki-button.js';",
  "export type * from './components/ki-button/ki-button.js';",
  '',
].join('\n');
const packageManifest = `${JSON.stringify(
  {
    name: '@kimen/elements',
    exports: {
      '.': {
        types: './dist/types/index.d.ts',
        import: './dist/index.js',
      },
      './ki-*': {
        types: './dist/components/ki-*.d.ts',
        import: './dist/components/ki-*.js',
      },
    },
  },
  null,
  2,
)}\n`;

function createGeneratorTree() {
  const tree = createTreeWithEmptyWorkspace();
  tree.write('packages/elements/src/index.ts', legacyRoot);
  tree.write('packages/elements/package.json', packageManifest);
  return tree;
}

async function scaffoldAvatar(tree) {
  await componentGenerator(tree, { name: tag, spec: feature });
}

test('S12 scaffolds source and a real-browser contract with traceability, and no simulated-DOM spec', async () => {
  const tree = createGeneratorTree();

  await scaffoldAvatar(tree);

  assert.equal(tree.exists(`${componentRoot}/${tag}.tsx`), true);
  assert.equal(tree.exists(`${componentRoot}/${tag}.css`), true);
  assert.equal(tree.exists(`${componentRoot}/${tag}.spec.tsx`), false);
  assert.equal(tree.exists(browserSpec), true);
  assert.match(tree.read(`${componentRoot}/${tag}.tsx`, 'utf8'), /export class KiAvatar/u);
  assert.match(tree.read(browserSpec, 'utf8'), /@spec:018-project-integrity-hardening/u);
  assert.match(tree.read(browserSpec, 'utf8'), /dist\/components\/ki-avatar\.js/u);
});

test('S12 scaffolds a described component-token source consumed by ki-avatar CSS', async () => {
  const tree = createGeneratorTree();

  await scaffoldAvatar(tree);

  assert.equal(tree.exists(tokenSource), true, 'component token source must be generated');
  const tokens = JSON.parse(tree.read(tokenSource, 'utf8'));
  assert.equal(typeof tokens.ki?.avatar, 'object');
  const avatarTokens = JSON.stringify(tokens.ki.avatar);
  assert.match(avatarTokens, /"\$value":"\{ki\.[^"]+\}"/u);
  assert.match(avatarTokens, /"\$description":"[^"]+"/u);
  assert.match(tree.read(`${componentRoot}/${tag}.css`, 'utf8'), /var\(--ki-avatar-/u);
});

test('S5 scaffolds the complete component folder and both token themes without editing shared files', async () => {
  const tree = createTreeWithEmptyWorkspace();
  for (const path of [
    'packages/elements/src/index.ts',
    'packages/elements/browser-tests/all-components.ts',
    'packages/elements/package.json',
    'site/docs/src/components/Demo.astro',
  ]) {
    tree.write(path, 'existing');
  }
  const existing = new Map(tree.listChanges().map(({ path }) => [path, tree.read(path, 'utf8')]));

  await componentGenerator(tree, { name: tag });

  const created = tree
    .listChanges()
    .map(({ path }) => path)
    .filter((path) => !existing.has(path));
  assert.deepEqual(
    created.sort(),
    [
      ...[
        `${tag}.browser.spec.ts`,
        `${tag}.css`,
        `${tag}.spec.ts`,
        `${tag}.stories.tsx`,
        `${tag}.tsx`,
        `${tag}.visual.browser.spec.ts`,
        `${tag}.visual.dark.browser.spec.ts`,
        'component.json',
        'docs/site.mdx',
        'docs/storybook.mdx',
        'gallery.ts',
        'usage/examples.md',
      ].map((path) => `${componentRoot}/${path}`),
      'packages/tokens/tokens/component/avatar.material3.tokens.json',
      tokenSource,
    ].sort(),
  );
  for (const [path, content] of existing) {
    assert.equal(tree.read(path, 'utf8'), content);
  }
  assert.deepEqual(JSON.parse(tree.read(`${componentRoot}/component.json`, 'utf8')), {
    barePage: { keyboardPressed: false },
    pointer: { hoverWitness: false },
  });
  const markup = `<${tag} label="Example"></${tag}>`;
  for (const path of ['gallery.ts', 'docs/site.mdx', 'docs/storybook.mdx', 'usage/examples.md']) {
    assert.ok(
      tree.read(`${componentRoot}/${path}`, 'utf8').includes(markup),
      `${path} has live markup`,
    );
  }
});

test('S12 scaffolds a host stylesheet that hands the hidden attribute back', async () => {
  const tree = createGeneratorTree();

  await scaffoldAvatar(tree);

  // A scaffold that sets `display` on :host overrides the browser's own
  // `[hidden]` rule unless it restores it, so every new component would ship
  // rendering while hidden.
  assert.match(
    tree.read(`${componentRoot}/${tag}.css`, 'utf8'),
    /:host\(\[hidden\]\)\s*\{\s*display:\s*none;\s*\}/u,
  );
});

test('S12 relies on derived subpaths and leaves the frozen legacy root untouched', async () => {
  const tree = createGeneratorTree();

  await scaffoldAvatar(tree);

  assert.equal(tree.read('packages/elements/src/index.ts', 'utf8'), legacyRoot);
  assert.equal(tree.read('packages/elements/package.json', 'utf8'), packageManifest);
  assert.doesNotMatch(tree.read('packages/elements/src/index.ts', 'utf8'), /KiAvatar/u);
});

test('S12 rejects a duplicate component name before mutating existing output', async () => {
  const tree = createGeneratorTree();
  await scaffoldAvatar(tree);
  const sourceBeforeDuplicate = tree.read(`${componentRoot}/${tag}.tsx`, 'utf8');
  const rootBeforeDuplicate = tree.read('packages/elements/src/index.ts', 'utf8');

  await assert.rejects(
    componentGenerator(tree, { name: tag, spec: feature }),
    /already exists|never overwritten/iu,
  );

  assert.equal(tree.read(`${componentRoot}/${tag}.tsx`, 'utf8'), sourceBeforeDuplicate);
  assert.equal(tree.read('packages/elements/src/index.ts', 'utf8'), rootBeforeDuplicate);
});
