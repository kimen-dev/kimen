// @spec:011-ki-alert
import { beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';

import tokensCss from '@kimen/tokens/css?raw';
import { defineCustomElement } from '../dist/components/ki-alert.js';
import { expectAccessible } from './axe';

const browserCommands = commands as unknown as {
  emulateColorScheme: (scheme: 'dark' | 'light' | null) => Promise<void>;
};

const tones = ['neutral', 'success', 'danger', 'info', 'warning'] as const;

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
  document.head.appendChild(style);
}

async function nextFrame(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

async function mountMatrix(): Promise<HTMLElement[]> {
  document.body.replaceChildren();
  document.body.style.backgroundColor = 'var(--ki-surface-s0)';
  const main = document.createElement('main');
  document.body.append(main);
  const alerts: HTMLElement[] = [];

  for (const tone of tones) {
    const el = document.createElement('ki-alert');
    el.setAttribute('tone', tone);
    el.setAttribute('heading', `${tone} heading`);
    el.textContent = `${tone} alert`;
    main.append(el);
    alerts.push(el);
  }

  await customElements.whenDefined('ki-alert');
  await nextFrame();
  await motionSettled(main);
  return alerts;
}

/** Axe contrast scans must wait out the one-shot opacity entrance (the
 * alert surface animates in under no-preference motion). */
async function motionSettled(el: Element): Promise<void> {
  const deadline = Date.now() + 2000;
  while (el.getAnimations({ subtree: true }).length > 0 && Date.now() < deadline) {
    await nextFrame();
  }
}

function alertPart(el: HTMLElement): HTMLElement {
  const part = el.shadowRoot?.querySelector<HTMLElement>('[part="alert"]');
  expect(part).toBeInstanceOf(HTMLElement);
  if (!part) {
    throw new Error('ki-alert did not render part="alert"');
  }
  return part;
}

function readTokenColor(name: string): string {
  const probe = document.createElement('div');
  probe.style.backgroundColor = `var(${name})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return value;
}

describe('ki-alert under the dark scheme', () => {
  it('S14 resolves dark onmars token values across the tone matrix and has zero axe violations', async () => {
    injectStylesheet(tokensCss, 'ki-alert-dark-tokens');
    document.documentElement.setAttribute('data-ki-color-scheme', 'dark');

    const alerts = await mountMatrix();

    for (const [index, tone] of tones.entries()) {
      const alert = alerts[index];
      expect(alert).toBeInstanceOf(HTMLElement);
      if (!alert) {
        throw new Error(`missing alert for tone ${tone}`);
      }
      expect(getComputedStyle(alertPart(alert)).backgroundColor).toBe(
        readTokenColor(`--ki-alert-${tone}-bg`),
      );
    }
    await expectAccessible(document.querySelector('main') ?? document.body);
  });
});
