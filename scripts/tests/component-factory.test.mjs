import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  discoverComponentInventory,
  FROZEN_LEGACY_ROOT,
  validateLegacyRootContract,
  validatePackageExportContract,
} from '../lib/component-inventory.mjs';

const workspaceRoot = fileURLToPath(new URL('../../', import.meta.url));

async function createWorkspace(t) {
  const root = await mkdtemp(join(tmpdir(), 'kimen-component-factory-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

const fixtureMetadata = {
  barePage: { keyboardPressed: false },
  pointer: { hoverWitness: false },
};

async function writeFixtureComponent(
  root,
  tag,
  { material3 = false, budgetGroup, tokenNamespace } = {},
) {
  const className = tag
    .split('-')
    .map((segment) => `${segment[0].toUpperCase()}${segment.slice(1)}`)
    .join('');
  const source = join(root, 'packages/elements/src/components', tag, `${tag}.tsx`);
  const browser = join(root, 'packages/elements/browser-tests', `${tag}.browser.spec.ts`);
  const slug = tag.slice(3);
  const token = join(root, 'packages/tokens/tokens/component', `${slug}.tokens.json`);
  await mkdir(dirname(source), { recursive: true });
  await mkdir(dirname(browser), { recursive: true });
  await mkdir(dirname(token), { recursive: true });
  await writeFile(
    source,
    `export type ${className}Size = 'md';\n@Component({ tag: '${tag}', shadow: true })\nexport class ${className} {}`,
    'utf8',
  );
  await writeFile(browser, '// browser\n', 'utf8');
  await writeFile(join(dirname(source), 'gallery.ts'), 'export default {};\n', 'utf8');
  await writeFile(
    join(dirname(source), 'component.json'),
    JSON.stringify({ ...fixtureMetadata, budgetGroup, tokenNamespace }),
    'utf8',
  );
  const tokenDocument = `${JSON.stringify({ ki: { [tokenNamespace ?? slug]: { color: { $value: '{ki.text.base}' } } } })}\n`;
  await writeFile(token, tokenDocument, 'utf8');
  if (material3) {
    await writeFile(
      join(root, 'packages/tokens/tokens/component', `${slug}.material3.tokens.json`),
      tokenDocument,
      'utf8',
    );
  }
}

test('derives direct module exports, tests, token sources, and budget membership from source', async (t) => {
  const root = await createWorkspace(t);
  const budgetGroup = { members: ['ki-alpha', 'ki-beta'] };
  await writeFixtureComponent(root, 'ki-alpha', { material3: true, budgetGroup });
  await writeFixtureComponent(root, 'ki-beta');

  const inventory = await discoverComponentInventory({ workspaceRoot: root });

  assert.deepEqual(inventory, [
    {
      tag: 'ki-alpha',
      className: 'KiAlpha',
      sourceModule: 'packages/elements/src/components/ki-alpha/ki-alpha.tsx',
      browserSpec: 'packages/elements/browser-tests/ki-alpha.browser.spec.ts',
      metadata: { ...fixtureMetadata, budgetGroup },
      distModule: './dist/components/ki-alpha.js',
      publicSubpath: './ki-alpha',
      moduleExports: { values: ['KiAlpha'], types: ['KiAlphaSize'] },
      tokenSources: [
        'packages/tokens/tokens/component/alpha.tokens.json',
        'packages/tokens/tokens/component/alpha.material3.tokens.json',
      ],
      budgetGroup: 'ki-alpha',
    },
    {
      tag: 'ki-beta',
      className: 'KiBeta',
      sourceModule: 'packages/elements/src/components/ki-beta/ki-beta.tsx',
      browserSpec: 'packages/elements/browser-tests/ki-beta.browser.spec.ts',
      metadata: fixtureMetadata,
      distModule: './dist/components/ki-beta.js',
      publicSubpath: './ki-beta',
      moduleExports: { values: ['KiBeta'], types: ['KiBetaSize'] },
      tokenSources: ['packages/tokens/tokens/component/beta.tokens.json'],
      budgetGroup: 'ki-alpha',
    },
  ]);
});

test('checks the declared token namespace with the same source uniqueness rule', async (t) => {
  const root = await createWorkspace(t);
  await writeFixtureComponent(root, 'ki-sample-block', {
    material3: true,
    tokenNamespace: 'sample',
  });
  const [component] = await discoverComponentInventory({ workspaceRoot: root });

  assert.deepEqual(component.tokenSources, [
    'packages/tokens/tokens/component/sample-block.tokens.json',
    'packages/tokens/tokens/component/sample-block.material3.tokens.json',
  ]);

  await writeFixtureComponent(root, 'ki-sample');
  await assert.rejects(
    discoverComponentInventory({ workspaceRoot: root }),
    /ambiguous token source/iu,
  );
});

test('complete inventory fails on missing token source, unknown group member, or duplicate membership', async (t) => {
  await t.test('token source', async (subtest) => {
    const root = await createWorkspace(subtest);
    await writeFixtureComponent(root, 'ki-alpha');
    await rm(join(root, 'packages/tokens/tokens/component/alpha.tokens.json'));
    await assert.rejects(
      discoverComponentInventory({ workspaceRoot: root }),
      /token source.*ki-alpha/iu,
    );
  });

  await t.test('unknown member', async (subtest) => {
    const root = await createWorkspace(subtest);
    await writeFixtureComponent(root, 'ki-alpha', {
      budgetGroup: { members: ['ki-alpha', 'ki-missing'] },
    });
    await assert.rejects(
      discoverComponentInventory({ workspaceRoot: root }),
      /unknown.*ki-missing/iu,
    );
  });

  await t.test('duplicate membership', async (subtest) => {
    const root = await createWorkspace(subtest);
    await writeFixtureComponent(root, 'ki-alpha', {
      budgetGroup: { members: ['ki-alpha', 'ki-beta'] },
    });
    await writeFixtureComponent(root, 'ki-beta', {
      budgetGroup: { members: ['ki-beta', 'ki-alpha'] },
    });
    await assert.rejects(
      discoverComponentInventory({ workspaceRoot: root }),
      /more than one.*ki-beta/iu,
    );
  });
});

test('safe package contract permits only the declared package targets', () => {
  const valid = {
    '.': { types: './dist/types/index.d.ts', import: './dist/index.js' },
    './loader': { types: './loader/index.d.ts', import: './loader/index.js' },
    './ki-*': {
      types: './dist/components/ki-*.d.ts',
      import: './dist/components/ki-*.js',
    },
    // Wrapper-resolution subpaths (spec 034): required members of the
    // frozen exports contract, same dist/components surface.
    './components': {
      types: './dist/types/components.d.ts',
      import: './dist/components/index.js',
    },
    './components/*.js': {
      types: './dist/components/*.d.ts',
      import: './dist/components/*.js',
    },
    './icons/*': {
      types: './icons/*.d.ts',
      import: './icons/*.js',
    },
  };

  assert.doesNotThrow(() => validatePackageExportContract(valid));
  assert.throws(
    () => validatePackageExportContract({ ...valid, './internal': './dist/internal.js' }),
    /auxiliary|unexpected.*internal/iu,
  );
  assert.throws(
    () => validatePackageExportContract({ ...valid, './ki-*': './dist/*' }),
    /wildcard/iu,
  );
  assert.throws(
    () => validatePackageExportContract({ ...valid, './icons/*': './dist/*' }),
    /icon package export/iu,
  );
});

test('real deprecated root is exact, frozen, and gives every symbol a direct replacement', async () => {
  const source = await readFile(join(workspaceRoot, 'packages/elements/src/index.ts'), 'utf8');
  const contract = validateLegacyRootContract(source);

  assert.deepEqual(contract, FROZEN_LEGACY_ROOT);
  assert.equal(contract.values.length, 20);
  assert.equal(contract.namedTypes.length, 12);
  assert.equal(contract.typeStars.length, 0);
  assert.equal(
    contract.values.every(({ replacement }) => replacement.startsWith('@kimen/elements/ki-')),
    true,
  );
  assert.equal(
    contract.namedTypes.every(({ replacement }) => replacement.startsWith('@kimen/elements/ki-')),
    true,
  );
});
