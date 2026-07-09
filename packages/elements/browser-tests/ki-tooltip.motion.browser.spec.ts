// @spec:013-ki-tooltip
import { commands, page, userEvent } from 'vitest/browser';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import tokensCss from '@kimen/tokens/css?raw';
import { defineCustomElement } from '../dist/components/ki-tooltip.js';

type KiTooltipElement = HTMLElement & {
  label: string;
  placement: string;
};

const browserCommands = commands as unknown as {
  emulateReducedMotion: (reducedMotion: 'reduce' | 'no-preference' | null) => Promise<void>;
};

beforeAll(async () => {
  defineCustomElement();
  await browserCommands.emulateReducedMotion('reduce');
});

afterEach(() => {
  document.body.replaceChildren();
});

function injectTokens(): void {
  if (document.getElementById('ki-tooltip-motion-token-style')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'ki-tooltip-motion-token-style';
  style.textContent = tokensCss;
  document.head.append(style);
}

async function nextFrame(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

async function mount(): Promise<{
  host: KiTooltipElement;
  trigger: HTMLButtonElement;
}> {
  injectTokens();
  const host = document.createElement('ki-tooltip') as KiTooltipElement;
  host.label = 'Send immediately';
  host.placement = 'top';
  host.style.setProperty('--ki-tooltip-show-delay', '0ms');
  host.style.setProperty('--ki-tooltip-hide-delay', '0ms');
  const trigger = document.createElement('button');
  trigger.textContent = 'Send';
  host.append(trigger);
  document.body.append(host);
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

describe('ki-tooltip with reduced motion', () => {
  it('S17 appears without animated movement under prefers-reduced-motion reduce', async () => {
    const { host, trigger } = await mount();

    await userEvent.hover(trigger);
    await nextFrame();

    await expect.element(page.getByRole('tooltip', { name: 'Send immediately' })).toBeVisible();
    const style = getComputedStyle(requireTooltip(host));
    expect(style.transitionDuration).toBe('0s');
    expect(style.animationName).toBe('none');
    expect(style.animationDuration).toBe('0s');
  });
});
