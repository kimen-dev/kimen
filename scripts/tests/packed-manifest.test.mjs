// @spec:018-project-integrity-hardening
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { checkPackedManifest, validatePackedManifest } from '../gates/check-packed-manifest.mjs';

function describedDeclaration(overrides = {}) {
  return {
    kind: 'class',
    name: 'KiDialog',
    customElement: true,
    tagName: 'ki-dialog',
    description: 'A modal dialog.',
    attributes: [{ name: 'open', description: 'Whether the dialog is open.' }],
    members: [{ kind: 'field', name: 'open', description: 'Whether the dialog is open.' }],
    events: [{ name: 'ki-close', description: 'Emitted after closing.' }],
    slots: [{ name: '', description: 'Dialog body content.' }],
    cssParts: [{ name: 'surface', description: 'Dialog surface.' }],
    cssProperties: [{ name: '--ki-dialog-bg', description: 'Dialog background color.' }],
    ...overrides,
  };
}

function validManifest(overrides = {}) {
  return {
    schemaVersion: '1.0.0',
    modules: [
      {
        kind: 'javascript-module',
        path: 'dist/components/ki-dialog.js',
        declarations: [describedDeclaration()],
        exports: [
          {
            kind: 'js',
            name: 'KiDialog',
            declaration: {
              name: 'KiDialog',
              module: 'dist/components/ki-dialog.js',
            },
          },
        ],
      },
    ],
    ...overrides,
  };
}

test('@spec:018-project-integrity-hardening S9 accepts described facets and packed module paths', () => {
  assert.deepEqual(
    validatePackedManifest({
      manifest: validManifest(),
      packedFiles: ['dist/components/ki-dialog.js', 'generated/custom-elements.json', 'llms.txt'],
    }),
    [],
  );
});

test('@spec:018-project-integrity-hardening S9 rejects empty descriptions for every public facet family', () => {
  const declaration = describedDeclaration({
    attributes: [{ name: 'open', description: ' ' }],
    members: [{ kind: 'method', name: 'show', description: '' }],
    events: [{ name: 'ki-close' }],
    slots: [{ name: '', description: '' }],
    cssParts: [{ name: 'surface', description: '' }],
    cssProperties: [{ name: '--ki-dialog-bg', description: '' }],
  });
  const manifest = validManifest();
  manifest.modules[0].declarations = [declaration];

  assert.deepEqual(
    validatePackedManifest({
      manifest,
      packedFiles: ['dist/components/ki-dialog.js'],
    }),
    [
      'ki-dialog.attribute[open]: description is empty',
      'ki-dialog.cssPart[surface]: description is empty',
      'ki-dialog.cssProperty[--ki-dialog-bg]: description is empty',
      'ki-dialog.event[ki-close]: description is empty',
      'ki-dialog.member[show]: description is empty',
      'ki-dialog.slot[default]: description is empty',
    ],
  );
});

test('@spec:018-project-integrity-hardening S9 rejects absent, absolute, escaping and source-only paths', () => {
  const manifest = validManifest();
  manifest.modules.push(
    {
      kind: 'javascript-module',
      path: '/absolute/ki-bad.js',
      declarations: [describedDeclaration({ tagName: 'ki-bad', name: 'KiBad' })],
      exports: [],
    },
    {
      kind: 'javascript-module',
      path: '../escaping/ki-worse.js',
      declarations: [describedDeclaration({ tagName: 'ki-worse', name: 'KiWorse' })],
      exports: [],
    },
    {
      kind: 'javascript-module',
      path: 'src/components/ki-source/ki-source.tsx',
      declarations: [describedDeclaration({ tagName: 'ki-source', name: 'KiSource' })],
      exports: [],
    },
  );
  manifest.modules[0].exports[0].declaration.module = 'dist/components/missing.js';

  assert.deepEqual(
    validatePackedManifest({
      manifest,
      packedFiles: ['dist/components/ki-dialog.js'],
    }),
    [
      'module[../escaping/ki-worse.js]: path escapes the package',
      'module[/absolute/ki-bad.js]: path must be package-relative',
      'module[src/components/ki-source/ki-source.tsx]: path is not present in the packed package',
      'module[dist/components/ki-dialog.js].export[KiDialog]: path dist/components/missing.js is not present in the packed package',
    ],
  );
});

test('@spec:018-project-integrity-hardening S9 packs with an isolated writable npm cache', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'kimen-packed-manifest-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const packageRoot = join(root, 'packages/elements');
  await mkdir(join(packageRoot, 'dist/components'), { recursive: true });
  await mkdir(join(packageRoot, 'generated'), { recursive: true });
  await writeFile(
    join(packageRoot, 'package.json'),
    JSON.stringify({
      name: '@fixture/elements',
      version: '1.0.0',
      files: ['dist', 'generated/custom-elements.json'],
    }),
  );
  await writeFile(join(packageRoot, 'dist/components/ki-dialog.js'), 'export class KiDialog {}\n');
  await writeFile(
    join(packageRoot, 'generated/custom-elements.json'),
    JSON.stringify(validManifest()),
  );
  const unusableCache = join(root, 'cache-is-a-file');
  await writeFile(unusableCache, 'not a directory');

  const violations = await checkPackedManifest({
    workspaceRoot: root,
    environment: { ...process.env, npm_config_cache: unusableCache },
  });

  assert.deepEqual(violations, []);
});
