// @spec:001-tokens-theming
import { beforeEach, describe, expect, it } from 'vitest';

import onmarsCss from '@kimen/tokens/css?raw';
import material3Css from '@kimen/tokens/css/material3?raw';

const STYLE_ID = 'kimen-tokens-test-style';
const MATERIAL3_STYLE_ID = 'kimen-material3-tokens-test-style';

function injectStylesheet(_css: string, _id = STYLE_ID): void {
  const style = document.createElement('style');
  style.id = _id;
  style.textContent = _css;
  document.head.appendChild(style);
}

function resetDocument(): void {
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
  document.getElementById(STYLE_ID)?.remove();
  document.getElementById(MATERIAL3_STYLE_ID)?.remove();
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

function extractTokenNames(css: string): string[] {
  return [...new Set([...css.matchAll(/--ki-[\w-]+(?=\s*:)/gu)].map((match) => match[0]))].sort();
}

function extractSchemeTokenNames(css: string): { light: string[]; dark: string[] } {
  const light = new Set<string>();
  const dark = new Set<string>();
  const blockPattern = /([^{}]+)\{([^{}]*)\}/gu;

  for (const match of css.replace(/\/\*[\s\S]*?\*\//gu, '').matchAll(blockPattern)) {
    const selector = match[1]?.trim() ?? '';
    const names = [...(match[2] ?? '').matchAll(/--ki-[\w-]+(?=\s*:)/gu)].map(
      (nameMatch) => nameMatch[0],
    );

    if (selector.includes("data-ki-color-scheme='dark'")) {
      for (const name of names) {
        dark.add(name);
      }
    } else if (selector.includes(':root')) {
      for (const name of names) {
        light.add(name);
      }
    }
  }

  const mediaPattern =
    /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*([^{}]+)\{([^{}]*)\}\s*\}/gu;

  for (const match of css.replace(/\/\*[\s\S]*?\*\//gu, '').matchAll(mediaPattern)) {
    for (const nameMatch of (match[2] ?? '').matchAll(/--ki-[\w-]+(?=\s*:)/gu)) {
      dark.add(nameMatch[0]);
    }
  }

  return {
    light: [...light].sort(),
    dark: [...new Set([...light, ...dark])].sort(),
  };
}

beforeEach(() => {
  resetDocument();
});

describe('S1 onmars light default tokens', () => {
  it('S1 resolves the onmars brand and base surface without configuration', () => {
    injectStylesheet(onmarsCss);

    expectTokenColor('--ki-color-brand-500', '#845abe');
    expectTokenColor('--ki-surface-s0', '#ffffff');
  });

  it('S1 resolves every published token name to a concrete value', () => {
    injectStylesheet(onmarsCss);

    for (const name of extractTokenNames(onmarsCss)) {
      expect(readToken(name), name).not.toBe('');
    }
  });
});

describe('S3 onmars forced dark scheme', () => {
  it('S3 lets a document force dark over a light system preference', () => {
    injectStylesheet(onmarsCss);
    document.documentElement.setAttribute('data-ki-color-scheme', 'dark');

    expectTokenColor('--ki-surface-s0', '#0a0a0a');
  });
});

describe('material3 theme and fallback', () => {
  it('S5 restyles the document when material3 is declared', () => {
    injectStylesheet(onmarsCss);
    injectStylesheet(material3Css, MATERIAL3_STYLE_ID);
    document.documentElement.setAttribute('data-ki-theme', 'material3');

    expectTokenColor('--ki-color-brand-500', '#6750a4');
  });

  it('S6 exposes the identical token contract as onmars', () => {
    expect(extractSchemeTokenNames(material3Css)).toEqual(extractSchemeTokenNames(onmarsCss));
  });

  it('S7 leaves unknown theme declarations on onmars', () => {
    injectStylesheet(onmarsCss);
    document.documentElement.setAttribute('data-ki-theme', 'acme');

    expectTokenColor('--ki-color-brand-500', '#845abe');
  });
});
