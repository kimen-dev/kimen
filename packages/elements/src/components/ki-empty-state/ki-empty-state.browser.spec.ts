// @spec:087-ki-empty-state
import '../../../icons/folder-plus.js';
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-empty-state.js';

const browser = commands as unknown as {
  accessibilityTree: () => Promise<{ role: string; live: unknown; text: string }[] | null>;
};

const fixture = document.createElement('main');
const styles = document.createElement('style');
const heading = 'No projects yet';
const advice = 'Check the spelling or remove a filter.';

function markup(attributes = '', contents = 'Projects hold your surfaces, catalogs and themes.') {
  return `<ki-empty-state heading="${heading}" ${attributes}>${contents}</ki-empty-state>`;
}

function emptyState(): HTMLElement {
  const host = fixture.querySelector<HTMLElement>('ki-empty-state');
  if (!host) throw new Error('Expected the EmptyState host');
  return host;
}

function part(host: Element, name: string): HTMLElement {
  const element = host.shadowRoot?.querySelector<HTMLElement>(`[part="${name}"]`);
  if (!element) throw new Error(`Expected the EmptyState ${name} part`);
  return element;
}

beforeAll(() => {
  defineCustomElement();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  fixture.removeAttribute('dir');
  fixture.removeAttribute('data-ki-theme');
  fixture.removeAttribute('style');
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('S1 paints the decorative icon, heading, description and next step in order', async () => {
  fixture.innerHTML = markup(
    'icon-name="folder-plus" tone="primary-light"',
    'Projects hold your surfaces, catalogs and themes.' +
      '<button slot="actions" type="button">New project</button>',
  );
  const host = emptyState();
  const title = page.getByRole('heading', { name: heading });
  const action = page.getByRole('button', { name: 'New project' });
  await expect.element(title).toBeVisible();
  await expect.element(action).toBeVisible();
  const media = part(host, 'media');
  const icon = media.querySelector('ki-icon');
  await expect
    .poll(() => icon?.shadowRoot?.querySelector('svg')?.getBoundingClientRect().width)
    .toBeGreaterThan(0);
  expect(media.getAttribute('aria-hidden')).toBe('true');
  expect(title.element().getBoundingClientRect().top).toBeGreaterThan(
    media.getBoundingClientRect().top,
  );
  expect(part(host, 'description').getBoundingClientRect().top).toBeGreaterThan(
    title.element().getBoundingClientRect().top,
  );
  expect(action.element().getBoundingClientRect().top).toBeGreaterThan(
    part(host, 'description').getBoundingClientRect().top,
  );
  await expectAccessible(fixture);
});

it('S2 substitutes slotted media and restores the icon when it is removed', async () => {
  fixture.innerHTML = markup('icon-name="folder-plus"');
  const host = emptyState();
  await expect.element(page.getByRole('heading', { name: heading })).toBeVisible();

  const illustration = document.createElement('span');
  illustration.slot = 'media';
  illustration.tabIndex = 0;
  illustration.textContent = 'Illustration';
  host.append(illustration);

  await expect.element(page.getByText('Illustration')).toBeVisible();
  illustration.focus();
  expect(document.activeElement).not.toBe(illustration);
  expect(part(host, 'media').getAttribute('aria-hidden')).toBe('true');
  expect(host.shadowRoot?.querySelector('ki-icon')?.getClientRects().length ?? 0).toBe(0);

  illustration.remove();
  await expect
    .poll(() => host.shadowRoot?.querySelector('ki-icon')?.getClientRects().length)
    .toBeGreaterThan(0);
});

it('S3 fits the same message into a more compact panel', async () => {
  fixture.innerHTML = markup();
  const host = emptyState();
  await expect.element(page.getByRole('heading', { name: heading })).toBeVisible();
  const regular = host.getBoundingClientRect().height;
  host.setAttribute('size', 'sm');
  await expect.poll(() => host.getBoundingClientRect().height).toBeLessThan(regular);
});

it.each(['{Enter}', ' '])(
  'S4 tabs directly to the action and activates it once with %s',
  async (key) => {
    fixture.innerHTML =
      '<input type="search" aria-label="Search projects">' +
      markup('', '<button slot="actions" type="button" tabindex="0">Clear filters</button>');
    const search = page
      .getByRole('searchbox', { name: 'Search projects' })
      .element() as HTMLInputElement;
    const action = page.getByRole('button', { name: 'Clear filters' });
    await expect.element(action).toBeVisible();
    const activated = { count: 0 };
    action.element().addEventListener('click', () => activated.count++);

    search.focus();
    await userEvent.keyboard('{Tab}');
    await expect.element(action).toHaveFocus();
    await userEvent.keyboard(key);

    expect(activated.count).toBe(1);
  },
);

it('S5 delivers the search message to an existing polite status and leaves focus in search', async () => {
  fixture.innerHTML = '<input type="search" aria-label="Search projects"><p>Two projects found</p>';
  const search = page
    .getByRole('searchbox', { name: 'Search projects' })
    .element() as HTMLInputElement;
  search.focus();
  const host = document.createElement('ki-empty-state');
  host.setAttribute('announce', '');
  host.setAttribute('heading', 'No results for webhok');
  host.innerHTML = `${advice}<button slot="actions" type="button">Clear filters</button>`;

  const root = host.shadowRoot;
  if (!root) throw new Error('Expected the EmptyState shadow root');
  const messages: string[] = [];
  const observer = new MutationObserver(() => {
    const message = root.querySelector('[role="status"]')?.textContent;
    if (message != null && message !== messages.at(-1)) messages.push(message);
  });
  observer.observe(root, { characterData: true, childList: true, subtree: true });
  try {
    fixture.querySelector('p')?.replaceWith(host);
    await expect
      .element(page.getByRole('heading', { name: 'No results for webhok' }))
      .toBeVisible();
    const status = page.getByRole('status').element();
    const description = status.querySelector('slot')?.assignedNodes();
    expect(messages).toEqual(['', 'No results for webhok']);
    expect(description?.[0]?.textContent).toBe(advice);
    expect(status.querySelector('slot[name="actions"]')).toBeNull();
    await expect.element(page.getByRole('button', { name: 'Clear filters' })).toBeVisible();
    expect(document.activeElement).toBe(search);

    const tree = await browser.accessibilityTree();
    if (tree !== null) {
      const live = tree.filter((node) => node.role === 'status' && node.live === 'polite');
      expect(live).toHaveLength(1);
      expect(live[0]?.text).toContain('No results for webhok');
      expect(live[0]?.text).toContain(advice);
    }

    host.setAttribute('heading', 'No results for hooks');
    await expect.element(page.getByRole('heading', { name: 'No results for hooks' })).toBeVisible();
    expect(page.getByRole('status').element()).toBe(status);
    expect(messages).toEqual(['', 'No results for webhok', 'No results for hooks']);
  } finally {
    observer.disconnect();
  }
});

it.each([
  ['', 3],
  ['heading-level="2"', 2],
  ['heading-level="4"', 4],
  ['heading-level="5"', 5],
  ['heading-level="6"', 6],
  ['heading-level="3.5"', 3],
  ['heading-level="2junk"', 3],
  ['heading-level="unsupported"', 3],
])('S6 resolves %s to a native level %s heading in a static message', async (attributes, level) => {
  fixture.innerHTML = markup(attributes);
  const title = page.getByRole('heading', { level, name: heading });
  await expect.element(title).toBeVisible();
  expect(title.element().localName).toBe(`h${String(level)}`);
  expect(page.getByRole('status').all()).toHaveLength(0);
});

it('S6 revalidates changed heading attributes and accepts subsequent numeric property writes', async () => {
  fixture.innerHTML = markup('heading-level="2"');
  const host = fixture.querySelector('ki-empty-state');
  if (!host) throw new Error('Expected the EmptyState host');

  await expect.element(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();
  host.setAttribute('heading-level', '2junk');
  await expect.element(page.getByRole('heading', { level: 3, name: heading })).toBeVisible();

  host.setAttribute('heading-level', '3');
  host.setAttribute('heading-level', '2junk');
  expect(host.headingLevel).toBe(3);

  host.headingLevel = 2;
  await expect.element(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();
});

it('S7 takes its heading family and wrapping width from tokens', async () => {
  fixture.setAttribute('data-ki-theme', 'onmars');
  fixture.style.setProperty('--ki-typography-family-heading', 'serif');
  fixture.style.setProperty('--ki-empty-state-max-width', '10rem');
  fixture.innerHTML = markup();
  const title = page.getByRole('heading', { name: heading });
  await expect.element(title).toBeVisible();
  const host = emptyState();
  const container = part(host, 'container');
  const description = part(host, 'description');
  expect(getComputedStyle(title.element()).fontFamily).toBe('serif');
  expect(container.getBoundingClientRect().width).toBeCloseTo(160);
  expect(description.getBoundingClientRect().height).toBeGreaterThan(
    Number.parseFloat(getComputedStyle(description).lineHeight),
  );
});

it('S10 places the first action at the inline start of the RTL row', async () => {
  fixture.dir = 'rtl';
  fixture.innerHTML = markup(
    '',
    '<button slot="actions">Browse</button><button slot="actions">Create</button>',
  );
  const first = page.getByRole('button', { name: 'Browse' });
  const second = page.getByRole('button', { name: 'Create' });
  await expect.element(first).toBeVisible();
  await expect.element(second).toBeVisible();

  expect(first.element().getBoundingClientRect().left).toBeGreaterThan(
    second.element().getBoundingClientRect().right,
  );
});
