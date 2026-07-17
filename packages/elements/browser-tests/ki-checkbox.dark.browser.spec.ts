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
    // Capture the forced-light value first so the dark assertion below is
    // falsable: a probe alone resolves whatever scheme is active and would
    // stay green even if the dark block never applied (ki-card.dark pattern).
    let el = await mount('light');
    const lightBackground = controlBackground(el);

    el = await mount('dark');
    const background = controlBackground(el);

    // The pointer may rest over the freshly mounted control, so the observed
    // value is one of the two dark interaction states; both mounts share the
    // same geometry, so the interaction state matches across schemes.
    expect([
      readTokenColor('--ki-checkbox-checked-rest-bg'),
      readTokenColor('--ki-checkbox-checked-hover-bg'),
    ]).toContain(background);
    expect(background, 'forced dark must change the resolved control surface').not.toBe(
      lightBackground,
    );
    expect(background).not.toBe('rgba(0, 0, 0, 0)');
  });
});
