// Kimen tokens: DTCG sources → CSS custom properties (constitution Art. VI).
// Layers: primitive → theme (onmars is the default theme) → semantic.
// Dark mode is a semantic-layer mode compiled to prefers-color-scheme with a
// [data-ki-color-scheme] attribute override. Run via ./build.mjs.
import { readdirSync } from 'node:fs';

import { formattedVariables } from 'style-dictionary/utils';

const comparePath = (left, right) => (left < right ? -1 : left > right ? 1 : 0);
const componentDirectory = new URL('./tokens/component/', import.meta.url);
const componentSources = readdirSync(componentDirectory, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.tokens.json'))
  .map((entry) => `tokens/component/${entry.name}`)
  .sort(comparePath);
const componentBaseLayers = componentSources.filter(
  (sourcePath) => !sourcePath.endsWith('.material3.tokens.json'),
);
const material3ComponentOverrides = componentSources.filter((sourcePath) =>
  sourcePath.endsWith('.material3.tokens.json'),
);
const componentBases = new Set(componentBaseLayers);

for (const overridePath of material3ComponentOverrides) {
  const basePath = overridePath.replace('.material3.tokens.json', '.tokens.json');
  if (!componentBases.has(basePath)) {
    throw new Error(`Component token override has no base source: ${overridePath}`);
  }
}

const ONMARS_FOUNDATION = ['tokens/primitive.tokens.json', 'tokens/themes/onmars.tokens.json'];
const ONMARS_SEMANTIC = ['tokens/semantic.tokens.json'];
// The material3 layer only overrides tokens the base layers already define
// (theme over onmars theme, semantic over semantic, component over component).
const MATERIAL3_OVERRIDES = [
  'tokens/themes/material3.tokens.json',
  'tokens/semantic/material3.tokens.json',
  ...material3ComponentOverrides,
];

// Every composition is layer-ordered, while file discovery within the
// component layer is deterministic: all bases first, then theme overrides.
const LAYERS = [...ONMARS_FOUNDATION, ...ONMARS_SEMANTIC, ...componentBaseLayers];

// Layer overrides are declared through Style Dictionary's include/source
// split: overriding an `include` token from `source` is silent by design,
// while two `source` files colliding still emits a "Token collisions
// detected" warning. Each layer stays collision-checked as `source` in
// exactly one build (base layers in lightConfig, material3 overrides in
// material3LightConfig, each dark-mode file as the sole source of its own
// config), so intentional overrides are quiet and a genuine duplicate —
// e.g. two component files defining the same token — still warns.

function variables({ dictionary, options, indentation = '  ' }) {
  return formattedVariables({
    format: 'css',
    dictionary,
    outputReferences: options.outputReferences,
    usesDtcg: options.usesDtcg ?? true,
    formatting: { indentation },
  });
}

function material3DarkFormat({ dictionary, options }) {
  const media = variables({ dictionary, options, indentation: '    ' });
  const attr = variables({ dictionary, options });

  return [
    '/* material3 dark mode: follows the OS by default; force with',
    '   [data-ki-color-scheme="dark"|"light"] on :root. */',
    '@media (prefers-color-scheme: dark) {',
    "  :root[data-ki-theme='material3']:not([data-ki-color-scheme='light']) {",
    media,
    '  }',
    '}',
    '',
    ":root[data-ki-theme='material3'][data-ki-color-scheme='dark'] {",
    attr,
    '}',
    '',
  ].join('\n');
}

export const lightConfig = {
  source: LAYERS,
  platforms: {
    css: {
      transformGroup: 'css',
      prefix: '',
      buildPath: 'dist/css/',
      files: [
        {
          destination: 'tokens.light.css',
          format: 'css/variables',
          options: { outputReferences: true },
        },
      ],
    },
  },
};

export const material3LightConfig = {
  include: LAYERS,
  source: MATERIAL3_OVERRIDES,
  hooks: {
    formats: {
      'kimen/css-material3-light': ({ dictionary, options }) =>
        [
          '/**',
          ' * Do not edit directly, this file was auto-generated.',
          ' */',
          '',
          ":root[data-ki-theme='material3'] {",
          variables({ dictionary, options }),
          '}',
          '',
        ].join('\n'),
    },
  },
  platforms: {
    css: {
      transformGroup: 'css',
      prefix: '',
      buildPath: 'dist/css/',
      files: [
        {
          destination: 'tokens.material3.light.css',
          format: 'kimen/css-material3-light',
          options: { outputReferences: true },
        },
      ],
    },
  },
};

export const darkConfig = {
  include: LAYERS,
  source: ['tokens/modes/dark.tokens.json'],
  hooks: {
    formats: {
      'kimen/css-dark': ({ dictionary, options }) => {
        const usesDtcg = options.usesDtcg ?? true;
        const outputReferences = options.outputReferences;
        const media = formattedVariables({
          format: 'css',
          dictionary,
          outputReferences,
          usesDtcg,
          formatting: { indentation: '    ' },
        });
        const attr = formattedVariables({
          format: 'css',
          dictionary,
          outputReferences,
          usesDtcg,
          formatting: { indentation: '  ' },
        });
        return [
          '/* onmars dark mode: follows the OS by default; force with',
          '   [data-ki-color-scheme="dark"|"light"] on :root. */',
          '@media (prefers-color-scheme: dark) {',
          "  :root:not([data-ki-color-scheme='light']) {",
          media,
          '  }',
          '}',
          '',
          ":root[data-ki-color-scheme='dark'] {",
          attr,
          '}',
          '',
        ].join('\n');
      },
    },
  },
  platforms: {
    css: {
      transformGroup: 'css',
      prefix: '',
      buildPath: 'dist/css/',
      // Combining the modes/dark filter with outputReferences makes Style
      // Dictionary warn about "filtered out token references": the dark file
      // emits var(--ki-*) references to tokens it does not define. That is
      // the intent — those custom properties are defined on :root by
      // tokens.light.css and both files ship concatenated in tokens.css, but
      // Style Dictionary cannot see across output files and offers no
      // per-warning switch, so file-level warnings are disabled for this
      // platform only. Genuinely broken references still fail the build
      // (log.errors.brokenReferences defaults to 'throw'), and token
      // collisions are reported at config level, which this does not touch.
      log: { warnings: 'disabled' },
      files: [
        {
          destination: 'tokens.dark.css',
          format: 'kimen/css-dark',
          filter: (token) => token.filePath.includes('modes/dark'),
          options: { outputReferences: true },
        },
      ],
    },
  },
};

export const material3DarkConfig = {
  include: [...LAYERS, ...MATERIAL3_OVERRIDES],
  source: ['tokens/modes/material3.dark.tokens.json'],
  hooks: {
    formats: {
      'kimen/css-material3-dark': material3DarkFormat,
    },
  },
  platforms: {
    css: {
      transformGroup: 'css',
      prefix: '',
      buildPath: 'dist/css/',
      files: [
        {
          destination: 'tokens.material3.dark.css',
          format: 'kimen/css-material3-dark',
          options: { outputReferences: true },
        },
      ],
    },
  },
};
