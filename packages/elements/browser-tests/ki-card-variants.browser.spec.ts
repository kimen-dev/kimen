// @spec:079-card-variants
import material3Css from '@kimen/tokens/css/material3?raw';
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { commands, page, server, userEvent } from 'vitest/browser';
import { defineCustomElement as defineButton } from '../dist/components/ki-button.js';
import { defineCustomElement as defineCard } from '../dist/components/ki-card.js';
import { expectAccessible, parkPointer } from './axe';

const browserCommands = commands as unknown as {
  ariaSnapshot: (selector: string) => Promise<string>;
  emulateForcedColors: (value: 'active' | null) => Promise<void>;
  emulateReducedMotion: (value: 'reduce' | null) => Promise<void>;
};
const title = 'Search index rebuild';
const copy = 'Rebuild starts at midnight';
const link = 'href="#incident-42"';
const beforeButton = '<button type="button" tabindex="0">Before</button>';
const afterButton = '<button type="button" tabindex="0">After</button>';

beforeAll(async () => {
  defineCard();
  defineButton();
  const style = document.createElement('style');
  style.textContent = tokensCss + material3Css;
  document.head.append(style);
  await browserCommands.emulateReducedMotion('reduce');
});

afterEach(async () => {
  await parkPointer();
  document.getSelection()?.removeAllRanges();
  document.body.replaceChildren();
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
  if (location.hash === '#incident-42') {
    history.replaceState(null, '', location.pathname + location.search);
  }
});

afterAll(async () => {
  await browserCommands.emulateForcedColors(null);
  await browserCommands.emulateReducedMotion(null);
});

async function mount(
  attributes = '',
  { footer = '', heading = title, before = '', after = '' } = {},
): Promise<HTMLElement> {
  document.body.innerHTML = `
    <main>
      ${before}
      <ki-card id="subject" ${attributes}>
        ${heading ? `<h3 slot="header">${heading}</h3>` : ''}
        <p id="copy">${copy}</p>
        ${footer}
      </ki-card>
      ${after}
      <span id="incident-42"></span>
    </main>
  `;
  const card = document.querySelector<HTMLElement>('#subject');
  if (!card) throw new Error('Card fixture not found');
  await expect.poll(() => surface(card, false)?.getBoundingClientRect().height).toBeGreaterThan(0);
  if (heading && (attributes.includes('href=') || attributes.includes('interactive'))) {
    await expect.poll(() => part(card, 'trigger')).not.toBeNull();
  }
  return card;
}

function part(card: HTMLElement, name: string): HTMLElement | null {
  return card.shadowRoot?.querySelector<HTMLElement>(`[part="${name}"]`) ?? null;
}

function surface(card: HTMLElement, required: false): HTMLElement | null;
function surface(card: HTMLElement): HTMLElement;
function surface(card: HTMLElement, required = true): HTMLElement | null {
  const node = part(card, 'card');
  if (!node && required) throw new Error('Card surface not rendered');
  return node;
}

function focusBefore(): void {
  const before = page.getByRole('button', { name: 'Before' }).element();
  if (!(before instanceof HTMLButtonElement)) throw new Error('Focus sentinel did not render');
  before.focus();
  expect(document.activeElement).toBe(before);
}

async function tabToTitle(
  card: HTMLElement,
  role: 'link' | 'button',
  shift = false,
): Promise<void> {
  const control = page.getByRole(role, { name: title, exact: true }).element();
  if (!(control instanceof HTMLElement)) throw new Error('Card title control did not render');
  await userEvent.tab({ shift });
  // WebKit can omit native links and buttons from Tab under platform keyboard
  // settings. Keep keyboard modality for the ring and test the native key
  // behavior by focusing the title directly if WebKit skips that stop.
  if (server.browser === 'webkit' && card.shadowRoot?.activeElement !== control) {
    control.focus();
  }
  expect(card.shadowRoot?.activeElement).toBe(control);
}

it('S1 follows the native destination when supporting text is clicked', async () => {
  await mount(link);
  await userEvent.click(page.getByText(copy, { exact: true }));
  await expect.poll(() => location.hash).toBe('#incident-42');
});

it('S2 keeps a Stencil footer button separately operable', async () => {
  const card = await mount('interactive', {
    footer: '<ki-button slot="footer" variant="secondary">Bookmark</ki-button>',
  });
  const activate = vi.fn();
  const bookmark = vi.fn();
  card.addEventListener('ki-activate', activate);
  card.querySelector('ki-button')?.addEventListener('click', bookmark);
  await userEvent.click(page.getByRole('button', { name: 'Bookmark' }));
  expect(bookmark).toHaveBeenCalledTimes(1);
  expect(activate).not.toHaveBeenCalled();
});

it('S3 allows a real pointer drag to select supporting text without activation', async () => {
  const card = await mount('interactive');
  const activate = vi.fn();
  card.addEventListener('ki-activate', activate);
  const paragraph = page.getByText(copy, { exact: true }).element();
  const range = document.createRange();
  range.selectNodeContents(paragraph);
  const line = range.getBoundingClientRect();
  const block = paragraph.getBoundingClientRect();
  const y = line.top - block.top + line.height / 2;
  await userEvent.pointer([
    { target: paragraph, coords: { x: line.left - block.left + 1, y }, keys: '[MouseLeft>]' },
    { target: paragraph, coords: { x: line.right - block.left - 1, y } },
    { target: paragraph, coords: { x: line.right - block.left - 1, y }, keys: '[/MouseLeft]' },
  ]);
  expect(document.getSelection()?.toString()).toContain('starts at');
  expect(activate).not.toHaveBeenCalled();
});

it('S4 tabs once to the title and each inner control, with a whole-card focus ring', async () => {
  const card = await mount(link, {
    before: beforeButton,
    footer: '<button slot="footer" type="button" tabindex="0">Bookmark</button>',
    after: afterButton,
  });
  focusBefore();
  await tabToTitle(card, 'link');
  expect(getComputedStyle(surface(card)).outlineStyle).toBe('solid');
  expect(parseFloat(getComputedStyle(surface(card)).outlineWidth)).toBeGreaterThan(0);
  await userEvent.tab();
  await expect.element(page.getByRole('button', { name: 'Bookmark' })).toHaveFocus();
  expect(getComputedStyle(surface(card)).outlineStyle).toBe('none');
  await userEvent.tab();
  await expect.element(page.getByRole('button', { name: 'After' })).toHaveFocus();
  await userEvent.tab({ shift: true });
  await expect.element(page.getByRole('button', { name: 'Bookmark' })).toHaveFocus();
  await tabToTitle(card, 'link', true);
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => location.hash).toBe('#incident-42');
});

it.each(['{Enter}', '[Space]'])('S5 activates a focused title button with %s once', async (key) => {
  const card = await mount('interactive', { before: beforeButton, after: afterButton });
  const activate = vi.fn();
  document.querySelector('main')?.addEventListener('ki-activate', activate);
  focusBefore();
  await tabToTitle(card, 'button');
  await userEvent.keyboard(key);
  expect(activate).toHaveBeenCalledTimes(1);
});

it.each([
  [link, 'link', /heading "Search index rebuild" \[level=3\]:\s+- link "Search index rebuild"/u],
  [
    'interactive',
    'button',
    /heading "Search index rebuild" \[level=3\]:\s+- button "Search index rebuild"/u,
  ],
] as const)(
  'S6 exposes the authored heading level and only its title as the %s name',
  async (attributes, role, outline) => {
    const card = await mount(attributes, { before: '<h2>Incidents</h2>' });
    const actual = await browserCommands.ariaSnapshot('#subject');
    expect(actual).toMatch(outline);
    expect(actual).toContain(copy);
    await expect.element(page.getByRole(role, { name: title, exact: true })).toBeVisible();
    const trigger = part(card, 'trigger');
    const main = document.querySelector('main');
    if (!trigger || !main) throw new Error('Card accessibility fixture did not render');
    expect(getComputedStyle(trigger).textDecorationLine).toContain('underline');
    await expectAccessible(main);
  },
);

it('S7 activates inside a form without submitting it', async () => {
  const card = await mount('interactive');
  const form = document.createElement('form');
  const activate = vi.fn();
  const submit = vi.fn((event: SubmitEvent) => {
    event.preventDefault();
  });
  card.before(form);
  form.append(card);
  form.addEventListener('submit', submit);
  form.addEventListener('ki-activate', activate);
  await userEvent.click(page.getByRole('button', { name: title }));
  expect(activate).toHaveBeenCalledTimes(1);
  expect(submit).not.toHaveBeenCalled();
});

it.each([
  ['onmars', 'light'],
  ['onmars', 'dark'],
  ['material3', 'light'],
  ['material3', 'dark'],
])('S8 uses the card variant tokens in %s %s', async (theme, scheme) => {
  document.documentElement.setAttribute('data-ki-theme', theme);
  document.documentElement.setAttribute('data-ki-color-scheme', scheme);
  const card = await mount();
  const probe = document.createElement('div');
  surface(card).after(probe);
  const compare = async (variant: string, background: string, shadow: string): Promise<void> => {
    card.setAttribute('variant', variant);
    probe.style.backgroundColor = `var(--ki-card-${background})`;
    probe.style.boxShadow = `var(--ki-${shadow})`;
    const appearance = getComputedStyle(probe);
    await expect
      .poll(() => getComputedStyle(surface(card)).backgroundColor === appearance.backgroundColor)
      .toBe(true);
    await expect
      .poll(() => getComputedStyle(surface(card)).boxShadow === appearance.boxShadow)
      .toBe(true);
    if (variant === 'outlined') {
      expect(parseFloat(getComputedStyle(surface(card)).borderInlineStartWidth)).toBeGreaterThan(0);
    } else if (variant !== 'default') {
      expect(getComputedStyle(surface(card)).borderInlineStartWidth).toBe('0px');
    }
  };
  await compare('default', 'bg', 'card-elevation');
  await compare('elevated', 'elevated-bg', 'card-elevated-shadow');
  await compare('filled', 'filled-bg', 'elevation-none');
  await compare('outlined', 'outlined-bg', 'elevation-none');
});

it('S9 retains the border and full-card keyboard outline in forced colours', async ({ skip }) => {
  await browserCommands.emulateForcedColors('active');
  try {
    if (
      !matchMedia('(forced-colors: active)').matches &&
      !navigator.userAgent.includes('Chrome/')
    ) {
      skip('This engine does not emulate forced colours');
    }
    expect(matchMedia('(forced-colors: active)').matches).toBe(true);
    const card = await mount(link, { before: beforeButton, after: afterButton });
    focusBefore();
    await tabToTitle(card, 'link');
    const styles = getComputedStyle(surface(card));
    expect(styles.borderInlineStartStyle).toBe('solid');
    expect(parseFloat(styles.borderInlineStartWidth)).toBeGreaterThan(0);
    expect(styles.outlineStyle).toBe('solid');
    expect(parseFloat(styles.outlineWidth)).toBeGreaterThan(0);
    const witness = document.createElement('span');
    witness.style.color = 'Highlight';
    document.body.append(witness);
    expect(styles.outlineColor).toBe(getComputedStyle(witness).color);
  } finally {
    await browserCommands.emulateForcedColors(null);
  }
});

it('S10 shows clickable hover feedback without motion', async () => {
  const card = await mount('variant="outlined" interactive');
  const styles = getComputedStyle(surface(card));
  const restingShadow = styles.boxShadow;
  const restingOverlay = getComputedStyle(surface(card), '::before').backgroundColor;
  expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
  expect(getComputedStyle(card).animationName).toBe('none');
  expect(styles.transitionDuration).toBe('0s');
  await userEvent.hover(page.getByText(copy, { exact: true }));
  expect(styles.boxShadow).not.toBe(restingShadow);
  expect(getComputedStyle(surface(card), '::before').backgroundColor).not.toBe(restingOverlay);
});

it('S11 keeps the title and body direction and activates in RTL', async () => {
  const arabic = 'إعادة بناء الفهرس';
  const card = await mount('dir="rtl" interactive', { heading: arabic });
  const activate = vi.fn();
  card.addEventListener('ki-activate', activate);
  const paragraph = card.querySelector('p');
  if (!paragraph) throw new Error('Card paragraph did not render');
  paragraph.textContent = 'تبدأ العملية عند منتصف الليل';
  expect(getComputedStyle(page.getByRole('button', { name: arabic }).element()).direction).toBe(
    'rtl',
  );
  expect(getComputedStyle(paragraph).direction).toBe('rtl');
  await userEvent.click(paragraph);
  expect(activate).toHaveBeenCalledTimes(1);
});

it('S13 chooses href over interactive', async () => {
  const card = await mount(`${link} interactive`);
  const activate = vi.fn();
  card.addEventListener('ki-activate', activate);
  await userEvent.click(page.getByRole('link', { name: title }));
  await expect.poll(() => location.hash).toBe('#incident-42');
  expect(activate).not.toHaveBeenCalled();
});

it('S14 leaves a titleless action card out of the tab order', async () => {
  await mount('interactive', {
    heading: '',
    before: beforeButton,
    after: afterButton,
  });
  focusBefore();
  await userEvent.tab();
  await expect.element(page.getByRole('button', { name: 'After' })).toHaveFocus();
});

it('S15 emits once per surface click and updates an edited heading', async () => {
  const card = await mount('interactive');
  const activate = vi.fn();
  card.addEventListener('ki-activate', activate);
  const heading = card.querySelector('[slot="header"]');
  if (!heading) throw new Error('Card heading did not render');
  heading.textContent = 'Index rebuilt';
  await expect.element(page.getByRole('button', { name: 'Index rebuilt' })).toBeVisible();
  await userEvent.click(page.getByText(copy, { exact: true }));
  expect(activate).toHaveBeenCalledTimes(1);
});
