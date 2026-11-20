// @spec:130-ki-markdown
import tokensCss from '@kimen/tokens/css?raw';
import pageCss from '@kimen/tokens/css/base?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page, server, userEvent } from 'vitest/browser';

import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-markdown.js';

const styles = document.createElement('style');
const fixture = document.createElement('main');
const browser = commands as unknown as {
  ariaSnapshot: (selector: string) => Promise<string>;
  emulateForcedColors: (value: 'active' | null) => Promise<void>;
  emulateReducedMotion: (value: 'reduce' | null) => Promise<void>;
};
const imageUrl = new URL('../ki-image/fixtures/hills.svg?no-inline', import.meta.url).href;

beforeAll(() => {
  defineCustomElement();
  styles.textContent = `${tokensCss}\n${pageCss}`;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.removeAttribute('dir');
  fixture.replaceChildren();
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

function mount(source: string, streaming = false) {
  const host = document.createElement('ki-markdown');
  const text = document.createTextNode(source);
  host.append(text);
  host.toggleAttribute('streaming', streaming);
  fixture.append(host);
  return { host, text };
}

function required<T extends Element>(element: T | null | undefined, name: string): T {
  if (!element) throw new Error(`Missing ${name}`);
  return element;
}

function keyboardStart(): HTMLInputElement {
  const input = document.createElement('input');
  input.setAttribute('aria-label', 'Before answer');
  fixture.prepend(input);
  return input;
}

function makeTabbableInMacWebKit(control: HTMLElement): void {
  if (server.browser === 'webkit' && server.platform === 'darwin') control.tabIndex = 0;
}

function expectVisibleFocus(control: HTMLElement): void {
  expect(control.matches(':focus-visible')).toBe(true);
  const paint = getComputedStyle(control);
  expect(paint.outlineStyle).toBe('solid');
  expect(Number.parseFloat(paint.outlineWidth)).toBeGreaterThan(0);
}

it('S1 reads direct text and gives src-text precedence, including an empty source', async () => {
  const { host, text } = mount('# Workspace');
  const workspace = page.getByRole('heading', { level: 3, name: 'Workspace' });
  await expect.element(workspace).toBeVisible();

  host.setAttribute('src-text', '# Release');
  await expect.element(page.getByRole('heading', { level: 3, name: 'Release' })).toBeVisible();
  await expect.element(workspace).not.toBeInTheDocument();

  host.setAttribute('src-text', '');
  await expect.element(page.getByRole('heading')).not.toBeInTheDocument();

  text.data = '# Roadmap';
  host.removeAttribute('src-text');
  await expect.element(page.getByRole('heading', { level: 3, name: 'Roadmap' })).toBeVisible();
});

it('S1 clamps shifted headings at level six and supports an offset of zero', async () => {
  const { host } = mount('# Workspace\n\n###### Details');
  await expect.element(page.getByRole('heading', { level: 3, name: 'Workspace' })).toBeVisible();
  await expect.element(page.getByRole('heading', { level: 6, name: 'Details' })).toBeVisible();

  host.setAttribute('heading-offset', '0');
  await expect.element(page.getByRole('heading', { level: 1, name: 'Workspace' })).toBeVisible();
});

it('S2 preserves raw markup and rejected destinations as text and follows a fragment', async () => {
  const raw = '<section data-markdown-example>Literal snippet</section>';
  const { host } = mount(
    `${raw}\n\n[Rejected](data:text/plain,example) and [Read details](#md-details).`,
  );
  const target = document.createElement('section');
  target.id = 'md-details';
  target.textContent = 'Details';
  fixture.append(target);

  await expect.element(page.getByText(raw, { exact: true })).toBeVisible();
  await expect.element(page.getByText('Rejected', { exact: false })).toBeVisible();
  await expect.element(page.getByRole('link', { name: 'Rejected' })).not.toBeInTheDocument();
  expect(host.shadowRoot?.querySelector('[data-markdown-example]')).toBeNull();

  const url = location.href;
  try {
    await page.getByRole('link', { name: 'Read details' }).click();
    await expect.poll(() => location.hash).toBe('#md-details');
  } finally {
    history.replaceState(history.state, '', url);
  }
});

it('S4 keeps the same open code block and preserves an earlier focused link', async () => {
  const { host, text } = mount('[Details](#details)\n\n```ts\nconst count', true);
  await expect.element(page.getByRole('link', { name: 'Details' })).toBeVisible();
  await expect.element(page.getByRole('region', { name: 'ts' })).toBeVisible();
  const code = required(host.shadowRoot?.querySelector('ki-code-block'), 'CodeBlock');
  const link = required(host.shadowRoot?.querySelector('ki-link'), 'Link');
  const anchor = required(link.shadowRoot?.querySelector('a'), 'native link');
  await expect.poll(() => code.shadowRoot?.querySelector('code')?.textContent).toBe('const count');
  anchor.focus();

  text.appendData(' = 3;\n```\n\nDone.');
  await expect.element(page.getByText('Done.', { exact: true })).toBeVisible();
  expect(host.shadowRoot?.querySelector('ki-code-block')).toBe(code);
  await expect
    .poll(() => code.shadowRoot?.querySelector('code')?.textContent.trimEnd())
    .toBe('const count = 3;');
  expect(link.shadowRoot?.activeElement).toBe(anchor);
});

it('S4 confirms a table delimiter and keeps the table and its existing cells as a row grows', async () => {
  const { host, text } = mount('| Control | Validates |\n| --- | ---', true);
  await expect.element(page.getByText(/Control.*Validates/u)).toBeVisible();
  await expect.element(page.getByRole('table')).not.toBeInTheDocument();

  text.appendData(' |\n| Email |');
  await expect.element(page.getByRole('cell', { name: 'Email' })).toBeVisible();
  const table = required(host.shadowRoot?.querySelector('table'), 'table');
  const firstCell = required(table.tBodies.item(0)?.rows.item(0)?.cells.item(0), 'first data cell');

  text.appendData(' Yes |');
  await expect.element(page.getByRole('cell', { name: 'Yes' })).toBeVisible();
  expect(host.shadowRoot?.querySelector('table')).toBe(table);
  expect(table.tBodies.item(0)?.rows.item(0)?.cells.item(0)).toBe(firstCell);
});

it('S6 loads only opted-in, allowed images and preserves alternative text for all others', async () => {
  const { host } = mount(
    `![Green hills](${imageUrl})\n\n![Unavailable](data:image/png;base64,AA==)`,
  );
  await expect.element(page.getByText('Green hills', { exact: true })).toBeVisible();
  await expect.element(page.getByRole('img')).not.toBeInTheDocument();

  host.setAttribute('allow-images', '');
  await expect.element(page.getByRole('img', { name: 'Green hills' })).toBeVisible();
  await expect.element(page.getByText('Unavailable', { exact: true })).toBeVisible();
  await expect.element(page.getByRole('img', { name: 'Unavailable' })).not.toBeInTheDocument();
  const image = required(host.shadowRoot?.querySelector('img'), 'native image');
  await expect.poll(() => image.naturalWidth).toBeGreaterThan(0);
  expect(image.referrerPolicy).toBe('no-referrer');
});

it('S7 reaches the native link, copy control and code region in order with visible focus', async () => {
  const start = keyboardStart();
  const { host } = mount('[Details](#details)\n\n```ts\nconst count = 3;\n```');
  await expect.element(page.getByRole('link', { name: 'Details' })).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'Copy code' })).toBeVisible();
  const link = required(host.shadowRoot?.querySelector('ki-link'), 'Link');
  const code = required(host.shadowRoot?.querySelector('ki-code-block'), 'CodeBlock');
  const anchor = required(link.shadowRoot?.querySelector('a'), 'native link');
  const copy = required(code.shadowRoot?.querySelector('ki-copy-button'), 'CopyButton');
  const button = required(copy.shadowRoot?.querySelector('button'), 'native copy button');
  const region = required(code.shadowRoot?.querySelector('pre'), 'native code region');
  makeTabbableInMacWebKit(anchor);
  makeTabbableInMacWebKit(button);

  start.focus();
  await userEvent.tab();
  expect(link.shadowRoot?.activeElement).toBe(anchor);
  expectVisibleFocus(anchor);

  await userEvent.tab();
  expect(copy.shadowRoot?.activeElement).toBe(button);
  expectVisibleFocus(button);

  await userEvent.tab();
  expect(code.shadowRoot?.activeElement).toBe(region);
  expectVisibleFocus(region);
});

it('S8 exposes headings, list state, table headers and accessible names and passes axe', async () => {
  fixture.innerHTML = '<h1>Documentation</h1><h2>Answer</h2>';
  const { host } = mount(
    [
      '# Workspace',
      '- [x] Configure email\n- [ ] Validate form',
      '| Control | Validates |\n| --- | --- |\n| Input | Yes |',
      '[Source](https://example.com/docs)',
      '```ts\nconst count = 3;\n```',
    ].join('\n\n'),
  );
  await expect.element(page.getByRole('heading', { level: 3, name: 'Workspace' })).toBeVisible();
  await expect.element(page.getByRole('list')).toBeVisible();
  await expect.element(page.getByRole('checkbox', { checked: true })).toBeDisabled();
  await expect.element(page.getByRole('checkbox', { checked: false })).toBeDisabled();
  await expect.element(page.getByRole('columnheader', { name: 'Control' })).toBeVisible();
  await expect.element(page.getByRole('cell', { name: 'Input' })).toBeVisible();
  await expect
    .element(page.getByRole('link', { name: 'Source (opens in a new tab)', exact: true }))
    .toBeVisible();
  await expect.element(page.getByRole('region', { name: 'ts' })).toBeVisible();
  const link = required(host.shadowRoot?.querySelector('ki-link'), 'external Link');
  const anchor = required(link.shadowRoot?.querySelector('a'), 'native external link');
  expect(anchor.target).toBe('_blank');
  expect(anchor.relList.contains('noopener')).toBe(true);
  const tree = await browser.ariaSnapshot('main');
  expect(tree).toContain('heading "Workspace" [level=3]');
  expect(tree).toContain('columnheader "Control"');
  expect(tree).toContain('figure "ts"');
  await expectAccessible(fixture);
});

it('S9 paints inline code with the consumer-assigned fill', async () => {
  const { host } = mount('Use `pnpm test` to verify.');
  host.style.setProperty('--ki-markdown-inline-code-bg', 'rgb(216, 235, 244)');

  await expect.element(page.getByText('pnpm test', { exact: true })).toBeVisible();
  const code = required(host.shadowRoot?.querySelector('code'), 'inline code');
  expect(getComputedStyle(code).backgroundColor).toBe('rgb(216, 235, 244)');
});

it('S10 keeps visible keyboard focus and updates without animation in system accessibility modes', async () => {
  const start = keyboardStart();
  const { host, text } = mount('[Details](#details)', true);
  try {
    await browser.emulateForcedColors('active');
    await browser.emulateReducedMotion('reduce');
    await expect.poll(() => matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    if (server.browser !== 'webkit') {
      expect(matchMedia('(forced-colors: active)').matches).toBe(true);
    }

    await expect.element(page.getByRole('link', { name: 'Details' })).toBeVisible();
    const link = required(host.shadowRoot?.querySelector('ki-link'), 'Link');
    const anchor = required(link.shadowRoot?.querySelector('a'), 'native link');
    const content = required(host.shadowRoot?.querySelector('[part~="content"]'), 'content part');
    makeTabbableInMacWebKit(anchor);
    start.focus();
    await userEvent.tab();
    expectVisibleFocus(anchor);
    expect(getComputedStyle(anchor).textDecorationLine).toBe('underline');

    text.appendData('\n\nMore details.');
    await expect.element(page.getByText('More details.', { exact: true })).toBeVisible();
    expect(link.shadowRoot?.activeElement).toBe(anchor);
    expect(content.getAnimations({ subtree: true })).toEqual([]);
    expect(anchor.getAnimations()).toEqual([]);
  } finally {
    await browser.emulateForcedColors(null);
    await browser.emulateReducedMotion(null);
  }
});

it('S11 puts the quote border and indent on the right in RTL', async () => {
  fixture.dir = 'rtl';
  const { host } = mount('> Enter a workspace name.');
  await expect.element(page.getByText('Enter a workspace name.', { exact: true })).toBeVisible();
  const quote = required(host.shadowRoot?.querySelector('blockquote'), 'blockquote');
  const paint = getComputedStyle(quote);
  expect(paint.direction).toBe('rtl');
  expect(paint.borderRightStyle).toBe('solid');
  expect(Number.parseFloat(paint.borderRightWidth)).toBeGreaterThan(0);
  expect(Number.parseFloat(paint.borderLeftWidth)).toBe(0);
  expect(Number.parseFloat(paint.paddingRight)).toBeGreaterThan(
    Number.parseFloat(paint.paddingLeft),
  );
});

it('S13 renders inline semantics and routes note text through Kimen Note', async () => {
  const { host } = mount(
    '**Required**, ~~deprecated~~ and `--check`.\n\n> [!NOTE]\n> Check your settings.',
  );
  await expect.element(page.getByText('Check your settings.', { exact: true })).toBeVisible();
  expect(host.shadowRoot?.querySelector('strong')?.textContent).toBe('Required');
  expect(host.shadowRoot?.querySelector('del')?.textContent).toBe('deprecated');
  expect(host.shadowRoot?.querySelector('code')?.textContent).toBe('--check');
  const note = required(host.shadowRoot?.querySelector('ki-note'), 'Note');
  await expect
    .poll(() => note.shadowRoot?.querySelector('[part~="message"]'))
    .toBeInstanceOf(HTMLElement);
  expect(note.textContent.trim()).toBe('Check your settings.');
});
