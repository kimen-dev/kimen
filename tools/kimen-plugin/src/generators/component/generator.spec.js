// @spec:018-project-integrity-hardening#S12
const assert = require('node:assert/strict');
const test = require('node:test');

const { createTreeWithEmptyWorkspace } = require('@nx/devkit/testing');

const componentGenerator = require('./generator.js');

const tag = 'ki-avatar';
const feature = '018-project-integrity-hardening';
const componentRoot = `packages/elements/src/components/${tag}`;
const browserSpec = `packages/elements/browser-tests/${tag}.browser.spec.ts`;
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

test('S12 scaffolds source, unit, and real-browser contracts with traceability', async () => {
  const tree = createGeneratorTree();

  await scaffoldAvatar(tree);

  assert.equal(tree.exists(`${componentRoot}/${tag}.tsx`), true);
  assert.equal(tree.exists(`${componentRoot}/${tag}.css`), true);
  assert.equal(tree.exists(`${componentRoot}/${tag}.spec.tsx`), true);
  assert.equal(tree.exists(browserSpec), true);
  assert.match(tree.read(`${componentRoot}/${tag}.tsx`, 'utf8'), /export class KiAvatar/u);
  assert.match(
    tree.read(`${componentRoot}/${tag}.spec.tsx`, 'utf8'),
    /@spec:018-project-integrity-hardening/u,
  );
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
