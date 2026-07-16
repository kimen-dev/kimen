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

async function mount(scheme: 'light' | 'dark'): Promise<HTMLElement> {
  document.body.replaceChildren();
  document.documentElement.setAttribute('data-ki-color-scheme', scheme);
  injectStylesheet(tokensCss, 'ki-textarea-dark-tokens');
  const el = document.createElement('ki-textarea');
  el.setAttribute('label', 'Delivery notes');
  document.body.append(el);
  await customElements.whenDefined('ki-textarea');
  await expect.poll(() => el.shadowRoot?.querySelector('[part="field"]')).toBeTruthy();
  return el;
}

function fieldBackground(el: HTMLElement): string {
  const field = el.shadowRoot?.querySelector('[part="field"]');
  expect(field).toBeInstanceOf(HTMLElement);
  return field instanceof HTMLElement ? getComputedStyle(field).backgroundColor : '';
}

describe('ki-textarea under the dark scheme', () => {
  it('S18 resolves the field appearance from dark onmars token values', async () => {
    // Capture the forced-light value first so the dark assertion below is
    // falsable: a probe alone resolves whatever scheme is active and would
    // stay green even if the dark block never applied (ki-card.dark pattern).
    let el = await mount('light');
    const lightBackground = fieldBackground(el);

    el = await mount('dark');
    const background = fieldBackground(el);

    // The pointer may rest over the freshly mounted field, so the observed
    // value is one of the two dark interaction states; both mounts share the
    // same geometry, so the interaction state matches across schemes.
    expect([
      readTokenColor('--ki-textarea-rest-bg'),
      readTokenColor('--ki-textarea-hover-bg'),
    ]).toContain(background);
    expect(background, 'forced dark must change the resolved field surface').not.toBe(
      lightBackground,
    );
    expect(background).not.toBe('rgba(0, 0, 0, 0)');
  });
});
