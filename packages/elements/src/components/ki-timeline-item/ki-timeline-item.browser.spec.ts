// @spec:114-ki-timeline
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { paintContrast } from '../../../browser-tests/contracts';
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

// Design-system review 2026-11-20, item 5: the pale tint alone read about
// 1.1:1, so a toned marker without an icon showed no status at all.
it.each(['primary', 'success', 'warning', 'danger'])(
  'S13 marks a %s event that has no icon with a solid dot in its ink',
  async (tone) => {
    fixture.innerHTML = `<ki-timeline-item tone="${tone}">Preview deploy failed</ki-timeline-item><ki-timeline-item>Neutral</ki-timeline-item>`;
    const [item, neutral] = Array.from(fixture.querySelectorAll('ki-timeline-item'));
    if (!item || !neutral) throw new Error('Expected two timeline items');
    const mark = () => item.shadowRoot?.querySelector<HTMLElement>('.tone-mark');
    await expect.poll(mark).toBeInstanceOf(HTMLElement);
    const dot = item.shadowRoot?.querySelector<HTMLElement>('[part="dot"]');
    const markElement = mark();
    if (!dot || !markElement) throw new Error('Expected a marker and its dot');
    const style = getComputedStyle(markElement);
    const page = getComputedStyle(document.body).backgroundColor;
    const ground = page === 'rgba(0, 0, 0, 0)' ? 'rgb(255, 255, 255)' : page;

    expect(markElement.getBoundingClientRect().width).toBeGreaterThan(0);
    expect(style.backgroundColor).toBe(getComputedStyle(dot).color);
    expect(paintContrast(style.backgroundColor, ground)).toBeGreaterThanOrEqual(3);
    await expect.poll(() => neutral.shadowRoot?.querySelector('[part="dot"]')).toBeTruthy();
    expect(neutral.shadowRoot?.querySelector('.tone-mark')).toBeNull();
  },
);

it('S13 draws no dot once an icon or a start marker is supplied', async () => {
  fixture.innerHTML =
    '<ki-timeline-item tone="danger" icon-name="x">Failed</ki-timeline-item>' +
    '<ki-timeline-item tone="danger"><span slot="start">AB</span>Failed</ki-timeline-item>';
  const items = Array.from(fixture.querySelectorAll('ki-timeline-item'));
  for (const item of items) {
    await expect.poll(() => item.shadowRoot?.querySelector('[part="dot"]')).toBeTruthy();
    expect(item.shadowRoot?.querySelector('.tone-mark')).toBeNull();
  }
});
