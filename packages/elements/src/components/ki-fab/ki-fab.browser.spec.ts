// @spec:104-ki-fab
import '../../../icons/pencil.js';
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineFab } from '../../../dist/components/ki-fab.js';

const styles = document.createElement('style');
const fixture = document.createElement('div');
fixture.id = 'fab-test-fixture';

const browser = commands as unknown as {
  ariaSnapshot: (selector: string) => Promise<string>;
  emulateReducedMotion: (motion: 'reduce' | null) => Promise<void>;
};
const compose = page.getByRole('button', { name: 'Compose', exact: true });
const composeText = page.getByText('Compose', { exact: true });
const scrollablePage = '<main style="min-block-size:calc(200vh + 600px)">Drafts</main>';
const scrollFab =
  '<ki-fab label="Compose" icon-name="pencil" extended collapse-on-scroll position="fixed"></ki-fab>';
const slottedIcon =
  '<svg slot="icon" role="img" aria-label="Pencil" viewBox="0 0 24 24">' +
  '<path d="M12 4v16M4 12h16" fill="none" stroke="currentColor"/></svg>';

beforeAll(() => {
  defineFab();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  fixture.removeAttribute('style');
  fixture.removeAttribute('dir');
  window.scrollTo(0, 0);
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

function host(): HTMLElement {
  const element = fixture.querySelector('ki-fab');
  if (!element) throw new Error('Missing FAB');
  return element;
}

function partOf(element: HTMLElement, name: string): HTMLElement {
  const part = element.shadowRoot?.querySelector<HTMLElement>(`[part~="${name}"]`);
  if (!part) throw new Error(`The FAB did not render part="${name}"`);
  return part;
}

async function scrollPageTo(top: number): Promise<void> {
  const scrolled = new Promise<void>((resolve) => {
    window.addEventListener(
      'scroll',
      () => {
        resolve();
      },
      { once: true },
    );
  });
  window.scrollTo({ top, behavior: 'instant' });
  await scrolled;
}

async function mountScrollFab(): Promise<HTMLElement> {
  fixture.innerHTML = scrollablePage + scrollFab;
  await expect.element(composeText).toBeVisible();
  return host();
}

async function expectCollapsed(control: HTMLElement): Promise<void> {
  await expect.element(composeText).not.toBeVisible();
  await expect.poll(() => Math.abs(control.getBoundingClientRect().width - 56)).toBeLessThan(0.5);
}

it.each([
  ['', 56, 24],
  ['size="lg"', 80, 28],
  ['size="xl"', 96, 36],
] as const)('S1: paints the icon FAB (%s) at %dpx square', async (size, width, iconSize) => {
  fixture.innerHTML = `<ki-fab label="Compose" icon-name="pencil" ${size}></ki-fab>`;
  await expect.element(compose).toBeVisible();
  await expect.element(composeText).not.toBeVisible();

  const rect = partOf(host(), 'control').getBoundingClientRect();
  expect(rect.width).toBeCloseTo(width, 0);
  expect(rect.height).toBeCloseTo(width, 0);
  await expect
    .poll(() => {
      const svg = partOf(host(), 'icon').querySelector('ki-icon')?.shadowRoot?.querySelector('svg');
      return svg?.getBoundingClientRect().width ?? 0;
    })
    .toBeCloseTo(iconSize, 0);
});

it('S2: the extended control shows the supplied glyph in place of the named glyph', async () => {
  fixture.innerHTML = `<ki-fab label="Compose" icon-name="pencil" extended>${slottedIcon}</ki-fab>`;
  await expect.element(composeText).toBeVisible();
  const icon = partOf(host(), 'icon');
  const slot = icon.querySelector<HTMLSlotElement>('slot[name="icon"]');
  expect(slot?.assignedElements()).toEqual([host().querySelector('svg')]);
  const supplied = host().querySelector('svg');
  expect(supplied?.getBoundingClientRect().width).toBeGreaterThan(0);
  expect(icon.querySelector('ki-icon')?.getBoundingClientRect().width ?? 0).toBe(0);
});

it('S3: a pointer activation bubbles one trusted click to the page', async () => {
  fixture.innerHTML = '<main><ki-fab label="Compose" icon-name="pencil"></ki-fab></main>';
  const click = vi.fn<(event: MouseEvent) => void>();
  fixture.querySelector('main')?.addEventListener('click', click);

  await compose.click();

  expect(click).toHaveBeenCalledTimes(1);
  expect(click.mock.calls[0]?.[0]).toBeInstanceOf(MouseEvent);
  expect(click.mock.calls[0]?.[0]?.isTrusted).toBe(true);
});

it('S4: downwards page scrolling hides the label and preserves focus and name', async () => {
  const fab = await mountScrollFab();
  const control = partOf(fab, 'control');
  control.focus({ preventScroll: true });

  await scrollPageTo(240);
  await expectCollapsed(control);

  await expect.element(compose).toBeVisible();
  expect(fab.shadowRoot?.activeElement).toBe(control);
});

it('S5: upwards page scrolling restores the label next to the icon', async () => {
  const fab = await mountScrollFab();
  const control = partOf(fab, 'control');
  await scrollPageTo(240);
  await expectCollapsed(control);

  await scrollPageTo(120);

  await expect.element(composeText).toBeVisible();
  await expect.poll(() => control.getBoundingClientRect().width).toBeGreaterThan(56);
});

it('S6: the fixed FAB clears mobile navigation and the page leaves space for its last item', async () => {
  fixture.style.setProperty('--ki-fab-mobile-nav-block-size', '64px');
  fixture.innerHTML =
    '<main style="padding-block-end:calc(56px + 32px + var(--ki-fab-mobile-nav-block-size))">' +
    '<div style="block-size:180vh">Drafts</div><button type="button">Last draft</button></main>' +
    '<ki-fab label="Compose" icon-name="pencil" position="fixed"></ki-fab>' +
    '<nav aria-label="Mobile navigation" style="position:fixed;inset-inline:0;inset-block-end:0;' +
    'block-size:var(--ki-fab-mobile-nav-block-size)">Inbox</nav>';
  await expect.element(compose).toBeVisible();

  await scrollPageTo(document.documentElement.scrollHeight);

  const control = partOf(host(), 'control').getBoundingClientRect();
  const nav = fixture.querySelector('nav')?.getBoundingClientRect();
  const lastItem = fixture.querySelector('main button')?.getBoundingClientRect();
  if (!nav || !lastItem) throw new Error('Missing fixed layout fixture');
  expect(document.documentElement.clientWidth - control.right).toBeCloseTo(16, 0);
  expect(nav.top - control.bottom).toBeCloseTo(16, 0);
  expect(lastItem.top).toBeGreaterThanOrEqual(0);
  expect(lastItem.bottom).toBeLessThan(control.top);
});

it.each([
  ['Enter', '{Enter}'],
  ['Space', ' '],
] as const)('S7: Tab reaches the button and %s activates it once', async (_name, key) => {
  fixture.innerHTML =
    '<input aria-label="Before"><ki-fab label="Compose" icon-name="pencil"></ki-fab>';
  await expect.element(compose).toBeVisible();
  const fab = host();
  const control = partOf(fab, 'control');
  control.tabIndex = 0;
  const click = vi.fn();
  fab.addEventListener('click', click);
  fixture.querySelector('input')?.focus();

  await userEvent.keyboard('{Tab}');

  expect(fab.shadowRoot?.activeElement).toBe(control);
  expect(control.matches(':focus-visible')).toBe(true);
  expect(Number.parseFloat(getComputedStyle(control).outlineWidth)).toBeGreaterThan(0);
  await userEvent.keyboard(key);
  expect(click).toHaveBeenCalledTimes(1);
});

it('S8: Enter on the link follows its native destination', async () => {
  fixture.innerHTML =
    '<ki-fab label="Projects" icon-name="pencil" href="#projects"></ki-fab>' +
    '<main id="projects">Your projects</main>';
  await expect.element(page.getByRole('link', { name: 'Projects', exact: true })).toBeVisible();
  const control = partOf(host(), 'control');
  control.focus();
  const originalUrl = window.location.href;
  try {
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => window.location.hash).toBe('#projects');
  } finally {
    window.history.replaceState(window.history.state, '', originalUrl);
  }
});

it('S9: the accessible button name excludes a supplied glyph with its own name', async () => {
  fixture.innerHTML = `<main><ki-fab label="Compose">${slottedIcon}</ki-fab></main>`;
  await expect.element(compose).toBeVisible();
  const snapshot = await browser.ariaSnapshot('#fab-test-fixture');
  expect(snapshot).toContain('button "Compose"');
  expect(snapshot).not.toContain('Pencil');
  await expect.element(page.getByRole('img')).not.toBeInTheDocument();
  await expectAccessible(fixture);
});

it('S10: the fixed control follows the main content in keyboard order', async () => {
  fixture.innerHTML =
    '<main><input aria-label="First draft"><input aria-label="Last draft"></main>' +
    '<ki-fab label="Compose" icon-name="pencil" position="fixed"></ki-fab>';
  await expect.element(compose).toBeVisible();
  const fab = host();
  const control = partOf(fab, 'control');
  control.tabIndex = 0;
  fixture.querySelector('input')?.focus();

  await userEvent.keyboard('{Tab}');
  await expect.element(page.getByRole('textbox', { name: 'Last draft' })).toHaveFocus();
  await userEvent.keyboard('{Tab}');

  expect(fab.shadowRoot?.activeElement).toBe(control);
});

it('S11: the default variant repaints with the overridden semantic fill and ink', async () => {
  const root = document.documentElement.style;
  root.setProperty('--ki-surface-primary-low-em', 'rgb(15, 35, 71)');
  root.setProperty('--ki-text-primary-on-primary-light', 'rgb(246, 244, 241)');
  try {
    fixture.innerHTML = '<ki-fab label="Compose" icon-name="pencil" extended></ki-fab>';
    await expect.element(composeText).toBeVisible();
    expect(getComputedStyle(partOf(host(), 'control')).backgroundColor).toBe('rgb(15, 35, 71)');
    expect(getComputedStyle(partOf(host(), 'label')).color).toBe('rgb(246, 244, 241)');
  } finally {
    root.removeProperty('--ki-surface-primary-low-em');
    root.removeProperty('--ki-text-primary-on-primary-light');
  }
});

it('S12: a fixed FAB moves to the left viewport edge in RTL', async () => {
  fixture.dir = 'rtl';
  fixture.innerHTML = '<ki-fab label="Compose" icon-name="pencil" position="fixed"></ki-fab>';
  await expect.element(compose).toBeVisible();

  const rect = partOf(host(), 'control').getBoundingClientRect();
  expect(rect.left).toBeCloseTo(16, 0);
  expect(document.documentElement.clientHeight - rect.bottom).toBeCloseTo(16, 0);
});

it('S13: reduced motion collapses the FAB without a shrink animation', async () => {
  await browser.emulateReducedMotion('reduce');
  try {
    await expect.poll(() => matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    const fab = await mountScrollFab();
    const control = partOf(fab, 'control');

    await scrollPageTo(240);
    await expectCollapsed(control);

    const paint = getComputedStyle(control);
    expect(paint.animationName).toBe('none');
    expect(paint.transitionDuration.split(',').map(Number.parseFloat)).toEqual(
      paint.transitionDuration.split(',').map(() => 0),
    );
  } finally {
    await browser.emulateReducedMotion(null);
  }
});

it('S15: disabling scroll collapse restores and keeps the label', async () => {
  const fab = await mountScrollFab();
  const control = partOf(fab, 'control');
  await scrollPageTo(240);
  await expectCollapsed(control);

  fab.removeAttribute('collapse-on-scroll');
  await expect.element(composeText).toBeVisible();
  await scrollPageTo(480);
  await new Promise((resolve) => requestAnimationFrame(resolve));
  await new Promise((resolve) => requestAnimationFrame(resolve));

  await expect.element(composeText).toBeVisible();
});
