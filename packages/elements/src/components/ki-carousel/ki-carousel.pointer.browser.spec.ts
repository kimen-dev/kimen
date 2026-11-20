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
