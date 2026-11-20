import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-suggestion.js';

const styles = document.createElement('style');
const fixture = document.createElement('main');

beforeAll(() => {
  defineCustomElement();
  styles.textContent = tokensCss;
  document.head.appendChild(styles);
  document.body.appendChild(fixture);
});

afterEach(async () => {
  await parkPointer();
  fixture.replaceChildren();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('removes the native button when its prompt becomes blank', async () => {
  fixture.innerHTML = '<ki-suggestion>Review changes</ki-suggestion>';
  const button = page.getByRole('button', { name: 'Review changes' });
  await expect.element(button).toBeVisible();

  const suggestion = fixture.querySelector('ki-suggestion');
  if (!suggestion) throw new Error('Missing suggestion');
  suggestion.textContent = '   ';

  await expect.element(page.getByRole('button')).not.toBeInTheDocument();
});

it('preserves the host title attribute independently of the prompt text', async () => {
  fixture.innerHTML = '<ki-suggestion title="Editorial note">Review changes</ki-suggestion>';
  const button = page.getByRole('button', { name: 'Review changes' });
  await expect.element(button).toBeVisible();

  const suggestion = fixture.querySelector('ki-suggestion');
  if (!suggestion) throw new Error('Missing suggestion');
  expect(suggestion.title).toBe('Editorial note');
});
