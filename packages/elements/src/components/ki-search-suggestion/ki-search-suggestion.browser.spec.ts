import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { defineAllComponents } from 'virtual:kimen-component-registrations';
import { page } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';

const styles = document.createElement('style');
const fixture = document.createElement('main');

beforeAll(() => {
  defineAllComponents();
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

it('projects the suggestion title only in its owning search view', async () => {
  fixture.innerHTML = `
    <ki-search-suggestion>Standalone suggestion</ki-search-suggestion>
    <ki-search mode="docked" open>
      <ki-search-suggestion description="Component">Dialog</ki-search-suggestion>
    </ki-search>
  `;
  await expect.element(page.getByRole('option', { name: 'Dialog Component' })).toBeVisible();
  await expect.element(page.getByText('Standalone suggestion')).not.toBeVisible();
});
