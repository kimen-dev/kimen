// @spec:093-ki-format
import { afterEach, expect, it, vi } from 'vitest';
import { commands } from 'vitest/browser';
import { expectAccessible } from './axe';
import { expectFormat, formatOutput, mountFormat, setupFormatTests } from './format-fixture';

const formatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });
let clockPaused = false;

vi.setConfig({ testTimeout: 120_000 });

afterEach(async () => {
  if (clockPaused) {
    clockPaused = false;
    await commands.resumeClock();
  }
});

setupFormatTests();

async function useClock(): Promise<void> {
  try {
    await commands.installClock();
  } catch {
    // Another browser spec may already have installed this page's clock.
  }
  await commands.pauseClock();
  clockPaused = true;
}

async function pass(ms: number): Promise<void> {
  await commands.fastForwardClock(ms);
  // Let Stencil complete its render after the time boundary.
  await commands.fastForwardClock(64);
}

function ago(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

function visibleRelative(main: HTMLElement, selector: string): string | null | undefined {
  return formatOutput(main, selector)?.querySelector('[aria-hidden="true"]')?.textContent;
}

it('S4 supports automatic and numeric relative wording', async () => {
  const date = ago(86_400_000);
  const main = mountFormat(`
    <ki-relative-time date="${date}" numeric="auto"></ki-relative-time>
    <ki-relative-time date="${date}" numeric="always"></ki-relative-time>
  `);
  await expect.poll(() => visibleRelative(main, '[numeric="auto"]')).toBe('yesterday');
  await expect.poll(() => visibleRelative(main, '[numeric="always"]')).toBe('1 day ago');
});

it('S5 switches from relative wording to absolute text at the threshold', async () => {
  await useClock();
  const date = ago(59_000);
  const main = mountFormat(
    `<ki-relative-time date="${date}" threshold="60" sync></ki-relative-time>`,
  );
  await pass(0);
  expect(visibleRelative(main, 'ki-relative-time')).toBe('59 seconds ago');
  await pass(936);
  await expectFormat(main, 'ki-relative-time', formatter.format(new Date(date)));
});

it('S6 static relative time keeps its initial text as time passes', async () => {
  await useClock();
  const main = mountFormat(`<ki-relative-time date="${ago(60_000)}"></ki-relative-time>`);
  await pass(0);
  expect(visibleRelative(main, 'ki-relative-time')).toBe('1 minute ago');
  await pass(60_000);
  expect(visibleRelative(main, 'ki-relative-time')).toBe('1 minute ago');
});

it('S10 exposes a stable absolute date as assistive text while relative text changes', async () => {
  await useClock();
  const date = ago(10_000);
  const main = mountFormat(`<ki-relative-time date="${date}" sync></ki-relative-time>`);
  await pass(0);
  const time = formatOutput(main, 'ki-relative-time');
  const absolute = formatter.format(new Date(date));
  expect(time).toBeInstanceOf(HTMLTimeElement);
  expect(time?.getAttribute('datetime')).toBe(date);
  expect(time?.title).toBe(absolute);
  expect(time?.querySelector(':not([aria-hidden])')?.textContent).toBe(absolute);
  expect(visibleRelative(main, 'ki-relative-time')).toBe('10 seconds ago');
  await pass(936);
  expect(visibleRelative(main, 'ki-relative-time')).toBe('11 seconds ago');
  expect(time?.title).toBe(absolute);
  const host = main.querySelector('ki-relative-time');
  expect(host?.getAttribute('aria-live')).toBeNull();
  expect(
    host?.shadowRoot?.querySelector('[aria-live], [role="status"], [role="alert"]'),
  ).toBeNull();
  const browser = commands as unknown as {
    accessibilityTree: () => Promise<{ name: string }[] | null>;
  };
  const nodes = await browser.accessibilityTree();
  if (nodes) {
    expect(nodes).toEqual(expect.arrayContaining([expect.objectContaining({ name: absolute })]));
    expect(nodes.some(({ name }) => name === '11 seconds ago')).toBe(false);
  }
  await commands.resumeClock();
  clockPaused = false;
  await expectAccessible(main);
});

it('catches up on reconnection and stops updating when synchronization is removed', async () => {
  await useClock();
  const main = mountFormat(`<ki-relative-time date="${ago(10_000)}" sync></ki-relative-time>`);
  await pass(0);
  const host = main.querySelector('ki-relative-time');
  if (!host) throw new Error('Missing relative-time formatter');
  expect(visibleRelative(main, 'ki-relative-time')).toBe('10 seconds ago');
  host.remove();
  await pass(5_000);
  main.append(host);
  await pass(0);
  expect(visibleRelative(main, 'ki-relative-time')).toBe('15 seconds ago');
  host.removeAttribute('sync');
  await pass(0);
  await pass(5_000);
  expect(visibleRelative(main, 'ki-relative-time')).toBe('15 seconds ago');
});
