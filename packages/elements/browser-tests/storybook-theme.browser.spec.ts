// The Storybook manager theme paints kimen.dev's onmars colors (#520, item
// 24). Storybook needs literal values, so .storybook/onmars-palette.ts holds
// each token's resolved value; this resolves every token in the browser, in
// both schemes, and fails when the palette has drifted from the tokens.
import tokensCss from '@kimen/tokens/css?raw';
import { afterEach, describe, expect, it } from 'vitest';
import { onmarsPalette } from '../.storybook/onmars-palette';

// .storybook is outside every type-checked project, so the linter sees the
// import untyped; state the shape the theme relies on.
type Palette = Readonly<
  Record<'light' | 'dark', Readonly<Record<string, { value: string; token: string }>>>
>;
const palette = onmarsPalette as unknown as Palette;

let cleanup: (() => void) | undefined;

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
});

describe('the Storybook manager theme', () => {
  it.each(['light', 'dark'] as const)('uses the onmars %s tokens as they resolve', (scheme) => {
    const sheet = document.createElement('style');
    sheet.textContent = tokensCss;
    const probe = document.createElement('div');
    probe.dataset.kiColorScheme = scheme;
    document.head.append(sheet);
    document.body.append(probe);
    cleanup = () => {
      sheet.remove();
      probe.remove();
    };
    const resolve = (color: string) => {
      probe.style.color = color;
      return getComputedStyle(probe).color;
    };

    for (const [name, { value, token }] of Object.entries(palette[scheme])) {
      expect(resolve(value), `${name} must equal ${token} in ${scheme}`).toBe(
        resolve(`var(${token})`),
      );
    }
  });
});
