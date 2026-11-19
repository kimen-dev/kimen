// @spec:073-ki-note
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-note.js';

const browser = commands as unknown as {
  ariaSnapshot: (selector: string) => Promise<string>;
  emulateForcedColors: (value: 'active' | 'none') => Promise<void>;
  emulateReducedMotion: (value: 'reduce' | 'no-preference') => Promise<void>;
};

const styles = document.createElement('style');
const fixture = document.createElement('main');
fixture.id = 'note-fixture';

const message = 'Changing the slug breaks existing links.';
const customIcon =
  '<svg slot="icon" viewBox="0 0 24 24" role="img" aria-label="Custom glyph" tabindex="0"><path d="M4 12h16" stroke="currentColor"/></svg>';

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

async function mount(html: string): Promise<void> {
  fixture.innerHTML = html;
  await expect.poll(() => fixture.querySelectorAll('ki-note').length).toBeGreaterThan(0);
  await expect
    .poll(() =>
      Array.from(fixture.querySelectorAll('ki-note')).every((note) =>
        note.shadowRoot?.querySelector('[part="note"]'),
      ),
    )
    .toBe(true);
}

function host(index = 0): HTMLElement {
  const note = fixture.querySelectorAll<HTMLElement>('ki-note')[index];
  if (!note) throw new Error('Expected a note');
  return note;
}

function part(name: string, index = 0): HTMLElement {
  const element = host(index).shadowRoot?.querySelector<HTMLElement>(`[part="${name}"]`);
  if (!element) throw new Error(`Expected the ${name} part`);
  return element;
}

function metrics(index = 0) {
  const { fontSize, paddingBlockStart, paddingInlineStart } = getComputedStyle(part('note', index));
  return [fontSize, paddingBlockStart, paddingInlineStart].map(Number.parseFloat);
}

it.each(['neutral', 'primary', 'info', 'success', 'warning', 'danger'])(
  'S1: the %s tone displays readable text and a decorative icon',
  async (tone) => {
    await mount(
      `<ki-note>${message}</ki-note><ki-note tone="${tone}">Only owners can change billing</ki-note>`,
    );
    await expect.element(page.getByText('Only owners can change billing')).toBeVisible();

    const surface = getComputedStyle(part('note', 1));
    const baseline = getComputedStyle(part('note'));
    const paintedIcon = part('icon', 1).querySelector('svg');
    expect(paintedIcon?.getBoundingClientRect().width).toBeGreaterThan(0);
    expect(surface.color).toBe(baseline.color);
    expect(surface.backgroundColor === baseline.backgroundColor).toBe(tone === 'neutral');
    expect(getComputedStyle(part('icon', 1)).color === getComputedStyle(part('icon')).color).toBe(
      tone === 'neutral',
    );
  },
);

it('S2: a slotted glyph replaces the default glyph', async () => {
  await mount(`<ki-note>${customIcon}${message}</ki-note>`);
  const glyph = host().querySelector('svg');
  expect(glyph?.assignedSlot?.name).toBe('icon');
  expect(glyph?.getBoundingClientRect().width).toBeGreaterThan(0);
  const fallback = part('icon').querySelector('svg');
  expect(fallback?.getClientRects().length ?? 0).toBe(0);
});

it('S3: icon=false removes the icon and its space and can be cleared', async () => {
  await mount(`<ki-note icon="false">${customIcon}${message}</ki-note>`);
  const surface = part('note');
  expect(host().querySelector('svg')?.getClientRects().length).toBe(0);
  expect(
    part('message').getBoundingClientRect().left - surface.getBoundingClientRect().left,
  ).toBeCloseTo(Number.parseFloat(getComputedStyle(surface).paddingInlineStart));
  host().removeAttribute('icon');
  await expect
    .poll(() => host().querySelector('svg')?.getBoundingClientRect().width)
    .toBeGreaterThan(0);
});

it('S4: the small note has tighter padding and smaller type', async () => {
  await mount(`<ki-note size="sm">${message}</ki-note><ki-note>${message}</ki-note>`);
  expect(metrics().every((value, index) => value < (metrics(1)[index] ?? 0))).toBe(true);
});

it('S5: unknown values paint with the neutral medium defaults', async () => {
  await mount(
    `<ki-note tone="invalid" size="invalid">${message}</ki-note><ki-note>${message}</ki-note>`,
  );
  expect(metrics()).toEqual(metrics(1));
  expect(getComputedStyle(part('note')).backgroundColor).toBe(
    getComputedStyle(part('note', 1)).backgroundColor,
  );
  expect(part('icon').querySelector('path')?.getAttribute('d')).toBe(
    part('icon', 1).querySelector('path')?.getAttribute('d'),
  );
});

it('S6: Tab skips the note and its decorative slot', async () => {
  await mount(
    `<button>Cancel</button><ki-note>${customIcon}${message}</ki-note><button>Save</button>`,
  );
  fixture.querySelector('button')?.focus();
  await userEvent.keyboard('{Tab}');
  await expect.element(page.getByRole('button', { name: 'Save' })).toHaveFocus();
});

it('S7: the note exposes ordinary text and its decorative glyph is hidden', async () => {
  await mount(`<ki-note tone="warning">${customIcon}${message}</ki-note>`);
  const snapshot = await browser.ariaSnapshot('#note-fixture');
  expect(snapshot).toContain(message);
  expect(snapshot).not.toMatch(/Custom glyph|\balert\b|\bstatus\b/u);
  expect(host().matches('[role], [aria-live]')).toBe(false);
  expect(host().shadowRoot?.querySelector('[role], [aria-live]')).toBeNull();
  expect(part('icon').getAttribute('aria-hidden')).toBe('true');
  await expectAccessible(fixture);
});

it('S8: a theme can set the solid, image, filter and ink independently', async () => {
  await mount(`<ki-note tone="warning" style="
    --ki-note-warning-bg: rgb(235, 244, 246);
    --ki-note-warning-fg: rgb(15, 32, 47);
    --ki-note-bg-image: linear-gradient(transparent, transparent);
    --ki-note-backdrop-filter: blur(3px)">${message}</ki-note>`);
  const surface = getComputedStyle(part('note'));
  expect(surface.backgroundColor).toBe('rgb(235, 244, 246)');
  expect(surface.color).toBe('rgb(15, 32, 47)');
  expect(surface.backgroundImage).toContain('linear-gradient(');
  expect(surface.backdropFilter).toBe('blur(3px)');
});

it('S9: the icon leads and aligns with the start of wrapped RTL text', async () => {
  await mount(
    '<ki-note dir="rtl" style="inline-size: 160px">يجب الاحتفاظ بنسخة احتياطية قبل حذف المشروع.</ki-note>',
  );
  const glyph = part('icon').getBoundingClientRect();
  const text = part('message').getBoundingClientRect();
  expect(glyph.left).toBeGreaterThan(text.right);
  expect(glyph.top).toBeGreaterThanOrEqual(text.top);
  expect(glyph.bottom).toBeLessThan(text.bottom);
});

it('S10: forced colors keep a visible edge, text and icon', async ({ skip }) => {
  await browser.emulateForcedColors('active');
  try {
    fixture.style.backgroundColor = 'rgb(1, 2, 3)';
    const paletteApplies = () =>
      matchMedia('(forced-colors: active)').matches &&
      getComputedStyle(fixture).backgroundColor !== 'rgb(1, 2, 3)';
    if (navigator.userAgent.includes('Chrome/')) {
      await expect.poll(paletteApplies).toBe(true);
    } else if (!paletteApplies()) {
      skip('This browser does not paint a forced palette under emulation');
    }
    await mount(`<ki-note tone="warning">${message}</ki-note>`);
    const surface = getComputedStyle(part('note'));
    expect(Number.parseFloat(surface.borderBlockStartWidth)).toBeGreaterThan(0);
    expect(surface.borderBlockStartColor).not.toBe(surface.backgroundColor);
    expect(surface.color).not.toBe(surface.backgroundColor);
    expect(getComputedStyle(part('icon')).color).not.toBe(surface.backgroundColor);
    expect(part('icon').querySelector('svg')?.getBoundingClientRect().width).toBeGreaterThan(0);
  } finally {
    fixture.style.removeProperty('background-color');
    await browser.emulateForcedColors('none');
  }
});

it('S11: the note is visible and stays still with reduced motion', async () => {
  await browser.emulateReducedMotion('reduce');
  try {
    await expect.poll(() => matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    await mount(`<ki-note tone="warning">${message}</ki-note>`);
    await expect.element(page.getByText(message)).toBeVisible();
    const surface = part('note');
    expect(surface.getAnimations({ subtree: true })).toEqual([]);
    expect(getComputedStyle(surface).animationName).toBe('none');
    expect(getComputedStyle(surface).transitionDuration).toBe('0s');
  } finally {
    await browser.emulateReducedMotion('no-preference');
  }
});
