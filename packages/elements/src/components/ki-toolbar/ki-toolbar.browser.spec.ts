// @spec:111-ki-toolbar
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineButton } from '../../../dist/components/ki-button.js';
import { defineCustomElement as defineDivider } from '../../../dist/components/ki-divider.js';
import { defineCustomElement as defineIconButton } from '../../../dist/components/ki-icon-button.js';
import { defineCustomElement } from '../../../dist/components/ki-toolbar.js';

const browser = commands as unknown as {
  ariaSnapshotByRole: (role: string, name: string) => Promise<string>;
  emulateForcedColors: (value: 'active' | null) => Promise<boolean>;
  emulateReducedMotion: (value: 'reduce' | 'no-preference' | null) => Promise<void>;
};
const styles = document.createElement('style');
const fixture = document.createElement('main');

beforeAll(() => {
  defineButton();
  defineIconButton();
  defineDivider();
  defineCustomElement();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  fixture.removeAttribute('style');
  window.scrollTo({ top: 0, behavior: 'instant' });
  await browser.emulateForcedColors(null);
  await browser.emulateReducedMotion(null);
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

const nativeActions = `
  <button type="button" tabindex="0">Bold</button>
  <button type="button" tabindex="0">Italic</button>
  <button type="button" tabindex="0">Insert link</button>
`;

async function mount(attributes = '', actions = nativeActions, before = '', after = '') {
  fixture.innerHTML = `${before}<ki-toolbar label="Formatting" ${attributes}>${actions}</ki-toolbar>${after}`;
  const toolbar = fixture.querySelector('ki-toolbar');
  if (!toolbar) throw new Error('Expected the toolbar host');
  const role = page.getByRole('toolbar', { name: 'Formatting' });
  await expect.element(role).toBeVisible();
  return { toolbar, surface: role.element() as HTMLElement };
}

function action(name: string) {
  return page.getByRole('button', { name, exact: true });
}

function rendered(name: string) {
  return action(name).element() as HTMLButtonElement;
}

function scrollTo(top: number) {
  fixture.style.minBlockSize = '300vh';
  window.scrollTo({ top, behavior: 'instant' });
}

async function expectOpacity(toolbar: HTMLElement, opacity: string) {
  await expect.poll(() => getComputedStyle(toolbar).opacity).toBe(opacity);
}

it('S1: lays out a floating toolbar as a pill', async () => {
  const { surface } = await mount();
  const bold = rendered('Bold').getBoundingClientRect();
  const link = rendered('Insert link').getBoundingClientRect();
  expect(bold.left).toBeLessThan(link.left);
  expect(bold.top).toBeCloseTo(link.top);
  expect(Number.parseFloat(getComputedStyle(surface).borderStartStartRadius)).toBeGreaterThan(0);
});

it('S2: docks horizontally across the bottom edge with safe-area padding', async () => {
  const { surface } = await mount('variant="docked" orientation="vertical"');
  const probe = document.createElement('span');
  probe.style.paddingBlockEnd = 'env(safe-area-inset-bottom, 0px)';
  fixture.append(probe);
  const safeArea = Number.parseFloat(getComputedStyle(probe).paddingBlockEnd);
  const css = getComputedStyle(surface);
  const rect = surface.getBoundingClientRect();
  expect(rect.left).toBeCloseTo(0, 0);
  expect(rect.right).toBeCloseTo(document.documentElement.clientWidth, 0);
  expect(rect.bottom).toBeCloseTo(document.documentElement.clientHeight, 0);
  expect(rect.height).toBeGreaterThanOrEqual(64 + safeArea);
  expect(Number.parseFloat(css.paddingBlockEnd)).toBeCloseTo(
    Number.parseFloat(css.paddingBlockStart) + safeArea,
  );
  expect(css.borderStartStartRadius).toBe('0px');
  expect(css.boxShadow).toBe('none');
  expect(surface.getAttribute('aria-orientation')).toBe('horizontal');
  expect(rendered('Bold').getBoundingClientRect().top).toBeCloseTo(
    rendered('Insert link').getBoundingClientRect().top,
  );
});

it('S3: gives a floating companion action its own Tab stop after the toolbar', async () => {
  const { surface } = await mount(
    '',
    nativeActions + '<button type="button" slot="fab" tabindex="0">Reply</button>',
  );
  const reply = rendered('Reply');
  expect(reply.getBoundingClientRect().left).toBeGreaterThanOrEqual(
    surface.getBoundingClientRect().right,
  );
  const tree = await browser.ariaSnapshotByRole('toolbar', 'Formatting');
  expect(tree).toContain('button "Bold"');
  expect(tree).not.toContain('Reply');
  rendered('Bold').focus();
  await userEvent.keyboard('{Tab}');
  expect(document.activeElement).toBe(reply);
});

it('S4: slides away on downward page scroll when enabled', async () => {
  await browser.emulateReducedMotion('no-preference');
  const { toolbar } = await mount('variant="docked" hide-on-scroll');
  const originalTop = toolbar.getBoundingClientRect().top;
  scrollTo(200);
  await expectOpacity(toolbar, '0');
  expect(toolbar.getBoundingClientRect().top).toBeGreaterThan(originalTop);
  expect(getComputedStyle(toolbar).pointerEvents).toBe('none');
});

it('S5: returns to its original position when the page scrolls up', async () => {
  const { toolbar } = await mount('variant="docked" hide-on-scroll');
  const top = toolbar.getBoundingClientRect().top;
  scrollTo(200);
  await expectOpacity(toolbar, '0');
  scrollTo(100);
  await expectOpacity(toolbar, '1');
  await expect.poll(() => Math.abs(toolbar.getBoundingClientRect().top - top)).toBeLessThan(0.5);
});

it('honors a hide-on-scroll property assigned immediately after connection', async () => {
  fixture.innerHTML = `<ki-toolbar label="Formatting" variant="docked">${nativeActions}</ki-toolbar>`;
  const toolbar = fixture.querySelector('ki-toolbar');
  if (!toolbar) throw new Error('Expected the toolbar host');
  toolbar.hideOnScroll = true;

  await expect.element(page.getByRole('toolbar', { name: 'Formatting' })).toBeVisible();
  scrollTo(200);
  await expectOpacity(toolbar, '0');
});

it('keeps its position and visibility on scroll by default', async () => {
  const { toolbar } = await mount('variant="docked"');
  const top = toolbar.getBoundingClientRect().top;
  const event = new Promise<void>((resolve) => {
    window.addEventListener(
      'scroll',
      () => {
        resolve();
      },
      { once: true },
    );
  });
  scrollTo(200);
  await event;
  expect(getComputedStyle(toolbar).opacity).toBe('1');
  expect(toolbar.getBoundingClientRect().top).toBeCloseTo(top);
});

it('S6: wraps horizontal focus and skips disabled actions and dividers', async () => {
  await mount(
    '',
    `<ki-icon-button label="Bold" variant="ghost"></ki-icon-button>
     <ki-divider orientation="vertical"></ki-divider>
     <ki-icon-button label="Italic" variant="ghost" disabled></ki-icon-button>
     <ki-button variant="ghost">Insert link</ki-button>`,
  );
  await expect.element(action('Bold')).toBeVisible();
  await expect.element(action('Insert link')).toBeVisible();
  const bold = rendered('Bold');
  const link = rendered('Insert link');
  await expect.poll(() => link.tabIndex).toBe(-1);
  link.focus();
  await userEvent.keyboard('{ArrowRight}');
  expect((bold.getRootNode() as ShadowRoot).activeElement).toBe(bold);
  await userEvent.keyboard('{ArrowRight}');
  expect((link.getRootNode() as ShadowRoot).activeElement).toBe(link);
});

it('S7: follows vertical arrows and leaves horizontal arrows alone', async () => {
  const { surface } = await mount(
    'orientation="vertical"',
    '<button type="button">Zoom in</button><button type="button">Zoom out</button>',
  );
  expect(surface.getAttribute('aria-orientation')).toBe('vertical');
  const zoomIn = rendered('Zoom in');
  const zoomOut = rendered('Zoom out');
  expect(zoomIn.getBoundingClientRect().bottom).toBeLessThan(zoomOut.getBoundingClientRect().top);
  zoomIn.focus();
  await userEvent.keyboard('{ArrowRight}');
  expect(document.activeElement).toBe(zoomIn);
  await userEvent.keyboard('{ArrowDown}');
  expect(document.activeElement).toBe(zoomOut);
  await userEvent.keyboard('{ArrowUp}');
  expect(document.activeElement).toBe(zoomIn);
});

it.each([
  { key: 'Home', target: 'Bold' },
  { key: 'End', target: 'Insert link' },
])('S8: $key moves focus to $target', async ({ key, target }) => {
  await mount();
  rendered('Italic').focus();
  await userEvent.keyboard(`{${key}}`);
  expect(document.activeElement).toBe(rendered(target));
});

it('S9: tabs in at the last focused action and then leaves the toolbar', async () => {
  await mount(
    '',
    `<ki-button variant="ghost">Bold</ki-button>
     <ki-icon-button label="Italic" variant="ghost"></ki-icon-button>
     <ki-button variant="ghost">Insert link</ki-button>`,
    '<button type="button" tabindex="0">Before</button>',
    '<button type="button" tabindex="0">After</button>',
  );
  await expect.element(action('Insert link')).toBeVisible();
  const link = rendered('Insert link');
  await expect.poll(() => link.tabIndex).toBe(-1);
  link.focus();
  rendered('Before').focus();
  await userEvent.keyboard('{Tab}');
  expect((link.getRootNode() as ShadowRoot).activeElement).toBe(link);
  await userEvent.keyboard('{Tab}');
  expect(document.activeElement).toBe(rendered('After'));
  await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
  expect((link.getRootNode() as ShadowRoot).activeElement).toBe(link);
});

it('S10: reveals a scroll-hidden toolbar immediately on keyboard focus', async () => {
  const { toolbar } = await mount(
    'variant="docked" hide-on-scroll',
    nativeActions,
    '<button type="button" tabindex="0" style="position: fixed">Before</button>',
  );
  rendered('Before').focus();
  scrollTo(200);
  await expectOpacity(toolbar, '0');
  await userEvent.keyboard('{Tab}');
  expect(document.activeElement).toBe(rendered('Bold'));
  expect(getComputedStyle(toolbar).opacity).toBe('1');
  expect(toolbar.getBoundingClientRect().bottom).toBeCloseTo(
    document.documentElement.clientHeight,
    0,
  );
});

it('S11: exposes the name and preserves the toggle’s pressed state and Space activation', async () => {
  const { surface } = await mount('', '<button type="button" aria-pressed="false">Bold</button>');
  const bold = rendered('Bold');
  bold.addEventListener(
    'click',
    () => {
      bold.setAttribute('aria-pressed', 'true');
    },
    { once: true },
  );
  bold.focus();
  await userEvent.keyboard(' ');
  const pressed = page.getByRole('button', { name: 'Bold', pressed: true });
  await expect.element(pressed).toBeVisible();
  expect(await browser.ariaSnapshotByRole('toolbar', 'Formatting')).toContain(
    'button "Bold" [pressed]',
  );
  expect(surface.getAttribute('aria-label')).toBe('Formatting');
  await expectAccessible(fixture);
});

it('S12: uses an overridable vibrant color pair, background image and backdrop filter', async () => {
  const { toolbar, surface } = await mount('tone="vibrant"');
  toolbar.style.setProperty('--ki-toolbar-vibrant-bg', 'rgb(20, 30, 40)');
  toolbar.style.setProperty('--ki-toolbar-vibrant-fg', 'rgb(240, 230, 220)');
  toolbar.style.setProperty('--ki-toolbar-bg-image', 'linear-gradient(black, transparent)');
  toolbar.style.setProperty('--ki-toolbar-backdrop-filter', 'blur(4px)');
  const css = getComputedStyle(surface);
  expect(css.backgroundColor).toBe('rgb(20, 30, 40)');
  expect(css.color).toBe('rgb(240, 230, 220)');
  expect(css.backgroundImage).toContain('linear-gradient');
  expect(css.backdropFilter).toBe('blur(4px)');
});

it('S13: follows visual horizontal order in RTL', async () => {
  await mount(
    'dir="rtl"',
    '<button type="button">Bold</button><button type="button">Insert link</button>',
  );
  const bold = rendered('Bold');
  const link = rendered('Insert link');
  expect(bold.getBoundingClientRect().left).toBeGreaterThan(link.getBoundingClientRect().left);
  bold.focus();
  await userEvent.keyboard('{ArrowLeft}');
  expect(document.activeElement).toBe(link);
});

it('S14: keeps a system-colored edge in forced colors', async ({ skip }) => {
  await browser.emulateForcedColors('active');
  if (!navigator.userAgent.includes('Chrome/') && !matchMedia('(forced-colors: active)').matches) {
    skip('This browser cannot emulate forced colors');
  }
  expect(matchMedia('(forced-colors: active)').matches).toBe(true);
  const { surface } = await mount('tone="vibrant"');
  const probe = document.createElement('span');
  probe.style.color = 'CanvasText';
  fixture.append(probe);
  const css = getComputedStyle(surface);
  expect(css.outlineStyle).toBe('solid');
  expect(css.outlineColor).toBe(getComputedStyle(probe).color);
  expect(Number.parseFloat(css.outlineWidth)).toBeGreaterThan(0);
});

it('S15: hides without animated movement under reduced motion', async () => {
  const { toolbar } = await mount('variant="docked" hide-on-scroll');
  await browser.emulateReducedMotion('reduce');
  await expect.poll(() => matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
  const originalTop = toolbar.getBoundingClientRect().top;
  scrollTo(200);
  await expectOpacity(toolbar, '0');
  expect(toolbar.getBoundingClientRect().top).toBeCloseTo(originalTop);
  expect(getComputedStyle(toolbar).transitionDuration).toBe('0s');
});

it('S17: leaves its FAB unexposed when docked', async () => {
  await mount(
    'variant="docked"',
    nativeActions + '<button type="button" slot="fab">Reply</button>',
  );
  await expect.element(action('Reply')).not.toBeInTheDocument();
  expect(fixture.querySelector<HTMLButtonElement>('[slot="fab"]')?.getClientRects()).toHaveLength(
    0,
  );
});

it('S18: makes the next available control the Tab stop when the current one is disabled', async () => {
  await mount(
    '',
    '<ki-button variant="ghost">Bold</ki-button><ki-button variant="ghost">Insert link</ki-button>',
    '<button type="button" tabindex="0">Before</button>',
  );
  await expect.element(action('Bold')).toBeVisible();
  await expect.element(action('Insert link')).toBeVisible();
  const bold = rendered('Bold');
  const link = rendered('Insert link');
  await expect.poll(() => link.tabIndex).toBe(-1);
  const first = fixture.querySelector('ki-button');
  if (!first) throw new Error('Expected the first slotted ki-button');
  first.disabled = true;
  await expect.poll(() => link.tabIndex).toBe(0);
  expect(bold.disabled).toBe(true);
  rendered('Before').focus();
  await userEvent.keyboard('{Tab}');
  expect((link.getRootNode() as ShadowRoot).activeElement).toBe(link);
});

it('gives Tab to the first displayed action', async () => {
  await mount(
    '',
    '<button type="button" style="display:none">Bold</button><button type="button">Insert link</button>',
    '<button type="button" tabindex="0">Before</button>',
  );
  const link = rendered('Insert link');
  await expect.poll(() => link.getAttribute('tabindex')).toBe('0');
  rendered('Before').focus();
  await userEvent.keyboard('{Tab}');
  expect(document.activeElement).toBe(link);
});

it('restores a slotted button’s tabindex after it leaves', async () => {
  const { toolbar } = await mount(
    '',
    '<button type="button">Bold</button><button type="button">Italic</button>',
  );
  const italic = rendered('Italic');
  await expect.poll(() => italic.tabIndex).toBe(-1);
  toolbar.after(italic);
  await expect.poll(() => italic.getAttribute('tabindex')).toBeNull();
});
