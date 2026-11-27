// @spec:127-ki-code-block
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { whileKeyHeld } from '../../../browser-tests/keyboard';
import { defineCustomElement } from '../../../dist/components/ki-code-block.js';

const styles = document.createElement('style');
const fixture = document.createElement('main');
const writeText = vi.fn<(value: string) => Promise<void>>();
const source = "const size = read(3);\n // source\nreturn 'ready';\n";
const longSource = 'const sample = ' + 'alphabet'.repeat(20);

const browser = commands as unknown as {
  ariaSnapshot: (selector: string) => Promise<string>;
  emulateForcedColors: (value: 'active' | null) => Promise<void>;
  emulateReducedMotion: (value: 'reduce' | null) => Promise<void>;
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
  fixture.removeAttribute('dir');
  fixture.replaceChildren();
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

async function mount(attributes = '', text = source): Promise<HTMLElement> {
  const template = document.createElement('template');
  template.innerHTML = `<ki-code-block ${attributes}></ki-code-block>`;
  const host = template.content.firstElementChild;
  if (!(host instanceof HTMLElement)) throw new Error('Missing CodeBlock');
  host.style.inlineSize = '280px';
  host.textContent = text;
  fixture.append(host);
  await expect
    .poll(() => host.shadowRoot?.querySelector('.line-text')?.textContent)
    .toBe(text.split(/\r\n|\n|\r/u)[0]);
  return host;
}

function highlighted(host: HTMLElement): HTMLElement[] {
  return [...part(host, 'code').querySelectorAll<HTMLElement>('[data-highlighted]')];
}

it('S1 displays language, filename, syntax colors, one-based numbers and line ranges', async () => {
  const host = await mount('language="ts" filename="main.ts" line-numbers highlight="1,3-4"');
  const header = part(host, 'header');
  expect(header.textContent).toContain('ts · main.ts');
  const code = part(host, 'code');
  const syntax = ['keyword', 'number', 'function', 'comment', 'string'];
  for (const kind of syntax) {
    const ink = code.querySelector<HTMLElement>(`.syntax-${kind}`);
    if (!ink) throw new Error(`Missing ${kind} syntax`);
    const token = `--ki-code-${kind}`;
    expect(getComputedStyle(host).getPropertyValue(token).trim()).not.toBe('');
    const swatch = document.createElement('span');
    swatch.style.color = `var(${token})`;
    ink.after(swatch);
    expect(getComputedStyle(ink).color).toBe(getComputedStyle(swatch).color);
    swatch.remove();
  }
  expect([...code.querySelectorAll('.line-number')].map((line) => line.textContent)).toEqual([
    '1',
    '2',
    '3',
    '4',
  ]);
  expect(highlighted(host).map((line) => line.querySelector('.line-number')?.textContent)).toEqual([
    '1',
    '3',
    '4',
  ]);
});

it.each([false, true])(
  'S1 keeps the code column aligned across line numbers (wrap=%s)',
  async (wrap) => {
    const text = Array.from({ length: 12 }, (_unused, index) =>
      index === 9 ? longSource : 'value',
    );
    const host = await mount(
      `line-numbers highlight="10" copyable="false" ${wrap ? 'wrap' : ''}`,
      text.join('\n'),
    );
    const lines = [...part(host, 'code').querySelectorAll('.line-text')];
    expect(lines).toHaveLength(12);

    const first = lines[0]?.getBoundingClientRect().left;
    expect(first).toBeDefined();
    for (const line of lines) {
      expect(line.getBoundingClientRect().left).toBeCloseTo(first ?? 0, 0);
    }
  },
);

it('S2 renders unsupported languages and HTML-like input as literal text', async () => {
  const literal = '  <b data-test>literal</b>\n  text';
  const host = await mount('language="txt"', literal);
  const code = part(host, 'code');
  expect(code.textContent).toBe(literal);
  expect(code.querySelector('b, [class^="syntax-"]')).toBeNull();
  expect(part(host, 'header').textContent).toContain('txt');
});

function observeCopyAtAncestor(type: 'ki-copy' | 'ki-copy-error') {
  const captured: (EventTarget | undefined)[] = [];
  const bubbled: (EventTarget | undefined)[] = [];
  const capture = (event: Event): void => {
    captured.push(event.composedPath()[0]);
  };
  const bubble = (event: Event): void => {
    bubbled.push(event.composedPath()[0]);
  };
  fixture.addEventListener(type, capture, true);
  fixture.addEventListener(type, bubble);
  return {
    captured,
    bubbled,
    stop() {
      fixture.removeEventListener(type, capture, true);
      fixture.removeEventListener(type, bubble);
    },
  };
}

it('S3 copies updated source with original whitespace and emits success once', async () => {
  const host = await mount('language="ts" line-numbers highlight="1" copied-label="Code copied"');
  const copied = vi.fn();
  host.addEventListener('ki-copy', copied);
  const updated = "\tconst content = '<tag>';  \r\n\r\n";
  const text = host.firstChild;
  if (!(text instanceof Text)) throw new Error('Missing original text node');
  text.data = updated;
  await expect
    .poll(() => part(host, 'code').querySelector('.line-text')?.textContent)
    .toBe("\tconst content = '<tag>';  ");

  const outside = observeCopyAtAncestor('ki-copy');
  try {
    await page.getByRole('button', { name: 'Copy code' }).click();

    await expect.poll(() => writeText.mock.calls).toEqual([[updated]]);
    await expect
      .poll(() => copied.mock.calls)
      .toEqual([
        [
          expect.objectContaining({
            detail: { value: updated },
            target: host,
          }),
        ],
      ]);
    expect(outside.captured).toEqual([host]);
    expect(outside.bubbled).toEqual([host]);
  } finally {
    outside.stop();
  }
  await expect.element(page.getByRole('status')).toHaveTextContent('Code copied');
});

it('S3 reports clipboard failure once with a localized announcement', async () => {
  const host = await mount('copy-error-label="Clipboard unavailable"');
  const failed = vi.fn();
  const copied = vi.fn();
  host.addEventListener('ki-copy-error', failed);
  host.addEventListener('ki-copy', copied);
  writeText.mockRejectedValueOnce(new Error('Clipboard denied'));

  const outside = observeCopyAtAncestor('ki-copy-error');
  try {
    await page.getByRole('button', { name: 'Copy code' }).click();

    await expect
      .poll(() => failed.mock.calls)
      .toEqual([[expect.objectContaining({ detail: null, target: host })]]);
    expect(outside.captured).toEqual([host]);
    expect(outside.bubbled).toEqual([host]);
    expect(copied).not.toHaveBeenCalled();
  } finally {
    outside.stop();
  }
  await expect.element(page.getByRole('status')).toHaveTextContent('Clipboard unavailable');
});

it('S4 wraps an unbroken line with numbers and omits the copy control', async () => {
  const host = await mount('wrap copyable="false" line-numbers', longSource);
  const scroll = part(host, 'scroll');
  const line = part(host, 'code').querySelector('.line-text');
  if (!(line instanceof HTMLElement)) throw new Error('Missing line');
  await expect.poll(() => scroll.scrollWidth <= scroll.clientWidth + 1).toBe(true);
  expect(line.getBoundingClientRect().height).toBeGreaterThan(
    Number.parseFloat(getComputedStyle(line).lineHeight),
  );
  expect(host.shadowRoot?.querySelector('ki-copy-button')).toBeNull();
});

it('S5 tabs to the scroll area with visible focus and scrolls using ArrowRight', async () => {
  const before = fixture.appendChild(document.createElement('button'));
  before.textContent = 'Before code';
  before.tabIndex = 0;
  const host = await mount('copyable="false"', longSource);
  const scroll = part(host, 'scroll');
  await expect.poll(() => scroll.scrollWidth > scroll.clientWidth).toBe(true);

  before.focus();
  await userEvent.tab();
  expect(host.shadowRoot?.activeElement).toBe(scroll);
  expect(getComputedStyle(scroll).outlineStyle).toBe('solid');
  // Held, not tapped: in macOS WebKit a tap scrolls no focused scroller,
  // a plain overflow:auto div in this harness included (whileKeyHeld).
  await whileKeyHeld('ArrowRight', () => expect.poll(() => scroll.scrollLeft).toBeGreaterThan(0));
});

it('S6 activates Copy code once with Enter and keeps native focus', async () => {
  const host = await mount('copy-label="Copy sample"');
  const locator = page.getByRole('button', { name: 'Copy sample' });
  await expect.element(locator).toBeVisible();
  const copy = host.shadowRoot?.querySelector('ki-copy-button');
  const button = copy?.shadowRoot?.querySelector('button');
  if (!copy || !button) throw new Error('Missing native copy button');

  button.focus();
  await userEvent.keyboard('{Enter}');

  await expect.poll(() => writeText.mock.calls).toEqual([[source]]);
  expect(host.shadowRoot?.activeElement).toBe(copy);
  expect(copy.shadowRoot?.activeElement).toBe(button);
});

it('S7 names the figure and region, describes highlights and hides line numbers from AT', async () => {
  const host = await mount(
    'language="ts" filename="main.ts" line-numbers highlight="2"',
    'alpha\nbeta',
  );
  const figure = part(host, 'figure');
  const scroll = part(host, 'scroll');
  expect(figure.getAttribute('aria-label')).toBe('ts · main.ts');
  expect(scroll.getAttribute('aria-label')).toBe('ts · main.ts');
  const tree = await browser.ariaSnapshot('main');
  expect(tree).toContain('figure "ts · main.ts"');
  expect(tree).toContain('region "ts · main.ts"');
  expect(tree).toContain('alpha');
  expect(tree).toContain('beta');
  expect(tree).not.toMatch(/(?:text|generic): "?[12]"?\s*$/mu);
  await expect
    .element(page.getByRole('region', { name: 'ts · main.ts' }))
    .toHaveAccessibleDescription('Highlighted lines: 2');
  expect(part(host, 'code').querySelectorAll('.line-number[aria-hidden="true"]')).toHaveLength(2);
  expect(figure.contains(scroll)).toBe(true);
  await expectAccessible(fixture);
});

it('S8 consumes overridden syntax ink and highlight fill tokens', async () => {
  const host = await mount('language="ts" highlight="1"');
  host.style.setProperty('--ki-code-keyword', 'rgb(8, 89, 95)');
  host.style.setProperty('--ki-code-highlight-bg', 'rgb(230, 240, 247)');
  const ink = part(host, 'code').querySelector('.syntax-keyword');
  const [line] = highlighted(host);
  if (!ink || !line) throw new Error('Missing highlight or syntax ink');
  expect(getComputedStyle(ink).color).toBe('rgb(8, 89, 95)');
  expect(getComputedStyle(line).backgroundColor).toBe('rgb(230, 240, 247)');
});

it('S9 preserves a highlight marker and focus in forced colors and reduced motion', async () => {
  const before = fixture.appendChild(document.createElement('button'));
  before.textContent = 'Before code';
  before.tabIndex = 0;
  const host = await mount('highlight="2" line-numbers copyable="false"');
  try {
    await browser.emulateForcedColors('active');
    await browser.emulateReducedMotion('reduce');
    expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    const supportsForcedColors = /Chrome\/|Firefox\//u.test(navigator.userAgent);
    if (supportsForcedColors) expect(matchMedia('(forced-colors: active)').matches).toBe(true);
    const scroll = part(host, 'scroll');
    const [line] = highlighted(host);
    if (!line) throw new Error('Missing selected line');
    before.focus();
    await userEvent.tab();
    const marker = getComputedStyle(line);
    expect(marker.borderInlineStartStyle).toBe('solid');
    expect(Number.parseFloat(marker.borderInlineStartWidth)).toBeGreaterThan(0);
    expect(getComputedStyle(scroll).outlineStyle).toBe('solid');
    if (supportsForcedColors)
      expect(marker.borderInlineStartColor).not.toBe(marker.backgroundColor);
    expect(host.getAnimations({ subtree: true })).toEqual([]);
  } finally {
    await browser.emulateForcedColors(null);
    await browser.emulateReducedMotion(null);
  }
});

it('S10 keeps the RTL header and left-to-right code with a left-side gutter', async () => {
  fixture.dir = 'rtl';
  const host = await mount('language="ts" filename="main.ts" line-numbers');
  const header = part(host, 'header');
  const code = part(host, 'code');
  const number = code.querySelector('.line-number');
  const line = code.querySelector('.line-text');
  if (!number || !line) throw new Error('Missing numbered line');
  expect(getComputedStyle(header).direction).toBe('rtl');
  expect(getComputedStyle(code).direction).toBe('ltr');
  const numberText = document.createRange();
  numberText.selectNodeContents(number);
  expect(numberText.getBoundingClientRect().right).toBeLessThan(line.getBoundingClientRect().left);
});

const englishGherkin = [
  '@checkout @smoke',
  'Feature: Pay the cart',
  '  Shoppers pay When And Then they leave.',
  '  # Totals include tax',
  '  Background:',
  '    Given a signed-in shopper',
  '  Rule: Totals are exact',
  '    Scenario Outline: Pay <count> items',
  '      Given a cart with <count> items named "deluxe"',
  '      When the shopper pays',
  '      Then the receipt reads',
  '        """',
  '        Given and When stay text here',
  '        """',
  '      And the order is placed',
  '      But no email is sent',
  '      * the cart is empty',
  '      Examples:',
  '        | count |',
  '        | 3     |',
].join('\n');

const spanishGherkin = [
  '# language: es',
  'Característica: Pagar el carrito',
  '  Antecedentes:',
  '    Dado un cliente con sesión',
  '  Esquema del escenario: Pagar <n> productos',
  '    Dados <n> productos y un cupón',
  '    Cuando el cliente paga e imprime Y sale',
  '    Entonces el recibo muestra el total',
  '    Y el pedido queda registrado',
  '    E incluye IVA',
  '    Pero no se envía correo',
  '    Ejemplos:',
  '      | n |',
  '      | 2 |',
].join('\n');

function syntax(host: HTMLElement, kind: string): string[] {
  const code = part(host, 'code');
  return [...code.querySelectorAll(`.syntax-${kind}`)].map((token) => token.textContent);
}

function lineSyntax(host: HTMLElement, index: number, kind: string): string[] {
  const line = part(host, 'code').querySelectorAll('.line-text')[index];
  if (!line) throw new Error(`Missing line ${String(index + 1)}`);
  return [...line.querySelectorAll(`.syntax-${kind}`)].map((token) => token.textContent);
}

it('S13 colors English Gherkin keywords that open a line and the other Gherkin syntax', async () => {
  const host = await mount('language="gherkin" filename="checkout.feature"', englishGherkin);
  expect(syntax(host, 'keyword').filter((text) => text !== '|')).toEqual([
    'Feature:',
    'Background:',
    'Given',
    'Rule:',
    'Scenario Outline:',
    'Given',
    'When',
    'Then',
    'And',
    'But',
    '*',
    'Examples:',
  ]);
  expect(lineSyntax(host, 2, 'keyword')).toEqual([]);
  expect(syntax(host, 'function')).toEqual(['@checkout @smoke']);
  expect(syntax(host, 'comment')).toEqual(['# Totals include tax']);
  expect(syntax(host, 'number')).toEqual(['<count>', '<count>']);
  expect(syntax(host, 'string')).toEqual([
    '"deluxe"',
    '"""',
    '        Given and When stay text here',
    '        """',
    ' count ',
    ' 3     ',
  ]);
  expect(lineSyntax(host, 18, 'keyword')).toEqual(['|', '|']);

  const code = part(host, 'code');
  const plain = getComputedStyle(code).color;
  for (const kind of ['keyword', 'function', 'comment', 'number', 'string']) {
    const ink = code.querySelector<HTMLElement>(`.syntax-${kind}`);
    if (!ink) throw new Error(`Missing ${kind} syntax`);
    const swatch = document.createElement('span');
    swatch.style.color = `var(--ki-code-${kind})`;
    ink.after(swatch);
    expect(getComputedStyle(ink).color).toBe(getComputedStyle(swatch).color);
    expect(getComputedStyle(ink).color).not.toBe(plain);
    swatch.remove();
  }
});

it('S14 colors Spanish Gherkin keywords and keeps the same words plain inside a sentence', async () => {
  const host = await mount('language="feature"', spanishGherkin);
  expect(syntax(host, 'comment')).toEqual(['# language: es']);
  expect(syntax(host, 'keyword').filter((text) => text !== '|')).toEqual([
    'Característica:',
    'Antecedentes:',
    'Dado',
    'Esquema del escenario:',
    'Dados',
    'Cuando',
    'Entonces',
    'Y',
    'E',
    'Pero',
    'Ejemplos:',
  ]);
  expect(lineSyntax(host, 5, 'keyword')).toEqual(['Dados']);
  expect(lineSyntax(host, 6, 'keyword')).toEqual(['Cuando']);
  const sentence = part(host, 'code').querySelectorAll('.line-text')[6];
  expect(sentence?.textContent).toBe('    Cuando el cliente paga e imprime Y sale');
  expect(syntax(host, 'number')).toEqual(['<n>', '<n>']);
});

it('S15 exposes the unchanged Gherkin source to assistive technology', async () => {
  // Wrapping keeps every line in view, so axe can measure the contrast of each ink.
  const host = await mount('language="gherkin" filename="checkout.feature" wrap', englishGherkin);
  expect(part(host, 'code').textContent).toBe(englishGherkin);
  expect(host.textContent).toBe(englishGherkin);
  const tree = await browser.ariaSnapshot('main');
  expect(tree).toContain('region "gherkin · checkout.feature"');
  for (const line of ['@checkout @smoke', 'Scenario Outline: Pay <count> items', '| count |']) {
    expect(tree).toContain(line);
  }
  await expectAccessible(fixture);
});

it('S16 restyles Gherkin keywords through the keyword ink token', async () => {
  const host = await mount(
    'language="gherkin"',
    `${englishGherkin}\n  Escenario: Pagar\n    Dado un carrito`,
  );
  host.style.setProperty('--ki-code-keyword', 'rgb(8, 89, 95)');
  const keywords = [...part(host, 'code').querySelectorAll('.syntax-keyword')];
  expect(keywords.map((keyword) => keyword.textContent)).toEqual(
    expect.arrayContaining(['Feature:', 'Given', 'Escenario:', 'Dado', '|']),
  );
  for (const keyword of keywords) {
    expect(getComputedStyle(keyword).color).toBe('rgb(8, 89, 95)');
  }
});

it('S17 hides the header and preserves the selected syntax grammar', async () => {
  const host = await mount('language="ts" filename="main.ts" header-hidden copyable="false"');
  expect(host.shadowRoot?.querySelector('[part="header"]')).toBeNull();
  expect(part(host, 'code').querySelector('.syntax-keyword')?.textContent).toBe('const');
  await expect.element(page.getByRole('button', { name: 'Copy code' })).not.toBeInTheDocument();
});

it.each([
  { attrs: 'language="ts" filename="main.ts"', name: 'ts · main.ts' },
  { attrs: 'language="ts"', name: 'ts' },
  { attrs: 'filename="main.ts"', name: 'main.ts' },
  { attrs: 'label="Example source"', name: 'Example source' },
])(
  'S18 keeps the figure named "$name" and copying reachable with the header hidden',
  async ({ attrs, name }) => {
    const start = document.createElement('button');
    start.textContent = 'Before the code';
    fixture.append(start);
    const host = await mount(`${attrs} header-hidden`);
    expect(host.shadowRoot?.querySelector('[part="header"]')).toBeNull();
    await expect.element(page.getByRole('figure', { name, exact: true })).toBeVisible();
    await expect.element(page.getByRole('region', { name, exact: true })).toBeVisible();
    const copy = page.getByRole('button', { name: 'Copy code' });
    await expect.element(copy).toBeVisible();

    start.focus();
    await userEvent.tab();
    expect(copy.element().matches(':focus-visible')).toBe(true);
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => writeText.mock.calls).toEqual([[source]]);
  },
);

it('S19 changes Gherkin keyword weight and keeps the default inherited weight', async () => {
  await browser.emulateReducedMotion('reduce');
  try {
    const host = await mount('language="gherkin"', 'Given a cart');
    host.style.fontWeight = '700';
    const keyword = part(host, 'code').querySelector('.syntax-keyword');
    if (!keyword) throw new Error('Missing Gherkin keyword');
    expect(getComputedStyle(keyword).fontWeight).toBe('700');

    host.style.setProperty('--ki-code-keyword-weight', '500');
    expect(getComputedStyle(keyword).fontWeight).toBe('500');
    expect(getComputedStyle(part(host, 'code')).fontWeight).toBe('700');
  } finally {
    await browser.emulateReducedMotion(null);
  }
});
