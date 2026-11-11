const concurrency = Number(process.env['KIMEN_MUTATION_CONCURRENCY'] ?? 4);
if (!Number.isSafeInteger(concurrency) || concurrency < 1) {
  throw new Error('KIMEN_MUTATION_CONCURRENCY must be a positive integer');
}

/**
 * Stable Stencil mutation policy. Unit specs consume the built lazy loader;
 * browser specs consume dist/components. Rebuild both from instrumented source
 * and build the tokens used by browser fixtures in every sandbox.
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
  buildCommand: 'bash scripts/gates/build-mutation-elements.sh',
  // Each worker owns Chromium and Vitest. CI uses four; larger local machines
  // can explicitly budget more workers without changing the mutation policy.
  concurrency,
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
