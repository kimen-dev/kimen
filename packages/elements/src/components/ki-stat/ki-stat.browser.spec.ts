// @spec:088-ki-stat
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-stat.js';

const browser = commands as unknown as {
  ariaSnapshot: (selector: string) => Promise<string>;
  emulateForcedColors: (value: 'active' | 'none' | null) => Promise<void>;
  emulateReducedMotion: (value: 'reduce' | 'no-preference' | null) => Promise<void>;
};
const fixture = document.createElement('main');
const styles = document.createElement('style');
const renderTime = 'Median render time';

function mount(attributes: Record<string, string> = {}) {
  const stat = document.createElement('ki-stat');
  stat.id = 'stat';
  for (const [name, value] of Object.entries({
    label: renderTime,
    value: '84',
    unit: 'ms',
    ...attributes,
  })) {
    stat.setAttribute(name, value);
  }
  fixture.append(stat);
  return stat;
}

function part(name: string) {
  return fixture
    .querySelector('ki-stat')
    ?.shadowRoot?.querySelector<HTMLElement>(`[part="${name}"]`);
}

function trendName() {
  return (part('trend') as HTMLKiIconElement | null | undefined)?.name;
}

function paintedPart(name: string): HTMLElement {
  const element = part(name);
  if (!element) {
    throw new Error(`The stat did not render its ${name} part`);
  }
  return element;
}

async function renderComparison() {
  await expect
    .poll(() => part('comparison')?.getBoundingClientRect().height ?? 0)
    .toBeGreaterThan(0);
}

async function expectText(name: string, text: string) {
  await expect.poll(() => part(name)?.textContent.replace(/\s+/g, ' ').trim()).toBe(text);
}

function addButton(label: string) {
  const button = document.createElement('button');
  button.textContent = label;
  button.tabIndex = 0;
  fixture.append(button);
  return button;
}

beforeAll(() => {
  defineCustomElement();
  styles.textContent = tokensCss;
  document.head.append(styles);
  fixture.lang = 'en-US';
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  fixture.lang = 'en-US';
  fixture.removeAttribute('dir');
  fixture.removeAttribute('style');
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('S1 paints the page locale and applies independent formatting to the comparison', async () => {
  fixture.lang = 'de-DE';
  const stat = mount({ value: '1234.5', delta: '-0.12' });
  Object.assign(stat, { deltaFormat: { style: 'percent' } });

  await expectText('value', '1.234,5 ms');
  await expectText('delta', '12 %');
  await expect.poll(trendName).toBe('trending-down');
});

it('S1 updates both values from the JavaScript format property when no delta format is supplied', async () => {
  const stat = mount({ delta: '9' });
  await renderComparison();

  Object.assign(stat, { format: { style: 'currency', currency: 'USD' } });

  await expectText('value', '$84.00');
  await expectText('delta', '$9.00');
});

it.each([
  ['higher-is-better', '9', 'trending-up', 'rgb(0, 100, 0)'],
  ['higher-is-better', '-9', 'trending-down', 'rgb(139, 0, 0)'],
  ['lower-is-better', '9', 'trending-up', 'rgb(139, 0, 0)'],
  ['lower-is-better', '-9', 'trending-down', 'rgb(0, 100, 0)'],
  ['neutral', '-9', 'trending-down', 'rgb(0, 0, 128)'],
])(
  'S2 paints %s change %s with glyph %s and the matching tone',
  async (direction, delta, icon, color) => {
    const stat = mount({ direction, delta });
    stat.style.setProperty('--ki-stat-delta-success-fg', 'darkgreen');
    stat.style.setProperty('--ki-stat-delta-danger-fg', 'darkred');
    stat.style.setProperty('--ki-stat-delta-neutral-fg', 'navy');

    await expect.poll(trendName).toBe(icon);
    await expect
      .poll(
        () => part('trend')?.shadowRoot?.querySelector('svg')?.getBoundingClientRect().height ?? 0,
      )
      .toBeGreaterThan(0);
    expect(getComputedStyle(paintedPart('delta')).color).toBe(color);
    expect(getComputedStyle(paintedPart('trend')).color).toBe(color);
  },
);

it('S3 omits the comparison and its reference when the change is absent', async () => {
  mount({ label: 'Active surfaces', value: '1284', unit: '', 'delta-label': 'vs last week' });

  await expectText('label', 'Active surfaces');
  await expectText('value', '1,284');
  expect(part('comparison')).toBeNull();
});

it('S4 exposes zero with its unit and reference and paints no direction glyph', async () => {
  const stat = mount({ delta: '0', 'delta-label': 'vs last week' });
  stat.style.setProperty('--ki-stat-delta-neutral-fg', 'navy');

  await expectText('delta', '0 ms');
  await expectText('reference', 'vs last week');
  expect(part('trend')).toBeNull();
  expect(getComputedStyle(paintedPart('delta')).color).toBe('rgb(0, 0, 128)');
  expect(await browser.ariaSnapshot('#stat')).toContain('84 ms, 0 ms vs last week');
});

it('S5 leaves the Tab and Shift+Tab sequence intact', async () => {
  const edit = addButton('Edit');
  mount({ delta: '-9' });
  const exportButton = addButton('Export');
  await renderComparison();

  edit.focus();
  await userEvent.keyboard('{Tab}');
  expect(document.activeElement).toBe(exportButton);
  await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
  expect(document.activeElement).toBe(edit);
});

it('S6 exposes one static phrase with the direction in words and passes axe', async () => {
  mount({ delta: '-9', direction: 'lower-is-better', 'delta-label': 'vs last week' });
  await renderComparison();

  const snapshot = await browser.ariaSnapshot('#stat');
  expect(snapshot).toContain('Median render time, 84 ms, down 9 ms vs last week');
  expect(snapshot.match(/Median render time/g)).toHaveLength(1);
  expect(snapshot).not.toContain('img');
  await expectAccessible(fixture);
});

it('S6 allows the application to translate the direction words', async () => {
  mount({ delta: '9', 'up-label': 'hausse de' });
  await renderComparison();

  expect(await browser.ariaSnapshot('#stat')).toContain('84 ms, hausse de 9 ms');
});

it('S7 exposes the chart and its alternative separately from the phrase', async () => {
  const stat = mount({ label: 'Sales', value: '750', unit: '' });
  const chart = document.createElement('span');
  chart.slot = 'chart';
  chart.textContent = 'Sales trend';
  chart.setAttribute('role', 'img');
  chart.setAttribute('aria-label', 'Revenue over seven days');
  stat.append(chart);

  await expectText('value', '750');
  await expect
    .element(page.getByRole('img', { name: 'Revenue over seven days' }))
    .toBeInTheDocument();
  const snapshot = await browser.ariaSnapshot('#stat');
  expect(snapshot).toContain('Sales, 750');
  expect(snapshot).toContain('img "Revenue over seven days"');
});

it('S8 paints the theme surface and keeps the text visible', async () => {
  const stat = mount();
  stat.style.setProperty('--ki-stat-bg', 'white');

  await expect.poll(() => part('card')?.getBoundingClientRect().height ?? 0).toBeGreaterThan(0);
  expect(getComputedStyle(paintedPart('card')).backgroundColor).toBe('rgb(255, 255, 255)');
  await expect.poll(() => part('value')?.getBoundingClientRect().height ?? 0).toBeGreaterThan(0);
});

it('S9 preserves a visible falling trend and number in a forced palette', async (test) => {
  mount({ delta: '-9' });
  fixture.style.backgroundColor = 'rgb(1, 2, 3)';
  await renderComparison();
  await browser.emulateForcedColors('active');

  try {
    const paletteApplies = () =>
      matchMedia('(forced-colors: active)').matches &&
      getComputedStyle(fixture).backgroundColor !== 'rgb(1, 2, 3)';
    if (navigator.userAgent.includes('Chrome/')) {
      await expect.poll(paletteApplies).toBe(true);
    } else if (!paletteApplies()) {
      test.skip('this engine does not apply a forced palette under emulation');
    }

    await expect.poll(() => part('trend')?.getBoundingClientRect().height ?? 0).toBeGreaterThan(0);
    await expect.poll(trendName).toBe('trending-down');
    await expectText('delta', '9 ms');
    const surface = getComputedStyle(paintedPart('card')).backgroundColor;
    expect(getComputedStyle(paintedPart('trend')).color).not.toBe(surface);
    expect(getComputedStyle(paintedPart('delta')).color).not.toBe(surface);
  } finally {
    await browser.emulateForcedColors(null);
  }
});

it('S10 stays visible and still under reduced motion', async () => {
  await browser.emulateReducedMotion('reduce');
  try {
    expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    mount({ delta: '-9' });
    await renderComparison();

    await expect.poll(() => part('value')?.getBoundingClientRect().height ?? 0).toBeGreaterThan(0);
    await expect.poll(() => part('trend')?.getBoundingClientRect().height ?? 0).toBeGreaterThan(0);
    expect(paintedPart('card').getAnimations({ subtree: true })).toHaveLength(0);
  } finally {
    await browser.emulateReducedMotion(null);
  }
});

it('S11 puts the trend at inline start in an RTL card', async () => {
  fixture.dir = 'rtl';
  mount({ delta: '-9' });
  await renderComparison();

  const magnitude = paintedPart('delta').querySelector('bdi');
  expect(magnitude).toBeInstanceOf(HTMLElement);
  await expect
    .poll(() => {
      const glyph = paintedPart('trend').getBoundingClientRect();
      return (
        glyph.width > 0 &&
        glyph.left >= (magnitude?.getBoundingClientRect().right ?? Infinity) - 0.5
      );
    })
    .toBe(true);
});
