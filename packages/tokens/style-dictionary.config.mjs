// Kimen tokens: DTCG sources → CSS custom properties (constitution Art. VI).
// Layers: primitive → theme (onmars is the default theme) → semantic.
// Dark mode is a semantic-layer mode compiled to prefers-color-scheme with a
// [data-ki-color-scheme] attribute override. Run via ./build.mjs.
import { formattedVariables } from 'style-dictionary/utils';

const LAYERS = [
  'tokens/primitive.tokens.json',
  'tokens/themes/onmars.tokens.json',
  'tokens/semantic.tokens.json',
  'tokens/component/button.tokens.json',
  'tokens/component/tabs.tokens.json',
  'tokens/component/tab.tokens.json',
  'tokens/component/tab-panel.tokens.json',
];
const MATERIAL3_LAYERS = [
  ...LAYERS,
  'tokens/themes/material3.tokens.json',
  'tokens/semantic/material3.tokens.json',
  'tokens/component/button.material3.tokens.json',
  'tokens/component/tab.material3.tokens.json',
];

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
  source: MATERIAL3_LAYERS,
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
  source: [...MATERIAL3_LAYERS, 'tokens/modes/material3.dark.tokens.json'],
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
