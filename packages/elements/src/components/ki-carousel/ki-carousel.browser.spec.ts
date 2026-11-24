// @spec:123-ki-carousel
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineItem } from '../../../dist/components/ki-carousel-item.js';
import { defineCustomElement } from '../../../dist/components/ki-carousel.js';

type Carousel = HTMLElement & {
  current: number;
  navigation: boolean;
  pagination: boolean;
  goTo(index: number): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
};

const browser = commands as unknown as {
  ariaSnapshot(selector: string): Promise<string>;
  emulateForcedColors(value: 'active' | null): Promise<void>;
  emulateReducedMotion(value: 'reduce' | 'no-preference' | null): Promise<void>;
  installClock(): Promise<void>;
  pauseClock(): Promise<void>;
  resumeClock(): Promise<void>;
  fastForwardClock(ms: number): Promise<void>;
};

// The rotation tests fast-forward the shared Playwright clock by up to about
// sixteen seconds, and a test's own timeout can run on that clock once
// another spec has installed it.
vi.setConfig({ testTimeout: 120_000 });

const development =
  (import.meta as ImportMeta & { env: { VITE_KIMEN_DEV_BUILD?: string } }).env
    .VITE_KIMEN_DEV_BUILD === '1';
const styles = document.createElement('style');
const fixture = document.createElement('main');
const names = ['Discover', 'Explore', 'Keep learning together', 'Customize', 'Finish'];
let pausedClock = false;

beforeAll(() => {
  defineCustomElement();
  defineItem();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  if (pausedClock) {
    pausedClock = false;
    await browser.resumeClock();
  }
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

function part(host: Element, name: string): HTMLElement {
  const element = host.shadowRoot?.querySelector<HTMLElement>(`[part~="${name}"]`);
  if (!element) throw new Error(`Missing Carousel part ${name}`);
  return element;
}

function slide(host: Carousel, index: number): HTMLElement {
  const element = host.children.item(index - 1);
  if (!(element instanceof HTMLElement)) throw new Error(`Missing slide ${String(index)}`);
  return element;
}

async function frames(): Promise<void> {
  if (pausedClock) {
    await browser.fastForwardClock(60);
    return;
  }
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        resolve();
      }),
    ),
  );
}

async function mount(attributes: Record<string, string> = {}, count = 3): Promise<Carousel> {
  const host = document.createElement('ki-carousel') as Carousel;
  host.id = 'carousel-under-test';
  host.setAttribute('label', 'Highlights');
  host.style.inlineSize = 'min(100%, 24rem)';
  for (const [name, value] of Object.entries(attributes)) host.setAttribute(name, value);
  for (const [index, name] of names.slice(0, count).entries()) {
    const item = document.createElement('ki-carousel-item');
    const link = document.createElement('a');
    link.href = `#slide-${String(index + 1)}`;
    link.textContent = name;
    link.tabIndex = 0;
    item.append(link);
    host.append(item);
  }
  fixture.append(host);
  await frames();
  await expect
    .poll(async () => {
      await frames();
      return (
        host.shadowRoot?.querySelector('ki-indicator') as (HTMLElement & { count: number }) | null
      )?.count;
    })
    .toBe(count);
  return host;
}

async function startClock(): Promise<void> {
  try {
    await browser.installClock();
  } catch {
    // Another spec may already have installed the shared Playwright clock.
  }
  await browser.pauseClock();
  pausedClock = true;
}

function aligned(host: Carousel, index: number, axis: 'left' | 'right' | 'top' = 'left'): boolean {
  return (
    Math.abs(
      slide(host, index).getBoundingClientRect()[axis] -
        part(host, 'viewport').getBoundingClientRect()[axis],
    ) < 0.5
  );
}

it('S1 advances two positions, exposes two slides and reports the new index', async () => {
  const host = await mount({ 'slides-per-view': '2', 'slides-per-move': '2' }, 5);
  const change = vi.fn();
  fixture.addEventListener('ki-slide-change', change, { once: true });

  await page.getByRole('button', { name: 'Next slide' }).click();

  await expect.poll(() => aligned(host, 3)).toBe(true);
  expect(host.current).toBe(3);
  expect(change).toHaveBeenCalledWith(
    expect.objectContaining({ detail: { index: 3 }, composed: true }),
  );
  expect(slide(host, 4).inert).toBe(false);
  expect(slide(host, 5).inert).toBe(true);
});

it('S2 wraps in both directions across the endpoints', async () => {
  const host = await mount({ loop: '', current: '3' });

  await page.getByRole('button', { name: 'Next slide' }).click();

  expect(host.current).toBe(1);
  await host.previous();
  expect(host.current).toBe(3);
});

it('S3 tracks native viewport scrolling and keeps the exposed slide through resize', async () => {
  const host = await mount();
  const viewport = part(host, 'viewport');
  const offset =
    slide(host, 2).getBoundingClientRect().left - viewport.getBoundingClientRect().left;

  viewport.scrollBy({ left: offset * 0.9, behavior: 'instant' });

  await expect.poll(() => aligned(host, 2)).toBe(true);
  await expect.element(page.getByRole('img', { name: 'Slide position, 2 / 3' })).toBeVisible();
  expect(host.current).toBe(2);

  const afterScroll = await browser.ariaSnapshot('#carousel-under-test');
  expect(afterScroll).toContain('group "2 of 3"');
  expect(afterScroll).not.toContain('group "1 of 3"');

  host.style.inlineSize = '12rem';
  await expect.poll(() => aligned(host, 2)).toBe(true);

  const afterResize = await browser.ariaSnapshot('#carousel-under-test');
  expect(afterResize).toContain('group "2 of 3"');
  expect(afterResize).not.toContain('group "1 of 3"');
  expect(afterResize).not.toContain('group "3 of 3"');
  expect(slide(host, 1).inert).toBe(true);
  expect(slide(host, 2).inert).toBe(false);
  expect(slide(host, 3).inert).toBe(true);
});

it('S4 selects a slide via the API and emits once per effective change', async () => {
  const host = await mount();
  const change = vi.fn();
  host.addEventListener('ki-slide-change', change);

  await host.goTo(3);
  await host.next();

  expect(host.current).toBe(3);
  expect(change).toHaveBeenCalledTimes(1);
  expect(change.mock.calls[0]?.[0]).toHaveProperty('detail', { index: 3 });
  host.current = 2;
  await expect.poll(() => aligned(host, 2)).toBe(true);
});

it('S4 keeps the requested slide through a resize that lands while it glides into place', async () => {
  await browser.emulateReducedMotion('no-preference');
  try {
    const host = await mount();
    const change = vi.fn();
    host.addEventListener('ki-slide-change', change);

    // The smooth alignment toward slide 2 starts on the next frame, and the
    // same frame delivers the resize observation, while the viewport offset
    // still shows slide 1. A freshly connected carousel is in this state for
    // its first frame: its initial observation lands on whatever moved first.
    await host.next();
    host.style.inlineSize = '20rem';

    await expect.poll(() => aligned(host, 2)).toBe(true);
    expect(host.current).toBe(2);
    expect(
      change.mock.calls.map(([event]) => (event as CustomEvent<{ index: number }>).detail),
    ).toEqual([{ index: 2 }]);
  } finally {
    await browser.emulateReducedMotion(null);
  }
});

it('S5 activates with Space and leaves focus on the navigation control', async () => {
  const host = await mount();
  const next = part(host, 'next');
  next.focus();

  await userEvent.keyboard(' ');

  await expect.poll(() => host.current).toBe(2);
  expect(host.shadowRoot?.activeElement).toBe(next);
});

it('S6 exposes a named carousel and only the visible slide, without axe violations', async () => {
  const host = await mount();

  const tree = await browser.ariaSnapshot('#carousel-under-test');

  expect(tree).toContain('region "Highlights"');
  expect(tree).toContain('group "1 of 3"');
  expect(tree).not.toContain('group "2 of 3"');
  expect(tree).not.toContain('group "3 of 3"');
  expect(host.getAttribute('aria-roledescription')).toBe('carousel');
  expect(slide(host, 2).inert).toBe(true);
  await expectAccessible(fixture);
});

it('S7 writes the new position into a polite live region', async () => {
  const host = await mount();

  await host.next();

  await expect.poll(() => part(host, 'announcement').textContent).toBe('2 of 3');
  expect(part(host, 'announcement').getAttribute('aria-live')).toBe('polite');
});

it('S8 stops on focus, keeps the manual announcement and restarts with Play', async () => {
  await browser.emulateReducedMotion('no-preference');
  try {
    await startClock();
    const host = await mount({ autoplay: '5000', loop: '' });
    const rotation = part(host, 'rotation');
    const viewport = part(host, 'viewport');
    const scrollSettled =
      'onscrollend' in viewport
        ? new Promise<void>((resolve) => {
            viewport.addEventListener(
              'scrollend',
              () => {
                resolve();
              },
              { once: true },
            );
          })
        : undefined;
    expect(part(host, 'announcement').getAttribute('aria-live')).toBe('off');
    await browser.fastForwardClock(5100);
    expect(host.current).toBe(2);

    rotation.focus();
    // Native smooth scrolling can still be in flight after current changes.
    // Finish it while rotation is stopped so its scroll events cannot rearm Play's timer.
    if (scrollSettled) await scrollSettled;
    else await expect.poll(() => aligned(host, 2)).toBe(true);
    await frames();
    await browser.fastForwardClock(5200);

    expect(host.current).toBe(2);
    expect(part(host, 'announcement').getAttribute('aria-live')).toBe('polite');
    expect(rotation.textContent).toBe('Play');
    await userEvent.keyboard(' ');
    await frames();
    expect(rotation.textContent).toBe('Pause');
    expect(part(host, 'announcement').getAttribute('aria-live')).toBe('off');
    await browser.fastForwardClock(5000);
    expect(host.current).toBe(3);
  } finally {
    await browser.emulateReducedMotion(null);
  }
});

it('S9 keeps the position after Pause is clicked', async () => {
  await browser.emulateReducedMotion('no-preference');
  try {
    await startClock();
    const host = await mount({ autoplay: '5000', loop: '' });

    await page.getByRole('button', { name: 'Pause' }).click();
    await frames();
    await browser.fastForwardClock(5200);

    expect(host.current).toBe(1);
    expect(part(host, 'rotation').textContent).toBe('Play');
  } finally {
    await browser.emulateReducedMotion(null);
  }
});

it('S10 pauses over content and resumes after the pointer leaves', async () => {
  await browser.emulateReducedMotion('no-preference');
  try {
    await startClock();
    const host = await mount({ autoplay: '5000', loop: '' });

    await page.getByRole('link', { name: 'Discover' }).hover();
    await browser.fastForwardClock(5200);
    expect(host.current).toBe(1);

    await parkPointer();
    await browser.fastForwardClock(5100);
    expect(host.current).toBe(2);
  } finally {
    await browser.emulateReducedMotion(null);
  }
});

it.each(['multi-browse', 'hero', 'uncontained', 'full-screen'])(
  'S11 keeps the slide, navigation and position available in %s',
  async (layout) => {
    const host = await mount({ layout }, 5);

    await host.next();

    await expect.poll(() => aligned(host, 2, layout === 'full-screen' ? 'top' : 'left')).toBe(true);
    await expect.element(page.getByRole('link', { name: 'Explore' })).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Previous slide' })).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Next slide' })).toBeVisible();
    await expect.element(page.getByRole('img', { name: 'Slide position, 2 / 5' })).toBeVisible();
  },
);

it('S12 hides small preview text until that item grows into the active slide', async () => {
  const host = await mount({ layout: 'multi-browse' }, 5);
  const preview = slide(host, 3);
  const initialWidth = preview.getBoundingClientRect().width;
  const text = page.getByText('Keep learning together');
  await expect.element(text).not.toBeVisible();
  expect(preview.inert).toBe(true);
  expect(initialWidth).toBeGreaterThan(0);

  await host.goTo(3);

  await expect.element(text).toBeVisible();
  expect(preview.inert).toBe(false);
  expect(preview.getBoundingClientRect().width).toBeGreaterThan(initialWidth);
});

it('S13 follows a navigation background token override', async () => {
  const host = await mount();

  host.style.setProperty('--ki-carousel-control-bg', 'yellow');

  expect(getComputedStyle(part(host, 'next')).backgroundColor).toBe('rgb(255, 255, 0)');
});

it('S14 retains forced-color control boundaries and glyphs', async (test) => {
  await browser.emulateForcedColors('active');
  try {
    if (!matchMedia('(forced-colors: active)').matches) test.skip('forced colors unavailable');
    const host = await mount();

    const button = part(host, 'next');
    const computed = getComputedStyle(button);
    expect(computed.borderInlineStartStyle).toBe('solid');
    expect(computed.borderInlineStartColor).toBe(computed.color);
    await expect
      .poll(() => {
        const glyph = button.querySelector('ki-icon')?.shadowRoot?.querySelector('svg');
        return glyph?.getBoundingClientRect().width ?? 0;
      })
      .toBeGreaterThan(0);
  } finally {
    await browser.emulateForcedColors(null);
  }
});

it('S15 selects and sizes immediately with reduced motion and leaves rotation paused', async () => {
  await browser.emulateReducedMotion('reduce');
  try {
    const host = await mount({ autoplay: '100', layout: 'multi-browse' });
    const preview = slide(host, 2);
    const small = preview.getBoundingClientRect().width;

    await host.next();

    expect(aligned(host, 2)).toBe(true);
    expect(preview.getBoundingClientRect().width).toBeGreaterThan(small);
    expect(getComputedStyle(preview).transitionDuration).toBe('0s');
    expect(part(host, 'announcement').getAttribute('aria-live')).toBe('polite');
    expect(part(host, 'rotation').getAttribute('aria-disabled')).toBe('true');
  } finally {
    await browser.emulateReducedMotion(null);
  }
});

it('S16 has a leftward next position in right-to-left reading order', async () => {
  const host = await mount({ dir: 'rtl' });
  expect(slide(host, 2).getBoundingClientRect().right).toBeLessThan(
    slide(host, 1).getBoundingClientRect().right,
  );

  await page.getByRole('button', { name: 'Next slide' }).click();

  await expect.poll(() => aligned(host, 2, 'right')).toBe(true);
  expect(host.current).toBe(2);
});

it('S18 can independently hide each control group and keeps a keyboard path', async () => {
  const host = await mount();

  host.navigation = false;

  await expect.element(page.getByRole('button', { name: 'Next slide' })).not.toBeInTheDocument();
  const viewport = part(host, 'viewport');
  expect(viewport.tabIndex).toBe(0);
  viewport.focus();
  await userEvent.keyboard('{ArrowRight}');
  expect(host.current).toBe(2);
  await expect.element(page.getByRole('img', { name: 'Slide position, 2 / 3' })).toBeVisible();

  host.pagination = false;
  await expect.element(page.getByRole('img', { name: /Slide position/ })).not.toBeInTheDocument();
});

it('S19 skips offscreen links in the tab sequence', async () => {
  const host = await mount();
  slide(host, 1).querySelector('a')?.focus();

  await userEvent.tab();

  expect(host.shadowRoot?.activeElement).toBe(part(host, 'previous'));
});

it('S11 lets the reader continue through an oversized full-screen slide', async () => {
  const host = await mount({ layout: 'full-screen' });
  const viewport = part(host, 'viewport');
  slide(host, 1).style.minBlockSize = `${String(viewport.clientHeight * 4)}px`;
  const offset = viewport.clientHeight * 2.5;

  viewport.scrollBy({ top: offset, behavior: 'instant' });

  await expect.poll(() => Math.abs(viewport.scrollTop - offset) < 0.5).toBe(true);
  await frames();
  expect(host.current).toBe(1);
  expect(slide(host, 1).inert).toBe(false);
});

/**
 * A looping three-slide carousel on a paused clock, with rotation armed only
 * after it has mounted, so the time spent mounting never counts toward the
 * interval. Returns the indexes its slide changes report.
 */
async function rotatingCarousel(interval: number): Promise<{ host: Carousel; changes: number[] }> {
  await startClock();
  const host = await mount({ loop: '' });
  const changes: number[] = [];
  host.addEventListener('ki-slide-change', (event) => {
    changes.push((event as CustomEvent<{ index: number }>).detail.index);
  });
  host.setAttribute('autoplay', String(interval));
  return { host, changes };
}

function floorWarnings(warn: { mock: { calls: unknown[][] } }): unknown[][] {
  return warn.mock.calls.filter(
    ([message]) => typeof message === 'string' && message.includes('5000 ms floor'),
  );
}

it.each([1, 334, 4999])(
  'S21 waits the full five seconds when autoplay is %i milliseconds',
  async (interval) => {
    await browser.emulateReducedMotion('no-preference');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const { host, changes } = await rotatingCarousel(interval);

      await browser.fastForwardClock(4999);

      expect(changes).toEqual([]);
      expect(host.current).toBe(1);
      expect(floorWarnings(warn)).toHaveLength(development ? 1 : 0);
    } finally {
      warn.mockRestore();
      await browser.emulateReducedMotion(null);
    }
  },
);

it('S22 moves once in six seconds when autoplay is 1 millisecond', async () => {
  await browser.emulateReducedMotion('no-preference');
  try {
    const { host, changes } = await rotatingCarousel(1);

    await browser.fastForwardClock(6000);

    expect(changes).toEqual([2]);
    expect(host.current).toBe(2);
  } finally {
    await browser.emulateReducedMotion(null);
  }
});

it('S23 keeps an 8000 millisecond interval as set', async () => {
  await browser.emulateReducedMotion('no-preference');
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  try {
    const { host, changes } = await rotatingCarousel(8000);

    await browser.fastForwardClock(12_000);

    expect(changes).toEqual([2]);
    expect(host.current).toBe(2);
    expect(floorWarnings(warn)).toEqual([]);
  } finally {
    warn.mockRestore();
    await browser.emulateReducedMotion(null);
  }
});
