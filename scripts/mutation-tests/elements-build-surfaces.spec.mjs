import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { runBuildSurfaces } from '../../packages/elements/scripts/build-surfaces.mjs';

// @spec:018-project-integrity-hardening

const validDocs = {
  timestamp: 'unstable',
  components: [
    {
      tag: 'ki-demo',
      filePath: 'src/components/ki-demo/ki-demo.tsx',
      docs: 'Demonstrates the generated surfaces.',
      docsTags: [
        { name: 'whenToUse', text: 'Use for demonstrations.' },
        { name: 'whenNotToUse', text: 'Avoid in production journeys.' },
      ],
      props: [{ name: 'label', attr: 'label', type: 'string', docs: 'Visible label.' }],
      methods: [{ name: 'show', docs: 'Shows the demo.', complexType: { return: 'void' } }],
      events: [],
      slots: [{ name: '', docs: 'Demo content.' }],
      parts: [{ name: 'surface', docs: 'Demo surface.' }],
      styles: [],
    },
  ],
};

const defaultTokenExports = {
  './css': './dist/onmars.css',
  './css/material3': [{ types: './dist/material3.d.ts' }, { browser: './dist/material3.css' }],
  './css/node': { node: './dist/node.css' },
  './json': './dist/tokens.json',
};

async function createSurfaceWorkspace({
  docs = validDocs,
  tokenExports = defaultTokenExports,
} = {}) {
  const root = await mkdtemp(join(tmpdir(), 'elements-build-surfaces-'));
  const packageRoot = resolve(root, 'packages/elements');
  const tokensRoot = resolve(root, 'packages/tokens');
  const generatedRoot = resolve(packageRoot, 'generated');
  await Promise.all([
    mkdir(resolve(root, 'scripts/lib'), { recursive: true }),
    mkdir(resolve(packageRoot, 'scripts'), { recursive: true }),
    mkdir(resolve(packageRoot, 'src'), { recursive: true }),
    mkdir(generatedRoot, { recursive: true }),
    mkdir(resolve(tokensRoot, 'dist'), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(resolve(generatedRoot, 'docs.json'), JSON.stringify(docs)),
    writeFile(
      resolve(packageRoot, 'package.json'),
      JSON.stringify({
        name: '@kimen/elements',
        description: 'Fixture elements.',
        exports: {
          './ki-demo': {
            types: './dist/components/ki-demo.d.ts',
            import: './dist/components/ki-demo.js',
          },
        },
      }),
    ),
    writeFile(resolve(packageRoot, 'scripts/llms-preamble.txt'), 'Install fixture exports.\n'),
    writeFile(resolve(packageRoot, 'src/index.ts'), 'export const KiLegacy = true;\n'),
    writeFile(
      resolve(tokensRoot, 'package.json'),
      JSON.stringify({ name: '@kimen/tokens', exports: tokenExports }),
    ),
    writeFile(resolve(tokensRoot, 'dist/onmars.css'), ':root { --ki-demo-color: red; }\n'),
    writeFile(resolve(tokensRoot, 'dist/material3.css'), ':root { --ki-demo-color: blue; }\n'),
    writeFile(resolve(tokensRoot, 'dist/node.css'), ':root { --ki-demo-color: green; }\n'),
    writeFile(
      resolve(tokensRoot, 'style-dictionary.config.mjs'),
      [
        "export const lightConfig = { name: 'light' };",
        "export const darkConfig = { name: 'dark' };",
        "export const material3LightConfig = { name: 'material3-light' };",
        "export const material3DarkConfig = { name: 'material3-dark' };",
        '',
      ].join('\n'),
    ),
    writeFile(
      resolve(root, 'scripts/lib/token-inventory.mjs'),
      [
        'export async function loadOrderedTokenCompositions({ configurations }) {',
        '  return configurations.map(({ id, theme, scheme }) => ({ id, theme, scheme }));',
        '}',
        'export function createOrderedTokenInventory(compositions) {',
        "  return { publicTokens: ['--ki-demo-color'], compositionIds: compositions.map(({ id }) => id) };",
        '}',
        'export async function readConsumedPublicCssProperties() {',
        "  return { 'ki-demo': [{ name: '--ki-demo-color', description: 'Demo color.' }] };",
        '}',
        '',
      ].join('\n'),
    ),
    writeFile(
      resolve(root, 'scripts/lib/component-inventory.mjs'),
      [
        "export async function discoverComponentInventory() { return [{ tag: 'ki-demo' }]; }",
        "export function resolveComponentSubpaths() { return ['./ki-demo']; }",
        "export function validateLegacyRootContract(source) { return { frozen: source.includes('KiLegacy') }; }",
        '',
      ].join('\n'),
    ),
    writeFile(
      resolve(root, 'scripts/lib/public-api-snapshot.mjs'),
      [
        'export function completeCemMethodSignatures({ manifest, docs }) {',
        '  return { ...manifest, completedMethods: docs.components.flatMap(({ methods = [] }) => methods).length };',
        '}',
        'export function buildRepositoryPublicApiSnapshot(input) {',
        '  return {',
        '    schemaVersion: 1,',
        '    elementsPackage: input.elementsPackage.name,',
        '    tokensPackage: input.tokensPackage.name,',
        '    componentSubpaths: input.componentSubpaths,',
        '    rootContract: input.rootContract,',
        '    defaultTokenId: input.defaultTokenComposition?.id,',
        '    tokenInventory: input.tokenInventory,',
        '    stylesheetSources: input.stylesheetSources,',
        '    browserBaseline: input.browserBaseline,',
        '    completedMethods: input.manifest.completedMethods,',
        '  };',
        '}',
        '',
      ].join('\n'),
    ),
    writeFile(
      resolve(root, 'scripts/lib/canonical-json.mjs'),
      'export const canonicalJson = (value) => `${JSON.stringify(value, null, 2)}\\n`;\n',
    ),
  ]);
  const surfacePaths = {
    docsPath: resolve(generatedRoot, 'docs.json'),
    packageJsonPath: resolve(packageRoot, 'package.json'),
    preamblePath: resolve(packageRoot, 'scripts/llms-preamble.txt'),
    manifestPath: resolve(generatedRoot, 'custom-elements.json'),
    publicApiPath: resolve(generatedRoot, 'public-api.json'),
    packageLlmsPath: resolve(packageRoot, 'llms.txt'),
    rootLlmsPath: resolve(root, 'llms.txt'),
  };
  return { root, packageRoot, tokensRoot, generatedRoot, surfacePaths };
}

describe('build-surfaces mutation boundary', () => {
  it('derives every default output from injected package/workspace roots', async () => {
    const { root, packageRoot, generatedRoot } = await createSurfaceWorkspace();
    try {
      const result = await runBuildSurfaces({ packageRoot, workspaceRoot: root });
      const docs = JSON.parse(await readFile(resolve(generatedRoot, 'docs.json'), 'utf8'));
      const manifestBytes = await readFile(resolve(generatedRoot, 'custom-elements.json'), 'utf8');
      const manifest = JSON.parse(manifestBytes);
      const publicApiBytes = await readFile(resolve(generatedRoot, 'public-api.json'), 'utf8');
      const publicApi = JSON.parse(publicApiBytes);
      const packageLlms = await readFile(resolve(packageRoot, 'llms.txt'), 'utf8');
      const rootLlms = await readFile(resolve(root, 'llms.txt'), 'utf8');

      expect(result.ok).toBe(true);
      expect(result.stderr).toBe('');
      expect(result.violations).toEqual([]);
      expect(result.outputs).toEqual(
        new Map([
          [resolve(generatedRoot, 'docs.json'), `${JSON.stringify(docs, null, 2)}\n`],
          [resolve(generatedRoot, 'custom-elements.json'), manifestBytes],
          [resolve(generatedRoot, 'public-api.json'), publicApiBytes],
          [resolve(packageRoot, 'llms.txt'), packageLlms],
          [resolve(root, 'llms.txt'), rootLlms],
        ]),
      );
      expect(docs).not.toHaveProperty('timestamp');
      expect(manifest.completedMethods).toBe(1);
      expect(manifest.modules[0].path).toBe('dist/components/ki-demo.js');
      expect(manifest.modules[0].declarations[0].cssProperties).toEqual([
        { name: '--ki-demo-color', description: 'Demo color.' },
      ]);
      expect(publicApi).toEqual({
        schemaVersion: 1,
        elementsPackage: '@kimen/elements',
        tokensPackage: '@kimen/tokens',
        componentSubpaths: ['./ki-demo'],
        rootContract: { frozen: true },
        defaultTokenId: 'onmars-light',
        tokenInventory: {
          publicTokens: ['--ki-demo-color'],
          compositionIds: ['onmars-light', 'onmars-dark', 'material3-light', 'material3-dark'],
        },
        stylesheetSources: {
          './css': ':root { --ki-demo-color: red; }\n',
          './css/material3': ':root { --ki-demo-color: blue; }\n',
          './css/node': ':root { --ki-demo-color: green; }\n',
        },
        browserBaseline: ['chromium', 'firefox', 'webkit'],
        completedMethods: 1,
      });
      expect(packageLlms).toBe(rootLlms);
      expect(packageLlms).toContain('CSS custom properties:\n- `--ki-demo-color`: Demo color.');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('honors every injected path and supplied manifest/public API input', async () => {
    const { root, packageRoot } = await createSurfaceWorkspace();
    const custom = resolve(root, 'custom');
    await mkdir(custom);
    const paths = {
      docsPath: resolve(custom, 'input-docs.json'),
      packageJsonPath: resolve(custom, 'input-package.json'),
      preamblePath: resolve(custom, 'input-preamble.txt'),
      manifestPath: resolve(custom, 'output-manifest.json'),
      publicApiPath: resolve(custom, 'output-api.json'),
      packageLlmsPath: resolve(custom, 'output-package-llms.txt'),
      rootLlmsPath: resolve(custom, 'output-root-llms.txt'),
    };
    try {
      await Promise.all([
        writeFile(paths.docsPath, JSON.stringify(validDocs)),
        writeFile(
          paths.packageJsonPath,
          JSON.stringify({ name: '@fixture/custom', description: 'Custom fixture.' }),
        ),
        writeFile(paths.preamblePath, 'Custom preamble.\n'),
      ]);
      const result = await runBuildSurfaces({
        ...paths,
        packageRoot,
        workspaceRoot: root,
        manifestInputs: {
          packageExports: { './ki-demo': './custom/ki-demo.js' },
          cssPropertiesByTag: {},
          tokenInventory: { publicTokens: [] },
          tokenCompositions: [],
        },
        publicApi: { schemaVersion: 1, fixture: true },
      });

      expect([...result.outputs.keys()]).toEqual([
        paths.docsPath,
        paths.manifestPath,
        paths.publicApiPath,
        paths.packageLlmsPath,
        paths.rootLlmsPath,
      ]);
      expect(JSON.parse(await readFile(paths.publicApiPath, 'utf8'))).toEqual({
        schemaVersion: 1,
        fixture: true,
      });
      expect(JSON.parse(await readFile(paths.manifestPath, 'utf8')).modules[0].path).toBe(
        'custom/ki-demo.js',
      );
      expect(await readFile(paths.packageLlmsPath, 'utf8')).toBe(
        await readFile(paths.rootLlmsPath, 'utf8'),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('returns all validation violations before reading downstream inputs or writing outputs', async () => {
    const root = await mkdtemp(join(tmpdir(), 'elements-build-invalid-'));
    const packageRoot = resolve(root, 'packages/elements');
    const docsPath = resolve(packageRoot, 'generated/docs.json');
    const surfacePaths = {
      docsPath,
      packageJsonPath: resolve(packageRoot, 'package.json'),
      preamblePath: resolve(packageRoot, 'scripts/llms-preamble.txt'),
      manifestPath: resolve(packageRoot, 'generated/custom-elements.json'),
      publicApiPath: resolve(packageRoot, 'generated/public-api.json'),
      packageLlmsPath: resolve(packageRoot, 'llms.txt'),
      rootLlmsPath: resolve(root, 'llms.txt'),
    };
    try {
      await mkdir(resolve(packageRoot, 'generated'), { recursive: true });
      await writeFile(
        docsPath,
        JSON.stringify({ components: [{ tag: 'ki-invalid', docs: '', docsTags: [] }] }),
      );

      const result = await runBuildSurfaces({
        ...surfacePaths,
        packageRoot,
        workspaceRoot: root,
      });

      expect(result).toEqual({
        ok: false,
        stderr: [
          'agent-surfaces: documentation incomplete (Art. I):',
          '  ki-invalid: component has no documentation',
          '  ki-invalid: missing @whenToUse guidance tag',
          '  ki-invalid: missing @whenNotToUse guidance tag',
          '',
        ].join('\n'),
        violations: [
          'ki-invalid: component has no documentation',
          'ki-invalid: missing @whenToUse guidance tag',
          'ki-invalid: missing @whenNotToUse guidance tag',
        ],
      });
      await expect(
        readFile(resolve(packageRoot, 'generated/custom-elements.json')),
      ).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it.each([
    [null, '@kimen/tokens exports must be an object'],
    [[], '@kimen/tokens exports must be an object'],
    [{ './css': 'https://cdn.example.test/tokens.css' }, 'must target package-relative CSS'],
    [{ './css': './dist/tokens.js' }, 'must target package-relative CSS'],
    [{ './css': './../escape.css' }, 'escapes its package root'],
    [{ './css': { types: './dist/tokens.d.ts' } }, 'has no runtime target'],
  ])('fails closed for an invalid public stylesheet export %#', async (tokenExports, message) => {
    const { root, packageRoot, surfacePaths } = await createSurfaceWorkspace({ tokenExports });
    try {
      await expect(
        runBuildSurfaces({ ...surfacePaths, packageRoot, workspaceRoot: root }),
      ).rejects.toThrow(message);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it.each([
    [{ tokenCompositions: [] }, 'parsed token compositions'],
    [{ tokenInventory: {}, tokenCompositions: null }, 'parsed token compositions'],
  ])('requires both parsed token inventory inputs before snapshot generation %#', async (input) => {
    const { root, packageRoot, surfacePaths } = await createSurfaceWorkspace();
    try {
      await expect(
        runBuildSurfaces({
          ...surfacePaths,
          packageRoot,
          workspaceRoot: root,
          manifestInputs: {
            packageExports: { './ki-demo': './dist/components/ki-demo.js' },
            cssPropertiesByTag: {},
            ...input,
          },
        }),
      ).rejects.toThrow('build-surfaces: public API generation requires parsed token compositions');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
