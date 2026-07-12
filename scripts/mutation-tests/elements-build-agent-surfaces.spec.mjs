import { describe, expect, it } from 'vitest';

import {
  buildLlmsTxt,
  buildManifest,
  normalizeDocs,
  serializeJson,
  validateDocs,
} from '../../packages/elements/scripts/agent-surfaces.mjs';

// @spec:018-project-integrity-hardening

const richDocs = {
  components: [
    {
      tag: 'ki-rich-item',
      filePath: 'src/components/ki-rich-item/ki-rich-item.tsx',
      docs: 'A rich\n component.',
      deprecation: 'Use ki-modern-item.',
      docsTags: [
        { name: 'whenToUse', text: 'Use for rich content.' },
        { name: 'whenNotToUse', text: 'Avoid for plain text.' },
      ],
      props: [
        {
          name: 'tone',
          attr: 'tone',
          type: '"info" | "danger"',
          default: "'info'",
          docs: 'Visual\n tone.',
          reflectToAttr: true,
        },
        {
          name: 'label',
          attr: 'label',
          type: 'string',
          docs: 'Accessible label.',
          reflectToAttr: false,
        },
        {
          name: 'internalState',
          type: 'number',
          docs: 'Public property without an attribute.',
          reflectToAttr: false,
        },
      ],
      methods: [
        {
          name: 'show',
          docs: 'Shows\n the item.',
          complexType: { return: 'Promise<void>' },
          parameters: [{ name: 'force', type: 'boolean', docs: 'Whether to force display.' }],
        },
        { name: 'reset', docs: 'Resets the item.' },
      ],
      events: [
        {
          event: 'kiChange',
          docs: 'Emitted after a change.',
          complexType: { original: '{ value: string }' },
        },
        { name: 'kiReady', docs: 'Emitted when ready.' },
      ],
      slots: [
        { name: '', docs: 'Default rich content.' },
        { name: 'icon', docs: 'Leading icon.' },
      ],
      parts: [{ name: 'surface', docs: 'Internal surface.' }],
      styles: [
        { name: '--ki-rich-color', annotation: 'prop', docs: 'Rich foreground color.' },
        { name: '--ki-private', annotation: 'internal', docs: 'Private implementation value.' },
      ],
    },
  ],
};

describe('agent-surface pure mutation boundary', () => {
  it('serializes deterministic indented JSON with exactly one trailing newline', () => {
    expect(serializeJson({ beta: [2], alpha: 1 })).toBe(
      '{\n  "beta": [\n    2\n  ],\n  "alpha": 1\n}\n',
    );
  });

  it('normalizes every component and member reference path without mutating input', () => {
    const input = {
      timestamp: 'unstable',
      components: [
        {
          tag: 'ki-paths',
          filePath: '/home/ci/kimen/packages/elements/src/components/ki-paths/ki-paths.tsx',
          dirPath: 'C:\\work\\kimen\\packages\\elements\\src\\components\\ki-paths',
          readmePath: '/checkout/packages/elements/src/components/ki-paths/readme.md',
          usagesDir: 'src\\components\\ki-paths\\usage',
          props: [
            {
              complexType: {
                references: {
                  PropRef: { path: '/checkout/packages/elements/src/types/prop.ts' },
                  GlobalRef: { location: 'global' },
                },
              },
            },
          ],
          events: [
            {
              complexType: {
                references: {
                  EventRef: { path: 'C:\\work\\kimen\\packages\\elements\\src\\types\\event.ts' },
                },
              },
            },
          ],
          methods: [
            {
              complexType: {
                references: {
                  MethodRef: { path: '/outside/types/method.ts' },
                },
              },
            },
          ],
        },
      ],
    };

    const output = normalizeDocs(input, { packageRoot: '/outside/package' });

    expect(output).toEqual({
      components: [
        {
          tag: 'ki-paths',
          filePath: 'src/components/ki-paths/ki-paths.tsx',
          dirPath: 'src/components/ki-paths',
          readmePath: 'src/components/ki-paths/readme.md',
          usagesDir: 'src/components/ki-paths/usage',
          props: [
            {
              complexType: {
                references: {
                  PropRef: { path: 'src/types/prop.ts' },
                  GlobalRef: { location: 'global' },
                },
              },
            },
          ],
          events: [
            {
              complexType: {
                references: { EventRef: { path: 'src/types/event.ts' } },
              },
            },
          ],
          methods: [
            {
              complexType: {
                references: { MethodRef: { path: '../types/method.ts' } },
              },
            },
          ],
        },
      ],
    });
    expect(input).toHaveProperty('timestamp', 'unstable');
    expect(input.components[0].filePath.startsWith('/home/ci/')).toBe(true);
  });

  it('normalizes an absolute path without a package root by removing its leading slash', () => {
    expect(
      normalizeDocs({ components: [{ filePath: '/external/generated.ts' }] }).components[0]
        .filePath,
    ).toBe('external/generated.ts');
    expect(normalizeDocs({ timestamp: 'gone' })).toEqual({});
  });

  it('reports every undocumented facet in deterministic order and names fallbacks precisely', () => {
    const invalid = {
      components: [
        {
          docs: 42,
          docsTags: [
            { name: 'whenToUse', text: '   ' },
            { name: 'custom', text: null },
          ],
          props: [{ name: 'value', docs: undefined }],
          events: [{ name: 'kiReady', docs: '' }],
          methods: [{ name: 'show', docs: false }],
          slots: [{ name: '', docs: [] }],
          parts: [{ name: 'surface', docs: {} }],
          styles: [
            { name: '--ki-named', docs: '' },
            { annotation: 'prop', docs: null },
            { docs: undefined },
          ],
        },
      ],
    };

    expect(validateDocs(invalid)).toEqual([
      '<unknown>: component has no documentation',
      '<unknown>: missing @whenToUse guidance tag',
      '<unknown>: missing @whenNotToUse guidance tag',
      '<unknown>.@whenToUse: documentation tag has empty text',
      '<unknown>.@custom: documentation tag has empty text',
      '<unknown>.value: property has no documentation',
      '<unknown>.kiReady: event has no documentation',
      '<unknown>.show: method has no documentation',
      '<unknown>.slot[default]: slot has no documentation',
      '<unknown>.part[surface]: part has no documentation',
      '<unknown>.--ki-named: CSS property has no documentation',
      '<unknown>.prop: CSS property has no documentation',
      '<unknown>.style: CSS property has no documentation',
    ]);
    expect(validateDocs(richDocs)).toEqual([]);
    expect(validateDocs({})).toEqual([]);
  });

  it('builds every CEM facet, deprecation and export using the published runtime path', () => {
    const manifest = buildManifest(richDocs, {
      packageExports: {
        './ki-rich-item': {
          types: './dist/components/ki-rich-item.d.ts',
          import: './dist/components/ki-rich-item.js',
        },
      },
    });

    expect(manifest).toEqual({
      schemaVersion: '1.0.0',
      readme: '',
      modules: [
        {
          kind: 'javascript-module',
          path: 'dist/components/ki-rich-item.js',
          declarations: [
            {
              kind: 'class',
              name: 'KiRichItem',
              customElement: true,
              tagName: 'ki-rich-item',
              description: 'A rich\n component.',
              whenToUse: 'Use for rich content.',
              whenNotToUse: 'Avoid for plain text.',
              attributes: [
                {
                  name: 'tone',
                  fieldName: 'tone',
                  type: { text: '"info" | "danger"' },
                  default: "'info'",
                  description: 'Visual\n tone.',
                },
                {
                  name: 'label',
                  fieldName: 'label',
                  type: { text: 'string' },
                  description: 'Accessible label.',
                },
              ],
              members: [
                {
                  kind: 'field',
                  name: 'tone',
                  privacy: 'public',
                  type: { text: '"info" | "danger"' },
                  default: "'info'",
                  description: 'Visual\n tone.',
                  attribute: 'tone',
                  reflects: true,
                },
                {
                  kind: 'field',
                  name: 'label',
                  privacy: 'public',
                  type: { text: 'string' },
                  description: 'Accessible label.',
                  attribute: 'label',
                  reflects: false,
                },
                {
                  kind: 'field',
                  name: 'internalState',
                  privacy: 'public',
                  type: { text: 'number' },
                  description: 'Public property without an attribute.',
                  reflects: false,
                },
                {
                  kind: 'method',
                  name: 'show',
                  privacy: 'public',
                  description: 'Shows\n the item.',
                  return: { type: { text: 'Promise<void>' } },
                  parameters: [
                    {
                      name: 'force',
                      type: { text: 'boolean' },
                      description: 'Whether to force display.',
                    },
                  ],
                },
                {
                  kind: 'method',
                  name: 'reset',
                  privacy: 'public',
                  description: 'Resets the item.',
                  return: { type: { text: 'void' } },
                  parameters: [],
                },
              ],
              events: [
                {
                  name: 'kiChange',
                  type: { text: 'CustomEvent<{ value: string }>' },
                  description: 'Emitted after a change.',
                },
                {
                  name: 'kiReady',
                  type: { text: 'CustomEvent' },
                  description: 'Emitted when ready.',
                },
              ],
              slots: [
                { name: '', description: 'Default rich content.' },
                { name: 'icon', description: 'Leading icon.' },
              ],
              cssParts: [{ name: 'surface', description: 'Internal surface.' }],
              cssProperties: [{ name: '--ki-rich-color', description: 'Rich foreground color.' }],
              deprecated: 'Use ki-modern-item.',
            },
          ],
          exports: [
            {
              kind: 'js',
              name: 'KiRichItem',
              declaration: { name: 'KiRichItem', module: 'dist/components/ki-rich-item.js' },
            },
            {
              kind: 'custom-element-definition',
              name: 'ki-rich-item',
              declaration: { name: 'KiRichItem', module: 'dist/components/ki-rich-item.js' },
            },
          ],
        },
      ],
    });
  });

  it('renders the complete agent-facing text contract with normalized one-line prose', () => {
    const output = buildLlmsTxt(
      richDocs,
      { name: '@kimen/elements', description: 'Portable elements.' },
      'Install from exports.\n',
    );

    expect(output).toBe(
      [
        '# @kimen/elements — Kimen web components',
        '',
        '> Portable elements.',
        '',
        'Install from exports.',
        '',
        '## Components',
        '',
        '### ki-rich-item',
        '',
        'A rich component.',
        '',
        'When to use: Use for rich content.',
        'When NOT to use: Avoid for plain text.',
        '',
        'Attributes:',
        '- `tone` ("info" | "danger", default \'info\'): Visual tone.',
        '- `label` (string): Accessible label.',
        '',
        'Slots:',
        '- (default): Default rich content.',
        '- `icon`: Leading icon.',
        '',
        'Parts:',
        '- `surface`: Internal surface.',
        '',
        'Events:',
        '- `kiChange` (CustomEvent<{ value: string }>): Emitted after a change.',
        '- `kiReady` (CustomEvent): Emitted when ready.',
        '',
        'Methods:',
        '- `show(force)` (Promise<void>): Shows the item.',
        '- `reset()` (void): Resets the item.',
        '',
        'CSS custom properties:',
        '- `--ki-rich-color`: Rich foreground color.',
        '',
      ].join('\n'),
    );
  });

  it('uses the derived CSS inventory as authoritative and emits none for absent facets', () => {
    const docs = {
      components: [
        {
          tag: 'ki-empty',
          docs: 'Empty component.',
          docsTags: [
            { name: 'whenToUse', text: 'Use when empty.' },
            { name: 'whenNotToUse', text: 'Avoid when rich.' },
          ],
          styles: [{ name: '--legacy', annotation: 'prop', docs: 'Ignored legacy property.' }],
        },
      ],
    };

    const output = buildLlmsTxt(
      docs,
      { name: '@kimen/elements', description: 'Portable elements.' },
      'Preamble',
      {
        cssPropertiesByTag: {
          'ki-empty': [{ name: '--ki-derived', description: undefined }],
        },
      },
    );

    expect(output).toContain('Attributes: none\n\nSlots: none\n\nParts: none');
    expect(output).toContain('Events: none\n\nMethods: none');
    expect(output).toContain('CSS custom properties:\n- `--ki-derived`: ');
    expect(output).not.toContain('--legacy');
    expect(buildManifest({}).modules).toEqual([]);
  });

  it.each([
    [{ './ki-rich-item': './direct/ki-rich-item.js' }, 'direct/ki-rich-item.js'],
    [
      {
        './ki-rich-item': [
          null,
          { types: './types/ignored.d.ts', browser: './browser/ki-rich-item.js' },
        ],
      },
      'browser/ki-rich-item.js',
    ],
    [
      { './ki-rich-item': { import: null, default: './default/ki-rich-item.js' } },
      'default/ki-rich-item.js',
    ],
    [{ './ki-*': { node: './node/ki-*.js' } }, 'node/ki-rich-item.js'],
    [
      {
        './bad**': './bad/**.js',
        './*': { import: './wildcard/*.js' },
      },
      'wildcard/ki-rich-item.js',
    ],
  ])('resolves supported package-export shape %#', (packageExports, expectedPath) => {
    expect(buildManifest(richDocs, { packageExports }).modules[0].path).toBe(expectedPath);
  });

  it.each([
    { './ki-rich-item': { types: './dist/ki-rich-item.d.ts' } },
    { './ki-rich-item': 42 },
    { './ki-rich-item': '' },
    { './not-it': './dist/not-it.js' },
    { './ki-*-*': './dist/*-*.js' },
  ])('fails closed when no JavaScript export resolves %#', (packageExports) => {
    expect(() => buildManifest(richDocs, { packageExports })).toThrow(
      'ki-rich-item: no published JavaScript export resolves its module path',
    );
  });

  it('retains the source path only when the package-export contract is omitted', () => {
    expect(buildManifest(richDocs).modules[0].path).toBe(
      'src/components/ki-rich-item/ki-rich-item.tsx',
    );
  });
});
