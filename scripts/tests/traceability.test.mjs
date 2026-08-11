import assert from 'node:assert/strict';
import test from 'node:test';

import { createFixtureRepo } from './helpers/fixture-repo.mjs';

const featureId = '999-fixture';
const marker = `@spec:${featureId}`;

test('discovers executable scenario evidence across declared roots and test extensions', async (t) => {
  const fixture = await createFixtureRepo({
    featureId,
    scenarioIds: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'],
    files: {
      'packages/example/component.spec.ts': `// ${marker}\ntest('S1 package spec', () => {});\n`,
      'scripts/tests/policy.test.mjs': `// ${marker}\ntest('S2 node esm', () => {});\n`,
      '.github/scripts/review.test.cjs': `// ${marker}\ntest('S3 node cjs', () => {});\n`,
      'sandbox/tests/containment.test.sh': `# ${marker}\nrun_case S4 sandbox-shell\n`,
      'tools/plugin/generator.spec.js': `// ${marker}\ntest('S5 generator', () => {});\n`,
      'packages/example/browser.e2e.ts': `// ${marker}\ntest('S6 browser', () => {});\n`,
      'packages/example/view.spec.tsx': `// ${marker}\ntest('S7 tsx', () => {});\n`,
    },
  });
  t.after(() => fixture.cleanup());

  const result = await fixture.runTraceability();

  assert.equal(result.code, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /GATE traceability: PASS/);
});

test('rejects scenario IDs that appear only in line, block, or trailing comments', async (t) => {
  const fixture = await createFixtureRepo({
    featureId,
    scenarioIds: ['S1', 'S2', 'S3', 'S4'],
    files: {
      'packages/example/comment-only.spec.ts': `// ${marker}\n// S1 is not evidence\n`,
      'sandbox/tests/comment-only.test.sh': `# ${marker}\n# S2 is not evidence\n`,
      'scripts/tests/block-comment.test.mjs': `// ${marker}\n/*\nS3 is not evidence\n*/\ntest('fixture', () => {});\n`,
      'tools/example/trailing-comment.spec.js': `// ${marker}\ntest('fixture', () => {}); // S4 is not evidence\n`,
    },
  });
  t.after(() => fixture.cleanup());

  const result = await fixture.runTraceability();

  assert.notEqual(result.code, 0);
  assert.match(result.stdout, /S1 has no reference in code lines/);
  assert.match(result.stdout, /S2 has no reference in code lines/);
  assert.match(result.stdout, /S3 has no reference in code lines/);
  assert.match(result.stdout, /S4 has no reference in code lines/);
});

test('rejects a scenario ID in a comment that trails an apostrophe-bearing regex', async (t) => {
  // The mirror of the glob case below, and the reason the scanner has to know
  // about regex literals: the apostrophe in `don't` is in neither a string nor
  // a comment. Read as a string opener it swallows the `//` that follows, and
  // the comment counts as evidence — the exact gaming vector the "comments do
  // not count" rule exists to block.
  const fixture = await createFixtureRepo({
    featureId,
    scenarioIds: ['S1', 'S2'],
    files: {
      'scripts/tests/regex.test.mjs': [
        `// ${marker}`,
        "const contraction = /don't/u;  // S1 is not evidence",
        "const another = /don't/u; /* S2 is not evidence */",
        '',
      ].join('\n'),
    },
  });
  t.after(() => fixture.cleanup());

  const result = await fixture.runTraceability();

  assert.notEqual(result.code, 0);
  assert.match(result.stdout, /S1 has no reference in code lines/);
  assert.match(result.stdout, /S2 has no reference in code lines/);
});

test('reads evidence that follows a block comment containing an apostrophe', async (t) => {
  // The case that broke the first attempt at this fix: blanking string spans
  // before locating comment openers makes the apostrophe in `radio's` swallow
  // the comment's own `*/`, so the block never closes and every following line
  // disappears. Strings and comments have to be recognized in one pass.
  const fixture = await createFixtureRepo({
    featureId,
    scenarioIds: ['S1'],
    files: {
      'scripts/tests/jsdoc.test.mjs': [
        `// ${marker}`,
        "/** What a radio's control actually paints, disabled or not. */",
        "test('S1 paints its control', () => {});",
        '',
      ].join('\n'),
    },
  });
  t.after(() => fixture.cleanup());

  const result = await fixture.runTraceability();

  assert.equal(result.code, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /GATE traceability: PASS/);
});

test('reads evidence that follows a glob string literal shaped like a block comment', async (t) => {
  // `'/assets/fonts/*'` is a Cloudflare `_headers` pattern, not a comment
  // opener. Treating it as one silently discarded every line after it — the
  // whole of scripts/tests/site-publication.test.mjs — so the gate reported
  // PASS on evidence it had never read.
  const fixture = await createFixtureRepo({
    featureId,
    scenarioIds: ['S1'],
    files: {
      'scripts/tests/globs.test.mjs': [
        `// ${marker}`,
        "const immutable = ['/assets/fonts/*'];",
        "test('S1 caches ' + immutable[0], () => {});",
        '',
      ].join('\n'),
    },
  });
  t.after(() => fixture.cleanup());

  const result = await fixture.runTraceability();

  assert.equal(result.code, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /GATE traceability: PASS/);
});

test('ignores fixtures, generated outputs, dependencies, and undeclared roots', async (t) => {
  const executableClaim = `// ${marker}\ntest('S1 false evidence', () => {});\n`;
  const fixture = await createFixtureRepo({
    featureId,
    files: {
      'scripts/tests/fixtures/false-evidence.test.mjs': executableClaim,
      'packages/example/node_modules/dependency.test.js': executableClaim,
      'packages/example/dist/output.spec.js': executableClaim,
      'packages/example/generated/docs.test.mjs': executableClaim,
      'packages/example/coverage/report.test.mjs': executableClaim,
      'packages/example/.stryker-tmp/mutant.spec.js': executableClaim,
      'packages/example/reports/mutation.test.mjs': executableClaim,
      'packages/example/test-results/result.test.mjs': executableClaim,
      'packages/example/playwright-report/report.test.mjs': executableClaim,
      'outside/tests/undeclared.test.mjs': executableClaim,
    },
  });
  t.after(() => fixture.cleanup());

  const result = await fixture.runTraceability();

  assert.notEqual(result.code, 0);
  assert.match(result.stdout, /no test file under declared roots/);
});
