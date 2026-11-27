// @spec:171-theme-checker
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { checkTheme } from '../theme-checker/check-theme.mjs';
import { packThemeCheckerData } from './generate-theme-checker-data.mjs';

const filePath = (relative) => fileURLToPath(new URL(relative, import.meta.url));
const fixture = filePath('./fixtures/theme-mistakes.css');
const findings = () => checkTheme(readFileSync(fixture, 'utf8'), { file: fixture });
const manifest = JSON.parse(readFileSync(filePath('../package.json'), 'utf8'));
const runCli = (nodeArgs, args) =>
  spawnSync(
    process.execPath,
    [...nodeArgs, filePath(`../${manifest.bin['kimen-tokens']}`), ...args],
    {
      encoding: 'utf8',
    },
  );
const cli = (...args) => runCli([], args);

test('S1: an unknown name gets the unprefixed public token and a source location', () => {
  assert.deepEqual(findings()[0], {
    code: 'unknown-token',
    severity: 'error',
    file: fixture,
    line: 3,
    column: 3,
    token: '--ki-switch-md-track-width',
    fix: 'Did you mean --ki-switch-track-width?',
  });
  const [typo] = checkTheme(':root { --ki-button-label-paddding-inline: 1px }');
  assert.match(typo.fix, /--ki-button-label-padding-inline/u);
});

test('S2: bare zero suggests an explicit length while CSS functions and sizing keywords pass', () => {
  assert.equal(findings()[1].code, 'unitless-dimension');
  assert.match(findings()[1].fix, /0px/u);
  assert.deepEqual(
    checkTheme(`:root {
      --ki-button-md-height: auto;
      --ki-button-label-padding-inline: calc(2 * 1em);
      --ki-button-padding-block: 0em;
      --ki-button-md-padding-inline: 1em 2em;
      --ki-switch-track-width: var(--size, clamp(1px, 50%, 3rem));
    }`),
    [],
  );
});

test('S3: only unread component tokens yield warnings and the check succeeds', () => {
  const warningFile = filePath('./fixtures/theme-warning.css');
  const data = packThemeCheckerData({
    modes: [],
    tokens: [
      ['surface-warning-high-em', 1],
      ['color-gray-800', 1],
      ['example-bg', 5],
    ],
  });
  // The shipped inventory has no unread tokens. Substitute a fixture inventory
  // so this test still checks the installed CLI's warnings-only exit status.
  const inventoryUrl = new URL('../dist/theme-checker-data.mjs', import.meta.url).href;
  const preload = `import { registerHooks } from 'node:module';
    registerHooks({
      load(url, context, nextLoad) {
        if (url !== ${JSON.stringify(inventoryUrl)}) return nextLoad(url, context);
        return { format: 'module', source: ${JSON.stringify(`export default '${data}';`)}, shortCircuit: true };
      },
    });`;
  const result = runCli(
    ['--import', `data:text/javascript,${encodeURIComponent(preload)}`],
    ['check-theme', '--json', warningFile],
  );
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    JSON.parse(result.stdout).map(({ code, severity, token }) => [code, severity, token]),
    [['unread-token', 'warning', '--ki-example-bg']],
  );
});

test('S4: active preference overrides suggest the mode-value token that wins', () => {
  assert.equal(findings().at(-1).code, 'mode-token');
  assert.match(findings().at(-1).fix, /--ki-contrast-more-text-supporting/u);
  const css = `@layer theme {
    [data-ki-contrast] {
      & .panel {
        --ki-text-supporting: black;
        --ki-contrast-more-text-supporting: black;
      }
    }
    [data-ki-transparency="reduce"] { --ki-surface-primary-tint: black; }
    [data-ki-contrast="less"] { --ki-text-supporting: black; }
  }`;
  assert.deepEqual(
    checkTheme(css).map(({ code, fix }) => [code, fix]),
    [
      ['mode-token', 'Set --ki-contrast-more-text-supporting instead.'],
      ['mode-token', 'Set --ki-reduced-transparency-surface-primary-tint instead.'],
    ],
  );
});

test('S5: Material 3 checks clean, errors and warnings', () => {
  const file = filePath('../dist/css/tokens.material3.css');
  const css = readFileSync(file, 'utf8');
  const result = cli('check-theme', file, '--json');
  assert.equal(result.status, 0, result.stderr);
  const findings = JSON.parse(result.stdout);
  const unreadTokens = JSON.parse(
    readFileSync(filePath('./fixtures/material3-unread-tokens.json'), 'utf8'),
  );
  assert.deepEqual(unreadTokens, []);
  assert.deepEqual(findings, unreadTokens);
  assert.deepEqual(checkTheme(`${css}\n/* Theme notes */`, { file }), findings);
});

test('S7: unused palette and primitive overrides and a component alias target produce no warnings', () => {
  assert.deepEqual(
    checkTheme(`:root {
      --ki-color-brand-400: #333;
      --ki-color-gray-800: #333;
      --ki-dialog-bg-start: #333;
    }`),
    [],
  );
});

test('S8: kimen-tokens is the only installed command', () => {
  assert.deepEqual(Object.keys(manifest.bin), ['kimen-tokens']);
});

test('S9: color tokens accept CSS colors and substitutions and reject incompatible literals', () => {
  for (const value of [
    'red',
    'transparent',
    'currentColor',
    'CanvasText',
    '#1234',
    'rgb(0 0 0 / 50%)',
    'hsl(60 100% 50%)',
    'hwb(60 0% 0%)',
    'lab(50% 20 30)',
    'lch(50% 20 30)',
    'oklab(.5 .1 .1)',
    'oklch(.5 .1 30)',
    'color(display-p3 1 0 0)',
    'color-mix(in oklab, red, blue)',
    'light-dark(black, white)',
    'rgb(from red r g b)',
    'var(--brand, red)',
    'env(--brand, red)',
    'attr(data-brand type(<color>), red)',
    'inherit',
    'initial',
    'unset',
    'revert',
    'revert-layer',
  ]) {
    assert.deepEqual(checkTheme(`:root { --ki-text-supporting: ${value}; }`), [], value);
  }

  for (const value of ['"red"', '0', '1px', '50%', 'url(red)', 'URL("red")', 'src("red")', '']) {
    const findings = checkTheme(`:root { --ki-text-supporting: ${value}; }`);
    assert.deepEqual(
      findings.map(({ code, severity, token }) => [code, severity, token]),
      [['type-mismatch', 'error', '--ki-text-supporting']],
      value,
    );
  }
});

test('the CLI reports each mistake and preserves input order across files', () => {
  const clean = filePath('../dist/css/base.css');
  const result = cli('check-theme', fixture, clean, '--json');
  assert.equal(result.status, 1, result.stderr);
  const actual = JSON.parse(result.stdout);
  assert.deepEqual(actual, findings());
  assert.deepEqual(
    actual.map(({ code }) => code),
    [
      'unknown-token',
      'unitless-dimension',
      'private-token',
      'type-mismatch',
      'type-mismatch',
      'type-mismatch',
      'type-mismatch',
      'mode-token',
    ],
  );
  const human = cli('check-theme', fixture);
  assert.ok(human.stdout.includes(`${fixture}:4:3`));
  assert.match(human.stdout, /0px/u);
});

test('a duration requires a time unit for a literal value', () => {
  const css = ':root { --ki-duration-fast: red; --ki-duration-fast: 0s; }';
  assert.deepEqual(
    checkTheme(css).map(({ code }) => code),
    ['type-mismatch'],
  );
});

test('token detection respects CSS strings, selectors, nesting, escapes and comments', () => {
  const css = String.raw`
    [title="[data-ki-contrast]"] {
      --unrelated: { --ki-mistake: 0; };
      content: "--_ki-fake: 0; }";
      @supports (--ki-mistake: 0) {
        & { --ki-button-padding-bl\6f ck /* size */: /* zero */0 !important }
      }
      --ki-text-supporting: red;
    }
  `;
  assert.deepEqual(
    checkTheme(css).map(({ code, token, line }) => [code, token, line]),
    [['unitless-dimension', '--ki-button-padding-block', 6]],
  );
});
