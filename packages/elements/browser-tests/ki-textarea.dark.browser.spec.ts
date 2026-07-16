// @spec:004-ki-textarea

import tokensCss from '@kimen/tokens/css?raw';
import { beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { defineCustomElement } from '../dist/components/ki-textarea.js';

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

async function mount(): Promise<HTMLElement> {
  document.body.replaceChildren();
  document.documentElement.setAttribute('data-ki-color-scheme', 'dark');
  injectStylesheet(tokensCss, 'ki-textarea-dark-tokens');
  const el = document.createElement('ki-textarea');
  el.setAttribute('label', 'Delivery notes');
  document.body.append(el);
  await customElements.whenDefined('ki-textarea');
  await expect.poll(() => el.shadowRoot?.querySelector('[part="field"]')).toBeTruthy();
  return el;
}

describe('ki-textarea under the dark scheme', () => {
  it('S18 resolves the field appearance from dark onmars token values', async () => {
    const el = await mount();
    const field = el.shadowRoot?.querySelector('[part="field"]');
    expect(field).toBeInstanceOf(HTMLElement);

    const background = field instanceof HTMLElement ? getComputedStyle(field).backgroundColor : '';

    // The pointer may rest over the freshly mounted field, so the observed
    // value is one of the two dark states — mirroring the S18 assertion in
    // ki-textarea.browser.spec.ts.
    expect([
      readTokenColor('--ki-textarea-rest-bg'),
      readTokenColor('--ki-textarea-hover-bg'),
    ]).toContain(background);
    expect(background).not.toBe('rgba(0, 0, 0, 0)');
  });
});
