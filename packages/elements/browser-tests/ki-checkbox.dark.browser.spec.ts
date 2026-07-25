// @spec:006-ki-checkbox

import tokensCss from '@kimen/tokens/css?raw';
import { beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { defineCustomElement } from '../dist/components/ki-checkbox.js';

type KiCheckboxElement = HTMLElement & { checked: boolean };

const browserCommands = commands as unknown as {
  emulateColorScheme: (scheme: 'dark' | 'light' | null) => Promise<void>;
};

beforeAll(async () => {
  defineCustomElement();
  await browserCommands.emulateColorScheme('dark');
});

function injectStylesheet(css: string, id: string): void {
  if (document.getElementById(id)) {
    return;
  }
  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  document.head.append(style);
}

function readTokenColor(name: string): string {
  const probe = document.createElement('div');
  probe.style.backgroundColor = `var(${name})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return value;
}

async function mount(scheme: 'light' | 'dark'): Promise<KiCheckboxElement> {
  document.body.replaceChildren();
  document.documentElement.setAttribute('data-ki-color-scheme', scheme);
  injectStylesheet(tokensCss, 'ki-checkbox-dark-tokens');
  const el = document.createElement('ki-checkbox') as KiCheckboxElement;
  el.toggleAttribute('checked', true);
  el.textContent = 'Email notifications';
  document.body.append(el);
  await customElements.whenDefined('ki-checkbox');
  await expect.poll(() => el.shadowRoot?.querySelector('[part="control"]')).toBeTruthy();
  return el;
}

function controlBackground(el: KiCheckboxElement): string {
  const control = el.shadowRoot?.querySelector('[part="control"]');
  expect(control).toBeInstanceOf(HTMLElement);
  return control instanceof HTMLElement ? getComputedStyle(control).backgroundColor : '';
}

describe('ki-checkbox under the dark scheme', () => {
  it('S17 resolves the checked control from dark onmars token values', async () => {
    // Each scheme is checked against the tokens read while that scheme is the
    // active one. The pointer may rest over the freshly mounted control, so
    // the observed value is one of the two interaction states.
    let el = await mount('light');
    const lightBackground = controlBackground(el);
    const lightPage = readTokenColor('--ki-surface-s0');
    expect([
      readTokenColor('--ki-checkbox-checked-rest-bg'),
      readTokenColor('--ki-checkbox-checked-hover-bg'),
    ]).toContain(lightBackground);

    el = await mount('dark');
    const background = controlBackground(el);
    expect([
      readTokenColor('--ki-checkbox-checked-rest-bg'),
      readTokenColor('--ki-checkbox-checked-hover-bg'),
    ]).toContain(background);
    expect(background).not.toBe('rgba(0, 0, 0, 0)');

    // Falsability, unchanged in intent: a probe alone resolves whatever scheme
    // is active and would stay green even if the dark block never applied
    // (ki-card.dark pattern). It is probed on the page surface, not on the
    // control fill: the checked fill is MarsUI's default brand surface
    // (brand 500) and resolves to the same value in BOTH schemes by design,
    // exactly as the ki-switch checked track does.
    expect(readTokenColor('--ki-surface-s0'), 'forced dark must change the scheme').not.toBe(
      lightPage,
    );
  });
});
