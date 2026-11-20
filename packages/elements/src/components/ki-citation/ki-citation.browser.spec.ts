// @spec:110-ki-sources
import { expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import {
  definitions,
  shadowLinkHasFocus,
  sourcesFixture,
} from '../../../browser-tests/sources-fixture';

const fixture = sourcesFixture();
const link = () => page.getByRole('link', { name: 'Source 1: Methods' });
const preview = () => page.getByRole('tooltip');
const media = commands as unknown as {
  emulateForcedColors: (value: 'active' | 'none' | null) => Promise<void>;
  emulateReducedMotion: (value: 'reduce' | 'no-preference' | null) => Promise<void>;
};

function answer(open = false): void {
  fixture.innerHTML = `
    <button type="button" tabindex="0">First control</button>
    <p>Study<ki-citation ref="methods"></ki-citation>.</p>
    <ki-sources ${open ? 'open' : ''}>${definitions}</ki-sources>`;
}

async function tabToCitation(): Promise<void> {
  await expect.element(link()).toBeVisible();
  fixture.querySelector('button')?.focus();
  await userEvent.tab();
  await expect.poll(() => shadowLinkHasFocus(link().query())).toBe(true);
}

it('S3 shows the referenced title and hostname on hover and remains open over the preview', async () => {
  answer();
  await link().hover();
  await expect.element(preview()).toHaveTextContent('Methods');
  await expect.element(preview()).toHaveTextContent('example.org');
  await preview().hover();
  await expect.element(preview()).toBeVisible();
  await page.getByRole('button', { name: 'First control' }).hover();
  await expect.element(preview()).not.toBeInTheDocument();
});

it('S7 displays the preview and visible focus on Tab and dismisses on Escape', async () => {
  answer();
  await tabToCitation();
  expect(getComputedStyle(link().element()).outlineStyle).toBe('solid');
  await expect.element(preview()).toBeVisible();
  await userEvent.keyboard('{Escape}');
  await expect.element(preview()).not.toBeInTheDocument();
  await expect.poll(() => shadowLinkHasFocus(link().query())).toBe(true);
});

it('S8 opens the closed list and focuses the named link on Enter', async () => {
  answer();
  await tabToCitation();
  await userEvent.keyboard('{Enter}');
  const source = page.getByRole('link', { name: 'Methods', exact: true });
  await expect.poll(() => shadowLinkHasFocus(source.query())).toBe(true);
  await expect.element(source).toHaveAttribute('href', 'https://example.org/methods');
  await expect.element(preview()).not.toBeInTheDocument();
});

it('S10 paints the citation with the semantic second surface override', async () => {
  fixture.style.setProperty('--ki-surface-s2', 'rgb(219, 233, 255)');
  answer();
  await expect.element(link()).toBeVisible();
  expect(
    getComputedStyle(link().element().querySelector('[part="marker"]') ?? link().element())
      .backgroundColor,
  ).toBe('rgb(219, 233, 255)');
});

it('S12 keeps the citation underlined and the card edge visible in forced colors', async () => {
  await media.emulateForcedColors('active');
  try {
    expect(matchMedia('(forced-colors: active)').matches).toBe(true);
    answer(true);
    const card = page.getByRole('link', { name: 'Methods', exact: true });
    await expect.element(link()).toBeVisible();
    await expect.element(card).toBeVisible();
    expect(getComputedStyle(link().element()).textDecorationLine).toBe('underline');
    const reference = document.createElement('span');
    reference.style.color = 'LinkText';
    fixture.append(reference);
    const border = getComputedStyle(card.element());
    expect(border.borderBlockStartColor).toBe(getComputedStyle(reference).color);
    expect(border.borderBlockStartStyle).toBe('solid');
    expect(Number.parseFloat(border.borderBlockStartWidth)).toBeGreaterThan(0);
  } finally {
    await media.emulateForcedColors(null);
  }
});

it('S13 opens the focused preview without animation under reduced motion', async () => {
  await media.emulateReducedMotion('reduce');
  try {
    answer();
    await tabToCitation();
    await expect.element(preview()).toBeVisible();
    expect(preview().element().getAnimations()).toHaveLength(0);
  } finally {
    await media.emulateReducedMotion(null);
  }
});

it('restores the English link and disclosure labels when custom templates are removed', async () => {
  answer();
  const citation = fixture.querySelector('ki-citation');
  const sources = fixture.querySelector('ki-sources');
  citation?.setAttribute('label-template', 'Fuente {number}: {title}');
  sources?.setAttribute('sources-count-label', '{count} fuentes');
  await expect.element(page.getByRole('link', { name: 'Fuente 1: Methods' })).toBeVisible();
  await expect.element(page.getByText('2 fuentes', { exact: true })).toBeVisible();
  citation?.removeAttribute('label-template');
  sources?.removeAttribute('sources-count-label');
  await expect.element(link()).toBeVisible();
  await expect.element(page.getByText('2 sources', { exact: true })).toBeVisible();
});
