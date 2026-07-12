import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildLlmsTxt, buildManifest } from '../../packages/elements/scripts/agent-surfaces.mjs';
import { runBuildSurfaces } from '../../packages/elements/scripts/build-surfaces.mjs';

// @spec:018-project-integrity-hardening

const docs = {
  components: [
    {
      tag: 'ki-dialog',
      filePath: 'src/components/ki-dialog/ki-dialog.tsx',
      docs: 'A modal dialog.',
      docsTags: [
        { name: 'whenToUse', text: 'Use for one interrupting decision.' },
        { name: 'whenNotToUse', text: 'Do not use for passive status.' },
      ],
      props: [
        {
          name: 'open',
          attr: 'open',
          type: 'boolean',
          default: 'false',
          docs: 'Whether the dialog is open.',
          reflectToAttr: true,
        },
      ],
      methods: [],
      events: [],
      slots: [{ name: '', docs: 'Dialog body content.' }],
      parts: [{ name: 'dialog', docs: 'Native dialog surface.' }],
      styles: [],
    },
  ],
};

const cssPropertiesByTag = {
  'ki-dialog': [
    {
      name: '--ki-dialog-bg',
      description: 'Dialog background color.',
      layer: 'component',
    },
    {
      name: '--ki-text-body',
      description: 'Body text color.',
      layer: 'semantic',
    },
  ],
};

describe('agent surface mutation boundary', () => {
  it('@spec:018 S9 resolves exact public exports and describes attributes/CSS properties', () => {
    const output = buildManifest(docs, {
      packageExports: {
        './ki-dialog': {
          types: './dist/components/ki-dialog.d.ts',
          import: './dist/components/ki-dialog.js',
        },
      },
      cssPropertiesByTag,
    });

    expect(output).toEqual({
      schemaVersion: '1.0.0',
      readme: '',
      modules: [
        {
          kind: 'javascript-module',
          path: 'dist/components/ki-dialog.js',
          declarations: [
            expect.objectContaining({
              kind: 'class',
              name: 'KiDialog',
              tagName: 'ki-dialog',
              attributes: [
                {
                  name: 'open',
                  fieldName: 'open',
                  type: { text: 'boolean' },
                  default: 'false',
                  description: 'Whether the dialog is open.',
                },
              ],
              cssProperties: [
                { name: '--ki-dialog-bg', description: 'Dialog background color.' },
                { name: '--ki-text-body', description: 'Body text color.' },
              ],
            }),
          ],
          exports: [
            {
              kind: 'js',
              name: 'KiDialog',
              declaration: { name: 'KiDialog', module: 'dist/components/ki-dialog.js' },
            },
            {
              kind: 'custom-element-definition',
              name: 'ki-dialog',
              declaration: { name: 'KiDialog', module: 'dist/components/ki-dialog.js' },
            },
          ],
        },
      ],
    });
  });

  it.each([
    [{ './ki-*': { import: './dist/components/ki-*.js' } }, 'dist/components/ki-dialog.js'],
    [{ './*': { default: './dist/components/*.js' } }, 'dist/components/ki-dialog.js'],
    [
      { './ki-dialog': [{ types: './ignored.d.ts' }, { browser: './browser/ki-dialog.js' }] },
      'browser/ki-dialog.js',
    ],
  ])('@spec:018 S9 resolves supported export shape %#', (packageExports, expectedPath) => {
    expect(buildManifest(docs, { packageExports }).modules[0].path).toBe(expectedPath);
  });

  it('@spec:018 S9 fails closed when no public JavaScript export exists', () => {
    expect(() =>
      buildManifest(docs, {
        packageExports: { './ki-dialog': { types: './dist/components/ki-dialog.d.ts' } },
      }),
    ).toThrow(/ki-dialog: no published JavaScript export resolves its module path/iu);
  });

  it('@spec:018 S9 keeps source paths only for the legacy no-input helper contract', () => {
    const module = buildManifest(docs).modules[0];

    expect(module.path).toBe('src/components/ki-dialog/ki-dialog.tsx');
    expect(module.declarations[0].cssProperties).toEqual([]);
  });

  it('@spec:018 S9 renders the same derived CSS contract in llms.txt', () => {
    const output = buildLlmsTxt(
      docs,
      { name: '@kimen/elements', description: 'Kimen elements.' },
      'Install from public exports.\n',
      { cssPropertiesByTag },
    );

    expect(output).toContain(
      'CSS custom properties:\n- `--ki-dialog-bg`: Dialog background color.\n- `--ki-text-body`: Body text color.',
    );
    expect(output.endsWith('\n')).toBe(true);
  });

  it('@spec:018 S9 writes normalized docs, published CEM and matching llms outputs', async () => {
    const root = await mkdtemp(join(tmpdir(), 'agent-surfaces-mutation-'));
    try {
      await writeFile(join(root, 'docs.json'), JSON.stringify({ timestamp: 'unstable', ...docs }));
      await writeFile(
        join(root, 'package.json'),
        JSON.stringify({ name: '@kimen/elements', description: 'Kimen elements.' }),
      );
      await writeFile(join(root, 'preamble.txt'), 'Install from public exports.\n');

      const result = await runBuildSurfaces({
        docsPath: join(root, 'docs.json'),
        packageJsonPath: join(root, 'package.json'),
        preamblePath: join(root, 'preamble.txt'),
        manifestPath: join(root, 'custom-elements.json'),
        publicApiPath: join(root, 'public-api.json'),
        packageLlmsPath: join(root, 'package-llms.txt'),
        rootLlmsPath: join(root, 'root-llms.txt'),
        packageRoot: root,
        manifestInputs: {
          packageExports: {
            './ki-dialog': { import: './dist/components/ki-dialog.js' },
          },
          cssPropertiesByTag,
        },
        publicApi: { schemaVersion: 1, surface: {}, surfaceSha256: 'fixture' },
      });

      expect(result.ok).toBe(true);
      expect(await readFile(join(root, 'docs.json'), 'utf8')).not.toContain('timestamp');
      expect(await readFile(join(root, 'custom-elements.json'), 'utf8')).toContain(
        '"path": "dist/components/ki-dialog.js"',
      );
      expect(await readFile(join(root, 'package-llms.txt'), 'utf8')).toBe(
        await readFile(join(root, 'root-llms.txt'), 'utf8'),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
