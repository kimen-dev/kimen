// Kimen deterministic layer: ESLint flat config (constitution Art. X).
// ESLint is the linter authority; Biome formats (stylistic rules stay off here).
// TODO(Fase 2): add @stencil-community/eslint-plugin when packages/elements has
// real components (requires type-aware tsx parsing per package).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import nxPlugin from '@nx/eslint-plugin';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '.nx/**',
      '**/*.md',
      '.specify/**',
      '.claude/**',
      '**/loader/**',
      '**/generated/**',
      '**/www/**',
      '**/storybook-static/**',
      'site-dist/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Public APIs never expose `any` (constitution, Technology Standards)
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      // Import hygiene: no barrels is enforced by Nx boundaries + knip
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    },
  },
  {
    files: ['**/*.tsx'],
    plugins: { 'jsx-a11y': jsxA11y },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      // Stencil classic JSX: `h` is the factory, referenced implicitly by the transform
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^(h|Fragment)$' }],
      // render() JSX return is idiomatic Stencil; the public API surface is props+JSDoc
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      // Known type-aware friction with Stencil's JSX factory under projectService;
      // tsc -p packages/elements (gates typecheck) is the type-safety authority for tsx.
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
  {
    plugins: { '@nx': nxPlugin },
    rules: {
      // Art. IV/VIII mechanical enforcement: no cross-package leakage, adapters isolated
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [],
          depConstraints: [
            {
              sourceTag: 'scope:tokens',
              onlyDependOnLibsWithTags: [],
            },
            {
              sourceTag: 'scope:elements',
              onlyDependOnLibsWithTags: ['scope:tokens'],
            },
            {
              sourceTag: 'scope:catalog',
              onlyDependOnLibsWithTags: ['scope:tokens'],
            },
            {
              sourceTag: 'scope:adapter',
              onlyDependOnLibsWithTags: ['scope:catalog', 'scope:elements'],
            },
          ],
        },
      ],
    },
  },
  {
    // Config and script files: relax type-aware rules (not part of shipped code)
    files: [
      '**/*.mjs',
      '**/*.config.ts',
      'scripts/**',
      'tools/**',
      'packages/*/scripts/**',
      '**/.storybook/**',
    ],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: {
        URL: 'readonly',
        console: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
  {
    // Browser specs intentionally import built custom-element JS from dist.
    // tsc still checks the test source; these imports are validated by build gates.
    files: ['packages/elements/browser-tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },
  {
    // Public site page script: plain browser ES module, outside any tsconfig
    // project (the landing ships no TypeScript; tokens do the heavy lifting)
    files: ['site/**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        IntersectionObserver: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
  {
    // Nx generator implementations are CommonJS (Nx loads them via require)
    files: ['tools/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'writable',
        exports: 'writable',
        __dirname: 'readonly',
        process: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
