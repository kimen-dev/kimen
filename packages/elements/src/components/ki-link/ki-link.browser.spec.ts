// @spec:070-ki-link
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-link.js';

const styles = document.createElement('style');
const fixture = document.createElement('main');
const media = commands as unknown as {
  emulateReducedMotion: (mode: 'reduce' | null) => Promise<void>;
};

beforeAll(() => {
  defineCustomElement();
  styles.textContent = tokensCss;
  document.head.append(styles);
  fixture.style.backgroundColor = 'var(--ki-surface-s0)';
  document.body.append(fixture);
});

afterEach(async () => {
  await parkPointer();
  fixture.replaceChildren();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

async function anchor(selector = 'ki-link'): Promise<HTMLAnchorElement> {
  const read = () => fixture.querySelector(selector)?.shadowRoot?.querySelector('[part="link"]');
  await expect.poll(read).toBeInstanceOf(HTMLAnchorElement);
  const part = read();
  if (!(part instanceof HTMLAnchorElement)) throw new Error('Missing native link part');
  return part;
}

it('S1 follows a destination on native link activation', async () => {
  fixture.innerHTML =
    '<p>Read the <ki-link href="#link-catalog">catalog contract</ki-link>.</p>' +
    '<section id="link-catalog">Catalog</section>';
  const url = location.href;
  try {
    await page.getByRole('link', { name: 'catalog contract' }).click();
    await expect.poll(() => location.hash).toBe('#link-catalog');
  } finally {
    history.replaceState(history.state, '', url);
  }
});

it('S2 forwards native attributes and preserves the empty download attribute', async () => {
  fixture.innerHTML =
    '<ki-link href="/report.csv" target="reports" rel="help" download="report.csv">Report</ki-link>';
  const part = await anchor();
  expect(part.getAttribute('href')).toBe('/report.csv');
  expect(part.getAttribute('target')).toBe('reports');
  expect(part.getAttribute('rel')).toBe('help');
  expect(part.getAttribute('download')).toBe('report.csv');

  const host = fixture.querySelector('ki-link');
  host?.setAttribute('download', '');
  await expect.poll(() => part.getAttribute('download')).toBe('');
  host?.removeAttribute('download');
  await expect.poll(() => part.hasAttribute('download')).toBe(false);
});

it('S1 preserves the difference between an omitted and an empty destination', async () => {
  fixture.innerHTML = '<ki-link>Catalog contract</ki-link>';
  const part = await anchor();
  expect(part.hasAttribute('href')).toBe(false);
  await expect
    .element(page.getByRole('link', { name: 'Catalog contract' }))
    .not.toBeInTheDocument();

  fixture.querySelector('ki-link')?.setAttribute('href', '');
  await expect.poll(() => part.getAttribute('href')).toBe('');
  await expect.element(page.getByRole('link', { name: 'Catalog contract' })).toBeVisible();
});

it('S3 shows keyboard focus under reduced motion and follows the destination with Enter', async () => {
  fixture.innerHTML =
    '<button>Start</button><ki-link href="#link-keyboard" underline="hover">Catalog contract</ki-link>' +
    '<section id="link-keyboard">Catalog</section>';
  const part = await anchor();
  const url = location.href;
  await media.emulateReducedMotion('reduce');
  try {
    await expect.poll(() => matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    fixture.querySelector('button')?.focus();
    await userEvent.keyboard('{Tab}');
    expect(part.getRootNode()).toBeInstanceOf(ShadowRoot);
    expect(document.activeElement).toBe(fixture.querySelector('ki-link'));
    expect(part.matches(':focus-visible')).toBe(true);

    const paint = getComputedStyle(part);
    expect(paint.outlineStyle).toBe('solid');
    expect(Number.parseFloat(paint.outlineWidth)).toBeGreaterThan(0);
    expect(paint.textDecorationLine).toBe('underline');
    expect(part.getAnimations()).toEqual([]);

    await userEvent.keyboard('{Enter}');
    await expect.poll(() => location.hash).toBe('#link-keyboard');
  } finally {
    history.replaceState(history.state, '', url);
    await media.emulateReducedMotion(null);
  }
});

it('S4 exposes slotted text as the link name and passes axe', async () => {
  fixture.innerHTML =
    '<p>Read the <ki-link href="/docs/catalog">catalog <strong>contract</strong></ki-link>.</p>' +
    '<p>Browse the <ki-link href="https://example.com" external>source</ki-link>.</p>';
  await expect
    .element(page.getByRole('link', { name: 'catalog contract', exact: true }))
    .toBeVisible();
  await expectAccessible(fixture);
});

it('S5 keeps external settings secure and announces the new tab in the accessible name', async () => {
  fixture.innerHTML =
    '<ki-link href="https://example.com" target="_self" rel="help" external>Source</ki-link>';
  const part = await anchor();
  expect(part.getAttribute('target')).toBe('_blank');
  expect(part.relList.contains('noopener')).toBe(true);
  expect(part.relList.contains('help')).toBe(true);
  const link = page.getByRole('link', { name: 'Source (opens in a new tab)', exact: true });
  await expect.element(link).toBeVisible();
  const icon = part.querySelector('svg');
  expect(icon?.getAttribute('aria-hidden')).toBe('true');
  expect(icon?.getBoundingClientRect().width).toBeGreaterThan(0);
  await expect.element(page.getByRole('img')).not.toBeInTheDocument();

  fixture
    .querySelector('ki-link')
    ?.setAttribute('external-label', '(se abre en una pestaña nueva)');
  await expect
    .element(page.getByRole('link', { name: 'Source (se abre en una pestaña nueva)', exact: true }))
    .toBeVisible();

  fixture.querySelector('ki-link')?.removeAttribute('external');
  await expect.element(page.getByRole('link', { name: 'Source', exact: true })).toBeVisible();
  expect(part.getAttribute('target')).toBe('_self');
  expect(part.getAttribute('rel')).toBe('help');
});

it('S5 places the external marker after the link text in RTL', async () => {
  fixture.innerHTML =
    '<p dir="rtl"><ki-link href="https://example.com" external><span>المصدر</span></ki-link></p>';
  const part = await anchor();
  expect(getComputedStyle(part).direction).toBe('rtl');
  const label = fixture.querySelector('ki-link span');
  const icon = part.querySelector('svg');
  if (label === null || icon === null) throw new Error('Missing external link label or marker');
  expect(icon.getBoundingClientRect().right).toBeLessThanOrEqual(
    label.getBoundingClientRect().left,
  );
});

it('S6 underlines running text and inherits font size and weight while wrapping', async () => {
  fixture.innerHTML =
    '<p style="font-size: 21px; font-weight: 650; inline-size: 9em;">Read the ' +
    '<ki-link href="/docs/catalog">catalog contract and other documentation</ki-link>.</p>';
  const part = await anchor();
  const paint = getComputedStyle(part);
  expect(paint.textDecorationLine).toBe('underline');
  expect(paint.fontSize).toBe('21px');
  expect(paint.fontWeight).toBe('650');
  expect(part.getClientRects().length).toBeGreaterThan(1);
});

it('S7 reveals a standalone underline on a hover-capable pointer', async ({ skip }) => {
  if (!matchMedia('(hover: hover)').matches)
    skip('Browser reports no hover-capable primary pointer');
  fixture.innerHTML =
    '<ki-link href="/changelog" underline="hover" variant="neutral">Changelog</ki-link>';
  const part = await anchor();
  expect(getComputedStyle(part).textDecorationLine).toBe('none');

  await page.getByRole('link', { name: 'Changelog' }).hover();
  await expect.poll(() => getComputedStyle(part).textDecorationLine).toBe('underline');
  expect(Number.parseFloat(getComputedStyle(part).textDecorationThickness)).toBe(2);
});

it('S8 resolves both foregrounds from the semantic ink tokens', async () => {
  fixture.innerHTML =
    '<ki-link href="/docs/catalog">Catalog</ki-link>' +
    '<ki-link href="/changelog" variant="neutral">Changelog</ki-link>';
  const primary = await anchor('ki-link[href="/docs/catalog"]');
  const neutral = await anchor('ki-link[variant="neutral"]');

  // The stylesheet declares the alias on the theme root. Override the
  // semantic tokens at that same boundary, then let the links inherit.
  const theme = document.documentElement;
  theme.style.setProperty('--ki-text-primary-high-em', 'rgb(32, 72, 87)');
  theme.style.setProperty('--ki-text-high-em', 'rgb(33, 44, 55)');
  try {
    expect(getComputedStyle(primary).color).toBe('rgb(32, 72, 87)');
    expect(getComputedStyle(neutral).color).toBe('rgb(33, 44, 55)');
  } finally {
    theme.style.removeProperty('--ki-text-primary-high-em');
    theme.style.removeProperty('--ki-text-high-em');
  }
});
