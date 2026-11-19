// @spec:085-ki-details
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-details.js';

const styles = document.createElement('style');
const fixture = document.createElement('main');

const browserCommands = commands as unknown as {
  accessibilityTree: () => Promise<{ name: string; expanded: boolean | null }[] | null>;
  ariaSnapshot: (selector: string) => Promise<string>;
  emulateReducedMotion: (value: 'reduce' | 'no-preference' | null) => Promise<void>;
};

beforeAll(() => {
  defineCustomElement();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  fixture.removeAttribute('dir');
  fixture.removeAttribute('style');
  await parkPointer();
});

afterAll(() => {
  styles.remove();
  fixture.remove();
});

async function mount(markup: string) {
  fixture.innerHTML = markup;
  const host = fixture.querySelector('ki-details');
  if (!host) throw new Error('Missing ki-details fixture');
  const native = () => host.querySelector('details');
  await expect.poll(native).not.toBeNull();
  const panel = native();
  const summary = panel?.querySelector('summary');
  if (!panel || !summary) throw new Error('Missing native disclosure');
  return { host, panel, summary };
}

function toggles(host: HTMLElement): boolean[] {
  const states: boolean[] = [];
  host.addEventListener('ki-toggle', (event) => {
    states.push((event as CustomEvent<{ open: boolean }>).detail.open);
  });
  return states;
}

it('S1 shows and hides the answer and emits each resulting state once', async () => {
  const { host, summary } = await mount(
    '<ki-details summary="Who can see my workspace?"><p>Only invited people.</p></ki-details>',
  );
  const states = toggles(host);
  const answer = page.getByText('Only invited people.');
  await expect.element(answer).not.toBeVisible();

  await userEvent.click(summary);
  await expect.element(answer).toBeVisible();
  await expect.poll(() => states.slice()).toEqual([true]);
  expect(host.open).toBe(true);

  await userEvent.click(summary);
  await expect.element(answer).not.toBeVisible();
  await expect.poll(() => states.slice()).toEqual([true, false]);
  expect(host.open).toBe(false);
});

it('S2 reflects open property writes without replaying a toggle', async () => {
  const { host, panel } = await mount(
    '<ki-details open summary="Exports"><p>Download your data as CSV.</p></ki-details>',
  );
  const states = toggles(host);
  const answer = page.getByText('Download your data as CSV.');
  await expect.element(answer).toBeVisible();

  for (const open of [false, true]) {
    const nativeChange = new Promise<void>((resolve) => {
      panel.addEventListener(
        'toggle',
        () => {
          resolve();
        },
        { once: true },
      );
    });
    host.open = open;
    await nativeChange;
    await expect.poll(() => host.hasAttribute('open')).toBe(open);
    expect(panel.open).toBe(open);
    if (open) {
      await expect.element(answer).toBeVisible();
    } else {
      await expect.element(answer).not.toBeVisible();
    }
  }
  await expect.element(answer).toBeVisible();
  expect(states).toEqual([]);
});

it('S3 keeps open content usable while the summary is disabled', async () => {
  const { host, panel, summary } = await mount(
    '<ki-details open disabled summary="Exports"><button tabindex="0">Download</button></ki-details>',
  );
  const states = toggles(host);
  await expect.poll(() => panel.open).toBe(true);
  summary.click();
  expect(panel.open).toBe(true);
  expect(summary.getAttribute('aria-disabled')).toBe('true');
  const download = page.getByRole('button', { name: 'Download' });
  await expect.element(download).toBeEnabled();
  await expect.element(download).toBeVisible();
  expect(states).toEqual([]);
});

it.each(['Enter', 'Space'])('S7 opens with %s and keeps keyboard focus', async (key) => {
  const { summary } = await mount(
    '<button tabindex="0">Previous</button><ki-details summary="Exports">Export instructions.</ki-details>',
  );
  fixture.querySelector('button')?.focus();
  await userEvent.keyboard('{Tab}');
  expect(document.activeElement).toBe(summary);
  await userEvent.keyboard(key === 'Space' ? ' ' : '{Enter}');

  await expect.element(page.getByText('Export instructions.')).toBeVisible();
  expect(document.activeElement).toBe(summary);
});

it('S8 tabs past a disabled summary to visible focus', async () => {
  const { summary } = await mount(
    '<button tabindex="0">Previous</button><ki-details disabled summary="Unavailable"></ki-details>' +
      '<ki-details summary="Available"></ki-details>',
  );
  await expect.poll(() => fixture.querySelectorAll('summary').length).toBe(2);
  fixture.querySelector('button')?.focus();
  await userEvent.keyboard('{Tab}');

  const enabled = fixture.querySelectorAll('summary')[1];
  expect(summary.tabIndex).toBe(-1);
  expect(document.activeElement).toBe(enabled);
  if (!enabled) throw new Error('Missing the enabled summary');
  expect(getComputedStyle(enabled).outlineStyle).toBe('solid');
  expect(Number.parseFloat(getComputedStyle(enabled).outlineWidth)).toBeGreaterThan(0);
});

it('S9 preserves the rich heading and exposes native expansion without a named icon', async () => {
  const { panel, summary } = await mount(
    '<ki-details id="rich" summary="Fallback label"><h2 slot="summary">Workspace settings</h2>' +
      '<p>Change who can join the workspace.</p></ki-details>',
  );
  expect(summary.querySelector('h2')?.textContent).toBe('Workspace settings');
  expect(summary.querySelector('ki-icon')?.getAttribute('aria-hidden')).toBe('true');
  expect(summary.hasAttribute('aria-expanded')).toBe(false);
  const expectExpanded = async (expanded: boolean): Promise<void> => {
    expect(panel.open).toBe(expanded);
    const tree = await browserCommands.accessibilityTree();
    // The Chromium AX tree exposes the browser's disclosure state. Other
    // engines still exercise native semantics and the rich summary.
    if (tree) {
      expect(
        tree.some((node) => node.name === 'Workspace settings' && node.expanded === expanded),
      ).toBe(true);
    }
  };

  await expectExpanded(false);
  await userEvent.click(summary);
  await expectExpanded(true);
  const snapshot = await browserCommands.ariaSnapshot('#rich');
  expect(snapshot).toContain('Workspace settings');
  expect(snapshot).not.toContain('Fallback label');
  await expectAccessible(fixture);
});

it('S10 reflects a native reveal of the closed answer', async () => {
  const { host, panel, summary } = await mount(
    '<ki-details summary="Permissions"><p>Guests inherit workspace permissions.</p></ki-details>',
  );
  const states = toggles(host);
  const answer = panel.querySelector('p');
  expect(answer?.textContent).toBe('Guests inherit workspace permissions.');
  expect(answer?.closest('[hidden], [inert], [aria-hidden="true"]')).toBeNull();
  expect(panel.firstElementChild).toBe(summary);
  await expect.element(page.getByText('Guests inherit workspace permissions.')).not.toBeVisible();

  // Exercise the native state change the browser uses to reveal a matching
  // ancestor. Browser chrome Find is covered by the manual walkthrough.
  panel.open = true;
  await expect.poll(() => host.hasAttribute('open')).toBe(true);
  await expect.poll(() => states.slice()).toEqual([true]);
});

it.skipIf(!navigator.userAgent.includes('Chrome/'))(
  'S10 reveals a closed native disclosure during fragment navigation',
  async () => {
    const { host } = await mount(
      '<a href="#details-find-target">Go to permissions</a>' +
        '<ki-details summary="Permissions"><p id="details-find-target">Guests inherit access.</p></ki-details>',
    );
    const initialUrl = window.location.href;
    try {
      await page.getByRole('link', { name: 'Go to permissions' }).click();
      await expect.poll(() => host.open).toBe(true);
      await expect.element(page.getByText('Guests inherit access.')).toBeVisible();
    } finally {
      window.history.replaceState(null, '', initialUrl);
    }
  },
);

it('S11 reads the surface, backdrop and hover color from theme tokens', async () => {
  const image = 'linear-gradient(rgb(255, 255, 255), rgb(220, 220, 220))';
  fixture.style.setProperty('--ki-details-bg-image', image);
  fixture.style.setProperty('--ki-details-backdrop-filter', 'blur(2px)');
  fixture.style.setProperty('--ki-details-summary-hover-bg', 'rgb(200, 210, 220)');
  const { panel, summary } = await mount('<ki-details summary="Permissions"></ki-details>');
  expect(getComputedStyle(panel).backgroundImage).toBe(image);
  expect(getComputedStyle(panel).backdropFilter).toBe('blur(2px)');
  if (matchMedia('(hover: hover)').matches) {
    await userEvent.hover(summary);
    expect(getComputedStyle(summary).backgroundColor).toBe('rgb(200, 210, 220)');
  }
});

it('S12 places the chevron at inline end in RTL', async () => {
  fixture.dir = 'rtl';
  const { summary } = await mount('<ki-details><span slot="summary">Workspace</span></ki-details>');
  const label = summary.querySelector('[slot="summary"]');
  const chevron = summary.querySelector('ki-icon');
  if (!label || !chevron) throw new Error('Missing summary text or chevron');
  expect(chevron.getBoundingClientRect().right).toBeLessThan(label.getBoundingClientRect().left);
});

it('S13 rotates the chevron without a transition under reduced motion', async () => {
  await browserCommands.emulateReducedMotion('no-preference');
  try {
    const { summary } = await mount('<ki-details summary="Permissions"></ki-details>');
    const chevron = summary.querySelector('ki-icon');
    if (!chevron) throw new Error('Missing decorative chevron');
    expect(Number.parseFloat(getComputedStyle(chevron).transitionDuration)).toBeGreaterThan(0);

    await browserCommands.emulateReducedMotion('reduce');
    await expect.poll(() => matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    await userEvent.click(summary);
    expect(getComputedStyle(chevron).transitionDuration).toBe('0s');
    expect(getComputedStyle(chevron).rotate).toBe('180deg');
  } finally {
    await browserCommands.emulateReducedMotion(null);
  }
});
