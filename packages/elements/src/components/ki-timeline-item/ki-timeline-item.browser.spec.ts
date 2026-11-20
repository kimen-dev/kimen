// @spec:114-ki-timeline
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-timeline-item.js';

const fixture = document.createElement('main');
const styles = document.createElement('style');

beforeAll(() => {
  defineCustomElement();
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

it('S5 creates a closed disclosure only when details are supplied', async () => {
  fixture.innerHTML = '<ki-timeline-item>Job failed</ki-timeline-item>';
  const item = fixture.querySelector('ki-timeline-item');
  if (!item) throw new Error('Expected a timeline item');
  await expect.poll(() => item.shadowRoot?.querySelector('[part="content"]')).toBeTruthy();
  expect(item.shadowRoot?.querySelector('details')).toBeNull();

  const content = document.createElement('span');
  content.slot = 'details';
  content.textContent = 'The build exceeded its time limit.';
  item.append(content);
  const details = () => item.shadowRoot?.querySelector('details');
  await expect.poll(details).toBeInstanceOf(HTMLDetailsElement);
  expect(details()?.open).toBe(false);
  expect(details()?.querySelector('summary')?.textContent).toBe('Details');

  content.remove();
  await expect.poll(details).toBeNull();
});
