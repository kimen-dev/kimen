// @spec:086-ki-copy-button
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-copy-button.js';

const styles = document.createElement('style');
const fixture = document.createElement('main');
const writeText = vi.fn<(value: string) => Promise<void>>();
const link = 'https://kimen.dev/i/4f9a';

const browser = commands as unknown as {
  ariaSnapshot: (selector: string) => Promise<string>;
  emulateForcedColors: (value: 'active' | null) => Promise<void>;
  emulateReducedMotion: (value: 'reduce' | null) => Promise<void>;
  fastForwardClock: (milliseconds: number) => Promise<void>;
  installClock: () => Promise<void>;
  pauseClock: () => Promise<void>;
  resumeClock: () => Promise<void>;
};

let clipboardDescriptor: PropertyDescriptor | undefined;

beforeAll(() => {
  defineCustomElement();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

beforeEach(() => {
  writeText.mockReset().mockResolvedValue(undefined);
  clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
});

afterEach(async () => {
  if (clipboardDescriptor) {
    Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
  } else {
    Reflect.deleteProperty(navigator, 'clipboard');
  }
  fixture.replaceChildren();
  fixture.removeAttribute('dir');
  document.documentElement.style.removeProperty('--ki-text-success-high-em');
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

function part(host: HTMLElement, name: string): HTMLElement {
  const element = host.shadowRoot?.querySelector<HTMLElement>(`[part~="${name}"]`);
  if (!element) throw new Error(`Missing ${name} part`);
  return element;
}

function status(host: HTMLElement): HTMLElement {
  const element = host.shadowRoot?.querySelector<HTMLElement>('[role="status"]');
  if (!element) throw new Error('Missing copy status');
  return element;
}

async function mount(html: string, root: HTMLElement | ShadowRoot = fixture): Promise<HTMLElement> {
  root.innerHTML = html;
  const host = root.querySelector('ki-copy-button');
  if (!(host instanceof HTMLElement)) throw new Error('Missing copy button');
  await expect
    .poll(() => host.shadowRoot?.querySelector('button'))
    .toBeInstanceOf(HTMLButtonElement);
  return host;
}

function outcome(host: HTMLElement): string | undefined {
  return part(host, 'icon').querySelector('ki-icon')?.name;
}

it('S1 copies the exact explicit value and emits a composed ki-copy event', async () => {
  const host = await mount(`<ki-copy-button value="${link}"></ki-copy-button>`);
  const success = vi.fn<(event: Event) => void>();
  const failure = vi.fn();
  fixture.addEventListener('ki-copy', success, { once: true });
  host.addEventListener('ki-copy-error', failure);
  await page.getByRole('button', { name: 'Copy' }).click();

  await expect.poll(() => writeText.mock.calls).toEqual([[link]]);
  await expect
    .poll(() => success.mock.calls[0]?.[0])
    .toMatchObject({
      bubbles: true,
      composed: true,
      detail: { value: link },
    });
  expect(failure).not.toHaveBeenCalled();
});

it('S2 reads the current field value from the same shadow root', async () => {
  const shadow = fixture.appendChild(document.createElement('div')).attachShadow({ mode: 'open' });
  const host = await mount(
    '<label>Invite token<input id="token" value="old"></label>' +
      '<ki-copy-button from="token" value="fallback">Copy token</ki-copy-button>',
    shadow,
  );
  const input = shadow.querySelector('input');
  if (!input) throw new Error('Missing field');
  input.value = 'fresh-token';

  await page.getByRole('button', { name: 'Copy token' }).click();

  expect(writeText.mock.calls).toEqual([['fresh-token']]);
  expect(host.getAttribute('value')).toBe('fallback');
});

it('S3 preserves code whitespace and accepts IDs with CSS selector punctuation', async () => {
  await mount(
    '<pre id="snippet.v1">  line 1\nline 2\n</pre>' +
      '<ki-copy-button from="snippet.v1"></ki-copy-button>',
  );

  await page.getByRole('button', { name: 'Copy' }).click();

  expect(writeText.mock.calls).toEqual([['  line 1\nline 2\n']]);
});

it.each([
  ['denied permission', '<ki-copy-button value="token"></ki-copy-button>'],
  ['missing source', '<ki-copy-button from="unknown" value="fallback"></ki-copy-button>'],
  ['unavailable clipboard', '<ki-copy-button value="token"></ki-copy-button>'],
])('S4 reports %s once through the polite status and the error event', async (kind, markup) => {
  writeText.mockRejectedValueOnce(new DOMException('Denied', 'NotAllowedError'));
  if (kind === 'unavailable clipboard') {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
  }
  const host = await mount(markup);
  const failure = vi.fn();
  const success = vi.fn<(event: Event) => void>();
  host.addEventListener('ki-copy-error', failure);
  host.addEventListener('ki-copy', success);
  const region = status(host);
  expect(region.textContent).toBe('');

  await page.getByRole('button', { name: 'Copy' }).click();

  await expect.poll(() => region.textContent).toBe("Couldn't copy");
  expect(region.getAttribute('aria-live')).toBe('polite');
  expect(failure).toHaveBeenCalledTimes(1);
  expect(success).not.toHaveBeenCalled();
  expect(writeText).toHaveBeenCalledTimes(kind === 'denied permission' ? 1 : 0);
  expect(outcome(host)).toBe('circle-alert');
});

it.each(['{Enter}', ' '])(
  'S5 copies once with the keyboard (%j) and retains visible focus',
  async (key) => {
    const host = await mount(
      '<button type="button" tabindex="0">Before</button>' +
        '<ki-copy-button value="token">Copy token</ki-copy-button>',
    );
    fixture.querySelector('button')?.focus();
    await userEvent.keyboard('{Tab}');
    const button = part(host, 'button');
    expect(host.shadowRoot?.activeElement).toBe(button);
    expect(button.matches(':focus-visible')).toBe(true);
    expect(getComputedStyle(button).outlineStyle).toBe('solid');

    await userEvent.keyboard(key);

    await expect.poll(() => writeText.mock.calls).toEqual([['token']]);
    expect(host.shadowRoot?.activeElement).toBe(button);
  },
);

it.each([
  [
    'icon-only',
    '<ki-copy-button value="token" label="Copy token" feedback-duration="0"></ki-copy-button>',
  ],
  [
    'labelled',
    '<ki-copy-button value="token" label="Ignored" feedback-duration="0">Copy token</ki-copy-button>',
  ],
])(
  'S6 announces success in the %s presentation with a stable name and size',
  async (_mode, markup) => {
    const host = await mount(markup);
    const button = part(host, 'button');
    const icon = part(host, 'icon');
    const measure = (element: HTMLElement) => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return [x, y, width, height];
    };
    const before = [button, icon].flatMap(measure);
    const region = status(host);
    expect(region.textContent).toBe('');
    expect(outcome(host)).toBe('copy');
    expect(await browser.ariaSnapshot('main')).toContain('button "Copy token"');

    await page.getByRole('button', { name: 'Copy token' }).click();

    await expect.poll(() => region.textContent).toBe('Copied');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(outcome(host)).toBe('check');
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    const tree = await browser.ariaSnapshot('main');
    expect(tree).toContain('button "Copy token"');
    await expect.element(page.getByRole('status')).toHaveTextContent('Copied');
    await expect
      .poll(() =>
        [button, icon]
          .flatMap(measure)
          .every((actual, index) => Math.abs(actual - (before[index] ?? Infinity)) < 0.5),
      )
      .toBe(true);
    await expectAccessible(fixture);
  },
);

it('S6 follows updated slot text and returns to the icon-only label when removed', async () => {
  const host = await mount(
    '<ki-copy-button value="token" label="Copy token"><span>Copy link</span></ki-copy-button>',
  );
  await expect.element(page.getByRole('button', { name: 'Copy link' })).toBeVisible();
  const span = host.querySelector('span');
  const text = span?.firstChild;
  if (!(text instanceof Text)) throw new Error('Missing slot text');
  text.data = ' ';
  await expect.element(page.getByRole('button', { name: 'Copy token' })).toBeVisible();
  text.data = 'Copy ID';
  await expect.element(page.getByRole('button', { name: 'Copy ID' })).toBeVisible();
});

it('S7 restores the copy glyph and clears the same live region after 1500 ms', async () => {
  const host = await mount('<ki-copy-button value="token"></ki-copy-button>');
  const region = status(host);
  try {
    await browser.installClock();
  } catch {
    // Earlier specs can already have installed the same page clock.
  }
  await browser.pauseClock();
  try {
    part(host, 'button').click();
    await browser.fastForwardClock(60);
    expect(outcome(host)).toBe('check');
    expect(region.textContent).toBe('Copied');
    await browser.fastForwardClock(1400);
    expect(outcome(host)).toBe('check');
    await browser.fastForwardClock(100);
    await browser.fastForwardClock(60);
    expect(outcome(host)).toBe('copy');
    expect(region.textContent).toBe('');
  } finally {
    await browser.resumeClock();
  }
});

it('S8 does not submit, reset or contribute form data', async () => {
  const host = await mount(
    '<form><label>Invitation<input id="invite" name="invite" value="original"></label>' +
      '<ki-copy-button name="copy" from="invite">Copy invitation</ki-copy-button></form>',
  );
  const form = host.closest('form');
  const field = form?.querySelector('input');
  if (!form || !field) throw new Error('Missing form');
  field.value = 'draft';
  const submit = vi.fn((event: Event) => {
    event.preventDefault();
  });
  const reset = vi.fn();
  form.addEventListener('submit', submit);
  form.addEventListener('reset', reset);

  await page.getByRole('button', { name: 'Copy invitation' }).click();

  expect(writeText.mock.calls).toEqual([['draft']]);
  expect(submit).not.toHaveBeenCalled();
  expect(reset).not.toHaveBeenCalled();
  expect([...new FormData(form)]).toEqual([['invite', 'draft']]);
});

it('S9 follows the overridden success ink in the RTL layout', async () => {
  fixture.dir = 'rtl';
  const host = await mount(
    '<ki-copy-button value="token" feedback-duration="0">Copy token</ki-copy-button>',
  );
  document.documentElement.style.setProperty('--ki-text-success-high-em', 'rgb(13, 85, 47)');
  const button = part(host, 'button');
  const icon = part(host, 'icon');
  expect(getComputedStyle(button).direction).toBe('rtl');
  expect(icon.getBoundingClientRect().left).toBeGreaterThan(
    (button.getBoundingClientRect().left + button.getBoundingClientRect().right) / 2,
  );

  await page.getByRole('button', { name: 'Copy token' }).click();

  await expect.poll(() => getComputedStyle(icon).color).toBe('rgb(13, 85, 47)');
});

it('S6 keeps the check visible in forced colours without reduced-motion animations', async () => {
  const host = await mount('<ki-copy-button value="token" variant="primary"></ki-copy-button>');
  try {
    await browser.emulateForcedColors('active');
    await browser.emulateReducedMotion('reduce');
    expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    const supportsForcedColors = /Chrome\/|Firefox\//u.test(navigator.userAgent);
    if (supportsForcedColors) expect(matchMedia('(forced-colors: active)').matches).toBe(true);

    await page.getByRole('button', { name: 'Copy' }).click();

    const icon = part(host, 'icon');
    await expect.poll(() => outcome(host)).toBe('check');
    const glyph = () => icon.querySelector('ki-icon')?.shadowRoot?.querySelector('svg');
    await expect.poll(() => glyph()?.getBoundingClientRect().width ?? 0).toBeGreaterThan(0);
    const svg = glyph();
    if (supportsForcedColors && svg) {
      expect(getComputedStyle(svg).stroke).not.toBe(getComputedStyle(icon).backgroundColor);
    }
    expect(host.getAnimations({ subtree: true })).toEqual([]);
  } finally {
    await browser.emulateForcedColors(null);
    await browser.emulateReducedMotion(null);
  }
});
