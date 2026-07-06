// @spec:001-tokens-theming
import { beforeEach, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';

import onmarsCss from '@kimen/tokens/css?raw';

const STYLE_ID = 'kimen-tokens-dark-test-style';
const browserCommands = commands as unknown as {
  emulateColorScheme: (scheme: 'dark' | 'light' | null) => Promise<void>;
};

function injectStylesheet(_css: string): void {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = _css;
  document.head.appendChild(style);
}

function resetDocument(): void {
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
  document.getElementById(STYLE_ID)?.remove();
}

function readToken(name: string): string {
  const probe = document.createElement('div');
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).getPropertyValue(name).trim();
  probe.remove();
  return value;
}

function rgbToHex(value: string): string {
  const rgbPattern = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/u;
  const match = rgbPattern.exec(value);

  if (!match) {
    return value.toLowerCase();
  }

  return `#${[match[1], match[2], match[3]]
    .map((part) => Number(part).toString(16).padStart(2, '0'))
    .join('')}`;
}

function expectTokenColor(name: string, hex: string): void {
  expect(rgbToHex(readToken(name))).toBe(hex);
}

beforeEach(async () => {
  await browserCommands.emulateColorScheme('dark');
  resetDocument();
});

describe('onmars system dark and forced light schemes', () => {
  it('S2 follows the system dark color scheme automatically', () => {
    injectStylesheet(onmarsCss);

    expectTokenColor('--ki-surface-s0', '#0a0a0a');
  });

  it('S4 lets a document force light over a dark system preference', () => {
    injectStylesheet(onmarsCss);
    document.documentElement.setAttribute('data-ki-color-scheme', 'light');

    expectTokenColor('--ki-surface-s0', '#ffffff');
  });
});
