/**
 * Stable Node mutation policy. T026 supplies the exact mutate set, scope-bound
 * report paths, temporary directory and force flag at the programmatic boundary.
 *
 * @satisfies {import('@stryker-mutator/api/core').PartialStrykerOptions & {
 *   vitest: { configFile: string, related: boolean, dir: string }
 * }}
 */
const config = {
  plugins: ['@stryker-mutator/vitest-runner'],
  ignorePatterns: [
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
    configFile: 'vitest.mutation.node.config.ts',
    related: false,
    dir: '.',
  },
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
