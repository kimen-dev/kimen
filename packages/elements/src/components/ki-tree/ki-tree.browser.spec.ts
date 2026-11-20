// @spec:122-ki-tree
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineTreeItem } from '../../../dist/components/ki-tree-item.js';
import { defineCustomElement as defineTree } from '../../../dist/components/ki-tree.js';

const browser = commands as unknown as {
  ariaSnapshot: (selector: string) => Promise<string>;
  emulateForcedColors: (value: 'active' | 'none' | null) => Promise<void>;
  emulateReducedMotion: (value: 'reduce' | null) => Promise<void>;
};

const styles = document.createElement('style');
const fixture = document.createElement('main');
const overriddenTokens = [
  '--ki-surface-s2',
  '--ki-surface-primary-low-em',
  '--ki-text-primary-on-primary-light',
];
const fileItems = `
  <ki-tree-item id="source" expanded>Source
    <ki-tree-item id="dialog" selected>Dialog</ki-tree-item>
    <ki-tree-item id="styles">Styles</ki-tree-item>
  </ki-tree-item>
  <ki-tree-item id="tokens">Tokens
    <ki-tree-item id="preview">Preview</ki-tree-item>
  </ki-tree-item>
  <ki-tree-item id="package">Package</ki-tree-item>
  <ki-tree-item id="paths">Paths</ki-tree-item>
  <ki-tree-item id="archived" disabled>Archived
    <ki-tree-item id="legacy">Legacy</ki-tree-item>
  </ki-tree-item>
`;

function mount(items = fileItems, attributes = ''): HTMLElement {
  fixture.innerHTML = `<ki-tree id="files" label="Files" ${attributes}>${items}</ki-tree>`;
  return fixture.firstElementChild as HTMLElement;
}

function item(id: string): HTMLElement {
  const element = fixture.querySelector<HTMLElement>(`ki-tree-item#${id}`);
  if (!element) throw new Error(`Missing tree item #${id}`);
  return element;
}

function part(id: string, name: string) {
  return item(id).shadowRoot?.querySelector<HTMLElement>(`[part~="${name}"]`);
}

function paintedPart(id: string, name: string): HTMLElement {
  const element = part(id, name);
  if (!(element instanceof HTMLElement)) throw new Error(`Missing ${name} on #${id}`);
  return element;
}

async function clickPart(id: string, name: string): Promise<void> {
  await expect.poll(() => part(id, name)).toBeInstanceOf(HTMLElement);
  await userEvent.click(paintedPart(id, name));
}

function spinnerVisible(): boolean {
  const spinner = item('tokens').shadowRoot?.querySelector('ki-spinner');
  return (spinner?.getClientRects().length ?? 0) > 0;
}

async function focusItem(id: string): Promise<void> {
  await expect.poll(() => part(id, 'row')).toBeInstanceOf(HTMLElement);
  await expect.element(item(id)).toHaveAttribute('role', 'treeitem');
  item(id).focus();
  await expect.element(item(id)).toHaveFocus();
}

function itemEvents(tree: HTMLElement) {
  const events: { type: string; item: HTMLElement }[] = [];
  const record = (event: Event) => {
    events.push({
      type: event.type,
      item: (event as CustomEvent<{ item: HTMLElement }>).detail.item,
    });
  };

  tree.addEventListener('ki-expand', record);
  tree.addEventListener('ki-collapse', record);
  tree.addEventListener('ki-load', record);
  return events;
}

function selectionEvents(tree: HTMLElement) {
  const events: HTMLElement[][] = [];
  tree.addEventListener('ki-selection-change', (event) => {
    events.push((event as CustomEvent<{ selectedItems: HTMLElement[] }>).detail.selectedItems);
  });
  return events;
}

beforeAll(() => {
  defineTreeItem();
  defineTree();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  fixture.removeAttribute('dir');
  fixture.removeAttribute('style');
  for (const token of overriddenTokens) document.documentElement.style.removeProperty(token);
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('S1 opens a collapsed branch from the disclosure and emits one expansion event', async () => {
  const events = itemEvents(mount());

  await clickPart('tokens', 'disclosure');

  await expect.element(item('tokens')).toHaveAttribute('aria-expanded', 'true');
  await expect.element(item('preview')).toBeVisible();
  expect(events).toEqual([{ type: 'ki-expand', item: item('tokens') }]);
});

it('S1 closes an expanded branch from the disclosure and emits one collapse event', async () => {
  const events = itemEvents(mount());

  await clickPart('source', 'disclosure');

  await expect.element(item('source')).toHaveAttribute('aria-expanded', 'false');
  await expect.element(item('dialog')).not.toBeVisible();
  expect(events).toEqual([{ type: 'ki-collapse', item: item('source') }]);
});

it('S2 switches the single selection and emits the new selected item', async () => {
  const events = selectionEvents(mount());

  await page.getByRole('treeitem', { name: 'Package', exact: true }).click();

  await expect.element(item('package')).toHaveAttribute('aria-selected', 'true');
  await expect.element(item('dialog')).toHaveAttribute('aria-selected', 'false');
  expect(events).toEqual([[item('package')]]);
});

it('S3 checks the enabled descendants of a branch and leaves a disabled subtree alone', async () => {
  const events = selectionEvents(
    mount(
      `<ki-tree-item id="source" expanded>Source
        <ki-tree-item id="dialog">Dialog</ki-tree-item>
        <ki-tree-item id="styles">Styles</ki-tree-item>
        <ki-tree-item id="archived" disabled expanded>Archived
          <ki-tree-item id="legacy">Legacy</ki-tree-item>
        </ki-tree-item>
      </ki-tree-item>`,
      'selection="multiple"',
    ),
  );

  await clickPart('source', 'checkbox');

  await expect.element(item('source')).toHaveAttribute('aria-checked', 'true');
  await expect.element(item('dialog')).toHaveAttribute('aria-checked', 'true');
  await expect.element(item('styles')).toHaveAttribute('aria-checked', 'true');
  await expect.element(item('archived')).not.toHaveAttribute('aria-checked', 'true');
  await expect.element(item('legacy')).not.toHaveAttribute('aria-checked', 'true');
  expect(events).toEqual([[item('source'), item('dialog'), item('styles')]]);
});

it('S3 S14 exposes a mixed parent when a checked child is cleared', async () => {
  const tree = mount(
    `<ki-tree-item id="source" expanded>Source
      <ki-tree-item id="dialog" selected>Dialog</ki-tree-item>
      <ki-tree-item id="styles" selected>Styles</ki-tree-item>
    </ki-tree-item>`,
    'selection="multiple"',
  );
  const events = selectionEvents(tree);
  await expect.element(item('source')).toHaveAttribute('aria-checked', 'true');

  await clickPart('dialog', 'checkbox');

  await expect.element(tree).toHaveAttribute('aria-multiselectable', 'true');
  await expect.element(item('source')).toHaveAttribute('aria-checked', 'mixed');
  await expect.element(item('source')).not.toHaveAttribute('aria-selected');
  await expect.element(item('dialog')).toHaveAttribute('aria-checked', 'false');
  await expect.element(item('styles')).toHaveAttribute('aria-checked', 'true');
  expect(events).toEqual([[item('styles')]]);
});

it('S4 starts a lazy load once and shows the loading row while expanded', async () => {
  const events = itemEvents(mount('<ki-tree-item id="tokens" lazy>Tokens</ki-tree-item>'));

  await clickPart('tokens', 'disclosure');
  await expect.poll(spinnerVisible).toBe(true);
  await expect.element(item('tokens')).toHaveAttribute('aria-expanded', 'true');
  await clickPart('tokens', 'disclosure');
  await expect.poll(spinnerVisible).toBe(false);
  await clickPart('tokens', 'disclosure');

  await expect.poll(spinnerVisible).toBe(true);
  expect(events.filter(({ type }) => type === 'ki-load')).toEqual([
    { type: 'ki-load', item: item('tokens') },
  ]);
});

it('S5 replaces the loading row with children supplied by the host', async () => {
  mount('<ki-tree-item id="tokens" lazy>Tokens</ki-tree-item>');
  await clickPart('tokens', 'disclosure');
  await expect.poll(spinnerVisible).toBe(true);

  item('tokens').insertAdjacentHTML(
    'beforeend',
    '<ki-tree-item id="palette">Palette</ki-tree-item>',
  );

  await expect.element(page.getByRole('treeitem', { name: 'Palette' })).toBeVisible();
  await expect.poll(spinnerVisible).toBe(false);
});

it('S5 finishes an empty lazy load when the host clears lazy', async () => {
  mount('<ki-tree-item id="tokens" lazy>Tokens</ki-tree-item>');
  await clickPart('tokens', 'disclosure');
  await expect.poll(spinnerVisible).toBe(true);

  item('tokens').removeAttribute('lazy');

  await expect.poll(spinnerVisible).toBe(false);
  await expect.element(item('tokens')).not.toHaveAttribute('aria-expanded');
});

it('S6 follows a native URL without selecting the destination in none mode', async () => {
  const tree = mount(
    '<ki-tree-item id="guide" href="#tree-guide" selected>Guide</ki-tree-item>',
    'selection="none"',
  );
  const events = selectionEvents(tree);
  const previousUrl = location.href;
  await expect.poll(() => part('guide', 'label')).toBeInstanceOf(HTMLAnchorElement);
  expect(paintedPart('guide', 'label')).toHaveAttribute('href', '#tree-guide');

  try {
    await clickPart('guide', 'label');

    await expect.poll(() => location.hash).toBe('#tree-guide');
    await expect.element(item('guide')).not.toHaveAttribute('aria-selected');
    await expect.element(item('guide')).not.toHaveAttribute('aria-checked');
    expect(events).toEqual([]);
  } finally {
    history.replaceState(history.state, '', previousUrl);
  }
});

it('S7 keeps a disabled branch focusable and inert under pointer and keyboard input', async () => {
  const tree = mount();
  const expansion = itemEvents(tree);
  const selection = selectionEvents(tree);
  await focusItem('paths');

  await userEvent.keyboard('{ArrowDown}');
  await expect.element(item('archived')).toHaveFocus();
  await userEvent.keyboard('{ArrowRight}{Enter} ');
  paintedPart('archived', 'disclosure').click();

  await expect.element(item('archived')).toHaveAttribute('aria-expanded', 'false');
  await expect.element(item('legacy')).not.toBeVisible();
  expect(expansion).toEqual([]);
  expect(selection).toEqual([]);
});

it('S8 gives the visible selected item the only tab stop inside the tree', async () => {
  const tree = mount();
  const before = document.createElement('button');
  before.textContent = 'Before files';
  before.tabIndex = 0;
  const after = document.createElement('button');
  after.textContent = 'After files';
  after.tabIndex = 0;
  tree.before(before);
  tree.after(after);
  await expect.element(item('dialog')).toHaveAttribute('tabindex', '0');
  before.focus();

  await userEvent.tab();
  await expect.element(item('dialog')).toHaveFocus();
  await userEvent.tab();

  await expect.element(after).toHaveFocus();
  expect([...tree.querySelectorAll('[tabindex="0"]')]).toEqual([item('dialog')]);
});

it.each([
  ['ArrowDown', 'styles', 'tokens'],
  ['ArrowDown', 'tokens', 'package'],
  ['ArrowUp', 'package', 'tokens'],
  ['Home', 'package', 'source'],
  ['End', 'source', 'archived'],
])('S9 %s moves visible focus from %s to %s', async (key, from, target) => {
  mount();
  await focusItem(from);

  await userEvent.keyboard(`{${key}}`);

  await expect.element(item(target)).toHaveFocus();
  await expect.element(item('dialog')).toHaveAttribute('aria-selected', 'true');
});

it.each([
  ['ltr', 'ArrowRight', 'ArrowLeft'],
  ['rtl', 'ArrowLeft', 'ArrowRight'],
])('S10 follows the branch and parent directions in %s', async (dir, towardChild, towardParent) => {
  fixture.dir = dir;
  mount();
  await focusItem('tokens');

  await userEvent.keyboard(`{${towardChild}}`);
  await expect.element(item('tokens')).toHaveAttribute('aria-expanded', 'true');
  await expect.element(item('tokens')).toHaveFocus();
  await userEvent.keyboard(`{${towardChild}}`);
  await expect.element(item('preview')).toHaveFocus();

  await userEvent.keyboard(`{${towardParent}}`);
  await expect.element(item('tokens')).toHaveFocus();
  await userEvent.keyboard(`{${towardParent}}`);

  await expect.element(item('tokens')).toHaveAttribute('aria-expanded', 'false');
  await expect.element(item('tokens')).toHaveFocus();
});

it('S10 indents the child toward inline end and mirrors the disclosure in RTL', async () => {
  fixture.dir = 'rtl';
  mount();

  await expect
    .poll(() => {
      const source = part('source', 'label')?.getBoundingClientRect();
      const dialog = part('dialog', 'label')?.getBoundingClientRect();
      const disclosure = part('source', 'disclosure')?.getBoundingClientRect();
      return Boolean(
        source &&
          dialog &&
          disclosure &&
          source.right > dialog.right &&
          disclosure.left >= source.right - 0.5,
      );
    })
    .toBe(true);
});

it('S11 wraps type-ahead over visible item names and skips collapsed descendants', async () => {
  mount(
    `<ki-tree-item id="project">Project</ki-tree-item>
    <ki-tree-item id="package">Package</ki-tree-item>
    <ki-tree-item id="tokens">Tokens<ki-tree-item id="preview">Preview</ki-tree-item></ki-tree-item>
    <ki-tree-item id="paths">Paths</ki-tree-item>`,
  );
  await focusItem('paths');

  await userEvent.keyboard('pa');

  await expect.element(item('package')).toHaveFocus();
  await expect.element(item('preview')).not.toBeVisible();
});

it.each([
  [' ', 'single', 'aria-selected'],
  ['{Enter}', 'single', 'aria-selected'],
  [' ', 'multiple', 'aria-checked'],
  ['{Enter}', 'multiple', 'aria-checked'],
])('S12 %j activates the focused item in %s mode', async (key, selection, attribute) => {
  const events = selectionEvents(
    mount('<ki-tree-item id="styles">Styles</ki-tree-item>', `selection="${selection}"`),
  );
  await focusItem('styles');

  await userEvent.keyboard(key);

  await expect.element(item('styles')).toHaveAttribute(attribute, 'true');
  expect(events).toEqual([[item('styles')]]);
});

it('S13 exposes one named tree with branch groups, levels and item states', async () => {
  mount();
  await expect.element(page.getByRole('tree', { name: 'Files', exact: true })).toBeVisible();
  await expect.element(item('source')).toHaveAttribute('aria-level', '1');
  await expect.element(item('source')).toHaveAttribute('aria-expanded', 'true');
  await expect.element(item('dialog')).toHaveAttribute('aria-level', '2');
  await expect.element(item('dialog')).toHaveAttribute('aria-selected', 'true');
  await expect.element(item('dialog')).not.toHaveAttribute('aria-expanded');
  await expect.element(item('archived')).toHaveAttribute('aria-disabled', 'true');
  const snapshot = await browser.ariaSnapshot('#files');

  expect(snapshot).toContain('tree "Files"');
  expect(snapshot).toContain('treeitem "Source"');
  expect(snapshot).toMatch(/- group[^\n]*:\n\s*- treeitem "Dialog"/);
});

it('S15 passes axe with selectable, mixed, disabled and loading rows', async () => {
  mount(
    `<ki-tree-item id="source" expanded>Source
      <ki-tree-item selected>Dialog</ki-tree-item><ki-tree-item>Styles</ki-tree-item>
    </ki-tree-item>
    <ki-tree-item id="tokens" lazy>Tokens</ki-tree-item>
    <ki-tree-item disabled>Archived</ki-tree-item>`,
    'selection="multiple"',
  );
  await expect.element(item('source')).toHaveAttribute('aria-checked', 'mixed');

  await clickPart('tokens', 'disclosure');

  await expect.poll(spinnerVisible).toBe(true);
  await expectAccessible(fixture);
});

it('S16 follows surface and selected foreground overrides on painted rows', async () => {
  mount();
  const { style } = document.documentElement;
  style.setProperty('--ki-surface-s2', 'rgb(230, 240, 250)');
  style.setProperty('--ki-surface-primary-low-em', 'rgb(208, 224, 240)');
  style.setProperty('--ki-text-primary-on-primary-light', 'rgb(20, 40, 60)');
  await clickPart('package', 'row');

  if (matchMedia('(hover: hover)').matches) {
    await userEvent.hover(paintedPart('styles', 'row'));
    await expect
      .poll(() => getComputedStyle(paintedPart('styles', 'row')).backgroundColor)
      .toBe('rgb(230, 240, 250)');
  }
  expect(getComputedStyle(paintedPart('package', 'row')).backgroundColor).toBe(
    'rgb(208, 224, 240)',
  );
  expect(getComputedStyle(paintedPart('package', 'label')).color).toBe('rgb(20, 40, 60)');
});

it('S17 keeps selection and keyboard focus visible in forced colors', async ({ skip }) => {
  mount();
  await focusItem('source');
  fixture.style.backgroundColor = 'rgb(1, 2, 3)';
  await browser.emulateForcedColors('active');
  try {
    const applies = () =>
      matchMedia('(forced-colors: active)').matches &&
      getComputedStyle(fixture).backgroundColor !== 'rgb(1, 2, 3)';
    if (navigator.userAgent.includes('Chrome/')) {
      await expect.poll(applies).toBe(true);
    } else if (!applies()) {
      skip('This engine does not repaint author colors with a forced palette');
    }
    await userEvent.keyboard('{ArrowDown}');

    await expect.element(item('dialog')).toHaveFocus();
    const selected = getComputedStyle(paintedPart('dialog', 'row'));
    const unselected = getComputedStyle(paintedPart('styles', 'row'));
    expect(selected.backgroundColor).not.toBe(unselected.backgroundColor);
    expect(getComputedStyle(paintedPart('dialog', 'label')).color).not.toBe(
      selected.backgroundColor,
    );
    expect(selected.outlineStyle).not.toBe('none');
    expect(parseFloat(selected.outlineWidth)).toBeGreaterThan(0);
    expect(selected.outlineColor).not.toBe(selected.backgroundColor);
  } finally {
    await browser.emulateForcedColors(null);
  }
});

it('S18 expands instantly under reduced motion', async () => {
  mount();
  await focusItem('tokens');
  const disclosure = paintedPart('tokens', 'disclosure');
  const glyph = disclosure.querySelector('ki-icon');
  if (!glyph) throw new Error('Missing disclosure glyph');
  await browser.emulateReducedMotion('reduce');
  try {
    await expect.poll(() => matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    const closed = [getComputedStyle(glyph).transform, getComputedStyle(glyph).rotate];

    await userEvent.keyboard('{ArrowRight}');

    await expect.element(item('preview')).toBeVisible();
    expect([getComputedStyle(glyph).transform, getComputedStyle(glyph).rotate]).not.toEqual(closed);
    expect(disclosure.getAnimations({ subtree: true })).toHaveLength(0);
    expect(getComputedStyle(glyph).transitionDuration).toBe('0s');
  } finally {
    await browser.emulateReducedMotion(null);
  }
});
