// @spec:123-ki-carousel
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';
import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineItem } from '../../../dist/components/ki-carousel-item.js';
import { defineCustomElement } from '../../../dist/components/ki-carousel.js';

const browser = commands as unknown as {
  emulateHoverCapability(value: 'none' | null): Promise<boolean>;
  tapWithCoarsePointer(selector: string): Promise<void>;
  swipeWithCoarsePointer(selector: string): Promise<void>;
};

const fixture = document.createElement('main');
const styles = document.createElement('style');

beforeAll(() => {
  defineCustomElement();
  defineItem();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('S17 provides 44 CSS pixel navigation targets and accepts a touch tap', async (test) => {
  if (!(await browser.emulateHoverCapability('none'))) test.skip('touch emulation unavailable');
  try {
    expect(matchMedia('(pointer: coarse)').matches).toBe(true);
    fixture.innerHTML = `<ki-carousel label="Highlights" data-ki-density="touch">
      <ki-carousel-item>Discover</ki-carousel-item>
      <ki-carousel-item>Explore</ki-carousel-item>
    </ki-carousel>`;
    await expect.element(page.getByRole('button', { name: 'Next slide' })).toBeVisible();
    const buttons = Array.from(
      fixture.querySelector('ki-carousel')?.shadowRoot?.querySelectorAll('button') ?? [],
    );
    expect(buttons).toHaveLength(2);
    expect(
      buttons.every((button) => {
        const rect = button.getBoundingClientRect();
        return rect.width >= 44 && rect.height >= 44;
      }),
    ).toBe(true);

    await browser.tapWithCoarsePointer('ki-carousel [part="next"]');

    await expect.element(page.getByRole('img', { name: 'Slide position, 2 / 2' })).toBeVisible();
  } finally {
    await browser.emulateHoverCapability(null);
  }
});

it('S3 advances one native snap position after a touch swipe', async (test) => {
  if (!(await browser.emulateHoverCapability('none'))) test.skip('touch emulation unavailable');
  try {
    fixture.innerHTML = `<ki-carousel label="Highlights">
      <ki-carousel-item>Discover</ki-carousel-item>
      <ki-carousel-item>Explore</ki-carousel-item>
      <ki-carousel-item>Customize</ki-carousel-item>
    </ki-carousel>`;
    await expect.element(page.getByRole('img', { name: 'Slide position, 1 / 3' })).toBeVisible();

    await browser.swipeWithCoarsePointer('ki-carousel [part="viewport"]');

    await expect.element(page.getByRole('img', { name: 'Slide position, 2 / 3' })).toBeVisible();
  } finally {
    await browser.emulateHoverCapability(null);
  }
});

// TEMPORARY DIAGNOSTIC (remove before the final commit).
it('DIAG compares the synthesized and the injected touch swipe', async (test) => {
  if (!(await browser.emulateHoverCapability('none'))) test.skip('touch emulation unavailable');
  const diagnostic = commands as unknown as {
    synthesizedSwipeDiagnostic(selector: string): Promise<unknown>;
  };
  const results: Record<string, unknown> = {};
  try {
    for (const method of ['synthesized', 'injected'] as const) {
      fixture.innerHTML = `<ki-carousel label="Highlights">
        <ki-carousel-item>Discover</ki-carousel-item>
        <ki-carousel-item>Explore</ki-carousel-item>
        <ki-carousel-item>Customize</ki-carousel-item>
      </ki-carousel>`;
      await expect.element(page.getByRole('img', { name: 'Slide position, 1 / 3' })).toBeVisible();
      const carousel = fixture.querySelector('ki-carousel') as HTMLElement & {
        current: number;
        alignAfterRender?: boolean;
      };
      const viewport = carousel.shadowRoot?.querySelector<HTMLElement>('[part="viewport"]');
      if (!viewport) throw new Error('no viewport');
      const counts: Record<string, number> = {};
      const record = (event: Event): void => {
        const key =
          event instanceof PointerEvent ? `${event.type}:${event.pointerType}` : event.type;
        counts[key] = (counts[key] ?? 0) + 1;
      };
      const types = [
        'touchstart',
        'touchmove',
        'touchend',
        'touchcancel',
        'pointerdown',
        'pointerup',
        'pointercancel',
        'click',
      ];
      for (const type of types) window.addEventListener(type, record, { capture: true });
      const scrolls: number[] = [];
      let scrollends = 0;
      const onScroll = (): void => {
        scrolls.push(Math.round(viewport.scrollLeft));
      };
      const onScrollEnd = (): void => {
        scrollends += 1;
      };
      viewport.addEventListener('scroll', onScroll);
      viewport.addEventListener('scrollend', onScrollEnd);
      const before = { alignAfterRender: carousel.alignAfterRender, left: viewport.scrollLeft };
      const started = performance.now();
      let info: unknown = 'injected';
      if (method === 'synthesized') {
        info = await diagnostic.synthesizedSwipeDiagnostic('ki-carousel [part="viewport"]');
      } else {
        await browser.swipeWithCoarsePointer('ki-carousel [part="viewport"]');
      }
      const gestureMs = Math.round(performance.now() - started);
      await new Promise((resolve) => {
        setTimeout(resolve, 1500);
      });
      results[method] = {
        info,
        gestureMs,
        before,
        counts,
        scrollEvents: scrolls.length,
        scrollPath: scrolls.filter((_, index) => index % 5 === 0 || index === scrolls.length - 1),
        scrollends,
        scrollLeft: viewport.scrollLeft,
        clientWidth: viewport.clientWidth,
        scrollWidth: viewport.scrollWidth,
        current: carousel.current,
        alignAfterRender: carousel.alignAfterRender,
        label: carousel.shadowRoot?.querySelector('ki-indicator')?.getAttribute('aria-label'),
        coarse: matchMedia('(pointer: coarse)').matches,
        maxTouchPoints: navigator.maxTouchPoints,
        inner: [innerWidth, innerHeight],
        rect: viewport.getBoundingClientRect().toJSON() as unknown,
      };
      for (const type of types) window.removeEventListener(type, record, { capture: true });
      viewport.removeEventListener('scroll', onScroll);
      viewport.removeEventListener('scrollend', onScrollEnd);
    }
  } finally {
    await browser.emulateHoverCapability(null);
  }
  throw new Error(`KIMEN-DIAG ${JSON.stringify(results)}`);
});
