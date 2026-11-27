// @spec:001-tokens-theming
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import onmarsCss from '@kimen/tokens/css?raw';
import material3Css from '@kimen/tokens/css/material3?raw';
import { defineCustomElement as defineKiAlert } from '../dist/components/ki-alert.js';
import { defineCustomElement as defineKiBadge } from '../dist/components/ki-badge.js';
import { defineCustomElement as defineKiButton } from '../dist/components/ki-button.js';
import { defineCustomElement as defineKiCard } from '../dist/components/ki-card.js';
import { expectAccessible } from './axe';

const STYLE_ID = 'kimen-tokens-test-style';
const MATERIAL3_STYLE_ID = 'kimen-material3-tokens-test-style';

// These declarations defer to context. Chromium reports an empty custom
// property when its root declaration is the CSS-wide keyword inherit.
const inheritedDefaults = [
  '--ki-code-keyword-weight',
  '--ki-link-font-weight',
  '--ki-link-hover-fg',
  '--ki-link-neutral-hover-fg',
] as const;

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

/** The computed value of the custom property itself, exactly as declared. */
function readToken(name: string): string {
  const probe = document.createElement('div');
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).getPropertyValue(name).trim();
  probe.remove();
  return value;
}

/**
 * The colour a token paints. A scheme-dependent token is a `light-dark()`
 * value, and a custom property keeps that function unresolved: it only becomes
 * a colour where it is used, against the colour scheme of the element using
 * it. So the token is read the way a component consumes it — through a real
 * colour property.
 */
function readTokenColor(name: string): string {
  const probe = document.createElement('div');
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).color;
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
  expect(rgbToHex(readTokenColor(name))).toBe(hex);
}

function extractTokenNames(css: string): string[] {
  return [...new Set([...css.matchAll(/--ki-[\w-]+(?=\s*:)/gu)].map((match) => match[0]))].sort();
}

/** Required tokens resolve, and optional defaults remain declared. */
function expectEveryTokenResolved(names: readonly string[], absent: readonly string[]): void {
  expect(names).toEqual(expect.arrayContaining([...absent]));
  for (const name of names) {
    const value = readToken(name);
    if (absent.includes(name)) {
      expect(value, name).toBe('');
      continue;
    }
    expect(value, name).not.toBe('');
    // An unresolved reference would surface as a literal var() string —
    // a concrete value never contains one (clean-context review, round 1).
    expect(value, name).not.toMatch(/var\(/u);
  }
}

beforeAll(() => {
  defineKiAlert();
  defineKiBadge();
  defineKiButton();
  defineKiCard();
});

beforeEach(() => {
  resetDocument();
});

async function mountComponentTree(): Promise<HTMLElement> {
  const main = document.createElement('main');
  main.innerHTML = `
    <ki-button>Save changes</ki-button>
    <ki-badge>3</ki-badge>
    <ki-alert heading="Heads up">We could not save your changes</ki-alert>
    <ki-card>
      <h2 slot="header">Monthly report</h2>
      <p>Revenue increased.</p>
    </ki-card>
  `;
  document.body.append(main);
  await customElements.whenDefined('ki-button');
  await customElements.whenDefined('ki-badge');
  await customElements.whenDefined('ki-alert');
  await customElements.whenDefined('ki-card');
  await new Promise((resolve) => requestAnimationFrame(resolve));
  await new Promise((resolve) => requestAnimationFrame(resolve));
  return main;
}

describe('S1 onmars light default tokens', () => {
  it('S1 resolves the onmars brand and base surface without configuration', () => {
    injectStylesheet(onmarsCss);

    expectTokenColor('--ki-color-brand-500', '#bc4c26');
    expectTokenColor('--ki-surface-base', '#f9f7f4');
    expectTokenColor('--ki-surface-s0', '#ffffff');
  });

  it('S1 resolves all required tokens and leaves optional defaults unset', () => {
    injectStylesheet(onmarsCss);

    // In Calma the tooltip arrow takes the bubble color through #343's fallback.
    expectEveryTokenResolved(extractTokenNames(onmarsCss), [
      ...inheritedDefaults,
      '--ki-surface-image-tooltip-arrow-start',
      '--ki-surface-image-tooltip-arrow-end',
    ]);
  });
});

describe('S3 onmars forced dark scheme', () => {
  it('S3 lets a document force dark over a light system preference', () => {
    injectStylesheet(onmarsCss);
    document.documentElement.setAttribute('data-ki-color-scheme', 'dark');

    expectTokenColor('--ki-surface-base', '#1b1916');
  });
});

describe('material3 theme and fallback', () => {
  it('S5 restyles the document when material3 is declared', () => {
    injectStylesheet(onmarsCss);
    injectStylesheet(material3Css, MATERIAL3_STYLE_ID);
    document.documentElement.setAttribute('data-ki-theme', 'material3');

    expectTokenColor('--ki-color-brand-500', '#6750a4');
  });

  it('S6 resolves all required onmars tokens and keeps inherited defaults under material3', () => {
    injectStylesheet(onmarsCss);
    injectStylesheet(material3Css, MATERIAL3_STYLE_ID);
    document.documentElement.setAttribute('data-ki-theme', 'material3');
    const contract = extractTokenNames(onmarsCss);

    expect(contract.length).toBeGreaterThan(0);
    expectEveryTokenResolved(contract, inheritedDefaults);
  });

  it('S6 reassigns no token name outside the onmars contract', () => {
    const contract = new Set(extractTokenNames(onmarsCss));
    const reassigned = extractTokenNames(material3Css);

    // A theme stylesheet carries its overrides only: some names, never new ones.
    expect(reassigned.length).toBeGreaterThan(0);
    expect(reassigned.filter((name) => !contract.has(name))).toEqual([]);
  });

  it('S7 leaves unknown theme declarations on onmars', () => {
    injectStylesheet(onmarsCss);
    document.documentElement.setAttribute('data-ki-theme', 'acme');

    expectTokenColor('--ki-color-brand-500', '#bc4c26');
  });
});

describe('token-driven accessibility of a component tree', () => {
  // One axe case per theme proves the token VALUES each theme resolves keep a
  // representative multi-component tree accessible (contrast included) —
  // the per-component axe scans only ever run under onmars.
  it('S1 has zero axe violations for a component tree under the default onmars theme', async () => {
    injectStylesheet(onmarsCss);
    const main = await mountComponentTree();

    await expectAccessible(main);
    main.remove();
  });

  it('S5 has zero axe violations for the same component tree under material3', async () => {
    injectStylesheet(onmarsCss);
    injectStylesheet(material3Css, MATERIAL3_STYLE_ID);
    document.documentElement.setAttribute('data-ki-theme', 'material3');
    const main = await mountComponentTree();

    expectTokenColor('--ki-color-brand-500', '#6750a4');
    await expectAccessible(main);
    main.remove();
  });
});
