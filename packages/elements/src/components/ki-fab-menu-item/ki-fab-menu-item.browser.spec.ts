// @spec:128-ki-fab-menu
import '../../../icons/calendar.js';
import { afterEach, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-fab-menu-item.js';

const fixture = document.createElement('main');

afterEach(async () => {
  fixture.remove();
  await parkPointer();
});

it('S11: the item exposes its visible name and a native link without announcing the glyph', async () => {
  defineCustomElement();
  document.body.append(fixture);
  fixture.innerHTML =
    '<div role="menu" aria-label="Create">' +
    '<ki-fab-menu-item icon-name="calendar" href="#event">New event</ki-fab-menu-item></div>';

  const item = page.getByRole('menuitem', { name: 'New event', exact: true });
  await expect.element(item).toHaveAttribute('href', '#event');
  await expect.element(item).toHaveAttribute('tabindex', '-1');
  const icon = fixture
    .querySelector('ki-fab-menu-item')
    ?.shadowRoot?.querySelector('[part="icon"]');
  expect(icon?.getAttribute('aria-hidden')).toBe('true');
});
