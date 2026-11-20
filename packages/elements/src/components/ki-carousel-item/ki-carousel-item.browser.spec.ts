// @spec:123-ki-carousel
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-carousel-item.js';
import { defineCustomElement as defineCarousel } from '../../../dist/components/ki-carousel.js';

const fixture = document.createElement('main');
const styles = document.createElement('style');

beforeAll(() => {
  defineCustomElement();
  defineCarousel();
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

it('S20 projects the item link into the visible slide', async () => {
  fixture.innerHTML = `<ki-carousel label="Highlights">
    <ki-carousel-item><a href="#guide">Learn more</a></ki-carousel-item>
  </ki-carousel>`;

  await expect
    .element(page.getByRole('group', { name: '1 of 1' }).getByRole('link', { name: 'Learn more' }))
    .toBeVisible();
});
