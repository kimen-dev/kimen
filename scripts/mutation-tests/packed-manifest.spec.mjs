import { describe, expect, it } from 'vitest';

import { validatePackedManifest } from '../gates/check-packed-manifest.mjs';

// @spec:018-project-integrity-hardening

const declaration = (overrides = {}) => ({
  kind: 'class',
  name: 'KiDialog',
  customElement: true,
  tagName: 'ki-dialog',
  description: 'A modal dialog.',
  attributes: [{ name: 'open', description: 'Whether the dialog is open.' }],
  members: [{ kind: 'method', name: 'show', description: 'Opens the dialog.' }],
  events: [{ name: 'ki-close', description: 'Emitted after closing.' }],
  slots: [{ name: '', description: 'Dialog body content.' }],
  cssParts: [{ name: 'surface', description: 'Dialog surface.' }],
  cssProperties: [{ name: '--ki-dialog-bg', description: 'Dialog background.' }],
  ...overrides,
});

const manifest = (overrides = {}) => ({
  schemaVersion: '1.0.0',
  modules: [
    {
      kind: 'javascript-module',
      path: 'dist/components/ki-dialog.js',
      declarations: [declaration()],
      exports: [
        {
          kind: 'js',
          name: 'KiDialog',
          declaration: { name: 'KiDialog', module: 'dist/components/ki-dialog.js' },
        },
      ],
    },
  ],
  ...overrides,
});

describe('packed manifest mutation boundary', () => {
  it('@spec:018 S9 accepts only described facets whose module is packed', () => {
    expect(
      validatePackedManifest({
        manifest: manifest(),
        packedFiles: ['./package/dist/components/ki-dialog.js'],
      }),
    ).toEqual([]);
  });

  it('@spec:018 S9 reports each empty public facet description', () => {
    const input = manifest();
    input.modules[0].declarations = [
      declaration({
        description: '',
        attributes: [{ name: 'open', description: '' }],
        members: [
          { kind: 'method', name: 'show', description: '' },
          { kind: 'field', name: 'privateState', privacy: 'private', description: '' },
        ],
        events: [{ name: 'ki-close', description: '' }],
        slots: [{ name: '', description: '' }],
        cssParts: [{ name: 'surface', description: '' }],
        cssProperties: [{ name: '--ki-dialog-bg', description: '' }],
      }),
    ];

    expect(
      validatePackedManifest({
        manifest: input,
        packedFiles: ['dist/components/ki-dialog.js'],
      }),
    ).toEqual([
      'ki-dialog.attribute[open]: description is empty',
      'ki-dialog.cssPart[surface]: description is empty',
      'ki-dialog.cssProperty[--ki-dialog-bg]: description is empty',
      'ki-dialog.event[ki-close]: description is empty',
      'ki-dialog.member[show]: description is empty',
      'ki-dialog.slot[default]: description is empty',
      'ki-dialog: description is empty',
    ]);
  });

  it.each([
    ['/absolute.js', 'module[/absolute.js]: path must be package-relative'],
    ['../escape.js', 'module[../escape.js]: path escapes the package'],
    ['./not-normal.js', 'module[./not-normal.js]: path is not normalized'],
    ['dist/missing.js', 'module[dist/missing.js]: path is not present in the packed package'],
  ])('@spec:018 S9 rejects invalid module path %s', (modulePath, expected) => {
    const input = manifest();
    input.modules[0].path = modulePath;

    expect(
      validatePackedManifest({
        manifest: input,
        packedFiles: ['dist/components/ki-dialog.js'],
      }),
    ).toContain(expected);
  });

  it('@spec:018 S9 rejects an export whose declaration module is absent', () => {
    const input = manifest();
    input.modules[0].exports[0].declaration.module = 'dist/components/missing.js';

    expect(
      validatePackedManifest({
        manifest: input,
        packedFiles: ['dist/components/ki-dialog.js'],
      }),
    ).toContain(
      'module[dist/components/ki-dialog.js].export[KiDialog]: path dist/components/missing.js is not present in the packed package',
    );
  });

  it.each([
    [null, ['manifest: root must be an object']],
    [{}, ['manifest.modules: must be an array']],
  ])('@spec:018 S9 rejects malformed manifest %#', (input, expected) => {
    expect(validatePackedManifest({ manifest: input, packedFiles: [] })).toEqual(expected);
  });
});
