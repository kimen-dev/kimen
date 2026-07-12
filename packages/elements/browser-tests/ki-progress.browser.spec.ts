import material3Css from '@kimen/tokens/css/material3?raw';
import tokensCss from '@kimen/tokens/css?raw';
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

// @spec:015-ki-progress
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
import { defineCustomElement } from '../dist/components/ki-progress.js';

type KiProgressElement = HTMLElement & {
  indeterminate: boolean;
  label: string;
  max: number;
  shape: string;
  value: number;
};

const STYLE_ID = 'ki-progress-browser-token-style';
const MATERIAL3_STYLE_ID = 'ki-progress-browser-material3-token-style';
const browserCommands = commands as unknown as {
  emulateReducedMotion: (reducedMotion: 'reduce' | 'no-preference' | null) => Promise<void>;
};

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

async function cleanupMedia(): Promise<void> {
  await browserCommands.emulateReducedMotion(null);
}

async function waitForRender(el: KiProgressElement): Promise<void> {
  await customElements.whenDefined('ki-progress');
  const deadline = Date.now() + 1000;
  while (!el.shadowRoot?.hasChildNodes() && Date.now() < deadline) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

async function mount(
  attributes: Partial<
    Record<'indeterminate' | 'label' | 'max' | 'shape' | 'value', string | boolean>
  >,
): Promise<KiProgressElement> {
  ensureTokens();
  const main = document.querySelector('main') ?? document.createElement('main');
  if (!main.isConnected) {
    document.body.append(main);
  }
  const el = document.createElement('ki-progress') as KiProgressElement;
  for (const [name, value] of Object.entries(attributes)) {
    if (typeof value === 'boolean') {
      el.toggleAttribute(name, value);
    } else {
      el.setAttribute(name, value);
    }
  }
  main.append(el);
  await waitForRender(el);
  return el;
}

function requireShadow(el: KiProgressElement): ShadowRoot {
  const shadow = el.shadowRoot;
  expect(shadow).toBeInstanceOf(ShadowRoot);
  if (!shadow) {
    throw new Error('ki-progress did not attach a shadow root');
  }
  return shadow;
}

function requireElement(root: ParentNode, selector: string): Element {
  const el = root.querySelector(selector);
  expect(el).toBeInstanceOf(Element);
  if (!el) {
    throw new Error(`Missing ${selector}`);
  }
  return el;
}

function progressbar(el: KiProgressElement): HTMLDivElement {
  return requireElement(requireShadow(el), '.base[role="progressbar"]') as HTMLDivElement;
}

function track(el: KiProgressElement): HTMLElement | SVGElement {
  return requireElement(requireShadow(el), '[part="track"]') as HTMLElement | SVGElement;
}

function indicator(el: KiProgressElement): HTMLElement | SVGElement {
  return requireElement(requireShadow(el), '[part="indicator"]') as HTMLElement | SVGElement;
}

function requireMain(): HTMLElement {
  const main = document.querySelector('main');
  expect(main).toBeInstanceOf(HTMLElement);
  if (!main) {
    throw new Error('Missing main test container');
  }
  return main;
}

function readToken(
  name: string,
  property: 'backgroundColor' | 'inlineSize' = 'backgroundColor',
): string {
  const probe = document.createElement('div');
  if (property === 'backgroundColor') {
    probe.style.backgroundColor = `var(${name})`;
  } else {
    probe.style.inlineSize = `var(${name})`;
  }
  document.body.append(probe);
  const value = getComputedStyle(probe)[property];
  probe.remove();
  return value;
}

function linearFillRatio(el: KiProgressElement): number {
  const trackRect = track(el).getBoundingClientRect();
  const indicatorRect = indicator(el).getBoundingClientRect();
  return indicatorRect.width / trackRect.width;
}

function circularDash(el: KiProgressElement): string {
  return getComputedStyle(indicator(el)).strokeDasharray;
}

function partColor(el: Element): string {
  const styles = getComputedStyle(el);
  return styles.stroke === 'none' ? styles.backgroundColor : styles.stroke;
}

function runningInfiniteAnimations(el: Element): Animation[] {
  return el.getAnimations().filter((animation) => {
    const timing = animation.effect?.getComputedTiming();
    return animation.playState === 'running' && timing?.iterations === Number.POSITIVE_INFINITY;
  });
}

describe('ki-progress in a real browser', () => {
  it('S1 fills a linear progress to 40 percent of the track', async () => {
    cleanup();
    await cleanupMedia();
    const el = await mount({ label: 'Uploading report.pdf', value: '40', max: '100' });

    expect(linearFillRatio(el)).toBeCloseTo(0.4, 1);
  });

  it('S2 presents circular progress as 40 of the normalized circumference', async () => {
    cleanup();
    await cleanupMedia();
    const el = await mount({
      label: 'Uploading report.pdf',
      shape: 'circular',
      value: '40',
      max: '100',
    });

    expect(circularDash(el).replaceAll(',', '')).toContain('40');
    expect(circularDash(el).replaceAll(',', '')).toContain('100');
  });

  it('S4 clamps values above max to a full linear indicator', async () => {
    cleanup();
    await cleanupMedia();
    const el = await mount({ label: 'Uploading report.pdf', value: '250', max: '100' });

    expect(linearFillRatio(el)).toBeCloseTo(1, 1);
    expect(progressbar(el).getAttribute('aria-valuenow')).toBe('100');
  });

  it('S13 updates fill and exposed value when value changes at runtime', async () => {
    cleanup();
    await cleanupMedia();
    const el = await mount({ label: 'Uploading report.pdf', value: '40', max: '100' });

    el.value = 80;
    await waitForRender(el);

    expect(linearFillRatio(el)).toBeCloseTo(0.8, 1);
    expect(progressbar(el).getAttribute('aria-valuenow')).toBe('80');
  });

  it('S14 renders documented malformed rows safely in a real browser', async () => {
    cleanup();
    await cleanupMedia();
    const cases = [
      { value: '-10', max: '100', expected: '0', ratio: 0 },
      { value: 'abc', max: '100', expected: '0', ratio: 0 },
      { value: '40', max: '0', expected: '40', ratio: 0.4, normalizedMax: '100' },
      { value: '40', max: '-5', expected: '40', ratio: 0.4, normalizedMax: '100' },
      { value: '40', max: 'abc', expected: '40', ratio: 0.4, normalizedMax: '100' },
    ];

    for (const row of cases) {
      const el = await mount({ label: 'Uploading report.pdf', value: row.value, max: row.max });
      expect(progressbar(el).getAttribute('aria-valuenow')).toBe(row.expected);
      expect(progressbar(el).getAttribute('aria-valuemax')).toBe(row.normalizedMax ?? row.max);
      expect(linearFillRatio(el)).toBeCloseTo(row.ratio, 1);
    }
  });

  it('S1 resolves track and indicator colors from progress tokens', async () => {
    cleanup();
    await cleanupMedia();
    const el = await mount({ label: 'Uploading report.pdf', value: '40', max: '100' });

    expect(getComputedStyle(track(el)).backgroundColor).toBe(
      readToken('--ki-progress-track-color'),
    );
    expect(getComputedStyle(indicator(el)).backgroundColor).toBe(
      readToken('--ki-progress-indicator-color'),
    );
  });

  it('S1 has zero axe violations for labeled determinate progress mounted in main', async () => {
    cleanup();
    await cleanupMedia();
    await mount({ label: 'Uploading report.pdf', value: '40', max: '100' });

    const results = await axe.run(requireMain());
    expect(results.violations).toEqual([]);
  });

  it('S3 shows running infinite indeterminate activity in both shapes without a completed fraction', async () => {
    cleanup();
    await browserCommands.emulateReducedMotion('no-preference');

    for (const shape of ['linear', 'circular'] as const) {
      const el = await mount({ label: 'Loading messages', indeterminate: true, shape });
      expect(progressbar(el).hasAttribute('aria-valuenow')).toBe(false);
      expect(runningInfiniteAnimations(indicator(el))).not.toHaveLength(0);
    }
  });

  it('S15 lets indeterminate win over a declared value', async () => {
    cleanup();
    await browserCommands.emulateReducedMotion('no-preference');
    const el = await mount({
      label: 'Loading messages',
      indeterminate: true,
      value: '40',
      max: '100',
    });

    expect(progressbar(el).hasAttribute('aria-valuenow')).toBe(false);
    expect(progressbar(el).style.getPropertyValue('--_ki-progress-fraction')).toBe('');
  });

  it('S8 exposes a labeled determinate progressbar with current value and range', async () => {
    cleanup();
    await cleanupMedia();
    const el = await mount({ label: 'Uploading report.pdf', value: '40', max: '100' });
    const base = progressbar(el);

    await expect
      .element(page.getByRole('progressbar', { name: 'Uploading report.pdf' }))
      .toBeInTheDocument();
    expect(base.getAttribute('aria-label')).toBe('Uploading report.pdf');
    expect(base.getAttribute('aria-valuemin')).toBe('0');
    expect(base.getAttribute('aria-valuemax')).toBe('100');
    expect(base.getAttribute('aria-valuenow')).toBe('40');
  });

  it('S9 exposes a labeled indeterminate progressbar without current value', async () => {
    cleanup();
    await cleanupMedia();
    const el = await mount({ label: 'Loading messages', indeterminate: true });
    const base = progressbar(el);

    await expect
      .element(page.getByRole('progressbar', { name: 'Loading messages' }))
      .toBeInTheDocument();
    expect(base.getAttribute('aria-label')).toBe('Loading messages');
    expect(base.getAttribute('aria-valuemin')).toBe('0');
    expect(base.getAttribute('aria-valuemax')).toBe('100');
    expect(base.hasAttribute('aria-valuenow')).toBe(false);
  });

  it('S7 adds no tab stop between adjacent buttons', async () => {
    cleanup();
    await cleanupMedia();
    const main = document.createElement('main');
    document.body.append(main);
    const before = document.createElement('button');
    before.tabIndex = 0;
    before.textContent = 'Before';
    const after = document.createElement('button');
    after.tabIndex = 0;
    after.textContent = 'After';
    main.append(before);
    await mount({ label: 'Uploading report.pdf', value: '40', max: '100' });
    main.append(after);

    before.focus();
    await userEvent.keyboard('{Tab}');

    expect(document.activeElement).toBe(after);
  });

  it('S8 renders no empty aria-label when label is omitted', async () => {
    cleanup();
    await cleanupMedia();
    const el = await mount({ value: '40', max: '100' });

    expect(progressbar(el).hasAttribute('aria-label')).toBe(false);
  });

  it('S8 S9 have zero axe violations across the labeled shape mode matrix', async () => {
    cleanup();
    await cleanupMedia();
    for (const shape of ['linear', 'circular'] as const) {
      await mount({ label: `${shape} determinate`, shape, value: '40', max: '100' });
      await mount({ label: `${shape} indeterminate`, shape, indeterminate: true });
    }

    const results = await axe.run(requireMain());
    expect(results.violations).toEqual([]);
  });

  it('S10 restyles the shape mode matrix from material3 progress tokens without markup changes', async () => {
    cleanup();
    await cleanupMedia();
    ensureMaterial3Tokens();
    document.documentElement.setAttribute('data-ki-theme', 'material3');

    for (const shape of ['linear', 'circular'] as const) {
      for (const indeterminate of [false, true]) {
        const el = await mount({
          label: `${shape} ${indeterminate ? 'indeterminate' : 'determinate'}`,
          shape,
          indeterminate,
          value: '40',
          max: '100',
        });

        expect(partColor(track(el))).toBe(readToken('--ki-progress-track-color'));
        expect(partColor(indicator(el))).toBe(readToken('--ki-progress-indicator-color'));
        expect(progressbar(el).outerHTML).toContain('role="progressbar"');

        if (shape === 'linear') {
          expect(getComputedStyle(track(el)).blockSize).toBe(
            readToken('--ki-progress-linear-thickness', 'inlineSize'),
          );
        } else {
          const svg = requireElement(requireShadow(el), 'svg');
          expect(getComputedStyle(svg).inlineSize).toBe(
            readToken('--ki-progress-circular-size', 'inlineSize'),
          );
        }
      }
    }
  });

  it('S12 grows the linear fill from the right edge under RTL', async () => {
    cleanup();
    await cleanupMedia();
    document.documentElement.setAttribute('dir', 'rtl');
    const el = await mount({ label: 'Uploading report.pdf', value: '40', max: '100' });

    const trackRect = track(el).getBoundingClientRect();
    const indicatorRect = indicator(el).getBoundingClientRect();
    expect(indicatorRect.right).toBeCloseTo(trackRect.right, 1);
    expect(indicatorRect.left).toBeGreaterThan(trackRect.left);
  });

  it('S5 renders an unrecognized shape with default linear metrics', async () => {
    cleanup();
    await cleanupMedia();
    const baseline = await mount({ label: 'Default shape', value: '40', max: '100' });
    const baselineTrackSize = getComputedStyle(track(baseline)).blockSize;
    baseline.remove();

    const el = await mount({ label: 'Unknown shape', shape: 'banana', value: '40', max: '100' });

    expect(requireShadow(el).querySelector('svg')).toBeNull();
    expect(getComputedStyle(track(el)).blockSize).toBe(baselineTrackSize);
    expect(linearFillRatio(el)).toBeCloseTo(0.4, 1);
  });

  it('S14 renders a non-numeric value empty at the default 0', async () => {
    cleanup();
    await cleanupMedia();
    const el = await mount({ label: 'Uploading report.pdf', value: 'abc', max: '100' });

    expect(progressbar(el).getAttribute('aria-valuenow')).toBe('0');
    expect(linearFillRatio(el)).toBeCloseTo(0, 1);
  });
});
