import { readFileSync } from 'node:fs';

import { expect, it } from 'vitest';

import { checkTheme } from '../../packages/tokens/theme-checker/check-theme.mjs';

it('reports every kind of finding in source order with a useful location and fix', () => {
  const file = 'theme-mistakes.css';
  const css = readFileSync(
    new URL(`../../packages/tokens/scripts/fixtures/${file}`, import.meta.url),
    'utf8',
  );
  const findings = checkTheme(css, { file });
  expect(findings.map(({ code, line }) => [code, line])).toEqual([
    ['unknown-token', 3],
    ['unitless-dimension', 4],
    ['unread-token', 5],
    ['private-token', 6],
    ['type-mismatch', 7],
    ['type-mismatch', 8],
    ['type-mismatch', 9],
    ['mode-token', 14],
  ]);
  expect(findings[0]).toMatchObject({
    file,
    column: 3,
    fix: 'Did you mean --ki-switch-track-width?',
    severity: 'error',
  });
  expect(findings[2].severity).toBe('warning');
  expect(findings.at(-1).fix).toContain('--ki-contrast-more-text-supporting');
});

it('allows CSS functions and keywords and ignores declarations in CSS strings', () => {
  const css = `:root {
    content: '; --ki-unknown: 4px;';
    --ki-button-md-height: auto;
    --ki-button-padding-block: calc(2 * 1em);
    --ki-button-md-padding-inline: 0 0.5em;
    --ki-duration-fast: 0ms;
  }`;
  expect(checkTheme(css)).toEqual([]);
});

it('uses edit distance for names without a default-size correction', () => {
  const [finding] = checkTheme(':root{--ki-button-paddinng-block:4px}');
  expect(finding.fix).toBe('Did you mean --ki-button-padding-block?');
});
