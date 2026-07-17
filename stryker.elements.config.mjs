/**
 * Stable Stencil mutation policy. Component specs consume the built lazy
 * loader, so every sandbox rebuilds from the instrumented source before tests.
 * T026 supplies all scope-specific paths and flags programmatically.
 *
 * @satisfies {import('@stryker-mutator/api/core').PartialStrykerOptions & {
 *   vitest: { configFile: string, related: boolean, dir: string }
 * }}
 */
const config = {
  plugins: ['@stryker-mutator/vitest-runner'],
  ignorePatterns: [
    // .claude/skills is a tracked directory SYMLINK (Claude compatibility
    // view of .agents/skills); fs.copyFile into the sandbox follows it and
    // fails (ENOTSUP/EISDIR). Agent tooling is never a mutation input anyway.
    '/.claude',
    '/.nx',
    '/.stryker-tmp',
    '/packages/*/dist',
    '/packages/elements/loader',
    '/reports',
    '/storybook-static',
    '/site-dist',
  ],
  testRunner: 'vitest',
  vitest: {
    configFile: 'vitest.mutation.elements.config.ts',
    related: false,
    dir: '.',
  },
  buildCommand: 'pnpm --filter @kimen/elements exec stencil build',
  coverageAnalysis: 'perTest',
  thresholds: {
    high: 70,
    low: 70,
    break: 70,
  },
  reporters: ['clear-text', 'json'],
  incremental: true,
  allowEmpty: false,
};

export default config;
