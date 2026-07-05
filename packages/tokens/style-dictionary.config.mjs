// Kimen tokens: DTCG sources → CSS custom properties (constitution Art. VI).
// Layers: primitive → theme (onmars is the default theme) → semantic.
// Dark mode is a semantic-layer mode compiled to prefers-color-scheme with a
// [data-ki-color-scheme] attribute override. Run via ./build.mjs.
import { formattedVariables } from 'style-dictionary/utils';

const LAYERS = [
  'tokens/primitive.tokens.json',
  'tokens/themes/onmars.tokens.json',
  'tokens/semantic.tokens.json',
];

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
          "[data-ki-color-scheme='dark'] {",
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
