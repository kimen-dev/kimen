// @spec:044-reduced-transparency
//
// Reduced transparency (spec 044). Each test opens real glass components —
// the select listbox, the tooltip, the dialog, the secondary button, the
// neutral and tinted badges and alerts, the avatar-group counter, the video
// control — puts the page under `prefers-reduced-transparency: reduce` (CDP,
// Chromium), `prefers-contrast: more` or the page's own declaration, and reads
// the painted fill alpha and backdrop filter of each content surface.
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import { textMeasurements } from './contracts';
import {
  blurs,
  byPart,
  deepElements,
  fillsOf,
  findDeep,
  hueOf,
  installKimen,
  isOpaque,
  mount,
  parseColor,
  resetPreferences,
  resetRoot,
  settleAnimations,
  SCHEMES,
  surfaceOf,
  THEMES,
  themeDocument,
  underContrast,
  underTransparency,
  uninstallKimen,
  unmountAll,
} from './modes';

const SELECT =
  '<ki-select label="Country" placeholder="Choose a country">' +
  '<ki-option value="es">Spain</ki-option><ki-option value="pt">Portugal</ki-option></ki-select>';
const TOOLTIP = '<ki-tooltip label="Copy link"><button type="button">Copy</button></ki-tooltip>';
const SECONDARY = '<ki-button variant="secondary">Cancel</ki-button>';

function host(fixture: HTMLElement, selector: string): HTMLElement {
  const found = fixture.querySelector<HTMLElement>(selector);
  if (found === null) throw new Error(`no ${selector} mounted`);
  return found;
}

async function openSelect(fixture: HTMLElement): Promise<HTMLElement> {
  const select = host(fixture, 'ki-select');
  findDeep(select, byPart('trigger')).click();
  const listbox = findDeep(select, byPart('listbox'));
  await expect.poll(() => listbox.checkVisibility()).toBe(true);
  await settleAnimations();
  return listbox;
}

async function showTooltip(fixture: HTMLElement): Promise<HTMLElement> {
  const tooltip = host(fixture, 'ki-tooltip');
  host(fixture, 'ki-tooltip > button').focus();
  const bubble = findDeep(tooltip, byPart('tooltip'));
  await expect.poll(() => bubble.checkVisibility({ opacityProperty: true })).toBe(true);
  await settleAnimations();
  return bubble;
}

async function openDialog(fixture: HTMLElement): Promise<HTMLElement> {
  const dialog = host(fixture, 'ki-dialog') as HTMLElement & { show: () => Promise<void> };
  await dialog.show();
  const surface = findDeep(dialog, byPart('dialog'));
  await expect.poll(() => (surface as HTMLDialogElement).open).toBe(true);
  await settleAnimations();
  return surface;
}

/** A content surface is solid: every fill layer opaque, nothing blurred behind it. */
function expectSolid(surface: HTMLElement, label: string): void {
  expect(isOpaque(surface), `${label} paints a translucent fill`).toBe(true);
  expect(blurs(surface), `${label} still blurs what is behind it`).toBe(false);
}

function expectReadable(fixture: HTMLElement): void {
  const weak = textMeasurements(fixture).filter((text) => text.ratio < 4.5);
  expect(weak.map((text) => `${text.where} "${text.text}" ${text.ratio.toFixed(2)}`)).toEqual([]);
}

beforeAll(async () => {
  await installKimen();
});

afterEach(async () => {
  unmountAll();
  resetRoot();
  await resetPreferences();
});

afterAll(async () => {
  await uninstallKimen();
});

describe('044 reduced transparency under the system preference', () => {
  it('S1: glass surfaces become opaque under the system preference', async (context) => {
    const fixture = await mount(SELECT + TOOLTIP + SECONDARY);
    await underTransparency('reduce', context);
    const listbox = await openSelect(fixture);
    const bubble = await showTooltip(fixture);
    const button = findDeep(host(fixture, 'ki-button'), byPart('button'));

    expectSolid(listbox, 'listbox');
    expectSolid(bubble, 'tooltip');
    expectSolid(button, 'secondary button');
  });

  it('S2: tinted alerts and badges keep their tone on an opaque surface', async (context) => {
    themeDocument('onmars', 'dark');
    // Since spec 011 A1 an onmars alert wears its tone on the icon frame
    // alone: that frame is the alert's tinted surface.
    const fixture = await mount(
      '<ki-alert tone="info"><svg slot="icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="currentColor"></circle></svg>Saved</ki-alert><ki-badge tone="success">Paid</ki-badge>',
    );
    await underTransparency('no-preference', context);
    const alert = findDeep(host(fixture, 'ki-alert'), byPart('icon'));
    const badge = findDeep(host(fixture, 'ki-badge'), byPart('badge'));
    const standardHues = [hueOf(surfaceOf(alert)), hueOf(surfaceOf(badge))];
    await underTransparency('reduce', context);

    for (const [index, surface] of [alert, badge].entries()) {
      expectSolid(surface, surface.getAttribute('part') ?? 'surface');
      const hue = hueOf(surfaceOf(surface));
      const standard = standardHues[index];
      expect(hue, 'the opaque surface lost its tone').not.toBeNull();
      expect(standard).not.toBeNull();
      const distance = Math.abs((hue ?? 0) - (standard ?? 0));
      expect(Math.min(distance, 360 - distance), 'hue drift').toBeLessThan(30);
    }
    expectReadable(fixture);
  });

  it('S3: a floating surface stays distinguishable from the page', async (context) => {
    const fixture = await mount(SELECT);
    const listbox = await openSelect(fixture);
    const standard = getComputedStyle(listbox);
    const shadow = standard.boxShadow;
    const edge = `${standard.borderTopWidth} ${standard.borderTopStyle}`;
    await underTransparency('reduce', context);

    const reduced = getComputedStyle(listbox);
    expect(reduced.boxShadow).not.toBe('none');
    expect(reduced.boxShadow).toBe(shadow);
    expect(`${reduced.borderTopWidth} ${reduced.borderTopStyle}`).toBe(edge);
  });

  it('S4: a dialog becomes opaque while its backdrop still dims the page', async (context) => {
    const fixture = await mount(
      '<ki-dialog heading="Delete file">This cannot be undone.</ki-dialog>',
    );
    await underTransparency('reduce', context);
    const surface = await openDialog(fixture);

    expectSolid(surface, 'dialog');
    await expect
      .poll(() => parseColor(getComputedStyle(surface, '::backdrop').backgroundColor).a)
      .toBeGreaterThan(0);
    expect(parseColor(getComputedStyle(surface, '::backdrop').backgroundColor).a).toBeLessThan(1);
  });

  describe.each(THEMES.flatMap((theme) => SCHEMES.map((scheme) => [theme, scheme] as const)))(
    'S5: every content surface is opaque in %s %s',
    (theme, scheme) => {
      it(`S5: every glass component paints opaque, unblurred, readable surfaces in ${theme} ${scheme}`, async (context) => {
        themeDocument(theme, scheme);
        const fixture = await mount(
          SELECT +
            TOOLTIP +
            SECONDARY +
            '<ki-badge>Draft</ki-badge><ki-badge tone="warning">Late</ki-badge>' +
            '<ki-alert>Heads up</ki-alert><ki-alert tone="success">Done</ki-alert>' +
            '<ki-avatar-group max="1"><ki-avatar initials="AB" label="Ana Bell"></ki-avatar>' +
            '<ki-avatar initials="CD" label="Cy Dale"></ki-avatar></ki-avatar-group>' +
            '<ki-dialog heading="Delete file">This cannot be undone.</ki-dialog>',
        );
        await underTransparency('reduce', context);
        const surfaces: [string, HTMLElement][] = [
          ['listbox', await openSelect(fixture)],
          ['tooltip', await showTooltip(fixture)],
          ['secondary button', findDeep(host(fixture, 'ki-button'), byPart('button'))],
          ...[...fixture.querySelectorAll<HTMLElement>('ki-badge')].map(
            (badge) =>
              [`badge ${badge.textContent}`, findDeep(badge, byPart('badge'))] as [
                string,
                HTMLElement,
              ],
          ),
          ...[...fixture.querySelectorAll<HTMLElement>('ki-alert')].map(
            (alert) =>
              [`alert ${alert.textContent}`, findDeep(alert, byPart('alert'))] as [
                string,
                HTMLElement,
              ],
          ),
          ['avatar-group counter', findDeep(host(fixture, 'ki-avatar-group'), byPart('counter'))],
        ];
        for (const [label, surface] of surfaces) expectSolid(surface, label);
        expectReadable(fixture);

        const dialog = await openDialog(fixture);
        expectSolid(dialog, 'dialog');
        expectReadable(fixture);
      });
    },
  );

  it('S5: the video play control loses its blur and keeps an opaque container', async (context) => {
    const fixture = await mount(
      '<ki-video label="Product tour"><video preload="none"></video></ki-video>',
    );
    await underTransparency('reduce', context);
    const video = host(fixture, 'ki-video');
    const play = findDeep(video, byPart('play'));

    expect(deepElements(video).filter((element) => blurs(element))).toEqual([]);
    const container = deepElements(play).find(
      (element) => element !== play && fillsOf(element).length > 0,
    );
    expect(container, 'the play control has a container').toBeDefined();
    if (container !== undefined) expect(isOpaque(container)).toBe(true);
  });

  it('S9: hover and press washes keep tinting the control they sit on', async (context) => {
    const fixture = await mount('<ki-button variant="ghost">More</ki-button>');
    await underTransparency('reduce', context);
    const button = findDeep(host(fixture, 'ki-button'), byPart('button'));
    await userEvent.hover(button);
    await settleAnimations();

    await expect.poll(() => fillsOf(button).some((fill) => fill.a > 0 && fill.a < 1)).toBe(true);
  });
});

describe('044 reduced transparency from other activations', () => {
  it('S6: a page can declare reduced transparency without the system preference', async (context) => {
    document.documentElement.setAttribute('data-ki-transparency', 'reduce');
    const fixture = await mount(SELECT);
    await underTransparency('no-preference', context);

    expectSolid(await openSelect(fixture), 'listbox');
  });

  it('S7: more contrast also removes transparency', async (context) => {
    const fixture = await mount(SELECT);
    await underContrast('more', context);

    expectSolid(await openSelect(fixture), 'listbox');
  });

  it('S8: without a preference or a declaration glass is unchanged', async (context) => {
    const fixture = await mount(SELECT);
    await underTransparency('no-preference', context);
    await underContrast('no-preference', context);
    // Calma ships with the filter off. Use a filter distinct from the legacy
    // default (24px), which follows the shared filter for compatibility.
    host(fixture, 'ki-select').style.setProperty(
      '--ki-select-listbox-backdrop-filter',
      'blur(12px)',
    );
    const listbox = await openSelect(fixture);

    expect(isOpaque(listbox), 'the glass panel is translucent').toBe(false);
    expect(getComputedStyle(listbox).backdropFilter, 'the glass filter is preserved').toBe(
      'blur(12px)',
    );
  });

  it('S10: a themed region inside a page that declares reduced transparency keeps it', async (context) => {
    document.documentElement.setAttribute('data-ki-transparency', 'reduce');
    await underTransparency('no-preference', context);
    const fixture = await mount(`<section data-ki-theme="material3">${SECONDARY}</section>`);

    expectSolid(findDeep(host(fixture, 'ki-button'), byPart('button')), 'secondary button');
  });

  it("S11: a page's own opaque value for a glass surface wins", async (context) => {
    const own = document.createElement('style');
    own.textContent =
      '@media (prefers-reduced-transparency: reduce) {' +
      ' :root { --ki-surface-special-blur-base-light: #fafafa; } }';
    document.head.append(own);
    try {
      const fixture = await mount(SELECT);
      await underTransparency('reduce', context);
      const listbox = await openSelect(fixture);

      const painted = surfaceOf(listbox);
      expect([painted.r, painted.g, painted.b].map(Math.round)).toEqual([250, 250, 250]);
      expect(isOpaque(listbox)).toBe(true);
    } finally {
      own.remove();
    }
  });
});
