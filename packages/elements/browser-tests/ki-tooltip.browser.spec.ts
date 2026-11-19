import material3Css from '@kimen/tokens/css/material3?raw';
// @spec:013-ki-tooltip
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
import tokensCss from '@kimen/tokens/css?raw';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { defineCustomElement } from '../dist/components/ki-tooltip.js';
import { expectAccessible } from './axe';
import { repaintedUnderForcedDark } from './color-scheme';
import { moveToNewParent } from './reconnect';

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
const MATERIAL3_STYLE_ID = 'ki-tooltip-browser-material3-token-style';
const placements = ['top', 'bottom', 'start', 'end'] as const;
const browserCommands = commands as unknown as {
  installClock: () => Promise<void>;
  pauseClock: () => Promise<void>;
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

function ensureMaterial3Tokens(): void {
  if (document.getElementById(MATERIAL3_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = MATERIAL3_STYLE_ID;
  style.textContent = material3Css;
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

// The bubble is always in the DOM; the `is-visible` class is the component's
// show/hide state signal. Read the CLASS synchronously, not the computed
// visibility: fake-clock tests must never depend on the polling
// `expect.element` matcher (page.clock freezes rAF/setTimeout, and a frozen
// poll cannot re-check), and under no-preference the exit fade now DELAYS the
// computed visibility flip by one fast step on the CSS clock, which the fake
// clock does not control.
function isTooltipShown(host: KiTooltipElement): boolean {
  return requireTooltip(host).classList.contains('is-visible');
}

// The enter fade runs under no-preference; geometry and axe assertions must
// observe the settled bubble (opacity 1, slide finished), never a mid-fade
// frame.
async function settleTooltip(host: KiTooltipElement): Promise<void> {
  const tooltip = requireTooltip(host);
  const deadline = Date.now() + 2000;
  while (getComputedStyle(tooltip).opacity !== '1' && Date.now() < deadline) {
    await nextFrame();
  }
  expect(getComputedStyle(tooltip).opacity).toBe('1');
}

// Under an installed fake clock, Stencil's queued render (rAF) does not run
// until the clock crosses an animation frame. Advancing ~one frame past a
// state change flushes the render so the DOM reflects the new `visible` state.
async function runRenderFrame(): Promise<void> {
  await browserCommands.fastForwardClock(20);
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
  await settleTooltip(host);
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

    await userEvent.hover(tooltip);
    await nextFrame();

    await expect.element(page.getByRole('tooltip', { name: 'Send immediately' })).toBeVisible();
  });

  it('S1 honors tokenized hover-intent and linger delays with fake timers', async () => {
    await browserCommands.installClock();
    try {
      const { host, trigger } = await mount({ showDelay: '150ms', hideDelay: '75ms' });
      await browserCommands.pauseClock();

      requireTriggerSlot(host);
      await userEvent.hover(trigger);

      // Just short of the 150ms show delay: still hidden (no render since mount).
      await browserCommands.fastForwardClock(149);
      expect(isTooltipShown(host)).toBe(false);

      // Cross the boundary, then run the render frame so the DOM reflects show.
      await browserCommands.fastForwardClock(1);
      await runRenderFrame();
      expect(isTooltipShown(host)).toBe(true);

      // Leaving the trigger starts the 75ms linger; the tooltip stays visible.
      await userEvent.unhover(trigger);
      expect(isTooltipShown(host)).toBe(true);

      // The linger elapses: hidden again once the render frame runs.
      await browserCommands.fastForwardClock(75);
      await runRenderFrame();
      expect(isTooltipShown(host)).toBe(false);
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

  // WCAG 1.4.10 (reflow at 320 CSS px): a bubble that is not shown must not
  // count as page content. Hidden but laid out, it overflowed the inline-end
  // edge and gave the whole page a horizontal scrollbar.
  it('S14 a closed tooltip at the inline-end edge does not widen a 320px page', async () => {
    await page.viewport(320, 640);
    try {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'flex-end';
      document.body.append(row);
      const { host, trigger } = await mount(
        { label: 'Fairly long helper text to measure the hidden bubble' },
        row,
      );
      await nextFrame();

      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);

      // It still opens fully inside the viewport, measured from its real size.
      trigger.focus();
      await nextFrame();
      await settleTooltip(host);
      const tooltipRect = requireTooltip(host).getBoundingClientRect();
      expect(tooltipRect.width).toBeGreaterThan(trigger.getBoundingClientRect().width);
      expect(tooltipRect.left).toBeGreaterThanOrEqual(0);
      expect(tooltipRect.right).toBeLessThanOrEqual(window.innerWidth);

      // Closed again, the page is back to its own width.
      trigger.blur();
      await expect.element(requireTooltip(host)).not.toBeVisible();
      await expect
        .poll(() => document.documentElement.scrollWidth)
        .toBeLessThanOrEqual(window.innerWidth);
    } finally {
      await page.viewport(414, 896);
    }
  });

  // A card, a scroll panel or a dialog body clips its overflow. The bubble
  // sits outside the trigger's box, so inside such a container it was cut off
  // and painted nothing; it has to escape every ancestor's clip.
  it('S1 a trigger inside a container that clips its overflow still shows the whole tooltip', async () => {
    const clip = document.createElement('div');
    clip.style.overflow = 'hidden';
    clip.style.marginBlockStart = '160px';
    document.body.append(clip);
    const { host, trigger } = await mount({ placement: 'top' }, clip);
    clip.style.blockSize = `${String(host.getBoundingClientRect().height)}px`;

    await hoverTrigger(host, trigger);

    const tooltip = requireTooltip(host);
    const rect = tooltip.getBoundingClientRect();
    expect(rect.bottom).toBeLessThanOrEqual(clip.getBoundingClientRect().top);
    const hit = host.shadowRoot?.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    expect(hit).toBe(tooltip);
  });

  it('S10 honors a forced dark scheme: the shown tooltip repaints', async () => {
    const { host, trigger } = await mount();
    trigger.tabIndex = 0;
    await userEvent.keyboard('{Tab}');
    await expect.element(page.getByRole('tooltip', { name: 'Send immediately' })).toBeVisible();

    expect(await repaintedUnderForcedDark(host)).toContain('tooltip');
    await expect.element(page.getByRole('tooltip', { name: 'Send immediately' })).toBeVisible();
  });

  it('S9 material3 restyles the visible tooltip with unchanged markup', async () => {
    ensureMaterial3Tokens();
    const { host, trigger } = await mount();
    await hoverTrigger(host, trigger);
    const tooltip = requireTooltip(host);
    const paint = (): string[] => {
      const style = getComputedStyle(tooltip);
      return [style.backgroundImage, style.color, style.borderTopLeftRadius];
    };
    const onmars = paint();
    const markup = host.outerHTML;

    // The card paints a gradient; material3 resolves it to its inverse bubble
    // surface, so the paint is the theme signal — on the tooltip being shown.
    document.documentElement.setAttribute('data-ki-theme', 'material3');

    await expect.poll(paint).not.toEqual(onmars);
    expect(host.outerHTML).toBe(markup);
    expect(host.outerHTML).toContain('<button aria-description="Send immediately">Send</button>');
  });

  it('S1 renders the MarsUI glass card geometry, bevel, and typography', async () => {
    const { host, trigger } = await mount({
      style: { marginBlockStart: '160px', marginInlineStart: '160px' },
    });
    await hoverTrigger(host, trigger);
    const tooltip = requireTooltip(host);
    const style = getComputedStyle(tooltip);

    // Tooltip master 12089:7621 card: radius 16, padding 12 all sides, max 288,
    // title UI/Para/medium 13/20 weight 600.
    expect(style.borderRadius).toBe('16px');
    expect(style.paddingTop).toBe('12px');
    expect(style.paddingRight).toBe('12px');
    expect(style.paddingBottom).toBe('12px');
    expect(style.paddingLeft).toBe('12px');
    expect(style.maxWidth).toBe('288px');
    expect(style.fontSize).toBe('13px');
    expect(style.lineHeight).toBe('20px');
    expect(style.fontWeight).toBe('600');

    // Glass card paint: gradient over a transparent color fallback plus the
    // Blur/24 (CSS 12px) backdrop filter.
    expect(style.backgroundImage).toContain('linear-gradient(');
    expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(style.getPropertyValue('backdrop-filter')).toBe('blur(12px)');

    // Bevel hairline on all sides while no caret ships.
    expect(style.borderTopWidth).toBe('1px');
    expect(style.borderTopStyle).toBe('solid');
    expect(style.borderBottomWidth).toBe('1px');

    // e4 wrap elevation (deepest layer 0 32 32 -16) plus the secondary_default
    // inner highlight (inset layer).
    expect(style.boxShadow).toContain('0px 32px 32px -16px');
    expect(style.boxShadow).toContain('inset');

    // Caret-depth offset: 8px trigger-to-card distance (top placement).
    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    expect(Math.round(triggerRect.top - tooltipRect.bottom)).toBe(8);
  });

  it('S11 start placement renders on the right side under RTL', async () => {
    document.documentElement.setAttribute('dir', 'rtl');
    // The inline offset must leave the bubble room on the trigger's
    // inline-start edge (the RIGHT edge under RTL), otherwise the documented
    // collision flip fires and this asserts the fallback rather than the
    // requested placement. 120px was tuned when ki-tooltip declared no
    // font-family and the bubble rendered in the user agent serif; with the
    // token typeface the same label is wider than the room it left.
    const { host, trigger } = await mount({
      placement: 'start',
      style: { marginBlockStart: '120px', marginInlineStart: '220px' },
    });
    await hoverTrigger(host, trigger);

    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = requireTooltip(host).getBoundingClientRect();

    expect(tooltipRect.left).toBeGreaterThanOrEqual(triggerRect.right);
  });

  // Block-axis placements center the bubble on the trigger. The centering
  // paired a logical inset with a physical translate, so under RTL the bubble
  // sat a whole bubble-width away from its trigger.
  it('S11 top placement stays centered on its trigger under RTL', async () => {
    const wrapper = document.createElement('div');
    wrapper.dir = 'rtl';
    wrapper.style.padding = '160px';
    document.body.append(wrapper);
    const { host, trigger } = await mount(
      { label: 'Helper text that is relatively long' },
      wrapper,
    );

    trigger.focus();
    await nextFrame();
    await settleTooltip(host);

    const hostRect = host.getBoundingClientRect();
    const tooltipRect = requireTooltip(host).getBoundingClientRect();
    const offCenter =
      tooltipRect.left + tooltipRect.width / 2 - (hostRect.left + hostRect.width / 2);
    expect(Math.abs(offCenter)).toBeLessThanOrEqual(1);
    expect(tooltipRect.bottom).toBeLessThanOrEqual(hostRect.top);
  });

  it('S11 S14 a tooltip at the inline-start edge is pulled back inside the viewport under RTL', async () => {
    document.documentElement.setAttribute('dir', 'rtl');
    const { host, trigger } = await mount({ label: 'Helper text that is relatively long' });

    trigger.focus();
    await nextFrame();
    await settleTooltip(host);

    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = requireTooltip(host).getBoundingClientRect();
    // The trigger hugs the right edge, so a centered bubble would not fit.
    expect(triggerRect.right + tooltipRect.width / 2).toBeGreaterThan(window.innerWidth);
    expect(tooltipRect.left).toBeGreaterThanOrEqual(0);
    // Pulled in by exactly its overflow: it ends at the viewport edge
    // (sub-pixel layout rounding aside).
    expect(Math.abs(window.innerWidth - tooltipRect.right)).toBeLessThan(0.5);
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

  it('S13 a tooltip created without a label renders its trigger and works once the label arrives', async () => {
    ensureTokens();
    // What a framework does with `label={undefined}` on the first render.
    const host = document.createElement('ki-tooltip') as KiTooltipElement;
    (host as { label: unknown }).label = undefined;
    host.style.setProperty('--ki-tooltip-show-delay', '0ms');
    const trigger = document.createElement('button');
    trigger.textContent = 'Send';
    host.append(trigger);
    document.body.append(host);
    await customElements.whenDefined('ki-tooltip');

    // The trigger is laid out: the slot it is assigned to has rendered.
    await expect.poll(() => trigger.getBoundingClientRect().width).toBeGreaterThan(0);
    expect(tooltipBubble(host)).toBeNull();
    expect(trigger.getAttribute('aria-description')).toBeNull();

    host.label = 'Send immediately';
    await expect.poll(() => trigger.getAttribute('aria-description')).toBe('Send immediately');
    trigger.focus();
    await expect.element(page.getByRole('tooltip', { name: 'Send immediately' })).toBeVisible();
  });

  it.each([
    [
      'set to undefined',
      (host: KiTooltipElement) => {
        (host as { label: unknown }).label = undefined;
      },
    ],
    [
      'set to null',
      (host: KiTooltipElement) => {
        (host as { label: unknown }).label = null;
      },
    ],
    [
      'removed as an attribute',
      (host: KiTooltipElement) => {
        host.removeAttribute('label');
      },
    ],
  ])('S13 a label %s leaves no tooltip and a tooltip that still works', async (_case, clear) => {
    ensureTokens();
    const host = document.createElement('ki-tooltip') as KiTooltipElement;
    host.setAttribute('label', 'Send immediately');
    host.style.setProperty('--ki-tooltip-show-delay', '0ms');
    const trigger = document.createElement('button');
    trigger.textContent = 'Send';
    host.append(trigger);
    document.body.append(host);
    await customElements.whenDefined('ki-tooltip');
    await expect.poll(() => trigger.getAttribute('aria-description')).toBe('Send immediately');

    clear(host);

    await expect.poll(() => tooltipBubble(host)).toBeNull();
    expect(trigger.getAttribute('aria-description')).toBeNull();

    // The instance survived: a new label describes and shows again.
    host.label = 'Send now';
    await expect.poll(() => trigger.getAttribute('aria-description')).toBe('Send now');
    trigger.focus();
    await expect.element(page.getByRole('tooltip', { name: 'Send now' })).toBeVisible();
  });

  it('S7 keeps describing its trigger after the tooltip moves to another parent', async () => {
    const { host, trigger } = await mount();
    await expect.poll(() => trigger.getAttribute('aria-description')).toBe('Send immediately');

    // A sortable row re-inserts itself with the tooltip inside: the trigger
    // keeps its place in the slot, so no slotchange describes it again.
    moveToNewParent(host);

    expect(trigger.getAttribute('aria-description')).toBe('Send immediately');
  });

  it('S9 still owns and restores the trigger description after the tooltip moves to another parent', async () => {
    ensureTokens();
    const host = document.createElement('ki-tooltip') as KiTooltipElement;
    host.label = 'Send immediately';
    const trigger = document.createElement('button');
    trigger.textContent = 'Send';
    trigger.setAttribute('aria-description', 'Author note');
    host.append(trigger);
    document.body.append(host);
    await customElements.whenDefined('ki-tooltip');
    await expect.poll(() => trigger.getAttribute('aria-description')).toBe('Send immediately');

    moveToNewParent(host);
    expect(trigger.getAttribute('aria-description')).toBe('Send immediately');

    host.label = '';
    await expect.poll(() => trigger.getAttribute('aria-description')).toBe('Author note');
  });

  it('S2 a tooltip taken out of the document under the pointer comes back hidden and follows the pointer again', async () => {
    const { host, trigger } = await mount();
    await hoverTrigger(host, trigger);

    // Out of the document there is no pointerleave to hear, and the tooltip
    // lands away from the pointer: it must not come back believing the
    // pointer is still on it.
    host.remove();
    const spacer = document.createElement('div');
    spacer.style.blockSize = '240px';
    document.body.append(spacer, host);
    await expect.poll(() => isTooltipShown(host)).toBe(false);

    await userEvent.hover(trigger);
    await expect.poll(() => isTooltipShown(host)).toBe(true);
    await userEvent.unhover(trigger);
    await expect.poll(() => isTooltipShown(host)).toBe(false);
  });

  it('S9 preserves and restores a consumer-authored trigger aria-description', async () => {
    ensureTokens();
    const host = document.createElement('ki-tooltip') as KiTooltipElement;
    host.label = 'Send immediately';
    const trigger = document.createElement('button');
    trigger.textContent = 'Send';
    trigger.setAttribute('aria-description', 'Author note');
    host.append(trigger);
    document.body.appendChild(host);
    await customElements.whenDefined('ki-tooltip');
    const deadline = Date.now() + 500;
    while (!host.shadowRoot?.hasChildNodes() && Date.now() < deadline) {
      await nextFrame();
    }
    await nextFrame();

    // While labeled, the tooltip owns the description.
    expect(trigger.getAttribute('aria-description')).toBe('Send immediately');

    // Clearing the label restores the author's original description, not null.
    host.label = '';
    await nextFrame();
    expect(trigger.getAttribute('aria-description')).toBe('Author note');

    // Relabeling takes ownership again; teardown restores the author's value.
    host.label = 'Send now';
    await nextFrame();
    expect(trigger.getAttribute('aria-description')).toBe('Send now');
    host.remove();
    expect(trigger.getAttribute('aria-description')).toBe('Author note');
  });

  it('S4 Tab focus shows the tooltip immediately even when show-delay is non-zero', async () => {
    const { trigger } = await mount({ showDelay: '60000ms' });
    trigger.tabIndex = 0;

    await userEvent.keyboard('{Tab}');
    await nextFrame();

    expect(document.activeElement).toBe(trigger);
    await expect.element(page.getByRole('tooltip', { name: 'Send immediately' })).toBeVisible();
  });

  it('S6 moving focus to the next interactive element hides the tooltip', async () => {
    const { host, trigger } = await mount();
    const next = document.createElement('button');
    next.tabIndex = 0;
    next.textContent = 'Next';
    document.body.append(next);
    await userEvent.hover(next);

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
    const { host, trigger } = await mount({}, main);

    trigger.focus();
    await nextFrame();
    await expect.element(page.getByRole('tooltip', { name: 'Send immediately' })).toBeVisible();
    await settleTooltip(host);

    await expectAccessible(main);
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

    // keepPointer: the shown state under audit is HELD OPEN by the hover —
    // the default rest-state parking would dismiss it before the scan.
    await expectAccessible(main, { keepPointer: true });
  });
});
