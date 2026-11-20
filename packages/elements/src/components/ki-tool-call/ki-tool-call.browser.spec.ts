// @spec:129-ki-tool-call
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { settleFrames } from '../../../browser-tests/visual/fixtures';
import { defineCustomElement as defineCodeBlock } from '../../../dist/components/ki-code-block.js';
import { defineCustomElement } from '../../../dist/components/ki-tool-call.js';

const fixture = document.createElement('main');
const styles = document.createElement('style');
const browser = commands as unknown as {
  accessibilityTree: () => Promise<{ name: string; focusable: boolean }[] | null>;
  ariaSnapshot: (selector: string) => Promise<string>;
  emulateForcedColors: (value: 'active' | null) => Promise<void>;
  emulateReducedMotion: (value: 'reduce' | 'no-preference' | null) => Promise<void>;
};

beforeAll(() => {
  defineCustomElement();
  defineCodeBlock();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  fixture.removeAttribute('dir');
  await browser.emulateForcedColors(null);
  await browser.emulateReducedMotion(null);
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

function part(root: HTMLElement, name: string): HTMLElement {
  const element = root.shadowRoot?.querySelector<HTMLElement>(`[part~="${name}"]`);
  if (!element) throw new Error(`Missing ${name} part`);
  return element;
}

type ToolCall = HTMLElement & { open?: boolean; status: string };

function tool(): ToolCall {
  const host = fixture.querySelector('ki-tool-call');
  if (!host) throw new Error('Missing ToolCall');
  return host as ToolCall;
}

async function mount(attributes: string, content = '') {
  fixture.innerHTML = `<ki-tool-call ${attributes}>${content}</ki-tool-call>`;
  const host = tool();
  await expect
    .poll(() => host.shadowRoot?.querySelector('details'))
    .toBeInstanceOf(HTMLDetailsElement);
  return host;
}

const disclosureSelector = 'ki-tool-call details';
const summary = () => part(tool(), 'summary');
const badge = () => part(tool(), 'status');
const disclosure = () => part(tool(), 'disclosure') as HTMLDetailsElement;

// Vitest's WebKit matcher exempts summary itself from the closed-details
// check. Its visible descendants still need a native visibility witness.
function hasVisibleBox(element: Element | null | undefined): boolean {
  if (!element?.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
  const { width, height } = element.getBoundingClientRect();
  return width > 0 && height > 0;
}

function statusHasVisibleBox(): boolean {
  return hasVisibleBox(badge().shadowRoot?.querySelector('[part~="badge"]'));
}

it('S1 opens a completed call and reveals labeled CodeBlock payloads', async () => {
  await mount(
    'name="search_docs" title="Search docs" status="done" duration="1200"',
    '<ki-code-block slot="input" language="json" filename="search-input.json" copyable="false">{"query": "Forms"}</ki-code-block>' +
      '<ki-code-block slot="output" language="json" filename="search-output.json" copyable="false">["Field help"]</ki-code-block>',
  );

  const summaryName = 'Search docs search_docs Done · 1.2 sec';
  await expect.element(summary()).toHaveTextContent(summaryName);
  const title = page.getByText('Search docs', { exact: true }).element();
  await expect.poll(() => hasVisibleBox(title)).toBe(true);
  await expect.element(part(tool(), 'name')).toHaveTextContent('search_docs');
  await expect.element(badge()).toHaveTextContent('Done · 1.2 sec');
  const tree = await browser.accessibilityTree();
  if (tree !== null) {
    expect(tree).toContainEqual(expect.objectContaining({ name: summaryName, focusable: true }));
  }
  expect(disclosure().open).toBe(false);
  const collapsed = await browser.ariaSnapshot(disclosureSelector);
  expect(collapsed).not.toContain('Forms');
  expect(collapsed).not.toContain('Field help');

  await userEvent.click(summary());

  await expect.poll(() => disclosure().open).toBe(true);
  await expect.element(page.getByText('Input', { exact: true })).toBeVisible();
  await expect.element(page.getByText('Output', { exact: true })).toBeVisible();
  await expect.element(page.getByText('{"query": "Forms"}', { exact: true })).toBeVisible();
  await expect.element(page.getByText('["Field help"]', { exact: true })).toBeVisible();
  const expanded = await browser.ariaSnapshot(disclosureSelector);
  expect(expanded).toContain('Forms');
  expect(expanded).toContain('Field help');
  await expectAccessible(fixture);
});

it('S2 opens a failed call by default and displays its error', async () => {
  await mount('name="deploy_preview" status="failed"', '<p slot="error">Build interrupted</p>');
  expect(disclosure().open).toBe(true);
  await expect.element(page.getByText('Build interrupted')).toBeVisible();
});

it('S3 preserves an explicit collapsed choice and permits later programmatic expansion', async () => {
  const host = await mount('name="deploy_preview" status="running" open="false"');

  host.status = 'failed';

  await expect.element(badge()).toHaveTextContent('Failed');
  expect(disclosure().open).toBe(false);
  host.open = true;
  await expect.poll(() => disclosure().open).toBe(true);
  host.open = false;
  await expect.poll(() => disclosure().open).toBe(false);
  host.removeAttribute('open');
  await expect.poll(() => disclosure().open).toBe(true);
});

it.each(['Space', 'Enter'])(
  'S4 toggles the native summary with %s and keeps focus',
  async (key) => {
    const host = await mount('name="search_docs"');
    const before = document.createElement('button');
    before.textContent = 'Previous';
    before.tabIndex = 0;
    fixture.prepend(before);
    before.focus();

    await userEvent.tab();
    await expect.poll(() => host.shadowRoot?.activeElement).toBe(part(host, 'summary'));
    await userEvent.keyboard(key === 'Space' ? ' ' : '{Enter}');
    await expect.poll(() => disclosure().open && host.open === true).toBe(true);
    expect(host.shadowRoot?.activeElement).toBe(part(host, 'summary'));

    await userEvent.keyboard(key === 'Space' ? ' ' : '{Enter}');
    await expect.poll(() => !disclosure().open && host.open === false).toBe(true);
    expect(host.shadowRoot?.activeElement).toBe(part(host, 'summary'));
  },
);

it('S5 exposes the expanded call and its status without a separate spinner announcement', async () => {
  const host = await mount(
    'name="run_tests" status="running" open',
    '<span slot="input">suite.ts</span>',
  );
  await expect.element(page.getByText('suite.ts', { exact: true })).toBeVisible();
  const tree = await browser.ariaSnapshot(disclosureSelector);

  // Playwright serializes native details as a group without its expanded state.
  expect(disclosure().open).toBe(true);
  expect(tree).toContain('run_tests');
  expect(tree).toContain('Running');
  expect(tree).toContain('suite.ts');
  expect(tree).not.toMatch(/^\s*- status\b/mu);
  const spinner = host.shadowRoot?.querySelector('ki-spinner');
  expect(spinner?.getAttribute('aria-hidden')).toBe('true');
  expect(spinner?.label).toBe('');
});

it('S6 publishes one transition to a conversation-owned log', async () => {
  fixture.innerHTML =
    '<div role="log" aria-label="Tool updates"></div><ki-tool-call name="run_tests" status="running"></ki-tool-call>';
  const host = tool();
  const log = fixture.querySelector('[role="log"]');
  if (!log) throw new Error('Missing conversation log');
  const record = (event: Event): void => {
    const { name, label } = (event as CustomEvent<{ name: string; label: string }>).detail;
    const entry = document.createElement('p');
    entry.textContent = [name, label].join(': ');
    log.append(entry);
  };
  fixture.addEventListener('ki-tool-status-change', record);
  try {
    await expect
      .poll(() => host.shadowRoot?.querySelector('[part="status"]')?.textContent)
      .toBe('Running');
    await expect.poll(statusHasVisibleBox).toBe(true);
    expect(log.children).toHaveLength(0);

    host.status = 'done';
    await expect.element(page.getByText('run_tests: Done', { exact: true })).toBeVisible();
    host.status = 'done';
    await settleFrames(2);

    expect(log.children).toHaveLength(1);
    await expect.element(badge()).toHaveTextContent('Done');
    expect(disclosure().open).toBe(false);
    expect(await browser.ariaSnapshot(disclosureSelector)).toContain('Done');
    expect(host.shadowRoot?.querySelector('[role="log"], [aria-live]')).toBeNull();
  } finally {
    fixture.removeEventListener('ki-tool-status-change', record);
  }
});

it('S7 requests a retry once and leaves the status under caller control', async () => {
  const host = await mount('name="deploy_preview" status="failed" retryable');
  const requests: unknown[] = [];
  host.addEventListener('ki-tool-retry', (event) => {
    requests.push((event as CustomEvent).detail);
  });

  await page.getByRole('button', { name: 'Retry' }).click();

  expect(requests).toEqual([{ name: 'deploy_preview' }]);
  expect(host.status).toBe('failed');
  await expect.element(badge()).toHaveTextContent('Failed');
});

it('S8 repaints the disclosure and its CodeBlock from token overrides', async () => {
  const host = await mount(
    'name="search_docs" status="done"',
    '<ki-code-block slot="output" copyable="false">Result</ki-code-block>',
  );
  host.style.setProperty('--ki-tool-call-bg', 'rgb(220, 230, 240)');
  host.style.setProperty('--ki-tool-call-code-bg', 'rgb(230, 240, 250)');
  await userEvent.click(summary());
  const block = host.querySelector('ki-code-block');
  if (!block) throw new Error('Missing output CodeBlock');
  await expect.poll(() => block.shadowRoot?.querySelector('figure')).not.toBeNull();
  expect(getComputedStyle(disclosure()).backgroundColor).toBe('rgb(220, 230, 240)');
  expect(getComputedStyle(part(block, 'figure')).backgroundColor).toBe('rgb(230, 240, 250)');
});

it('S9 keeps the status and keyboard focus visible in forced colors', async (context) => {
  const host = await mount('name="run_tests" status="running"');
  await browser.emulateForcedColors('active');
  const canvas = document.createElement('span');
  const witnessColor = 'rgb(1, 2, 3)';
  canvas.style.backgroundColor = witnessColor;
  fixture.append(canvas);
  await settleFrames(2);
  const paletteApplied = () =>
    matchMedia('(forced-colors: active)').matches &&
    getComputedStyle(canvas).backgroundColor !== witnessColor;
  if (!paletteApplied() && !navigator.userAgent.includes('Chrome/')) {
    context.skip('The browser cannot apply a forced palette under emulation');
  }
  await expect.poll(paletteApplied).toBe(true);

  const control = part(host, 'summary');
  const before = document.createElement('button');
  before.textContent = 'Previous';
  before.tabIndex = 0;
  fixture.prepend(before);
  before.focus();
  await userEvent.tab();
  await expect.poll(() => host.shadowRoot?.activeElement).toBe(control);
  const focus = getComputedStyle(control);
  expect(focus.outlineStyle).toBe('solid');
  expect(Number.parseFloat(focus.outlineWidth)).toBeGreaterThan(0);
  expect(focus.outlineColor).not.toBe(getComputedStyle(canvas).backgroundColor);
  await expect.poll(statusHasVisibleBox).toBe(true);
  await expect.element(badge()).toHaveTextContent('Running');
});

it('S10 stops the decorative activity indicator under reduced motion', async () => {
  const host = await mount('name="run_tests" status="running"');
  await browser.emulateReducedMotion('no-preference');
  const spinner = host.shadowRoot?.querySelector('ki-spinner');
  if (!spinner) throw new Error('Missing decorative spinner');
  const animation = () =>
    spinner.shadowRoot?.querySelector('[part="ring"]')?.getAnimations().length;
  await expect.poll(animation).toBe(1);

  await browser.emulateReducedMotion('reduce');

  await expect.poll(() => matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
  await expect.poll(animation).toBe(0);
  await expect.poll(statusHasVisibleBox).toBe(true);
  await expect.element(badge()).toHaveTextContent('Running');
});

it('S11 lays out summary content in right-to-left reading order', async () => {
  fixture.dir = 'rtl';
  const host = await mount('name="search_docs" status="done"');
  const identity = part(host, 'name');
  const status = part(host, 'status');
  expect(getComputedStyle(part(host, 'summary')).direction).toBe('rtl');
  expect(identity.getBoundingClientRect().left).toBeGreaterThanOrEqual(
    status.getBoundingClientRect().right - 0.5,
  );
});

it('S13 displays the approval badge without a duration', async () => {
  const host = await mount('name="publish_preview" status="approval" duration="3000"');
  expect(part(host, 'status').getAttribute('tone')).toBe('warning');
  await expect.element(badge()).toHaveTextContent('Needs approval');
  await expect.element(summary()).toHaveTextContent('publish_preview Needs approval');
});

it('S14 opens an automatic disclosure when the status becomes Failed', async () => {
  const host = await mount(
    'name="deploy_preview" status="running"',
    '<p slot="error">Build interrupted</p>',
  );
  expect(disclosure().open).toBe(false);

  host.status = 'failed';

  await expect.element(page.getByText('Build interrupted')).toBeVisible();
  expect(disclosure().open).toBe(true);
});
