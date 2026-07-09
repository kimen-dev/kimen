// @spec:013-ki-tooltip
import axe from 'axe-core';
import { commands, page, userEvent } from 'vitest/browser';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import tokensCss from '@kimen/tokens/css?raw';
import { defineCustomElement } from '../dist/components/ki-tooltip.js';

type KiTooltipElement = HTMLElement & {
  label: string;
  placement: string;
};

const browserCommands = commands as unknown as {
  emulateColorScheme: (scheme: 'dark' | 'light' | null) => Promise<void>;
};

beforeAll(async () => {
  defineCustomElement();
  await browserCommands.emulateColorScheme('dark');
});

afterEach(() => {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('data-ki-color-scheme');
});

function injectTokens(): void {
  if (document.getElementById('ki-tooltip-dark-token-style')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'ki-tooltip-dark-token-style';
  style.textContent = tokensCss;
  document.head.append(style);
}

async function nextFrame(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

function readTokenColor(name: string, property: 'backgroundColor' | 'color'): string {
  const probe = document.createElement('div');
  if (property === 'backgroundColor') {
    probe.style.backgroundColor = `var(${name})`;
  } else {
    probe.style.color = `var(${name})`;
  }
  document.body.append(probe);
  const value = getComputedStyle(probe)[property];
  probe.remove();
  return value;
}

async function mount(): Promise<{
  host: KiTooltipElement;
  trigger: HTMLButtonElement;
}> {
  injectTokens();
  document.documentElement.setAttribute('data-ki-color-scheme', 'dark');
  const main = document.createElement('main');
  document.body.append(main);
  const host = document.createElement('ki-tooltip') as KiTooltipElement;
  host.label = 'Send immediately';
  host.placement = 'top';
  host.style.setProperty('--ki-tooltip-show-delay', '0ms');
  host.style.setProperty('--ki-tooltip-hide-delay', '0ms');
  const trigger = document.createElement('button');
  trigger.textContent = 'Send';
  host.append(trigger);
  main.append(host);
  await customElements.whenDefined('ki-tooltip');
  await nextFrame();
  return { host, trigger };
}

function requireTooltip(host: KiTooltipElement): HTMLDivElement {
  const tooltip = host.shadowRoot?.querySelector('[part="tooltip"]');
  if (!(tooltip instanceof HTMLDivElement)) {
    throw new Error('ki-tooltip did not render its tooltip bubble');
  }
  return tooltip;
}

describe('ki-tooltip in forced dark scheme', () => {
  it('S10 resolves onmars dark token values and has zero axe violations', async () => {
    const { host, trigger } = await mount();

    await userEvent.hover(trigger);
    await nextFrame();
    await expect.element(page.getByRole('tooltip', { name: 'Send immediately' })).toBeVisible();

    const tooltip = requireTooltip(host);
    const style = getComputedStyle(tooltip);
    expect(style.backgroundColor).toBe(readTokenColor('--ki-tooltip-bg', 'backgroundColor'));
    expect(style.color).toBe(readTokenColor('--ki-tooltip-fg', 'color'));

    const main = document.querySelector('main');
    if (!main) {
      throw new Error('Expected dark tooltip fixture to render in main');
    }
    const results = await axe.run(main);
    expect(results.violations).toEqual([]);
  });
});
