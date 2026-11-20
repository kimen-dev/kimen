// @spec:118-ki-reasoning
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

import { defineCustomElement } from '../dist/components/ki-reasoning.js';
import { expectAccessible, parkPointer } from './axe';
import { textRatio } from './modes';

type ReasoningElement = HTMLElement & {
  duration?: number;
  open: boolean;
  status: 'thinking' | 'done';
};

const browser = commands as unknown as {
  ariaSnapshot: (selector: string) => Promise<string>;
  emulateForcedColors: (mode: 'active' | null) => Promise<void>;
  emulateReducedMotion: (mode: 'reduce' | 'no-preference' | null) => Promise<void>;
};

const styles = document.createElement('style');
const fixture = document.createElement('main');
const firstStep = 'Review the request.';
const secondStep = 'Check the current behavior.';
const stepList = `<ol><li>${firstStep}</li></ol>`;

beforeAll(() => {
  defineCustomElement();
  styles.textContent = tokensCss;
  fixture.id = 'reasoning-fixture';
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  fixture.removeAttribute('dir');
  fixture.removeAttribute('style');
  await parkPointer();
});

afterAll(() => {
  styles.remove();
  fixture.remove();
});

async function mount(markup: string) {
  fixture.innerHTML = markup;
  const host = fixture.querySelector<ReasoningElement>('ki-reasoning');
  if (!host) throw new Error('Missing reasoning fixture');
  await expect
    .poll(() => host.shadowRoot?.querySelector('details'))
    .toBeInstanceOf(HTMLDetailsElement);

  const root = host.shadowRoot;
  const panel = root?.querySelector('details');
  const summary = panel?.querySelector('summary[part~="summary"]');
  const body = panel?.querySelector<HTMLElement>('[part~="body"]');
  if (!root || !panel || !summary || !body) throw new Error('Missing reasoning disclosure');
  return { host, root, panel, summary, body };
}

function reportedToggles(host: HTMLElement): boolean[] {
  const values: boolean[] = [];
  host.addEventListener('ki-toggle', (event) => {
    values.push((event as CustomEvent<{ open: boolean }>).detail.open);
  });
  return values;
}

function nextToggle(panel: HTMLDetailsElement): Promise<void> {
  return new Promise((resolve) => {
    panel.addEventListener(
      'toggle',
      () => {
        resolve();
      },
      { once: true },
    );
  });
}

function thinkingLabel(summary: HTMLElement): HTMLElement {
  const label = summary.querySelector<HTMLElement>('.summary-label');
  if (!label) throw new Error('Missing thinking label');
  return label;
}

it('S1 starts collapsed with the thinking summary', async () => {
  const { host, panel, summary } = await mount(`<ki-reasoning>${stepList}</ki-reasoning>`);

  await expect.element(page.getByText(firstStep)).not.toBeVisible();
  expect(summary.textContent.trim()).toBe('Thinking…');
  expect(panel.open).toBe(false);
  expect(host.open).toBe(false);
});

it('S2 shows streamed steps in order while the disclosure stays open', async () => {
  const { host, summary } = await mount(`<ki-reasoning open>${stepList}</ki-reasoning>`);
  await expect.element(page.getByText(firstStep)).toBeVisible();

  const step = document.createElement('li');
  step.textContent = secondStep;
  const list = host.querySelector('ol');
  if (!list) throw new Error('Missing original step list');
  list.append(step);

  await expect.element(page.getByText(secondStep)).toBeVisible();
  expect([...list.children].map((item) => item.textContent)).toEqual([firstStep, secondStep]);
  expect(summary.textContent.trim()).toBe('Thinking…');
});

it('S3 shows the elapsed time at completion and keeps the steps visible', async () => {
  const { host, summary } = await mount(
    `<ki-reasoning open duration="12000">${stepList}</ki-reasoning>`,
  );

  host.status = 'done';

  await expect.poll(() => summary.textContent.trim()).toBe('Thought for 12 seconds');
  await expect.element(page.getByText(firstStep)).toBeVisible();
  expect(host.open).toBe(true);
});

it('S4 synchronizes application writes to open without emitting user toggles', async () => {
  const { host, panel } = await mount(`<ki-reasoning status="done">${stepList}</ki-reasoning>`);
  const toggles = reportedToggles(host);

  const opened = nextToggle(panel);
  host.open = true;
  await opened;
  await expect.element(page.getByText(firstStep)).toBeVisible();
  await expect.poll(() => host.hasAttribute('open')).toBe(true);

  const closed = nextToggle(panel);
  host.open = false;
  await closed;
  await expect.element(page.getByText(firstStep)).not.toBeVisible();
  await expect.poll(() => host.hasAttribute('open')).toBe(false);
  expect(toggles).toEqual([]);
});

it.each(['{Enter}', ' '])('S5 opens with keyboard input %j and keeps focus', async (input) => {
  const { host, root, summary } = await mount(
    `<button tabindex="0">Previous</button><ki-reasoning>${stepList}</ki-reasoning>`,
  );
  const toggles = reportedToggles(host);

  fixture.querySelector('button')?.focus();
  await userEvent.keyboard('{Tab}');
  expect(root.activeElement).toBe(summary);
  expect(getComputedStyle(summary).outlineStyle).toBe('solid');
  await userEvent.keyboard(input);

  await expect.element(page.getByText(firstStep)).toBeVisible();
  await expect.poll(() => [...toggles]).toEqual([true]);
  expect(root.activeElement).toBe(summary);
  expect(host.open).toBe(true);
  await expect.poll(() => host.hasAttribute('open')).toBe(true);
});

it('S6 announces completion once while the native disclosure stays closed', async () => {
  const { host, root, panel, summary } = await mount(`<ki-reasoning>${stepList}</ki-reasoning>`);
  const region = root.querySelector('[role="status"]');
  if (!region) throw new Error('Missing reasoning live region');
  expect(root.querySelectorAll('[role="status"]')).toHaveLength(1);
  expect(panel.contains(region)).toBe(false);
  expect(region.getAttribute('aria-live') ?? 'polite').toBe('polite');
  expect(region.getAttribute('aria-atomic') ?? 'true').toBe('true');
  expect(region.textContent).toBe('');

  const announced: string[] = [];
  const observer = new MutationObserver((records) => {
    announced.push(...records.map(() => region.textContent));
  });
  observer.observe(region, { childList: true, characterData: true, subtree: true });
  try {
    host.status = 'done';

    await expect.poll(() => announced.slice()).toEqual(['Thought']);
    const disclosure = await browser.ariaSnapshot('#reasoning-fixture ki-reasoning summary');
    expect(disclosure).toContain('Thought');
    expect(disclosure).not.toContain('[expanded]');
    expect(panel.open).toBe(false);
    await expect.element(page.getByText(firstStep)).not.toBeVisible();
    await expectAccessible(fixture);

    host.duration = 2000;

    await expect.poll(() => summary.textContent.trim()).toBe('Thought for 2 seconds');
    expect(announced).toEqual(['Thought']);
  } finally {
    observer.disconnect();
  }
});

it('S7 uses the supplied singular label and inserts the elapsed seconds', async () => {
  const { summary } = await mount(
    '<ki-reasoning status="done" duration="1000" singular-duration-label="Pensó durante {seconds} segundo"></ki-reasoning>',
  );

  expect(summary.textContent.trim()).toBe('Pensó durante 1 segundo');
});

it('S8 applies the supplied summary ink, surface and step rule colors', async () => {
  fixture.style.setProperty('--ki-reasoning-bg', 'rgb(235, 244, 246)');
  fixture.style.setProperty('--ki-reasoning-fg', 'rgb(15, 32, 47)');
  fixture.style.setProperty('--ki-reasoning-border', 'rgb(56, 76, 96)');
  const { host, panel, summary, body } = await mount(
    `<ki-reasoning open status="done">${stepList}</ki-reasoning>`,
  );
  const step = host.querySelector('li');
  if (!step) throw new Error('Missing reasoning step');

  expect(getComputedStyle(panel).backgroundColor).toBe('rgb(235, 244, 246)');
  expect(getComputedStyle(summary).color).toBe('rgb(15, 32, 47)');
  expect(getComputedStyle(step).color).toBe('rgb(15, 32, 47)');
  expect(getComputedStyle(body).borderInlineStartColor).toBe('rgb(56, 76, 96)');
  expect(Number.parseFloat(getComputedStyle(body).borderInlineStartWidth)).toBeGreaterThan(0);
});

it('S9 stops the thinking shimmer under reduced motion and keeps text readable', async () => {
  await browser.emulateReducedMotion('no-preference');
  try {
    const { summary } = await mount('<ki-reasoning></ki-reasoning>');
    const label = thinkingLabel(summary);
    const animations = () => label.getAnimations({ subtree: true });
    await expect.poll(() => animations().length).toBeGreaterThan(0);

    await browser.emulateReducedMotion('reduce');
    await expect.poll(() => matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);

    await expect.poll(animations).toEqual([]);
    await expect.element(page.getByText('Thinking…')).toBeVisible();
    expect(textRatio(label)).toBeGreaterThanOrEqual(4.5);
  } finally {
    await browser.emulateReducedMotion(null);
  }
});

it('S10 preserves readable summary text and the rule in forced colors', async ({ skip }) => {
  await browser.emulateForcedColors('active');
  try {
    fixture.style.backgroundColor = 'rgb(1, 2, 3)';
    const usesForcedPalette = () =>
      matchMedia('(forced-colors: active)').matches &&
      getComputedStyle(fixture).backgroundColor !== 'rgb(1, 2, 3)';
    if (navigator.userAgent.includes('Chrome/')) {
      await expect.poll(usesForcedPalette).toBe(true);
    } else if (!usesForcedPalette()) {
      skip('This browser does not paint a forced palette under emulation');
    }

    fixture.style.color = 'CanvasText';
    const { summary, body } = await mount(`<ki-reasoning open>${stepList}</ki-reasoning>`);
    const label = thinkingLabel(summary);
    const paletteInk = getComputedStyle(fixture).color;
    await expect.element(page.getByText('Thinking…')).toBeVisible();
    expect(getComputedStyle(label).color).toBe(paletteInk);
    expect(getComputedStyle(body).borderInlineStartColor).toBe(paletteInk);
    expect(Number.parseFloat(getComputedStyle(body).borderInlineStartWidth)).toBeGreaterThan(0);
  } finally {
    await browser.emulateForcedColors(null);
  }
});

it('S11 places the rule on the right edge of open steps in RTL', async () => {
  fixture.dir = 'rtl';
  const { body } = await mount(`<ki-reasoning open status="done">${stepList}</ki-reasoning>`);

  await expect.element(page.getByText(firstStep)).toBeVisible();
  const style = getComputedStyle(body);
  expect(Number.parseFloat(style.borderRightWidth)).toBeGreaterThan(0);
  expect(Number.parseFloat(style.borderLeftWidth)).toBe(0);
});
