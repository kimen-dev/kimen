// @spec:114-ki-timeline
import '../../../icons/circle-alert.js';
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineItem } from '../../../dist/components/ki-timeline-item.js';
import { defineCustomElement as defineTimeline } from '../../../dist/components/ki-timeline.js';

const browser = commands as unknown as {
  ariaSnapshotByRole: (role: 'list', name: string) => Promise<string>;
  emulateForcedColors: (mode: 'active' | null) => Promise<void>;
  emulateReducedMotion: (mode: 'reduce' | null) => Promise<void>;
  installClock: () => Promise<void>;
  pauseClock: () => Promise<void>;
  fastForwardClock: (milliseconds: number) => Promise<void>;
  resumeClock: () => Promise<void>;
};

const fixture = document.createElement('main');
const sheet = document.createElement('style');
const list = () => page.getByRole('list', { name: 'Activity', exact: true });
const review = '2020-11-19T10:40Z';
const deploy = '2020-11-19T10:41Z';

beforeAll(() => {
  defineTimeline();
  defineItem();
  sheet.textContent = tokensCss;
  document.head.append(sheet);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  fixture.removeAttribute('dir');
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  sheet.remove();
});

function event(text: string, datetime?: string): string {
  const attribute = datetime === undefined ? '' : ` datetime="${datetime}"`;
  return `<ki-timeline-item${attribute}>${text}</ki-timeline-item>`;
}

async function mount(events: string, prefix = ''): Promise<HTMLElement> {
  fixture.innerHTML = `${prefix}<ki-timeline label="Activity" lang="en">${events}</ki-timeline>`;
  const timeline = fixture.querySelector('ki-timeline');
  if (!timeline) throw new Error('Expected the Timeline fixture');
  await expect.element(list()).toBeInTheDocument();
  await expect
    .poll(() =>
      [...timeline.querySelectorAll('ki-timeline-item')].every((item) =>
        item.shadowRoot?.hasChildNodes(),
      ),
    )
    .toBe(true);
  return timeline;
}

function part(root: Element, name: string): HTMLElement {
  const el = root.shadowRoot?.querySelector<HTMLElement>(`[part~="${name}"]`);
  if (!el) throw new Error(`Expected ${root.localName} part "${name}"`);
  return el;
}

function item(timeline: HTMLElement, text: string): HTMLElement {
  const found = [...timeline.querySelectorAll('ki-timeline-item')].find((el) =>
    el.textContent.includes(text),
  );
  if (!found) throw new Error(`Expected Timeline event "${text}"`);
  return found;
}

async function expectOrder(timeline: HTMLElement, summaries: string[]): Promise<void> {
  await expect
    .poll(async () => {
      const tree = await browser.ariaSnapshotByRole('list', 'Activity');
      const positions = summaries.map((summary) => tree.indexOf(summary));
      return positions.every(
        (position, index) =>
          position >= 0 && (index === 0 || position > (positions[index - 1] ?? -1)),
      );
    })
    .toBe(true);
  const tops = summaries.map((summary) => item(timeline, summary).getBoundingClientRect().top);
  expect(tops).toEqual([...tops].sort((first, second) => first - second));
  expect(new Set(tops).size).toBe(summaries.length);
}

function disclosure(): string {
  return `<ki-timeline-item details-label="Build log">
    Preview deployment
    <p slot="details" data-test="details">Runner exceeded its limit.</p>
  </ki-timeline-item>`;
}

function detailsHeight(): number {
  return fixture.querySelector('[data-test="details"]')?.getBoundingClientRect().height ?? 0;
}

it('S1 presents dated events newest first, preserving ties and placing undated events last', async () => {
  const timeline = await mount(
    event('Review complete', review) +
      event('Date pending') +
      event('Deploy finished', deploy) +
      event('Build uploaded', deploy) +
      event('Date unavailable', 'invalid'),
  );

  await expectOrder(timeline, [
    'Deploy finished',
    'Build uploaded',
    'Review complete',
    'Date pending',
    'Date unavailable',
  ]);
});

it('S2 switches the reading and visual order and reacts to date edits', async () => {
  const timeline = await mount(event('Deploy finished', deploy) + event('Review complete', review));
  await expectOrder(timeline, ['Deploy finished', 'Review complete']);

  timeline.setAttribute('order', 'oldest-first');
  await expectOrder(timeline, ['Review complete', 'Deploy finished']);

  item(timeline, 'Deploy finished').setAttribute('datetime', '2020-11-18T12:00Z');
  await expectOrder(timeline, ['Deploy finished', 'Review complete']);
});

it('S3 renders relative and absolute text in native times and omits invalid times', async () => {
  const recent = new Date(Date.now() - 315_000).toISOString();
  const timeline = await mount(
    event('Tests finished', recent) +
      event('Review complete', review) +
      event('Date unavailable', '2020-02-31'),
  );
  const recentTime = part(item(timeline, 'Tests finished'), 'time');
  const earlierTime = part(item(timeline, 'Review complete'), 'time');

  expect(recentTime).toBeInstanceOf(HTMLTimeElement);
  expect(recentTime.getAttribute('datetime')).toBe(recent);
  expect(recentTime.textContent).toContain('5 minutes ago');
  expect(earlierTime).toBeInstanceOf(HTMLTimeElement);
  expect(earlierTime.getAttribute('datetime')).toBe(review);
  expect(earlierTime.textContent).toMatch(/2020/u);
  expect(item(timeline, 'Date unavailable').shadowRoot?.querySelector('time')).toBeNull();
});

it('S4 substitutes a decorative avatar for the requested icon', async () => {
  const timeline = await mount(`<ki-timeline-item icon-name="circle-alert">
    Reviewer added
    <span slot="start" data-test="avatar">AP</span>
  </ki-timeline-item>`);
  const reviewer = item(timeline, 'Reviewer added');
  const avatar = reviewer.querySelector('[data-test="avatar"]');
  const dot = part(reviewer, 'dot');

  expect(avatar?.getBoundingClientRect().height).toBeGreaterThan(0);
  expect(dot.querySelector('ki-icon')).toBeNull();
  expect(dot.getAttribute('aria-hidden')).toBe('true');
});

it.each(['[Space]', '{Enter}'])(
  'S5 reaches and toggles a native disclosure with %s',
  async (key) => {
    const timeline = await mount(disclosure(), '<input aria-label="Previous control">');
    const summary = part(item(timeline, 'Preview deployment'), 'summary');
    expect(summary.localName).toBe('summary');
    expect(summary.textContent).toContain('Build log');
    expect(detailsHeight()).toBe(0);

    fixture.querySelector('input')?.focus();
    await userEvent.keyboard('{Tab}');
    await expect.poll(() => summary.matches(':focus')).toBe(true);
    await userEvent.keyboard(key);
    await expect.poll(detailsHeight).toBeGreaterThan(0);
    await userEvent.keyboard(key);
    await expect.poll(detailsHeight).toBe(0);
    expect(summary.matches(':focus')).toBe(true);
  },
);

it('S6 exposes the named ordered list and failure text, with the marker hidden from assistive technology', async () => {
  const timeline =
    await mount(`<ki-timeline-item icon-name="circle-alert" tone="danger" datetime="${deploy}">
    Deploy to preview failed
  </ki-timeline-item>`);
  expect(part(timeline, 'list')).toBeInstanceOf(HTMLOListElement);
  expect(part(timeline, 'item')).toBeInstanceOf(HTMLLIElement);
  const dot = part(item(timeline, 'Deploy to preview failed'), 'dot');
  const icon = dot.querySelector('ki-icon');
  await expect.poll(() => icon?.shadowRoot?.querySelector('svg')).toBeInstanceOf(SVGSVGElement);

  const tree = await browser.ariaSnapshotByRole('list', 'Activity');
  expect(tree).toMatch(/list "Activity":\n\s+- listitem:/u);
  expect(tree).toContain('Deploy to preview failed');
  expect(tree).not.toMatch(/- img\b|circle-alert/u);
  await expectAccessible(fixture);
});

function announcementText(region: HTMLElement): string {
  return region.textContent.trim().replace(/\s+/gu, ' ');
}

async function advanceClockAndRender(milliseconds: number): Promise<void> {
  await browser.fastForwardClock(milliseconds);
  // Playwright fires each scheduled timer once when fast-forwarding. Advance
  // the frames separately so Stencil can render the timeout's state change.
  await browser.fastForwardClock(20);
  await browser.fastForwardClock(20);
  await browser.fastForwardClock(20);
}

it('S7 announces only incoming events together in one polite update', async () => {
  const timeline = await mount(event('Initial review', review));
  const live = part(timeline, 'announcements');
  const updates: string[] = [];
  const observer = new MutationObserver(() => updates.push(announcementText(live)));

  expect(live.getAttribute('aria-live')).toBe('polite');
  expect(live.getAttribute('aria-atomic')).toBe('true');
  try {
    await browser.installClock();
  } catch {
    // Other browser specs may have installed this page's clock.
  }
  await browser.pauseClock();

  try {
    observer.observe(live, { childList: true, characterData: true, subtree: true });
    await advanceClockAndRender(250);
    expect(announcementText(live)).toBe('');

    timeline.insertAdjacentHTML('beforeend', event('First update', deploy));
    await browser.fastForwardClock(50);
    timeline.insertAdjacentHTML('beforeend', event('Second update', deploy));
    await browser.fastForwardClock(100);
    expect(updates).toEqual([]);

    await advanceClockAndRender(250);
    expect(updates).toEqual([expect.stringContaining('First update')]);
    expect(updates[0]).toContain('Second update');
    expect(updates[0]).not.toContain('Initial review');
  } finally {
    observer.disconnect();
    await browser.resumeClock();
  }
});

it('S8 applies consumer colors to the marker, connecting rule, and time', async () => {
  const timeline = await mount(event('Deploy finished', deploy) + event('Review complete', review));
  timeline.style.setProperty('--ki-timeline-dot-bg', 'rgb(213, 221, 232)');
  timeline.style.setProperty('--ki-timeline-line', 'rgb(32, 42, 52)');
  timeline.style.setProperty('--ki-timeline-time-fg', 'rgb(30, 45, 60)');

  const first = item(timeline, 'Deploy finished');
  expect(getComputedStyle(part(first, 'dot')).backgroundColor).toBe('rgb(213, 221, 232)');
  expect(getComputedStyle(part(first, 'time')).color).toBe('rgb(30, 45, 60)');
  expect(getComputedStyle(part(timeline, 'item'), '::before').borderInlineStartColor).toBe(
    'rgb(32, 42, 52)',
  );
});

it('S9 retains a visible marker outline and connector in forced colours', async ({ skip }) => {
  const witness = document.createElement('span');
  witness.style.backgroundColor = 'rgb(1, 2, 3)';
  const timeline = await mount(event('Deploy finished', deploy) + event('Review complete', review));
  fixture.append(witness);

  try {
    await browser.emulateForcedColors('active');
    const applied = () =>
      matchMedia('(forced-colors: active)').matches &&
      getComputedStyle(witness).backgroundColor !== 'rgb(1, 2, 3)';
    if (navigator.userAgent.includes('Chrome/')) {
      await expect.poll(applied).toBe(true);
    } else if (!applied()) {
      skip('This engine does not repaint with the emulated forced palette.');
    }

    const canvas = getComputedStyle(witness).backgroundColor;
    const marker = getComputedStyle(part(item(timeline, 'Deploy finished'), 'dot'));
    const connector = getComputedStyle(part(timeline, 'item'), '::before');
    expect(marker.outlineStyle).toBe('solid');
    expect(marker.outlineColor).not.toBe(canvas);
    expect(connector.borderInlineStartStyle).toBe('solid');
    expect(connector.borderInlineStartColor).not.toBe(canvas);
  } finally {
    await browser.emulateForcedColors(null);
  }
});

it('S10 opens event details without motion when requested', async () => {
  try {
    await browser.emulateReducedMotion('reduce');
    await expect.poll(() => matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    const timeline = await mount(disclosure());
    const entry = item(timeline, 'Preview deployment');
    const summary = part(entry, 'summary');

    await userEvent.click(summary);

    expect(detailsHeight()).toBeGreaterThan(0);
    expect(part(entry, 'details').getAnimations({ subtree: true })).toHaveLength(0);
    expect(getComputedStyle(part(entry, 'details')).transitionDuration).toBe('0s');
  } finally {
    await browser.emulateReducedMotion(null);
  }
});

it('S11 mirrors the marker and connector to the right of the event in RTL', async () => {
  fixture.dir = 'rtl';
  const timeline = await mount(event('Deploy finished', deploy) + event('Review complete', review));

  const first = item(timeline, 'Deploy finished');
  const dot = part(first, 'dot').getBoundingClientRect();
  const content = part(first, 'content').getBoundingClientRect();
  const row = part(timeline, 'item');
  const connector = getComputedStyle(row, '::before');
  expect(dot.left).toBeGreaterThan(content.right);
  expect(Number.parseFloat(connector.right)).toBeLessThan(row.getBoundingClientRect().width / 2);
});
