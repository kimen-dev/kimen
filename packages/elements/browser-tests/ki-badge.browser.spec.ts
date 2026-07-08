import axe from 'axe-core';
import { page, userEvent } from 'vitest/browser';
import { beforeAll, describe, expect, it } from 'vitest';

// @spec:010-ki-badge
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
import tokensCss from '@kimen/tokens/css?raw';
import material3Css from '@kimen/tokens/css/material3?raw';
import { defineCustomElement } from '../dist/components/ki-badge.js';

type KiBadgeElement = HTMLElement & { tone: string; size: string };

const STYLE_ID = 'ki-badge-browser-token-style';
const MATERIAL3_STYLE_ID = 'ki-badge-browser-material3-token-style';
const tones = ['neutral', 'success', 'danger', 'info', 'warning'] as const;

beforeAll(() => {
  defineCustomElement();
});

function ensureTokens(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = tokensCss;
  document.head.appendChild(style);
}

function ensureMaterial3Tokens(): void {
  if (document.getElementById(MATERIAL3_STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = MATERIAL3_STYLE_ID;
  style.textContent = material3Css;
  document.head.appendChild(style);
}

function cleanup(): void {
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
  for (const el of document.body.querySelectorAll('ki-badge, button')) {
    el.remove();
  }
}

async function mount(
  label: string,
  attributes: Partial<Record<'tone' | 'size', string>> = {},
): Promise<KiBadgeElement> {
  ensureTokens();
  const el = document.createElement('ki-badge') as KiBadgeElement;
  for (const [name, value] of Object.entries(attributes)) {
    el.setAttribute(name, value);
  }
  el.textContent = label;
  document.body.appendChild(el);
  await customElements.whenDefined('ki-badge');
  const deadline = Date.now() + 2000;
  while (!el.shadowRoot?.querySelector('[part="badge"]') && Date.now() < deadline) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  return el;
}

function pillOf(el: KiBadgeElement): HTMLElement {
  const pill = el.shadowRoot?.querySelector<HTMLElement>('[part="badge"]');
  expect(pill).toBeTruthy();
  if (!pill) {
    throw new Error('ki-badge did not render its pill');
  }
  return pill;
}

function readTokenColor(name: string): string {
  const probe = document.createElement('div');
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

describe('ki-badge', () => {
  it('S1 renders the label as a one-line status pill with token metrics', async () => {
    cleanup();
    const el = await mount('Beta');
    const pill = pillOf(el);
    const computed = getComputedStyle(pill);

    expect(el.textContent).toBe('Beta');
    expect(computed.whiteSpace).toBe('nowrap');
    expect(computed.display).toBe('inline-flex');
  });

  it('S2 resolves each tone from its own token pair', async () => {
    cleanup();
    for (const tone of tones) {
      const el = await mount(tone, { tone });
      const computed = getComputedStyle(pillOf(el));
      expect(computed.backgroundColor, `${tone} bg`).toBe(readTokenColor(`--ki-badge-${tone}-bg`));
      expect(computed.color, `${tone} fg`).toBe(readTokenColor(`--ki-badge-${tone}-fg`));
      el.remove();
    }
  });

  it('S3 renders unknown tone and size values with the default appearance', async () => {
    cleanup();
    const control = await mount('Control');
    const neutralBg = getComputedStyle(pillOf(control)).backgroundColor;
    const controlHeight = getComputedStyle(pillOf(control)).blockSize;

    const el = await mount('Odd', { tone: 'chartreuse', size: 'xl' });
    const computed = getComputedStyle(pillOf(el));
    expect(computed.backgroundColor).toBe(neutralBg);
    expect(computed.blockSize).toBe(controlHeight);
  });

  it('S4 never takes keyboard focus', async () => {
    cleanup();
    const before = document.createElement('button');
    before.textContent = 'before';
    document.body.appendChild(before);
    const el = await mount('Static');
    const after = document.createElement('button');
    after.textContent = 'after';
    document.body.appendChild(after);

    before.focus();
    await userEvent.keyboard('{Tab}');

    expect(document.activeElement).toBe(after);
    expect(el.contains(document.activeElement)).toBe(false);
  });

  it('S5 exposes its meaning to assistive technology as plain text', async () => {
    cleanup();
    await mount('Payment overdue');

    await expect.element(page.getByText('Payment overdue')).toBeInTheDocument();
    const el = document.querySelector('ki-badge');
    expect(el?.getAttribute('role')).toBeNull();
    expect(el?.getAttribute('aria-label')).toBeNull();
  });

  it('S5 has zero axe violations across the tone matrix', async () => {
    cleanup();
    for (const tone of tones) {
      await mount(tone, { tone });
    }
    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });

  it('S6 restyles through material3 tokens alone without markup changes', async () => {
    cleanup();
    ensureTokens();
    const onmars = await mount('Beta', { tone: 'success' });
    const onmarsBg = getComputedStyle(pillOf(onmars)).backgroundColor;
    const markup = onmars.outerHTML;
    onmars.remove();

    ensureMaterial3Tokens();
    document.documentElement.setAttribute('data-ki-theme', 'material3');
    const el = await mount('Beta', { tone: 'success' });
    const computed = getComputedStyle(pillOf(el));

    expect(el.outerHTML).toBe(markup);
    expect(computed.backgroundColor).toBe(readTokenColor('--ki-badge-success-bg'));
    expect(computed.backgroundColor, 'material3 must restyle the pill').not.toBe(onmarsBg);
  });

  it('S8 renders an empty badge without error and exposes no stray text', async () => {
    cleanup();
    const el = await mount('');
    expect(pillOf(el)).toBeTruthy();
    expect(el.textContent.trim()).toBe('');
    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });
});
