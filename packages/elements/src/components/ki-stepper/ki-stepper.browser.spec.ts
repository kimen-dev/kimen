// @spec:092-ki-stepper
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineStep } from '../../../dist/components/ki-step.js';
import { defineCustomElement } from '../../../dist/components/ki-stepper.js';

const browser = commands as unknown as {
  ariaSnapshotByRole: (role: 'list', name: string) => Promise<string>;
};
const styles = document.createElement('style');
const fixture = document.createElement('main');
const initialUrl = location.href;
const label = 'Setup progress';
const steps = [
  '<ki-step state="done" href="#stepper-account">Account</ki-step>',
  '<ki-step state="done">Workspace</ki-step>',
  '<ki-step state="current">Invite</ki-step>',
  '<ki-step>Review</ki-step>',
].join('');

function mount(content = steps, attributes = ''): HTMLElement {
  fixture.insertAdjacentHTML(
    'beforeend',
    `<ki-stepper label="${label}" ${attributes}>${content}</ki-stepper>`,
  );
  const host = fixture.querySelector('ki-stepper');
  if (!host) throw new Error('Stepper fixture did not mount');
  return host;
}

function list() {
  return page.getByRole('list', { name: label });
}

async function accountLink(): Promise<HTMLAnchorElement> {
  const account = page.getByRole('link', { name: /Account/ });
  await expect.element(account).toBeVisible();
  const link = account.element();
  if (!(link instanceof HTMLAnchorElement)) {
    throw new Error('Account did not render as a native link');
  }
  // Default keyboard preferences in macOS WebKit skip native links and
  // buttons without an explicit tabindex.
  link.tabIndex = 0;
  return link;
}

beforeAll(() => {
  defineStep();
  defineCustomElement();
  styles.textContent = tokensCss;
  document.head.append(styles);
  fixture.style.backgroundColor = 'var(--ki-surface-s0)';
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  fixture.style.inlineSize = '';
  fixture.removeAttribute('dir');
  document.documentElement.style.removeProperty('--ki-surface-primary-med-em');
  history.replaceState(history.state, '', initialUrl);
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('S1 stacks the four markers and displays a vertical description', async () => {
  mount(
    '<ki-step state="done">Account</ki-step><ki-step state="current">Invite</ki-step>' +
      '<ki-step description="Confirm the details.">Review</ki-step><ki-step state="error">Publish</ki-step>',
    'orientation="vertical"',
  );
  await expect.element(page.getByText('Confirm the details.')).toBeVisible();
  const markers = [...list().element().querySelectorAll<HTMLElement>('[part="marker"]')];
  const positions = markers.map((node) => node.getBoundingClientRect().top);
  expect(markers).toHaveLength(4);
  expect(positions).toEqual([...new Set(positions)].sort((a, b) => a - b));
  expect(
    markers.map((marker) => marker.querySelector('ki-icon')?.name ?? marker.textContent.trim()),
  ).toEqual(['check', '2', '3', 'circle-alert']);
});

it('S2 compacts at the available width and expands the same list', async () => {
  fixture.style.inlineSize = '24rem';
  mount();
  await expect.element(list()).toBeVisible();

  fixture.style.inlineSize = '18rem';
  const summary = page.getByRole('button', { name: /^Step 3 of 4/ });
  await expect.element(summary).toHaveAccessibleName('Step 3 of 4, Setup progress');
  await expect.element(summary).toHaveAttribute('aria-expanded', 'false');
  await expect.element(list()).not.toBeInTheDocument();

  await summary.click();
  await expect.element(list()).toBeVisible();
  await expect.element(summary).toHaveAttribute('aria-expanded', 'true');
  await expect.element(page.getByRole('link', { name: /Account/ })).toBeVisible();
  await expectAccessible(fixture);
});

it('S3 recalculates the compact position after a direct step is inserted', async () => {
  fixture.style.inlineSize = '18rem';
  const host = mount(steps.replace('<ki-step state="done">Workspace</ki-step>', ''));
  await expect.element(page.getByRole('button', { name: /^Step 2 of 3/ })).toBeVisible();

  const step = document.createElement('ki-step');
  step.textContent = 'Workspace';
  host.insertBefore(step, host.querySelector('[state="current"]'));
  await expect.element(page.getByRole('button', { name: /^Step 3 of 4/ })).toBeVisible();
});

it('S4 tabs to the completed link, skips the current destination, and navigates on Enter', async () => {
  fixture.insertAdjacentHTML('beforeend', '<button type="button" tabindex="0">Previous</button>');
  const host = mount(
    '<ki-step state="done" href="#stepper-account">Account</ki-step>' +
      '<ki-step state="current" href="#stepper-invite">Invite</ki-step>',
    'orientation="vertical"',
  );
  fixture.insertAdjacentHTML(
    'beforeend',
    '<button type="button" tabindex="0" id="stepper-account">Next</button>',
  );
  await expect.element(list()).toBeVisible();
  const account = await accountLink();
  const previous = fixture.querySelector<HTMLButtonElement>('button');
  const next = fixture.querySelector('#stepper-account');
  previous?.focus();

  await userEvent.keyboard('{Tab}');
  expect(host.shadowRoot?.activeElement).toBe(account);
  await userEvent.keyboard('{Tab}');
  expect(document.activeElement).toBe(next);
  await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
  expect(host.shadowRoot?.activeElement).toBe(account);
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => location.hash).toBe('#stepper-account');
});

it('S5 reveals the ordered list with Space and tabs to the completed link', async () => {
  fixture.style.inlineSize = '18rem';
  const host = mount();
  const summary = page.getByRole('button', { name: /^Step 3 of 4/ });
  await expect.element(summary).toBeVisible();
  const button = summary.element() as HTMLButtonElement;
  button.tabIndex = 0;
  button.focus();
  await userEvent.keyboard(' ');

  await expect.element(summary).toHaveAttribute('aria-expanded', 'true');
  await expect.element(list()).toBeVisible();
  const account = await accountLink();
  await userEvent.keyboard('{Tab}');
  expect(host.shadowRoot?.activeElement).toBe(account);
});

it('S6 exposes named, ordered list items with textual states and one current item', async () => {
  mount(
    '<ki-step state="done">Account</ki-step><ki-step state="current">Invite</ki-step>' +
      '<ki-step>Review</ki-step><ki-step state="error">Publish</ki-step>',
    'orientation="vertical"',
  );
  await expect.element(list()).toBeVisible();
  await expect.element(page.getByRole('listitem').nth(1)).toHaveAttribute('aria-current', 'step');
  expect(list().element().querySelectorAll('[aria-current]')).toHaveLength(1);

  const snapshot = await browser.ariaSnapshotByRole('list', label);
  expect(snapshot).toMatch(/- list "Setup progress":/);
  expect(snapshot.match(/- listitem/g)).toHaveLength(4);
  expect(snapshot).toMatch(
    /Account[\s\S]*Completed[\s\S]*Invite[\s\S]*Current[\s\S]*Review[\s\S]*Not started[\s\S]*Publish[\s\S]*Error/,
  );
  await expectAccessible(fixture);
});

it('S7 repaints the completed marker after a semantic theme override', async () => {
  const host = mount(steps, 'orientation="vertical"');
  await expect.element(list()).toBeVisible();
  const marker = host.shadowRoot?.querySelector('[part="marker"]');
  if (!marker) throw new Error('The completed marker did not render');
  expect(getComputedStyle(marker).backgroundColor).not.toBe('rgb(0, 0, 128)');

  document.documentElement.style.setProperty('--ki-surface-primary-med-em', 'navy');

  await expect.poll(() => getComputedStyle(marker).backgroundColor).toBe('rgb(0, 0, 128)');
});

it('S8 keeps the horizontal sequence in RTL reading order', async () => {
  fixture.dir = 'rtl';
  fixture.style.inlineSize = '24rem';
  mount('<ki-step state="done">Account</ki-step><ki-step state="current">Invite</ki-step>');

  await expect.element(list()).toBeVisible();
  const items = page.getByRole('listitem');
  const first = items.nth(0).element().getBoundingClientRect();
  const second = items.nth(1).element().getBoundingClientRect();
  expect(first.top).toBeCloseTo(second.top);
  expect(first.left).toBeGreaterThan(second.left);
});

it('S12 displays a localized total and omits hidden or unrelated children', async () => {
  fixture.style.inlineSize = '18rem';
  mount(
    '<ki-step state="done">Account</ki-step><span>Ignore</span><ki-step hidden>Draft</ki-step><ki-step>Review</ki-step>',
    'summary-label="Paso {current} de {total}" count-label="Pasos ({total})"',
  );
  await expect.element(page.getByRole('button', { name: /^Pasos \(2\)/ })).toBeVisible();
});

it('S2 keeps a focused completed link reachable when the horizontal list narrows', async () => {
  fixture.style.inlineSize = '24rem';
  const host = mount();
  await expect.element(list()).toBeVisible();
  const account = await accountLink();
  account.focus();
  expect(host.shadowRoot?.activeElement).toBe(account);

  // Resize before Stencil has had a chance to render the focus state.
  fixture.style.inlineSize = '18rem';
  const summary = page.getByRole('button', { name: /^Step 3 of 4/ });
  await expect.element(summary).toBeVisible();
  await expect
    .poll(() => ({
      expanded: summary.element().getAttribute('aria-expanded'),
      linkHasFocus: host.shadowRoot?.activeElement === account,
    }))
    .toEqual({ expanded: 'true', linkHasFocus: true });
  await expect.element(list()).toBeVisible();

  (summary.element() as HTMLButtonElement).focus();
  await expect.element(summary).toHaveAttribute('aria-expanded', 'false');
});

it('S2 still closes the compact list after its focused link is removed', async () => {
  fixture.style.inlineSize = '18rem';
  const host = mount();
  await page.getByRole('button', { name: /^Step 3 of 4/ }).click();
  const account = await accountLink();
  account.focus();
  await expect.poll(() => host.shadowRoot?.activeElement).toBe(account);

  host.querySelector('ki-step')?.remove();

  const summary = page.getByRole('button', { name: /^Step 2 of 3/ });
  await expect.element(summary).toHaveAttribute('aria-expanded', 'true');
  await summary.click();
  await expect.element(summary).toHaveAttribute('aria-expanded', 'false');
  await expect.element(list()).not.toBeInTheDocument();
});
