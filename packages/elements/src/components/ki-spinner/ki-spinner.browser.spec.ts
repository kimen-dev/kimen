// @spec:071-ki-spinner
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-spinner.js';

const styles = document.createElement('style');
const fixture = document.createElement('main');
const saving = 'Saving changes';
const thinking = 'Assistant is thinking';

function mount(label: string, attributes = {}): HTMLElement {
  const host = document.createElement('ki-spinner');
  host.setAttribute('label', label);
  for (const [name, value] of Object.entries<string>(attributes)) {
    host.setAttribute(name, value);
  }
  fixture.append(host);
  return host;
}

function status(label: string) {
  return page.getByRole('status', { exact: true, name: label });
}

function part(host: HTMLElement, name: string): HTMLElement {
  const element = host.shadowRoot?.querySelector<HTMLElement>(`[part="${name}"]`);
  if (!element) {
    throw new Error(`The spinner did not render its ${name} part`);
  }
  return element;
}

beforeAll(() => {
  defineCustomElement();
  styles.textContent = tokensCss;
  document.head.append(styles);
  fixture.style.backgroundColor = 'var(--ki-surface-s0)';
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  fixture.removeAttribute('dir');
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it.each([
  { attributes: { size: 'sm' }, diameter: 16 },
  { attributes: {}, diameter: 20 },
  { attributes: { size: 'lg' }, diameter: 32 },
])(
  'S1 paints a $diameter px ring and keeps the label out of layout',
  async ({ attributes, diameter }) => {
    const host = mount(saving, attributes);
    await expect.element(status(saving)).toBeInTheDocument();
    const ring = getComputedStyle(part(host, 'ring'));
    expect(ring.inlineSize).toBe(`${String(diameter)}px`);
    expect(ring.blockSize).toBe(`${String(diameter)}px`);
    expect(host.getBoundingClientRect().width).toBeCloseTo(diameter);
  },
);

it('S2 paints three dots next to the visible label', async () => {
  const host = mount(thinking, { 'show-label': '', variant: 'dots' });
  await expect.element(status(thinking)).toBeVisible();
  const dots = part(host, 'dots');
  const label = part(host, 'label');
  expect(dots.children).toHaveLength(3);
  expect(label.getBoundingClientRect().width).toBeGreaterThan(dots.getBoundingClientRect().width);
  expect(dots.getBoundingClientRect().right).toBeLessThan(label.getBoundingClientRect().left);
});

it('S3 draws the medium ring for unknown presentation values', async () => {
  const host = mount(saving, { size: 'enormous', variant: 'bar' });
  await expect.element(status(saving)).toBeInTheDocument();
  expect(getComputedStyle(part(host, 'ring')).inlineSize).toBe('20px');
});

it('S4 leaves the next button in the Tab sequence', async () => {
  const edit = document.createElement('button');
  edit.textContent = 'Edit';
  fixture.append(edit);
  mount(saving);
  const cancel = document.createElement('button');
  cancel.textContent = 'Cancel';
  fixture.append(cancel);
  await expect.element(status(saving)).toBeInTheDocument();

  edit.focus();
  await userEvent.keyboard('{Tab}');

  expect(document.activeElement).toBe(cancel);
});

it('S5 inserts the message once into an already present polite status', async () => {
  const host = document.createElement('ki-spinner');
  host.setAttribute('label', saving);
  const root = host.shadowRoot;
  if (!root) {
    throw new Error('The custom element did not attach its shadow root');
  }
  const messages: string[] = [];
  const observer = new MutationObserver(() => {
    const region = root.querySelector('[role="status"]');
    const message = region?.textContent;
    if (message != null && message !== messages.at(-1)) {
      messages.push(message);
    }
  });
  observer.observe(root, { characterData: true, childList: true, subtree: true });
  fixture.append(host);

  try {
    await expect.element(status(saving)).toBeInTheDocument();
    expect(page.getByRole('status').all()).toHaveLength(1);
    expect(messages).toEqual(['', saving]);
  } finally {
    observer.disconnect();
  }
});

it('S5 meets axe checks with a name for each variant', async () => {
  mount(saving);
  mount(thinking, { 'show-label': '', variant: 'dots' });
  await expect.element(status(saving)).toBeInTheDocument();
  await expect.element(status(thinking)).toBeInTheDocument();
  await expectAccessible(fixture);
});

it('S6 shows the existing status text without writing a new live message', async () => {
  const host = mount(saving);
  await expect.element(status(saving)).toBeInTheDocument();
  const label = part(host, 'label');
  const originalText = label.firstChild;
  const updates: MutationRecord[] = [];
  const observer = new MutationObserver((records) => updates.push(...records));
  const region = status(saving).element();
  observer.observe(region, { characterData: true, childList: true, subtree: true });

  try {
    host.setAttribute('show-label', '');
    await expect.poll(() => label.getBoundingClientRect().width).toBeGreaterThan(20);
    expect(status(saving).element()).toBe(region);
    expect(label.firstChild).toBe(originalText);
    expect(updates).toHaveLength(0);
  } finally {
    observer.disconnect();
  }
});

it('S7 paints the track and indicator using the theme overrides', async () => {
  const host = mount(saving);
  host.style.setProperty('--ki-spinner-track', 'navy');
  host.style.setProperty('--ki-spinner-indicator', 'gold');
  await expect.element(status(saving)).toBeInTheDocument();

  const ring = getComputedStyle(part(host, 'ring'));
  expect(ring.borderInlineStartColor).toBe('rgb(0, 0, 128)');
  expect(ring.borderBlockStartColor).toBe('rgb(255, 215, 0)');
});

it('S9 places the dots before the label in RTL reading order', async () => {
  fixture.dir = 'rtl';
  const label = 'جارٍ التفكير';
  const host = mount(label, { 'show-label': '', variant: 'dots' });
  await expect.element(status(label)).toBeInTheDocument();

  expect(part(host, 'dots').getBoundingClientRect().left).toBeGreaterThan(
    part(host, 'label').getBoundingClientRect().right,
  );
});
