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

// The pointer may rest over the freshly mounted control, so token assertions
// read the matching interaction state — mirroring checkboxState in
// ki-checkbox.browser.spec.ts.
function checkboxState(el: KiCheckboxElement): 'hover' | 'rest' {
  return el.matches(':hover') ? 'hover' : 'rest';
}

async function mount(): Promise<KiCheckboxElement> {
  document.body.replaceChildren();
  document.documentElement.setAttribute('data-ki-color-scheme', 'dark');
  injectStylesheet(tokensCss, 'ki-checkbox-dark-tokens');
  const el = document.createElement('ki-checkbox') as KiCheckboxElement;
  el.toggleAttribute('checked', true);
  el.textContent = 'Email notifications';
  document.body.append(el);
  await customElements.whenDefined('ki-checkbox');
  await expect.poll(() => el.shadowRoot?.querySelector('[part="control"]')).toBeTruthy();
  return el;
}

describe('ki-checkbox under the dark scheme', () => {
  it('S17 resolves the checked control from dark onmars token values', async () => {
    const el = await mount();
    const control = el.shadowRoot?.querySelector('[part="control"]');
    expect(control).toBeInstanceOf(HTMLElement);

    const background =
      control instanceof HTMLElement ? getComputedStyle(control).backgroundColor : '';

    expect(background).toBe(readTokenColor(`--ki-checkbox-checked-${checkboxState(el)}-bg`));
    expect(background).not.toBe('rgba(0, 0, 0, 0)');
  });
});
