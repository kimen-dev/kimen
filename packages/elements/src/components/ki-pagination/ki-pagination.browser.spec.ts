// @spec:100-ki-pagination
import tokensCss from '@kimen/tokens/css?raw';
import pageCss from '@kimen/tokens/css/base?raw';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-pagination.js';

const styles = document.createElement('style');
const fixture = document.createElement('main');
const media = commands as unknown as {
  emulateForcedColors: (mode: 'active' | null) => Promise<void>;
  emulateReducedMotion: (mode: 'reduce' | null) => Promise<void>;
};

beforeAll(() => {
  defineCustomElement();
  styles.textContent = `${tokensCss}\n${pageCss}`;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  await parkPointer();
  fixture.replaceChildren();
  fixture.style.removeProperty('inline-size');
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

function mount(
  attributes = 'page="5" pages="12"',
  width = 640,
): HTMLElementTagNameMap['ki-pagination'] {
  fixture.style.inlineSize = `${String(width)}px`;
  fixture.insertAdjacentHTML('beforeend', `<ki-pagination ${attributes}></ki-pagination>`);
  const host = fixture.querySelector('ki-pagination');
  if (!host) throw new Error('Pagination fixture did not mount');
  return host;
}

const numbered = (number: number, role: 'button' | 'link' = 'button') =>
  page.getByRole(role, { exact: true, name: `Page ${String(number)}` });

it('S1 displays the nearby pages, boundaries and omitted ranges in order', async () => {
  const host = mount();
  await expect.element(numbered(5)).toBeVisible();
  const list = host.shadowRoot?.querySelector('ol');
  expect(Array.from(list?.children ?? [], (item) => item.textContent)).toEqual([
    '1',
    '…',
    '4',
    '5',
    '6',
    '…',
    '12',
  ]);
});

it('S2 requests a different page and keeps the current page until the host updates it', async () => {
  const host = mount();
  const onRequest = vi.fn<(event: CustomEvent<{ page: number }>) => void>();
  host.addEventListener('ki-page-change', onRequest);
  await numbered(5).click();
  expect(onRequest).not.toHaveBeenCalled();
  await numbered(6).click();
  expect(onRequest).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ detail: { page: 6 } }),
  );
  await expect.element(numbered(5)).toHaveAttribute('aria-current', 'page');
  host.page = 6;
  await expect.element(numbered(6)).toHaveAttribute('aria-current', 'page');
  expect(onRequest).toHaveBeenCalledTimes(1);
});

it('S3 swaps to compact below 480 pixels with the secondary direction controls', async () => {
  mount(undefined, 480);
  await expect.element(numbered(5)).toBeVisible();
  fixture.style.inlineSize = '479px';
  await expect.element(page.getByText('Page 5 of 12', { exact: true })).toBeVisible();
  await expect.element(numbered(5)).not.toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Previous page' })).toBeVisible();
  const next = page.getByRole('button', { name: 'Next page' });
  await expect.element(next).toBeVisible();
  const root = next.element().getRootNode();
  expect(root instanceof ShadowRoot && root.host.getAttribute('variant')).toBe('secondary');
});

// Regression (design-system review 2026-11-20, item 2): size containment gave
// the host no intrinsic width, so a flex row shrank it to zero and every
// variant collapsed, the numbered one into its compact form.
it('S3 keeps its available inline size inside a flex row instead of collapsing', async () => {
  fixture.style.inlineSize = '1280px';
  fixture.insertAdjacentHTML(
    'beforeend',
    `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px">
      <ki-pagination page="5" pages="12" label="Search results pages"></ki-pagination>
      <ki-pagination page="5" pages="12" variant="compact" label="Table pages"></ki-pagination>
      <ki-pagination variant="load-more" shown="20" total="240" label="More search results"></ki-pagination>
    </div>`,
  );
  const [numberedHost, compactHost, loadMoreHost] = Array.from(
    fixture.querySelectorAll('ki-pagination'),
  );
  if (!numberedHost || !compactHost || !loadMoreHost) throw new Error('Pagination did not mount');

  // The numbered window, not its compact fallback, at the row's full width.
  await expect.element(numbered(5)).toBeVisible();
  expect(numberedHost.getBoundingClientRect().width).toBeGreaterThan(480);

  // Each control sits on one line: the compact steppers side by side, and the
  // status and the Load more label unwrapped.
  const inShadow = (host: Element, selector: string): Element => {
    const node = host.shadowRoot?.querySelector(selector);
    if (!node) throw new Error(`Missing ${selector}`);
    return node;
  };
  const lines = (node: Element): number => {
    const range = document.createRange();
    range.selectNodeContents(node);
    return new Set(Array.from(range.getClientRects(), (rect) => Math.round(rect.top))).size;
  };
  const previous = inShadow(compactHost, '[part="previous"]').getBoundingClientRect();
  const next = inShadow(compactHost, '[part="next"]').getBoundingClientRect();
  expect(compactHost.getBoundingClientRect().width).toBeGreaterThan(0);
  expect(Math.abs(previous.top - next.top)).toBeLessThan(1);
  expect(next.left).toBeGreaterThan(previous.right);
  expect(loadMoreHost.getBoundingClientRect().width).toBeGreaterThan(0);
  expect(lines(inShadow(loadMoreHost, '[part="status"]'))).toBe(1);
  expect(lines(inShadow(loadMoreHost, '[part="load-more"]'))).toBe(1);
});

it.each([
  ['pages', 1, 'Previous page'],
  ['pages', 12, 'Next page'],
  ['compact', 1, 'Previous page'],
  ['compact', 12, 'Next page'],
])(
  'S4 keeps the %s boundary at page %i visible and unavailable (%s)',
  async (variant, current, name) => {
    const host = mount(`variant="${variant}" page="${String(current)}" pages="12"`);
    const control = page.getByRole('button', { name });
    await expect.element(control).toBeVisible();
    await expect.element(control).toBeDisabled();
    const onRequest = vi.fn();
    host.addEventListener('ki-page-change', onRequest);
    (control.element() as HTMLButtonElement).click();
    expect(onRequest).not.toHaveBeenCalled();
  },
);

it('S5 renders native numbered links and direction links with the substituted destination', async () => {
  const host = mount('page="5" pages="12" href-template="?page={page}"');
  await expect.element(numbered(6, 'link')).toHaveAttribute('href', '?page=6');
  await expect
    .element(page.getByRole('link', { name: 'Next page' }))
    .toHaveAttribute('href', '?page=6');
  await expect.element(numbered(5, 'link')).toHaveAttribute('aria-current', 'page');

  host.hrefTemplate = '#results-{page}';
  await expect.element(numbered(6, 'link')).toHaveAttribute('href', '#results-6');
  const originalUrl = location.href;
  try {
    await page.getByRole('link', { name: 'Next page' }).click();
    await expect.poll(() => location.hash).toBe('#results-6');
    host.addEventListener(
      'ki-page-change',
      (event) => {
        event.preventDefault();
      },
      { once: true },
    );
    await page.getByRole('link', { name: 'Previous page' }).click();
    expect(location.hash).toBe('#results-6');
  } finally {
    history.replaceState(history.state, '', originalUrl);
  }
});

it('S6 tabs to a page, shows a focus ring, and hands focus to the updated results', async () => {
  fixture.innerHTML = '<h2 tabindex="-1">Results page 5</h2>';
  const host = mount();
  const heading = fixture.querySelector('h2');
  host.addEventListener('ki-page-change', (event) => {
    host.page = event.detail.page;
    if (!heading) throw new Error('Missing results heading');
    heading.textContent = `Results page ${String(event.detail.page)}`;
    heading.focus();
  });

  await expect.element(numbered(6)).toBeVisible();
  (numbered(5).element() as HTMLButtonElement).focus();
  await userEvent.keyboard('{Tab}');
  const target = numbered(6).element();
  expect(host.shadowRoot?.activeElement).toBe(target);
  expect(target.matches(':focus-visible')).toBe(true);
  expect(getComputedStyle(target).outlineStyle).toBe('solid');
  await userEvent.keyboard('{Enter}');
  await expect.element(numbered(6)).toHaveAttribute('aria-current', 'page');
  expect(heading?.textContent).toBe('Results page 6');
  expect(document.activeElement).toBe(heading);
});

it('S7 exposes the landmark and current page, hides omitted ranges, and passes axe', async () => {
  const host = mount('page="5" pages="12" label="Search results pages"');
  await expect
    .element(page.getByRole('navigation', { name: 'Search results pages' }))
    .toBeVisible();
  await expect.element(numbered(5)).toHaveAttribute('aria-current', 'page');
  const gaps = Array.from(host.shadowRoot?.querySelectorAll('[part="gap"]') ?? []);
  expect(gaps.map((gap) => gap.getAttribute('aria-hidden'))).toEqual(['true', 'true']);
  await expectAccessible(fixture);
});

it('S8 loads the final batch by Space and retains focus while the polite status updates', async () => {
  const host = mount('variant="load-more" shown="20" total="40"');
  const onLoad = vi.fn(() => {
    host.shown = 40;
  });
  host.addEventListener('ki-load-more', onLoad);
  const button = page.getByRole('button', { name: 'Load more' });
  const status = page.getByRole('status').filter({ hasText: /^Showing /u });
  await expect.element(status).toHaveTextContent('Showing 20 of 40 results');
  await expect.element(status).toHaveAttribute('aria-live', 'polite');
  const liveRegion = status.element();
  await expect.element(button).toBeVisible();
  const native = button.element() as HTMLButtonElement;
  native.focus();
  await userEvent.keyboard(' ');
  await expect.element(status).toHaveTextContent('Showing 40 of 40 results');
  expect(status.element()).toBe(liveRegion);
  expect(native.getRootNode()).toBeInstanceOf(ShadowRoot);
  expect((native.getRootNode() as ShadowRoot).activeElement).toBe(native);
  await expect.element(button).toBeDisabled();
  await userEvent.keyboard(' ');
  expect(onLoad).toHaveBeenCalledTimes(1);
  await expectAccessible(fixture);
});

it('S9 repaints the current page when the consumer overrides its background token', async () => {
  const host = mount();
  await expect.element(numbered(5)).toBeVisible();
  host.style.setProperty('--ki-pagination-current-bg', 'rgb(12, 22, 32)');
  expect(getComputedStyle(numbered(5).element()).backgroundColor).toBe('rgb(12, 22, 32)');
  expect(getComputedStyle(numbered(6).element()).backgroundColor).not.toBe('rgb(12, 22, 32)');
});

it('S13 mirrors the direction icons in RTL without turning Previous into Next', async () => {
  const host = mount('variant="compact" page="5" pages="12"', 400);
  const previous = page.getByRole('button', { name: 'Previous page' });
  await expect.element(previous).toBeVisible();
  const previousIcon = host.shadowRoot?.querySelector('[part="previous"] ki-icon');
  const nextIcon = host.shadowRoot?.querySelector('[part="next"] ki-icon');
  if (!previousIcon || !nextIcon) throw new Error('Missing direction glyphs');
  const previousTransform = getComputedStyle(previousIcon).transform;
  const nextTransform = getComputedStyle(nextIcon).transform;
  expect(previousTransform).not.toBe(nextTransform);
  host.dir = 'rtl';
  await expect.poll(() => getComputedStyle(previousIcon).transform).toBe(nextTransform);
  await expect.poll(() => getComputedStyle(nextIcon).transform).toBe(previousTransform);
  const onRequest = vi.fn();
  host.addEventListener('ki-page-change', onRequest);
  await previous.click();
  expect(onRequest).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ detail: { page: 4 } }),
  );
});

it('keeps the current page visually distinguishable under forced colors', async ({ skip }) => {
  await media.emulateForcedColors('active');
  try {
    if (!matchMedia('(forced-colors: active)').matches) skip('Forced-colors emulation unavailable');
    mount();
    await expect.element(numbered(5)).toBeVisible();
    const current = getComputedStyle(numbered(5).element());
    const other = getComputedStyle(numbered(6).element());
    expect(current.backgroundColor).not.toBe(other.backgroundColor);
    expect(current.color).not.toBe(current.backgroundColor);
  } finally {
    await media.emulateForcedColors(null);
  }
});

it('keeps page changes free of motion with reduced motion enabled', async () => {
  await media.emulateReducedMotion('reduce');
  try {
    const host = mount();
    await expect.element(numbered(5)).toBeVisible();
    host.page = 6;
    await expect.element(numbered(6)).toHaveAttribute('aria-current', 'page');
    expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    expect(numbered(6).element().getAnimations()).toEqual([]);
  } finally {
    await media.emulateReducedMotion(null);
  }
});
