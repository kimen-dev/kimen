import axe from 'axe-core';
import { commands, page, userEvent } from 'vitest/browser';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

// @spec:013-ki-tooltip
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
import tokensCss from '@kimen/tokens/css?raw';
import { defineCustomElement } from '../dist/components/ki-tooltip.js';

type KiTooltipElement = HTMLElement & {
  label: string;
  placement: string;
};

interface MountOptions {
  label?: string;
  placement?: string;
  style?: Partial<CSSStyleDeclaration>;
  showDelay?: string;
  hideDelay?: string;
}

const STYLE_ID = 'ki-tooltip-browser-token-style';
const placements = ['top', 'bottom', 'start', 'end'] as const;
const browserCommands = commands as unknown as {
  installClock: () => Promise<void>;
  fastForwardClock: (milliseconds: number) => Promise<void>;
  resumeClock: () => Promise<void>;
};

beforeAll(() => {
  defineCustomElement();
});

afterEach(() => {
  cleanup();
});

function ensureTokens(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = tokensCss;
  document.head.append(style);
}

function cleanup(): void {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('dir');
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
}

async function nextFrame(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

async function mount(
  options: MountOptions = {},
  parent: ParentNode = document.body,
): Promise<{
  host: KiTooltipElement;
  trigger: HTMLButtonElement;
}> {
  ensureTokens();
  const host = document.createElement('ki-tooltip') as KiTooltipElement;
  host.label = options.label ?? 'Send immediately';
  host.placement = options.placement ?? 'top';
  host.style.setProperty('--ki-tooltip-show-delay', options.showDelay ?? '0ms');
  host.style.setProperty('--ki-tooltip-hide-delay', options.hideDelay ?? '0ms');
  Object.assign(host.style, options.style ?? {});

  const trigger = document.createElement('button');
  trigger.textContent = 'Send';
  host.append(trigger);
  parent.appendChild(host);

  await customElements.whenDefined('ki-tooltip');
  const deadline = Date.now() + 500;
  while (!host.shadowRoot?.hasChildNodes() && Date.now() < deadline) {
    await nextFrame();
  }

  return { host, trigger };
}

function tooltipBubble(host: KiTooltipElement): HTMLDivElement | null {
  return host.shadowRoot?.querySelector('[part="tooltip"]') ?? null;
}

function requireTooltip(host: KiTooltipElement): HTMLDivElement {
  const tooltip = tooltipBubble(host);
  expect(tooltip).toBeInstanceOf(HTMLDivElement);
  if (!tooltip) {
    throw new Error('ki-tooltip did not render its tooltip bubble');
  }
  return tooltip;
}

function requireTriggerSlot(host: KiTooltipElement): void {
  const slot = host.shadowRoot?.querySelector('slot');
  if (!slot) {
    throw new Error('ki-tooltip did not render the default trigger slot');
  }
}

async function hoverTrigger(host: KiTooltipElement, trigger: HTMLButtonElement): Promise<void> {
  requireTriggerSlot(host);
  await userEvent.hover(trigger);
  await nextFrame();
  expect(requireTooltip(host)).toHaveTextContent('Send immediately');
}

describe('ki-tooltip pointer path in a real browser', () => {
  it('S1 hovering the Send trigger shows Send immediately', async () => {
    const { host, trigger } = await mount();

    await hoverTrigger(host, trigger);

    await expect.element(page.getByRole('tooltip', { name: 'Send immediately' })).toBeVisible();
  });

  it('S2 moving the pointer away from trigger and tooltip hides it', async () => {
    const { host, trigger } = await mount();
    await hoverTrigger(host, trigger);

    await userEvent.unhover(trigger);
    await nextFrame();

    await expect.element(requireTooltip(host)).not.toBeVisible();
  });

  it('S12 moving the pointer from the trigger onto the tooltip keeps it visible', async () => {
    const { host, trigger } = await mount({ hideDelay: '100ms' });
    await hoverTrigger(host, trigger);
    const tooltip = requireTooltip(host);

    await userEvent.unhover(trigger);
    await userEvent.hover(tooltip);
    await nextFrame();

    await expect.element(page.getByRole('tooltip', { name: 'Send immediately' })).toBeVisible();
  });

  it('S1 honors tokenized hover-intent and linger delays with fake timers', async () => {
    await browserCommands.installClock();
    try {
      const { host, trigger } = await mount({ showDelay: '150ms', hideDelay: '75ms' });

      requireTriggerSlot(host);
      await userEvent.hover(trigger);
      await browserCommands.fastForwardClock(149);
      await nextFrame();
      await expect.element(requireTooltip(host)).not.toBeVisible();

      await browserCommands.fastForwardClock(1);
      await nextFrame();
      await expect.element(page.getByRole('tooltip', { name: 'Send immediately' })).toBeVisible();

      await userEvent.unhover(trigger);
      await browserCommands.fastForwardClock(74);
      await nextFrame();
      await expect.element(requireTooltip(host)).toBeVisible();

      await browserCommands.fastForwardClock(1);
      await nextFrame();
      await expect.element(requireTooltip(host)).not.toBeVisible();
    } finally {
      await browserCommands.resumeClock();
    }
  });

  it('S3 an unrecognized placement value renders above the trigger', async () => {
    const { host, trigger } = await mount({
      placement: 'sideways',
      style: { marginBlockStart: '120px', marginInlineStart: '120px' },
    });
    await hoverTrigger(host, trigger);

    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = requireTooltip(host).getBoundingClientRect();

    expect(tooltipRect.bottom).toBeLessThanOrEqual(triggerRect.top);
  });

  it('S14 top-edge preferred top placement flips below and stays in the viewport', async () => {
    const { host, trigger } = await mount({
      placement: 'top',
      style: { position: 'fixed', insetBlockStart: '0px', insetInlineStart: '120px' },
    });
    await hoverTrigger(host, trigger);

    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = requireTooltip(host).getBoundingClientRect();

    expect(tooltipRect.top).toBeGreaterThanOrEqual(0);
    expect(tooltipRect.bottom).toBeLessThanOrEqual(window.innerHeight);
    expect(tooltipRect.top).toBeGreaterThanOrEqual(triggerRect.bottom);
  });

  it('S5 Escape hides the focused tooltip without moving focus or activating the trigger', async () => {
    const { host, trigger } = await mount();
    let activations = 0;
    trigger.addEventListener('click', () => {
      activations += 1;
    });

    requireTriggerSlot(host);
    trigger.focus();
    await nextFrame();
    await expect.element(page.getByRole('tooltip', { name: 'Send immediately' })).toBeVisible();

    await userEvent.keyboard('{Escape}');
    await nextFrame();

    await expect.element(requireTooltip(host)).not.toBeVisible();
    expect(document.activeElement).toBe(trigger);
    expect(activations).toBe(0);
  });

  it('S13 empty labels show no tooltip and expose no accessible description', async () => {
    const { host, trigger } = await mount({ label: '  ' });

    requireTriggerSlot(host);
    expect(trigger.getAttribute('aria-description')).toBeNull();
    await userEvent.hover(trigger);
    await nextFrame();

    expect(tooltipBubble(host)).toBeNull();
    expect(trigger.getAttribute('aria-description')).toBeNull();
  });

  it('S4 Tab focus shows the tooltip immediately even when show-delay is non-zero', async () => {
    const { trigger } = await mount({ showDelay: '60000ms' });

    await userEvent.keyboard('{Tab}');
    await nextFrame();

    expect(document.activeElement).toBe(trigger);
    await expect.element(page.getByRole('tooltip', { name: 'Send immediately' })).toBeVisible();
  });

  it('S6 moving focus to the next interactive element hides the tooltip', async () => {
    const { host, trigger } = await mount();
    const next = document.createElement('button');
    next.textContent = 'Next';
    document.body.append(next);

    trigger.focus();
    await nextFrame();
    await expect.element(page.getByRole('tooltip', { name: 'Send immediately' })).toBeVisible();

    await userEvent.keyboard('{Tab}');
    await nextFrame();

    expect(document.activeElement).toBe(next);
    await expect.element(requireTooltip(host)).not.toBeVisible();
  });

  it('S15 Escape hides a hover-shown tooltip while focus stays elsewhere', async () => {
    const other = document.createElement('button');
    other.textContent = 'Other';
    document.body.append(other);
    other.focus();
    const { host, trigger } = await mount();
    await hoverTrigger(host, trigger);

    await userEvent.keyboard('{Escape}');
    await nextFrame();

    await expect.element(requireTooltip(host)).not.toBeVisible();
    expect(document.activeElement).toBe(other);
  });

  it('S16 Escape over a tooltip inside an open dialog dismisses only the tooltip', async () => {
    const dialog = document.createElement('dialog');
    document.body.append(dialog);
    const { host, trigger } = await mount({}, dialog);
    dialog.showModal();
    await hoverTrigger(host, trigger);

    await userEvent.keyboard('{Escape}');
    await nextFrame();

    await expect.element(requireTooltip(host)).not.toBeVisible();
    expect(dialog.open).toBe(true);

    await userEvent.keyboard('{Escape}');
    await nextFrame();
    expect(dialog.open).toBe(false);
  });

  it('S7 exposes the trigger name unchanged and the tooltip label as description', async () => {
    const { trigger } = await mount();
    const describedButtonOptions = {
      name: 'Send',
      description: 'Send immediately',
    } as Parameters<typeof page.getByRole>[1];

    expect(trigger.getAttribute('aria-description')).toBe('Send immediately');
    await expect.element(page.getByRole('button', { name: 'Send' })).toBeVisible();
    await expect.element(page.getByRole('button', describedButtonOptions)).toBeVisible();
  });

  it('S8 exposes the tooltip role only while the tooltip is visible', async () => {
    const { host, trigger } = await mount();

    await expect.element(requireTooltip(host)).not.toBeVisible();

    trigger.focus();
    await nextFrame();

    await expect.element(page.getByRole('tooltip', { name: 'Send immediately' })).toBeVisible();

    trigger.blur();
    await nextFrame();

    await expect.element(requireTooltip(host)).not.toBeVisible();
  });

  it('S8 has zero axe violations with the tooltip visible', async () => {
    const main = document.createElement('main');
    document.body.append(main);
    const { trigger } = await mount({}, main);

    trigger.focus();
    await nextFrame();
    await expect.element(page.getByRole('tooltip', { name: 'Send immediately' })).toBeVisible();

    const results = await axe.run(main);
    expect(results.violations).toEqual([]);
  });

  it('S1 has zero axe violations across placements shown and hidden', async () => {
    const main = document.createElement('main');
    document.body.append(main);

    for (const placement of placements) {
      const { host, trigger } = await mount({ placement });
      main.append(host);
      await hoverTrigger(host, trigger);
      await userEvent.unhover(trigger);
      await nextFrame();
    }

    for (const placement of placements) {
      const { host, trigger } = await mount({ placement });
      main.append(host);
      await hoverTrigger(host, trigger);
    }

    const results = await axe.run(main);
    expect(results.violations).toEqual([]);
  });
});
