import material3Css from '@kimen/tokens/css/material3?raw';
// @spec:024-ki-indicator
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
//
// The current-dot treatment is construction over theme tokens: the onmars
// pill is a transparent-center box whose border carries the paint (ring
// width = (block-size − hole) / 2), so "presents the current appearance" is
// measurable as the token-resolved geometry and paint of the dot-current
// part, and a theme that zeroes the hole collapses the same construction
// into a solid color-emphasized dot (material3).
import tokensCss from '@kimen/tokens/css?raw';
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { defineCustomElement } from '../dist/components/ki-indicator.js';

type KiIndicatorElement = HTMLElement & { count?: number; current?: number; label?: string };

const browserCommands = commands as unknown as {
  ariaSnapshot: (selector: string) => Promise<string>;
  emulateReducedMotion: (reducedMotion: 'reduce' | 'no-preference' | null) => Promise<void>;
};

const STYLE_ID = 'ki-indicator-browser-token-style';
const MATERIAL3_STYLE_ID = 'ki-indicator-browser-material3-token-style';

beforeAll(() => {
  defineCustomElement();
});

function ensureTokens(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = tokensCss;
  document.head.appendChild(style);
}

function ensureMaterial3Tokens(): void {
  if (document.getElementById(MATERIAL3_STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = MATERIAL3_STYLE_ID;
  style.textContent = material3Css;
  document.head.appendChild(style);
}

function landmark(): HTMLElement {
  let main = document.querySelector('main');
  if (!main) {
    main = document.createElement('main');
    document.body.appendChild(main);
  }
  return main;
}

function cleanup(): void {
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
  document.documentElement.removeAttribute('dir');
  landmark().replaceChildren();
}

async function waitUntil(condition: () => boolean, what: string): Promise<void> {
  const deadline = Date.now() + 2000;
  while (!condition() && Date.now() < deadline) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  expect(condition(), what).toBe(true);
}

/** Stencil renders async: wait until the row container exists. */
async function mount(
  container: HTMLElement,
  attributes: Record<string, string> = {},
): Promise<KiIndicatorElement> {
  ensureTokens();
  const el = document.createElement('ki-indicator') as KiIndicatorElement;
  for (const [name, value] of Object.entries(attributes)) {
    el.setAttribute(name, value);
  }
  container.appendChild(el);
  await customElements.whenDefined('ki-indicator');
  await waitUntil(
    () => Boolean(el.shadowRoot?.querySelector('[part="indicator"]')),
    'ki-indicator did not render its row',
  );
  return el;
}

function dotsOf(el: KiIndicatorElement): HTMLElement[] {
  return Array.from(el.shadowRoot?.querySelectorAll<HTMLElement>('[part~="dot"]') ?? []);
}

function rowOf(el: KiIndicatorElement): HTMLElement {
  const row = el.shadowRoot?.querySelector<HTMLElement>('[part="indicator"]');
  expect(row).toBeTruthy();
  if (!row) {
    throw new Error('ki-indicator did not render its row');
  }
  return row;
}

function dotAt(el: KiIndicatorElement, index: number): HTMLElement {
  const dot = dotsOf(el)[index];
  expect(dot).toBeTruthy();
  if (!dot) {
    throw new Error(`ki-indicator has no dot at index ${String(index)}`);
  }
  return dot;
}

function currentIndexOf(el: KiIndicatorElement): number {
  const dots = dotsOf(el);
  const current = dots.filter((dot) => dot.getAttribute('part')?.includes('dot-current'));
  expect(current, 'exactly one dot presents the current appearance').toHaveLength(1);
  const only = current[0];
  if (!only) {
    throw new Error('ki-indicator has no current dot');
  }
  return dots.indexOf(only);
}

function readTokenColor(name: string): string {
  const probe = document.createElement('div');
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

function readTokenLength(name: string): number {
  const probe = document.createElement('div');
  probe.style.blockSize = `var(${name})`;
  document.body.appendChild(probe);
  const value = Number.parseFloat(getComputedStyle(probe).blockSize);
  probe.remove();
  return value;
}

describe('ki-indicator', () => {
  it('S1 renders one dot per position in a single row with only the second current, all from tokens', async () => {
    cleanup();
    const el = await mount(landmark(), { label: 'Slide position', count: '5', current: '2' });
    const dots = dotsOf(el);

    expect(dots).toHaveLength(5);
    expect(currentIndexOf(el)).toBe(1);

    // A single row: every dot vertically centered on the same line.
    const firstRect = dotAt(el, 0).getBoundingClientRect();
    const rowCenter = firstRect.top + firstRect.height / 2;
    for (const dot of dots) {
      const rect = dot.getBoundingClientRect();
      expect(Math.abs(rect.top + rect.height / 2 - rowCenter)).toBeLessThan(1);
    }

    // Geometry and paint resolve from tokens (FR-007): the onmars 8px
    // resting circle, the 32x16 current pill and the Space/sm gap.
    expect(firstRect.width).toBe(readTokenLength('--ki-indicator-dot-inline-size'));
    expect(firstRect.height).toBe(readTokenLength('--ki-indicator-dot-block-size'));
    expect(getComputedStyle(dotAt(el, 0)).backgroundColor).toBe(
      readTokenColor('--ki-indicator-dot-color'),
    );
    const current = dotAt(el, 1).getBoundingClientRect();
    expect(current.width).toBe(readTokenLength('--ki-indicator-dot-current-inline-size'));
    expect(current.height).toBe(readTokenLength('--ki-indicator-dot-current-block-size'));
    expect(current.left - firstRect.right).toBe(readTokenLength('--ki-indicator-gap'));

    // The MarsUI ring construction: transparent center, the paint on the
    // border, ring width = (block-size − hole) / 2 = (16 − 6) / 2.
    const style = getComputedStyle(dotAt(el, 1));
    expect(style.borderTopColor).toBe(readTokenColor('--ki-indicator-dot-current-color'));
    expect(Number.parseFloat(style.borderTopWidth)).toBe(
      (readTokenLength('--ki-indicator-dot-current-block-size') -
        readTokenLength('--ki-indicator-dot-current-hole-block-size')) /
        2,
    );
    expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)');
  });

  it('S2 moves the highlight and the exposed position text when the current position changes', async () => {
    cleanup();
    const el = await mount(landmark(), { label: 'Slide position', count: '5', current: '2' });
    expect(currentIndexOf(el)).toBe(1);
    expect(el.getAttribute('aria-label')).toBe('Slide position, 2 / 5');

    el.setAttribute('current', '3');

    await waitUntil(() => currentIndexOf(el) === 2, 'the highlight did not follow the change');
    expect(dotsOf(el)).toHaveLength(5);
    expect(el.getAttribute('aria-label')).toBe('Slide position, 3 / 5');
  });

  it('S3 clamps an out-of-range current position to the last dot', async () => {
    cleanup();
    const el = await mount(landmark(), { label: 'Slide position', count: '5', current: '9' });
    expect(dotsOf(el)).toHaveLength(5);
    expect(currentIndexOf(el)).toBe(4);
    expect(el.getAttribute('aria-label')).toBe('Slide position, 5 / 5');
  });

  it('S4 falls a non-numeric current position back to the first dot', async () => {
    cleanup();
    const el = await mount(landmark(), { label: 'Slide position', count: '5', current: 'next' });
    expect(dotsOf(el)).toHaveLength(5);
    expect(currentIndexOf(el)).toBe(0);
    expect(el.getAttribute('aria-label')).toBe('Slide position, 1 / 5');
  });

  it('S5 renders the default appearance under an unrecognized variant attribute', async () => {
    cleanup();
    const control = await mount(landmark(), { label: 'Slide position', count: '3', current: '1' });
    const controlWidths = dotsOf(control).map((dot) => dot.getBoundingClientRect().width);

    const el = await mount(landmark(), {
      label: 'Slide position',
      count: '3',
      current: '1',
      variant: 'worm',
      size: 'lg',
    });

    // Unknown vocabulary from another design system matches no code path
    // and no selector: same anatomy, same token-resolved appearance.
    expect(dotsOf(el)).toHaveLength(3);
    expect(currentIndexOf(el)).toBe(0);
    expect(dotsOf(el).map((dot) => dot.getBoundingClientRect().width)).toEqual(controlWidths);
  });

  it('S6 reduced motion moves the highlight without transitional motion', async () => {
    cleanup();
    await browserCommands.emulateReducedMotion('reduce');
    const el = await mount(landmark(), { label: 'Slide position', count: '5', current: '2' });

    el.setAttribute('current', '3');
    await waitUntil(() => currentIndexOf(el) === 2, 'the highlight did not follow the change');

    // The computed transitions of every dot are inert (SC-004): durations
    // resolve to zero under prefers-reduced-motion by construction.
    for (const dot of dotsOf(el)) {
      const durations = getComputedStyle(dot)
        .transitionDuration.split(',')
        .map((duration) => Number.parseFloat(duration));
      for (const duration of durations) {
        expect(duration).toBe(0);
      }
    }
    await browserCommands.emulateReducedMotion(null);
  });

  it('S7 adds no keyboard stop between two buttons', async () => {
    cleanup();
    const save = document.createElement('button');
    save.textContent = 'Previous';
    landmark().appendChild(save);
    const el = await mount(landmark(), { label: 'Slide position', count: '5', current: '2' });
    const next = document.createElement('button');
    next.textContent = 'Next';
    landmark().appendChild(next);

    save.focus();
    expect(document.activeElement).toBe(save);
    await userEvent.keyboard('{Tab}');

    expect(document.activeElement).toBe(next);
    expect(el.contains(document.activeElement)).toBe(false);
    expect(el.shadowRoot?.activeElement ?? null).toBeNull();
  });

  it('S8 exposes one graphic named from label and position whose dots contribute nothing', async () => {
    cleanup();
    const el = await mount(landmark(), { label: 'Slide position', count: '5', current: '2' });
    el.id = 's8-indicator';

    // The REAL computed accessibility tree (Playwright ariaSnapshot): one
    // image named "<label>, <current> / <count>" and nothing below it.
    const snapshot = await browserCommands.ariaSnapshot('#s8-indicator');
    expect(snapshot.trim()).toBe('- img "Slide position, 2 / 5"');

    for (const dot of dotsOf(el)) {
      expect(dot.getAttribute('role')).toBeNull();
      expect(dot.getAttribute('aria-label')).toBeNull();
      expect(dot.getAttribute('aria-current')).toBeNull();
      expect(dot.getAttribute('tabindex')).toBeNull();
      expect(dot.textContent).toBe('');
    }

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });

  it('S9 restyles size, shape, spacing and colors through material3 tokens alone', async () => {
    cleanup();
    ensureTokens();
    const onmars = await mount(landmark(), { label: 'Slide position', count: '5', current: '2' });
    const onmarsGap = readTokenLength('--ki-indicator-gap');
    const onmarsCurrentWidth = readTokenLength('--ki-indicator-dot-current-inline-size');
    const onmarsCurrentPaint = getComputedStyle(dotAt(onmars, 1)).borderTopColor;
    const onmarsRestingColor = readTokenColor('--ki-indicator-dot-color');
    const markup = onmars.outerHTML;
    onmars.remove();

    ensureMaterial3Tokens();
    document.documentElement.setAttribute('data-ki-theme', 'material3');
    const el = await mount(landmark(), { label: 'Slide position', count: '5', current: '2' });

    expect(el.outerHTML).toBe(markup);
    // Uniform 8dp circles at 8dp gaps: emphasis by color alone (the M2
    // pager-dot reading recorded in the theme token values).
    expect(readTokenLength('--ki-indicator-dot-current-inline-size')).toBe(8);
    expect(readTokenLength('--ki-indicator-dot-current-inline-size')).not.toBe(onmarsCurrentWidth);
    expect(readTokenLength('--ki-indicator-gap')).toBe(8);
    expect(readTokenLength('--ki-indicator-gap')).not.toBe(onmarsGap);
    expect(readTokenLength('--ki-indicator-dot-current-hole-block-size')).toBe(0);
    expect(dotAt(el, 1).getBoundingClientRect().width).toBe(8);
    expect(dotAt(el, 1).getBoundingClientRect().height).toBe(8);
    // The zeroed hole collapses the ring into a solid current dot painted
    // in the theme's current color, distinct from the resting fill.
    const currentPaint = getComputedStyle(dotAt(el, 1)).borderTopColor;
    expect(currentPaint).toBe(readTokenColor('--ki-indicator-dot-current-color'));
    expect(currentPaint).not.toBe(onmarsCurrentPaint);
    expect(readTokenColor('--ki-indicator-dot-color')).not.toBe(onmarsRestingColor);

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });

  it('S11 the first position leads the row from the right edge in a right-to-left document', async () => {
    cleanup();
    document.documentElement.setAttribute('dir', 'rtl');
    const el = await mount(landmark(), { label: 'Slide position', count: '5', current: '1' });

    expect(currentIndexOf(el)).toBe(0);
    // Physical right edge: the first position's dot is the rightmost and
    // flush with the row's right edge (logical flow, zero direction code).
    const rowRect = rowOf(el).getBoundingClientRect();
    const first = dotAt(el, 0).getBoundingClientRect();
    const last = dotAt(el, 4).getBoundingClientRect();
    expect(Math.abs(first.right - rowRect.right)).toBeLessThan(1);
    expect(first.left).toBeGreaterThan(last.right);
    document.documentElement.removeAttribute('dir');
  });
});
