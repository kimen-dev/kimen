// @spec:084-ki-skeleton
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-skeleton.js';

const styles = document.createElement('style');
const fixture = document.createElement('main');

const browserCommands = commands as unknown as {
  ariaSnapshot: (selector: string) => Promise<string>;
  emulateForcedColors: (value: 'active' | null) => Promise<void>;
  emulateReducedMotion: (value: 'reduce' | 'no-preference' | null) => Promise<void>;
  installClock: () => Promise<void>;
  pauseClock: () => Promise<void>;
  fastForwardClock: (milliseconds: number) => Promise<void>;
  resumeClock: () => Promise<void>;
};

beforeAll(() => {
  defineCustomElement();
  styles.textContent = tokensCss;
  document.head.appendChild(styles);
  document.body.appendChild(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

function parts(host: HTMLElement): HTMLElement[] {
  return [...(host.shadowRoot?.querySelectorAll<HTMLElement>('[part="shape"]') ?? [])];
}

async function paintedPart(host: HTMLElement): Promise<HTMLElement> {
  await expect.poll(() => parts(host)[0]).toBeInstanceOf(HTMLElement);
  const part = parts(host)[0];
  if (part === undefined) throw new Error('Expected a painted skeleton shape');
  return part;
}

function skeleton(attributes: Record<string, string> = {}, parent: HTMLElement = fixture) {
  const host = document.createElement('ki-skeleton');
  for (const [name, value] of Object.entries(attributes)) host.setAttribute(name, value);
  parent.appendChild(host);
  return host;
}

function dimensions(element: HTMLElement): [number, number] {
  const { width, height } = element.getBoundingClientRect();
  return [width, height];
}

function shimmer(part: HTMLElement) {
  return getComputedStyle(part, '::after').animationName;
}

it('S1 draws a full-width line by default and shortens only the last of three lines', async () => {
  const host = skeleton({ 'inline-size': '200px' });
  expect(dimensions(await paintedPart(host))).toEqual([200, 12]);

  host.setAttribute('lines', '3');
  await expect
    .poll(() => parts(host).map(dimensions))
    .toEqual([
      [200, 12],
      [200, 12],
      [140, 12],
    ]);
  expect(host.getBoundingClientRect().height).toBe(52);

  host.setAttribute('block-size', '16px');
  await expect
    .poll(() => parts(host).map(dimensions))
    .toEqual([
      [200, 16],
      [200, 16],
      [140, 16],
    ]);
});

it('S2 sizes a circle and a rectangle, with axis props overriding size', async () => {
  const circle = await paintedPart(skeleton({ shape: 'circle', size: '2.5rem', lines: '3' }));
  expect(dimensions(circle)).toEqual([40, 40]);
  expect(Number.parseFloat(getComputedStyle(circle).borderStartStartRadius)).toBeGreaterThanOrEqual(
    20,
  );

  const rectangle = await paintedPart(
    skeleton({ shape: 'rect', size: '8rem', 'inline-size': '160px', 'block-size': '6rem' }),
  );
  expect(dimensions(rectangle)).toEqual([160, 96]);
  expect(Number.parseFloat(getComputedStyle(rectangle).borderStartStartRadius)).toBeLessThan(20);

  const oneAxis = await paintedPart(skeleton({ shape: 'circle', 'inline-size': '48px' }));
  expect(dimensions(oneAxis)).toEqual([48, 48]);
});

async function mountProjectRegion() {
  fixture.innerHTML = `
    <section aria-label="Loading project" aria-busy="true" style="min-block-size: 96px">
      <ki-skeleton hidden shape="rect" block-size="96px"></ki-skeleton>
    </section>
    <button type="button">Next project</button>
  `;
  const region = fixture.querySelector('section');
  const placeholder = fixture.querySelector('ki-skeleton');
  const next = fixture.querySelector('button');
  if (!region || !placeholder || !next) throw new Error('Expected the project loading fixture');
  await paintedPart(placeholder);
  return { region, placeholder, next };
}

it('S3 reveals a slow load at 300 ms without moving the next control', async () => {
  const { placeholder, next } = await mountProjectRegion();
  const initialTop = next.getBoundingClientRect().top;

  await browserCommands.installClock();
  try {
    await browserCommands.pauseClock();
    window.setTimeout(() => {
      placeholder.hidden = false;
    }, 300);

    await browserCommands.fastForwardClock(299);
    expect(placeholder.getClientRects()).toHaveLength(0);
    await browserCommands.fastForwardClock(1);
    expect(placeholder.getBoundingClientRect().height).toBe(96);
    expect(next.getBoundingClientRect().top).toBe(initialTop);
  } finally {
    await browserCommands.resumeClock();
  }
});

it('S4 cancels the reveal when the project is ready before 300 ms', async () => {
  const { region, placeholder, next } = await mountProjectRegion();
  const initialTop = next.getBoundingClientRect().top;
  let revealed = false;

  await browserCommands.installClock();
  try {
    await browserCommands.pauseClock();
    const reveal = window.setTimeout(() => {
      revealed = true;
      placeholder.hidden = false;
    }, 300);
    window.setTimeout(() => {
      window.clearTimeout(reveal);
      region.textContent = 'Project ready';
      region.setAttribute('aria-busy', 'false');
    }, 150);

    await browserCommands.fastForwardClock(150);
    expect(region.textContent).toBe('Project ready');
    expect(region.getAttribute('aria-busy')).toBe('false');
    expect(placeholder.isConnected).toBe(false);
    await browserCommands.fastForwardClock(150);
    expect(revealed).toBe(false);
    expect(next.getBoundingClientRect().top).toBe(initialTop);
  } finally {
    await browserCommands.resumeClock();
  }
});

it('S5 skips the skeleton in both directions of sequential focus', async () => {
  fixture.innerHTML = '<button>Before</button><ki-skeleton></ki-skeleton><button>After</button>';
  const host = fixture.querySelector('ki-skeleton');
  if (!host) throw new Error('Expected a skeleton');
  await paintedPart(host);
  fixture.querySelector('button')?.focus();

  await userEvent.keyboard('{Tab}');
  await expect.element(page.getByRole('button', { name: 'After' })).toHaveFocus();
  await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
  await expect.element(page.getByRole('button', { name: 'Before' })).toHaveFocus();
});

it('S6 exposes only the named busy region and passes axe', async () => {
  fixture.innerHTML = `
    <section aria-busy="true" aria-label="Loading project">
      <ki-skeleton shape="circle" role="img" aria-label="Decorative avatar"></ki-skeleton>
      <ki-skeleton lines="3"></ki-skeleton>
    </section>
  `;
  const hosts = [...fixture.querySelectorAll('ki-skeleton')];
  for (const host of hosts) {
    await paintedPart(host);
    expect(host.getAttribute('aria-hidden')).toBe('true');
  }

  await expect
    .element(page.getByRole('region', { name: 'Loading project' }))
    .toHaveAttribute('aria-busy', 'true');
  expect(await browserCommands.ariaSnapshot('section[aria-busy]')).toBe(
    '- region "Loading project"',
  );
  await expectAccessible(fixture);
});

it('S7 uses theme paint and radius overrides on the painted shape', async () => {
  const theme = document.createElement('div');
  theme.style.setProperty('--ki-skeleton-bg', 'rgb(31, 41, 51)');
  theme.style.setProperty('--ki-skeleton-radius', '9px');
  fixture.appendChild(theme);
  const part = await paintedPart(skeleton({ shape: 'rect', animated: 'false' }, theme));

  const computed = getComputedStyle(part);
  expect(computed.backgroundColor).toBe('rgb(31, 41, 51)');
  expect(computed.borderStartStartRadius).toBe('9px');
  expect(computed.backgroundImage).toBe('none');
  expect(computed.backdropFilter).toBe('none');
});

it('S8 uses a bounded shimmer by default and keeps the same fill and size under opt-out and reduced motion', async () => {
  await browserCommands.emulateReducedMotion('no-preference');
  try {
    const host = skeleton();
    const part = await paintedPart(host);
    const before = dimensions(part);
    const fill = getComputedStyle(part).backgroundColor;
    expect(shimmer(part)).not.toBe('none');
    expect(getComputedStyle(part, '::after').animationIterationCount).toBe('3');

    host.setAttribute('animated', 'false');
    await expect.poll(() => shimmer(part)).toBe('none');
    expect(dimensions(part)).toEqual(before);
    expect(getComputedStyle(part).backgroundColor).toBe(fill);

    host.setAttribute('animated', 'true');
    await expect.poll(() => shimmer(part)).not.toBe('none');
    await browserCommands.emulateReducedMotion('reduce');
    await expect.poll(() => shimmer(part)).toBe('none');
    expect(dimensions(part)).toEqual(before);
    expect(getComputedStyle(part).backgroundColor).toBe(fill);
  } finally {
    await browserCommands.emulateReducedMotion(null);
  }
});

it('S9 draws a static visible outline in a forced palette', async (test) => {
  const part = await paintedPart(skeleton({ shape: 'rect' }));
  try {
    await browserCommands.emulateForcedColors('active');
    if (
      !navigator.userAgent.includes('Chrome/') &&
      !matchMedia('(forced-colors: active)').matches
    ) {
      test.skip('This engine does not expose an emulated forced palette');
      return;
    }
    expect(matchMedia('(forced-colors: active)').matches).toBe(true);

    const computed = getComputedStyle(part);
    expect(computed.outlineStyle).toBe('solid');
    expect(Number.parseFloat(computed.outlineWidth)).toBeGreaterThan(0);
    expect(computed.outlineColor).not.toBe(computed.backgroundColor);
    expect(shimmer(part)).toBe('none');
  } finally {
    await browserCommands.emulateForcedColors(null);
  }
});

it('S10 places the short last line at inline start in RTL', async () => {
  const host = skeleton({ dir: 'rtl', lines: '3', 'inline-size': '200px' });
  await paintedPart(host);

  const [first, , last] = parts(host).map((part) => part.getBoundingClientRect());
  expect(last?.right).toBe(first?.right);
  expect(last?.width).toBe(140);
});
