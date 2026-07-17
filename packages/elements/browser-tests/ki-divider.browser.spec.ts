import material3Css from '@kimen/tokens/css/material3?raw';
// @spec:020-ki-divider
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
import tokensCss from '@kimen/tokens/css?raw';
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { defineCustomElement } from '../dist/components/ki-divider.js';

type KiDividerElement = HTMLElement & { orientation: string };

const STYLE_ID = 'ki-divider-browser-token-style';
const MATERIAL3_STYLE_ID = 'ki-divider-browser-material3-token-style';

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

function landmark(): HTMLElement {
  let main = document.querySelector('main');
  if (!main) {
    main = document.createElement('main');
    document.body.appendChild(main);
  }
  return main;
}

function cleanup(): void {
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
  landmark().replaceChildren();
}

/** Stencil renders async: wait until the rule part exists (no text content). */
async function mount(
  container: HTMLElement,
  attributes: Partial<Record<'orientation', string>> = {},
): Promise<KiDividerElement> {
  ensureTokens();
  const el = document.createElement('ki-divider') as KiDividerElement;
  for (const [name, value] of Object.entries(attributes)) {
    el.setAttribute(name, value);
  }
  container.appendChild(el);
  await customElements.whenDefined('ki-divider');
  const deadline = Date.now() + 2000;
  while (!el.shadowRoot?.querySelector('[part="divider"]') && Date.now() < deadline) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  return el;
}

function ruleOf(el: KiDividerElement): HTMLElement {
  const rule = el.shadowRoot?.querySelector<HTMLElement>('[part="divider"]');
  expect(rule).toBeTruthy();
  if (!rule) {
    throw new Error('ki-divider did not render its rule');
  }
  return rule;
}

function readTokenColor(name: string): string {
  const probe = document.createElement('div');
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

function readTokenLength(name: string): number {
  const probe = document.createElement('div');
  probe.style.blockSize = `var(${name})`;
  document.body.appendChild(probe);
  const value = Number.parseFloat(getComputedStyle(probe).blockSize);
  probe.remove();
  return value;
}

describe('ki-divider', () => {
  it('S1 separates stacked sections with a horizontal rule spanning the available width', async () => {
    cleanup();
    const page = document.createElement('div');
    page.style.inlineSize = '240px';
    const profile = document.createElement('section');
    profile.textContent = 'Profile';
    page.appendChild(profile);
    landmark().appendChild(page);
    const el = await mount(page);
    const notifications = document.createElement('section');
    notifications.textContent = 'Notifications';
    page.appendChild(notifications);

    const rect = ruleOf(el).getBoundingClientRect();
    expect(rect.width).toBe(240);
    expect(rect.height).toBe(readTokenLength('--ki-divider-thickness'));
    // The reserved gutter (FR-007): the host spans the token cross size with
    // the rule centered in it.
    expect(el.getBoundingClientRect().height).toBe(readTokenLength('--ki-divider-spacing'));
  });

  it('S2 separates side-by-side toolbar groups with a vertical rule spanning its height', async () => {
    cleanup();
    const toolbar = document.createElement('div');
    toolbar.style.display = 'flex';
    toolbar.style.blockSize = '120px';
    const edit = document.createElement('div');
    edit.textContent = 'Edit';
    toolbar.appendChild(edit);
    landmark().appendChild(toolbar);
    const el = await mount(toolbar, { orientation: 'vertical' });
    const share = document.createElement('div');
    share.textContent = 'Share';
    toolbar.appendChild(share);

    const rect = ruleOf(el).getBoundingClientRect();
    expect(rect.height).toBe(120);
    expect(rect.width).toBe(readTokenLength('--ki-divider-thickness'));
    expect(el.getBoundingClientRect().width).toBe(readTokenLength('--ki-divider-spacing'));
  });

  it('S3 renders an unrecognized orientation as the default horizontal rule', async () => {
    cleanup();
    const page = document.createElement('div');
    page.style.inlineSize = '240px';
    landmark().appendChild(page);
    const control = await mount(page);
    const controlRect = ruleOf(control).getBoundingClientRect();

    const el = await mount(page, { orientation: 'inset' });
    const rect = ruleOf(el).getBoundingClientRect();
    expect(rect.width).toBe(controlRect.width);
    expect(rect.height).toBe(controlRect.height);
    expect(el.getBoundingClientRect().height).toBe(control.getBoundingClientRect().height);
  });

  it('S4 adds no keyboard stop between Save and Cancel', async () => {
    cleanup();
    const save = document.createElement('button');
    save.textContent = 'Save';
    landmark().appendChild(save);
    const el = await mount(landmark());
    const cancel = document.createElement('button');
    cancel.textContent = 'Cancel';
    landmark().appendChild(cancel);

    save.focus();
    expect(document.activeElement).toBe(save);
    await userEvent.keyboard('{Tab}');

    expect(document.activeElement).toBe(cancel);
    expect(el.contains(document.activeElement)).toBe(false);
    expect(el.shadowRoot?.activeElement ?? null).toBeNull();
  });

  it('S5 stays silent in the accessibility tree and passes axe across orientations', async () => {
    cleanup();
    const page = document.createElement('div');
    page.style.inlineSize = '240px';
    const profile = document.createElement('section');
    profile.textContent = 'Profile';
    page.appendChild(profile);
    landmark().appendChild(page);
    const el = await mount(page);
    const notifications = document.createElement('section');
    notifications.textContent = 'Notifications';
    page.appendChild(notifications);

    // Decorative by contract (FR-004): no role, no name, no announcement.
    expect(el.getAttribute('role')).toBeNull();
    expect(el.getAttribute('aria-label')).toBeNull();
    const rule = ruleOf(el);
    expect(rule.getAttribute('role')).toBeNull();
    expect(rule.getAttribute('aria-label')).toBeNull();
    expect(rule.textContent).toBe('');

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.blockSize = '48px';
    landmark().appendChild(row);
    await mount(row, { orientation: 'vertical' });
    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });

  it('S6 restyles thickness, color and spacing through material3 tokens alone', async () => {
    cleanup();
    ensureTokens();
    const page = document.createElement('div');
    page.style.inlineSize = '240px';
    landmark().appendChild(page);
    const onmars = await mount(page);
    const onmarsColor = getComputedStyle(ruleOf(onmars)).backgroundColor;
    const onmarsCross = onmars.getBoundingClientRect().height;
    const markup = onmars.outerHTML;
    onmars.remove();

    ensureMaterial3Tokens();
    document.documentElement.setAttribute('data-ki-theme', 'material3');
    const el = await mount(page);
    const rule = ruleOf(el);
    const computed = getComputedStyle(rule);

    expect(el.outerHTML).toBe(markup);
    expect(computed.backgroundColor).toBe(readTokenColor('--ki-divider-color'));
    expect(computed.backgroundColor, 'material3 must restyle the rule color').not.toBe(onmarsColor);
    expect(rule.getBoundingClientRect().height).toBe(readTokenLength('--ki-divider-thickness'));
    // material3 sets the gutter to zero (FR-007): the host collapses to the
    // 1dp rule, unlike the onmars 8px frame.
    expect(el.getBoundingClientRect().height).toBe(readTokenLength('--ki-divider-thickness'));
    expect(el.getBoundingClientRect().height).not.toBe(onmarsCross);

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });
});
