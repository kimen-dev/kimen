// @spec:069-ki-icon
import '../../../icons/circle-check.js';
import '../../../icons/triangle-alert.js';
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

import { expectAccessible } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-icon.js';

const styles = document.createElement('style');
const fixture = document.createElement('main');

const media = commands as unknown as {
  ariaSnapshot: (selector: string) => Promise<string>;
  emulateForcedColors: (value: 'active' | null) => Promise<void>;
  emulateReducedMotion: (value: 'reduce' | null) => Promise<void>;
  emulateHoverCapability: (value: 'none' | null) => Promise<boolean>;
};

beforeAll(() => {
  defineCustomElement();
  styles.textContent = tokensCss;
  document.head.appendChild(styles);
  document.body.appendChild(fixture);
});

afterEach(() => {
  fixture.replaceChildren();
});
afterAll(() => {
  fixture.remove();
  styles.remove();
});

function icon(name: string, parent: HTMLElement = fixture) {
  const element = document.createElement('ki-icon');
  element.setAttribute('name', name);
  parent.appendChild(element);
  return element;
}

async function glyph(element: HTMLElement): Promise<SVGSVGElement> {
  await expect.poll(() => element.shadowRoot?.querySelector('svg')).toBeInstanceOf(SVGSVGElement);
  const svg = element.shadowRoot?.querySelector('svg');
  if (!svg) throw new Error('Expected a glyph');
  return svg;
}

it('S1 replaces the geometry when the name changes', async () => {
  const element = icon('circle-check');
  const first = await glyph(element);
  expect(first.getAttribute('viewBox')).toBe('0 0 24 24');
  expect(first.getAttribute('fill')).toBe('none');
  expect(first.getAttribute('stroke')).toBe('currentColor');
  expect(first.getAttribute('stroke-linecap')).toBe('round');
  expect(first.getAttribute('stroke-linejoin')).toBe('round');
  expect(first.querySelector('circle')).not.toBeNull();

  element.setAttribute('name', 'triangle-alert');
  await expect.poll(() => element.shadowRoot?.querySelectorAll('svg path').length).toBe(3);
  expect((await glyph(element)).querySelector('circle')).toBeNull();
});

it('S2 skips decorative and labelled icons when tabbing', async () => {
  fixture.innerHTML =
    '<input aria-label="Before"><ki-icon name="circle-check"></ki-icon>' +
    '<ki-icon name="triangle-alert" label="Warning"></ki-icon><input aria-label="After">';
  for (const element of fixture.querySelectorAll('ki-icon')) await glyph(element);
  fixture.querySelector('input')?.focus();

  await userEvent.keyboard('{Tab}');

  await expect.element(page.getByRole('textbox', { name: 'After' })).toHaveFocus();
});

it('S3 exposes one named image and passes axe with decorative and labelled glyphs', async () => {
  const decorative = icon('circle-check');
  const labelled = icon('triangle-alert');
  labelled.setAttribute('label', 'Warning');
  await glyph(decorative);
  await glyph(labelled);

  expect(await media.ariaSnapshot('main')).toBe('- main:\n  - img "Warning"');
  await expectAccessible(fixture);
  labelled.setAttribute('label', '  ');
  await expect.element(page.getByRole('img')).not.toBeInTheDocument();
});

it('S4 contributes no form data even with a name attribute', async () => {
  const form = document.createElement('form');
  form.innerHTML = '<label>Status <input name="status" value="confirmed"></label>';
  fixture.appendChild(form);
  await glyph(icon('circle-check', form));

  expect([...new FormData(form)]).toEqual([['status', 'confirmed']]);
});

it('S5 uses theme overrides and inherits the surrounding ink', async () => {
  const theme = document.createElement('div');
  theme.style.setProperty('--ki-icon-size-sm', '18px');
  theme.style.setProperty('--ki-icon-stroke-width', '3');
  theme.style.color = 'var(--ki-text-success-high-em)';
  fixture.appendChild(theme);
  const element = icon('circle-check', theme);
  element.setAttribute('size', 'sm');
  const svg = await glyph(element);
  const computed = getComputedStyle(svg);

  expect(svg.getBoundingClientRect().width).toBe(18);
  expect(svg.getBoundingClientRect().height).toBe(18);
  expect(Number.parseFloat(computed.strokeWidth)).toBe(3);
  expect(computed.stroke).toBe(getComputedStyle(theme).color);
});

it('S5 resolves all preset sizes and inherits 1em by default', async () => {
  const line = document.createElement('p');
  line.style.fontSize = '19px';
  fixture.appendChild(line);
  const element = icon('circle-check', line);
  const svg = await glyph(element);
  const width = () => svg.getBoundingClientRect().width;
  expect(width()).toBe(19);
  for (const [size, pixels] of [
    ['sm', 16],
    ['md', 20],
    ['lg', 24],
    ['inherit', 19],
  ] as const) {
    element.setAttribute('size', size);
    await expect.poll(width).toBe(pixels);
  }
});

it.each(['abacus', 'made-up', 'https://example.test/payload.svg'])(
  'S7 renders an empty inaccessible glyph for %s without fetching',
  async (name) => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    try {
      const element = icon('circle-check');
      element.setAttribute('label', 'Status');
      await glyph(element);

      element.setAttribute('name', name);

      await expect.poll(() => element.shadowRoot?.querySelector('svg')).toBeNull();
      expect(await media.ariaSnapshot('main')).toBe('- main');
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      fetch.mockRestore();
    }
  },
);

it('S9 keeps the inherited glyph static with RTL, forced colours and coarse-pointer density', async () => {
  const row = document.createElement('div');
  row.dir = 'rtl';
  row.dataset.kiDensity = 'touch';
  row.style.fontSize = '19px';
  row.style.color = 'var(--ki-text-success-high-em)';
  fixture.appendChild(row);
  const element = icon('circle-check', row);
  element.setAttribute('label', 'Confirmed');
  const svg = await glyph(element);
  const geometry = svg.innerHTML;

  try {
    const coarsePointer = await media.emulateHoverCapability('none');
    expect(coarsePointer).toBe(navigator.userAgent.includes('Chrome/'));
    if (coarsePointer) await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);
    await media.emulateForcedColors('active');
    await media.emulateReducedMotion('reduce');

    expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    // WebKit does not expose forced-colors. Where the feature exists, the
    // effective ink must be the surrounding forced palette's ink.
    if (navigator.userAgent.includes('Chrome/') || navigator.userAgent.includes('Firefox/')) {
      expect(matchMedia('(forced-colors: active)').matches).toBe(true);
    }
    expect(getComputedStyle(svg).stroke).toBe(getComputedStyle(row).color);
    expect(getComputedStyle(svg).direction).toBe('rtl');
    expect(svg.getBoundingClientRect().width).toBe(19);
    expect(svg.innerHTML).toBe(geometry);
    expect(element.getAnimations({ subtree: true })).toEqual([]);
  } finally {
    await media.emulateForcedColors(null);
    await media.emulateReducedMotion(null);
    await media.emulateHoverCapability(null);
  }
});
