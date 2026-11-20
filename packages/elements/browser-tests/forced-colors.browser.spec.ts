// @spec:062-solid-surface-background
// @spec:104-ki-fab
// @spec:092-ki-stepper
// @spec:101-input-action
// @spec:085-ki-details
// Forced-colors contract (Art. III: the reproduction IS a failing test).
//
// A forced palette — Windows Contrast themes, `forced-colors: active` — is the
// user replacing every author colour with a handful of their own. The browser
// repaints each author `background-color` as Canvas, drops every gradient and
// every `box-shadow`, and repaints text and borders as CanvasText. What
// survives is exactly what was drawn with text, a border or an outline.
//
// So a state that lives only in a fill disappears: the dot of a checked radio
// is Canvas on Canvas, the filled part of a progress bar is the same Canvas as
// its rail, the thumb of a switch is gone, the selected tab has no indicator,
// and a dialog whose surface is a gradient is a window onto the page behind
// it. None of that is visible to any other suite here, because every one of
// them paints the palette the component asked for.
//
// Each test below mounts one component under the emulated palette and reads
// what is painted. It never asks WHICH system colour a part uses — that is a
// design decision the stylesheet is free to change — only whether the part
// can be told apart from the Canvas it sits on, or from its other state.
//
// Every test runs under both shipped themes. The forced palette owes nothing
// to either of them, and that is the point: a rule that leans on a theme
// token holds only while the theme keeps it — material3 sets the dialog
// border to `none`, onmars sets the card and alert border widths to zero.
//
// The emulation is Playwright's `emulateMedia({ forcedColors })`, and what it
// does differs by engine: it can flip the media feature without the engine
// repainting anything, on an engine that has no forced palette on any
// platform. Measuring there would test the author's colours and call it the
// user's. So every test carries a WITNESS — an element with an author
// background that the palette must repaint — and where the witness keeps its
// colour the test skips aloud instead of passing or failing for a reason
// that has nothing to do with the component.
//
// That skip is not available to the engine the PR gate runs: on Chromium a
// palette that is not applied fails the test, so the suite cannot go quietly
// green by measuring nothing.
import material3Css from '@kimen/tokens/css/material3?raw';
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { commands, userEvent } from 'vitest/browser';

import { defineAllComponents } from './all-components';
import { parkPointer } from './axe';

const browserCommands = commands as unknown as {
  emulateForcedColors: (forcedColors: 'active' | 'none' | null) => Promise<void>;
};

const TOKENS_STYLE_ID = 'forced-colors-tokens';
const MATERIAL3_STYLE_ID = 'forced-colors-material3-tokens';
const THEMES = ['onmars', 'material3'] as const;
const SETTLE_DEADLINE_MS = 2000;
// The engine the PR gate runs, where the palette is known to be applied and
// its absence is therefore a regression. `Chrome/` and not a word-bounded
// match: headless Chromium reports `HeadlessChrome/`
// (pointer-capability.browser.spec.ts found that out).
const MUST_APPLY_PALETTE = navigator.userAgent.includes('Chrome/');

interface SkippableTest {
  skip: (note?: string) => void;
}

async function nextFrame(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

const CUSTOM_IMAGE = 'url(data:image/svg+xml,%3Csvg%2F%3E)';
const WITNESS_COLOUR = 'rgb(1, 2, 3)';

/** Does the palette repaint an author background, or is it only announced? */
function witnessIsRepainted(): boolean {
  const witness = document.createElement('span');
  witness.style.backgroundColor = WITNESS_COLOUR;
  document.body.append(witness);
  const painted = getComputedStyle(witness).backgroundColor;
  witness.remove();
  return painted !== WITNESS_COLOUR;
}

/** Ask for the forced palette and report whether the page is really under it. */
async function settleForcedColors(): Promise<boolean> {
  await browserCommands.emulateForcedColors('active');
  const applied = (): boolean =>
    matchMedia('(forced-colors: active)').matches && witnessIsRepainted();
  const deadline = Date.now() + SETTLE_DEADLINE_MS;
  while (!applied() && Date.now() < deadline) {
    await nextFrame();
  }
  return applied();
}

/** `undefined` until the first test finds out. */
let paletteApplies: boolean | undefined;

/** Put the page under the forced palette, or skip where the engine has none. */
async function underForcedColors(test: SkippableTest): Promise<void> {
  // An engine does not change its mind between tests: once it has shown that
  // it does not apply the palette, the rest stop waiting out the deadline.
  paletteApplies = paletteApplies !== false && (await settleForcedColors());
  if (MUST_APPLY_PALETTE) {
    expect(
      paletteApplies,
      'Chromium stopped applying the forced palette under emulation: nothing below is being measured',
    ).toBe(true);
  }
  if (!paletteApplies) {
    test.skip(`${navigator.userAgent} does not apply a forced palette under emulation`);
  }
}

async function mount(html: string): Promise<HTMLElement> {
  const fixture = document.createElement('main');
  fixture.innerHTML = html;
  document.body.append(fixture);
  await Promise.all(
    [...fixture.querySelectorAll('*')]
      .map((element) => element.localName)
      .filter((name) => name.startsWith('ki-'))
      .map((name) => customElements.whenDefined(name)),
  );
  return fixture;
}

/** A shadow part of the host matching `hostSelector`, once it has rendered. */
async function partOf(
  fixture: HTMLElement,
  hostSelector: string,
  partSelector: string,
): Promise<HTMLElement> {
  const find = (): HTMLElement | null =>
    fixture.querySelector(hostSelector)?.shadowRoot?.querySelector<HTMLElement>(partSelector) ??
    null;
  await expect
    .poll(find, {
      message: `${hostSelector} never rendered ${partSelector}`,
      timeout: SETTLE_DEADLINE_MS,
    })
    .not.toBeNull();
  const part = find();
  if (part === null) {
    throw new Error(`${hostSelector} dropped ${partSelector} right after rendering it`);
  }
  return part;
}

interface Rgba {
  ink: string;
  alpha: number;
}

function parseColor(value: string): Rgba {
  const channels = (value.match(/[\d.]+/gu) ?? []).map(Number);
  const [red = 0, green = 0, blue = 0, alpha = 1] = channels;
  return { ink: `${String(red)},${String(green)},${String(blue)}`, alpha };
}

function systemColor(keyword: string): Rgba {
  const probe = document.createElement('span');
  probe.style.color = keyword;
  document.body.append(probe);
  const resolved = parseColor(getComputedStyle(probe).color);
  probe.remove();
  return resolved;
}

/**
 * The ink a colour adds to Canvas, or `null` when it adds none: fully
 * transparent, or Canvas itself at any opacity — which is precisely what a
 * forced palette turns an author background into.
 */
function inkOnCanvas(value: string): string | null {
  const color = parseColor(value);
  return color.alpha === 0 || color.ink === systemColor('Canvas').ink ? null : color.ink;
}

/** The fill an element paints over Canvas, or `null` when it paints none. */
function fillOf(element: Element, pseudo?: string): string | null {
  return inkOnCanvas(getComputedStyle(element, pseudo).backgroundColor);
}

/** The border — or failing that the outline — that draws an element's edge. */
function edgeOf(element: Element): string | null {
  const style = getComputedStyle(element);
  if (
    style.borderBlockStartStyle !== 'none' &&
    Number.parseFloat(style.borderBlockStartWidth) > 0
  ) {
    return inkOnCanvas(style.borderBlockStartColor);
  }
  if (style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0) {
    return inkOnCanvas(style.outlineColor);
  }
  return null;
}

/** Everything that tells one state of an element from another under the palette. */
function paintOf(element: Element): string {
  const style = getComputedStyle(element);
  return JSON.stringify({
    fill: fillOf(element),
    edge: edgeOf(element),
    text: parseColor(style.color).ink,
  });
}

/**
 * What an element's text is actually painted on. A forced palette draws a
 * Canvas backplate behind every run of text so that it stays readable over
 * whatever the page put there; only `forced-color-adjust: none` removes it.
 * So a label reversed out of a filled row — HighlightText on Highlight — is
 * painted on Canvas unless the row opts out, and reads as an empty box.
 */
function textBackdropOf(element: Element): string {
  const style = getComputedStyle(element);
  return style.getPropertyValue('forced-color-adjust') === 'none'
    ? parseColor(style.backgroundColor).ink
    : systemColor('Canvas').ink;
}

function isOpaqueCanvas(element: Element): boolean {
  const background = parseColor(getComputedStyle(element).backgroundColor);
  return background.alpha === 1 && background.ink === systemColor('Canvas').ink;
}

function injectStylesheet(id: string, css: string): void {
  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  document.head.append(style);
}

beforeAll(() => {
  defineAllComponents();
  injectStylesheet(TOKENS_STYLE_ID, tokensCss);
  injectStylesheet(MATERIAL3_STYLE_ID, material3Css);
});

// The emulation belongs to the Playwright page, not to this file: whatever a
// test leaves behind is the palette the next spec file renders under. Restored
// here, not in the test bodies, so a failing assertion cannot leak it.
afterEach(async () => {
  await browserCommands.emulateForcedColors(null);
  await parkPointer();
  document.body.replaceChildren();
});

afterAll(() => {
  document.documentElement.removeAttribute('data-ki-theme');
  document.getElementById(TOKENS_STYLE_ID)?.remove();
  document.getElementById(MATERIAL3_STYLE_ID)?.remove();
});

describe.for(THEMES)('forced colors under the %s theme', (theme) => {
  beforeAll(() => {
    document.documentElement.setAttribute('data-ki-theme', theme);
  });

  it('S7 preserves the input boundary and the slotted action focus ring', async (test) => {
    await underForcedColors(test);
    const fixture = await mount(`
      <form role="search">
        <ki-input label="Search docs" type="search">
          <ki-button slot="action" size="sm" variant="secondary" type="submit">Search</ki-button>
        </ki-input>
      </form>
    `);
    const field = await partOf(fixture, 'ki-input', '[part="field"]');
    const input = await partOf(fixture, 'ki-input', '[part="input"]');
    const action = await partOf(fixture, 'ki-button', '[part="button"]');

    input.focus();
    await userEvent.keyboard('{Tab}');

    const fieldStyle = getComputedStyle(field);
    expect(Number.parseFloat(fieldStyle.borderBlockEndWidth)).toBeGreaterThan(0);
    expect(inkOnCanvas(fieldStyle.borderBlockEndColor)).not.toBeNull();
    expect(action.matches(':focus-visible')).toBe(true);
    const focus = getComputedStyle(action);
    expect(focus.outlineStyle).toBe('solid');
    expect(Number.parseFloat(focus.outlineWidth)).toBeGreaterThan(0);
    expect(inkOnCanvas(focus.outlineColor)).not.toBeNull();
  });

  it('ki-link keeps its underline and focus ring visible', async (test) => {
    await underForcedColors(test);
    const fixture = await mount(
      '<button>Start</button><p>Read the <ki-link href="/catalog">catalog contract</ki-link>.</p>',
    );
    const link = await partOf(fixture, 'ki-link', '[part="link"]');
    const paint = getComputedStyle(link);
    expect(paint.textDecorationLine).toBe('underline');
    expect(inkOnCanvas(paint.textDecorationColor)).not.toBeNull();

    fixture.querySelector('button')?.focus();
    await userEvent.keyboard('{Tab}');
    expect(link.matches(':focus-visible')).toBe(true);
    const focused = getComputedStyle(link);
    expect(focused.outlineStyle).toBe('solid');
    expect(Number.parseFloat(focused.outlineWidth)).toBeGreaterThan(0);
    expect(inkOnCanvas(focused.outlineColor)).not.toBeNull();
  });

  it('S16 ki-fab keeps its edge, ink and focus ring in the forced palette', async (test) => {
    const fixture = await mount(
      '<input aria-label="Before"><ki-fab label="Compose" extended>' +
        '<svg slot="icon" viewBox="0 0 24 24"><path d="M12 4v16M4 12h16" ' +
        'fill="none" stroke="currentColor"/></svg></ki-fab>',
    );
    const control = await partOf(fixture, 'ki-fab', '[part="control"]');
    const label = await partOf(fixture, 'ki-fab', '[part="label"]');
    control.tabIndex = 0;
    fixture.querySelector('input')?.focus();
    await userEvent.keyboard('{Tab}');

    await underForcedColors(test);

    expect(edgeOf(control)).not.toBeNull();
    expect(parseColor(getComputedStyle(label).color).ink).not.toBe(textBackdropOf(control));
    expect(control.matches(':focus-visible')).toBe(true);
    const focused = getComputedStyle(control);
    expect(focused.outlineStyle).toBe('solid');
    expect(Number.parseFloat(focused.outlineWidth)).toBeGreaterThan(0);
    expect(inkOnCanvas(focused.outlineColor)).not.toBeNull();
  });

  it('leaves layout surfaces transparent and keeps slotted controls in order', async (test) => {
    await underForcedColors(test);
    const fixture = await mount(
      '<ki-stack direction="row"><button type="button">First</button><button type="button">Second</button></ki-stack>' +
        '<ki-grid columns="1"><button type="button">Third</button><button type="button">Fourth</button></ki-grid>',
    );
    const stack = await partOf(fixture, 'ki-stack', '[part="stack"]');
    const grid = await partOf(fixture, 'ki-grid', '[part="grid"]');
    const [first, second, third, fourth] = Array.from(fixture.querySelectorAll('button'), (node) =>
      node.getBoundingClientRect(),
    );

    expect(fillOf(stack)).toBeNull();
    expect(fillOf(grid)).toBeNull();
    expect(second?.left).toBeGreaterThan(first?.left ?? Infinity);
    expect(fourth?.top).toBeGreaterThan(third?.top ?? Infinity);
  });

  it('ki-radio paints the dot of the checked option and none on the others', async (test) => {
    await underForcedColors(test);
    const fixture = await mount(
      '<ki-radio-group label="Contact method" value="email">' +
        '<ki-radio value="email">Email</ki-radio>' +
        '<ki-radio value="sms">SMS</ki-radio>' +
        '</ki-radio-group>',
    );
    const checked = await partOf(fixture, 'ki-radio[value="email"]', '[part="control"]');
    const unchecked = await partOf(fixture, 'ki-radio[value="sms"]', '[part="control"]');

    await expect.poll(() => getComputedStyle(checked, '::before').opacity).toBe('1');
    expect(
      fillOf(checked, '::before'),
      'the checked dot is Canvas on Canvas: checked and unchecked look the same',
    ).not.toBeNull();
    expect(getComputedStyle(unchecked, '::before').opacity).toBe('0');
  });

  it('ki-progress draws its rail when empty and fills it with something else', async (test) => {
    await underForcedColors(test);
    const fixture = await mount(
      '<ki-progress id="empty" label="Upload" value="0"></ki-progress>' +
        '<ki-progress id="most" label="Upload" value="80"></ki-progress>',
    );
    const emptyRail = await partOf(fixture, '#empty', '[part="track"]');
    const rail = await partOf(fixture, '#most', '[part="track"]');
    const filled = await partOf(fixture, '#most', '[part="indicator"]');

    expect(edgeOf(emptyRail), 'an empty progress bar paints nothing at all').not.toBeNull();
    expect(fillOf(filled), 'the filled part is Canvas on Canvas').not.toBeNull();
    expect(fillOf(filled), 'the filled part and the rail are the same paint').not.toBe(
      fillOf(rail),
    );
  });

  it.for(['neutral', 'success', 'danger', 'info', 'warning'])(
    'ki-status paints the %s dot',
    async (tone, test) => {
      await underForcedColors(test);
      const fixture = await mount(`<ki-status label="State" tone="${tone}"></ki-status>`);
      const dot = await partOf(fixture, 'ki-status', '[part="dot"]');

      expect(fillOf(dot), 'the status dot is Canvas on Canvas').not.toBeNull();
    },
  );

  it('ki-tab marks the selected tab and only that one', async (test) => {
    await underForcedColors(test);
    const fixture = await mount(
      '<ki-tabs label="Settings" value="email">' +
        '<ki-tab value="email">Email</ki-tab>' +
        '<ki-tab value="billing">Billing</ki-tab>' +
        '<ki-tab-panel value="email">Email settings.</ki-tab-panel>' +
        '<ki-tab-panel value="billing">Billing settings.</ki-tab-panel>' +
        '</ki-tabs>',
    );
    const selected = await partOf(fixture, 'ki-tab[value="email"]', '[part="indicator"]');
    const other = await partOf(fixture, 'ki-tab[value="billing"]', '[part="indicator"]');

    await expect.poll(() => getComputedStyle(selected).opacity).toBe('1');
    expect(selected.getBoundingClientRect().height).toBeGreaterThan(0);
    expect(
      fillOf(selected),
      'the selection indicator is Canvas on Canvas: no tab reads as selected',
    ).not.toBeNull();
    expect(
      other.getBoundingClientRect().height === 0 || getComputedStyle(other).opacity === '0',
      'an unselected tab shows the selection indicator too',
    ).toBe(true);
  });

  it('S5 ki-select tells the selected option, the active option and the rest apart', async (test) => {
    await underForcedColors(test);
    const fixture = await mount(
      `<ki-select label="Country" value="fr" style="--ki-select-listbox-bg-image: ${CUSTOM_IMAGE}">` +
        '<ki-option value="es">Spain</ki-option>' +
        '<ki-option value="fr">France</ki-option>' +
        '<ki-option value="it">Italy</ki-option>' +
        '</ki-select>',
    );
    const trigger = await partOf(fixture, 'ki-select', '[part="trigger"]');
    const listbox = await partOf(fixture, 'ki-select', '[part="listbox"]');
    trigger.focus();
    // Opens on the selected option, then moves the active option one further.
    // Each selector names the whole state it wants: the listbox renders a
    // frame after the key press, and a looser one would settle for the
    // moment in between, when the selected option is still the active one.
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ArrowDown}');
    const active = await partOf(
      fixture,
      'ki-select',
      '[part="option"][data-highlighted="true"]:not([aria-selected="true"])',
    );
    const selected = await partOf(
      fixture,
      'ki-select',
      '[part="option"][aria-selected="true"]:not([data-highlighted="true"])',
    );
    const plain = await partOf(
      fixture,
      'ki-select',
      '[part="option"]:not([aria-selected="true"], [data-highlighted="true"])',
    );

    await expect
      .poll(() => new Set([paintOf(plain), paintOf(selected), paintOf(active)]).size, {
        message: 'selected, active and plain options paint the same',
      })
      .toBe(3);
    // Read the settled highlight fill after the row's background transition.
    await Promise.all(active.getAnimations().map((animation) => animation.finished));
    expect(
      parseColor(getComputedStyle(active).color).ink,
      'the label of the active option is the colour of the backplate drawn behind it',
    ).not.toBe(textBackdropOf(active));
    expect(getComputedStyle(listbox).backgroundImage).toBe('none');
    expect(isOpaqueCanvas(listbox), 'the option panel is see-through').toBe(true);
    expect(edgeOf(listbox), 'the option panel has no edge against the page').not.toBeNull();
  });

  it('ki-switch paints its thumb in both positions', async (test) => {
    await underForcedColors(test);
    const fixture = await mount(
      '<ki-switch id="off">Notifications</ki-switch>' +
        '<ki-switch id="on" checked>Notifications</ki-switch>',
    );
    const offThumb = await partOf(fixture, '#off', '[part="thumb"]');
    const onThumb = await partOf(fixture, '#on', '[part="thumb"]');

    expect(fillOf(offThumb), 'the thumb of an unchecked switch is Canvas on Canvas').not.toBeNull();
    expect(fillOf(onThumb), 'the thumb of a checked switch is Canvas on Canvas').not.toBeNull();
  });

  it('ki-switch shows its focus ring only while focused', async (test) => {
    await underForcedColors(test);
    const fixture = await mount('<ki-switch>Notifications</ki-switch>');
    const track = await partOf(fixture, 'ki-switch', '[part="track"]');
    const input = await partOf(fixture, 'ki-switch', 'input');
    const ring = (): string => {
      const style = getComputedStyle(track);
      return style.outlineStyle === 'none' ? 'none' : style.outlineWidth;
    };

    expect(
      ring(),
      'the transparent rest outline is repainted by the palette: every switch looks focused',
    ).toBe('none');
    input.focus();
    await expect.poll(ring).not.toBe('none');
  });

  // A native disabled control turns GrayText under a forced palette; these
  // paint their own control, so they have to say it themselves, or a disabled
  // one is the same CanvasText drawing as an enabled one.
  it('ki-checkbox paints a disabled box, mark and label in GrayText', async (test) => {
    await underForcedColors(test);
    const fixture = await mount('<ki-checkbox disabled checked>Accept the terms</ki-checkbox>');
    const control = await partOf(fixture, 'ki-checkbox', '[part="control"]');
    const label = await partOf(fixture, 'ki-checkbox', '[part="label"]');
    const gray = systemColor('GrayText').ink;

    expect(edgeOf(control), 'the disabled box edge').toBe(gray);
    expect(parseColor(getComputedStyle(control).color).ink, 'the disabled mark').toBe(gray);
    expect(parseColor(getComputedStyle(label).color).ink, 'the disabled label').toBe(gray);
  });

  it('ki-radio paints a disabled ring, dot and label in GrayText', async (test) => {
    await underForcedColors(test);
    const fixture = await mount(
      '<ki-radio-group label="Plan" value="basic">' +
        '<ki-radio value="basic" disabled>Basic</ki-radio>' +
        '</ki-radio-group>',
    );
    const control = await partOf(fixture, 'ki-radio', '[part="control"]');
    const label = await partOf(fixture, 'ki-radio', '[part="label"]');
    const gray = systemColor('GrayText').ink;

    await expect.poll(() => getComputedStyle(control, '::before').opacity).toBe('1');
    expect(edgeOf(control), 'the disabled ring').toBe(gray);
    expect(fillOf(control, '::before'), 'the disabled dot').toBe(gray);
    expect(parseColor(getComputedStyle(label).color).ink, 'the disabled label').toBe(gray);
  });

  it('ki-switch paints a disabled track, thumb and label in GrayText', async (test) => {
    await underForcedColors(test);
    const fixture = await mount('<ki-switch disabled checked>Notifications</ki-switch>');
    const track = await partOf(fixture, 'ki-switch', '[part="track"]');
    const thumb = await partOf(fixture, 'ki-switch', '[part="thumb"]');
    const label = await partOf(fixture, 'ki-switch', '[part="label"]');
    const gray = systemColor('GrayText').ink;

    expect(edgeOf(track), 'the disabled track edge').toBe(gray);
    expect(fillOf(thumb), 'the disabled thumb').toBe(gray);
    expect(parseColor(getComputedStyle(label).color).ink, 'the disabled label').toBe(gray);
  });

  it('S5 ki-dialog is an opaque surface with an edge', async (test) => {
    await underForcedColors(test);
    const fixture = await mount(
      `<ki-dialog heading="Confirm changes" style="--ki-dialog-bg-image: ${CUSTOM_IMAGE}"><p>Publishing replaces the current version.</p></ki-dialog>`,
    );
    const surface = await partOf(fixture, 'ki-dialog', '[part="dialog"]');

    expect(getComputedStyle(surface).backgroundImage).toBe('none');
    expect(isOpaqueCanvas(surface), 'the page shows through the dialog').toBe(true);
    expect(edgeOf(surface), 'the dialog has no edge against the page').not.toBeNull();
  });

  it('ki-menu preserves its popup boundary, focus ring and checkmark', async (test) => {
    await underForcedColors(test);
    const fixture = await mount(`
      <button id="menu-actions" type="button">Actions</button>
      <ki-menu anchor="menu-actions">
        <ki-menu-item type="checkbox" value="pin" checked>Pin to sidebar</ki-menu-item>
      </ki-menu>
    `);
    const trigger = fixture.querySelector('button');
    if (!trigger) throw new Error('Missing trigger');
    await expect.poll(() => trigger.getAttribute('aria-expanded')).toBe('false');
    trigger.focus();
    await userEvent.keyboard('{ArrowDown}');
    const surface = await partOf(fixture, 'ki-menu', '[part="popup"]');
    const row = await partOf(fixture, 'ki-menu-item', '[part="item"]');
    const check = await partOf(fixture, 'ki-menu-item', '[part="check"]');

    expect(isOpaqueCanvas(surface)).toBe(true);
    expect(edgeOf(surface)).not.toBeNull();
    expect(getComputedStyle(row).outlineStyle).toBe('solid');
    expect(getComputedStyle(check).visibility).toBe('visible');
    expect(inkOnCanvas(getComputedStyle(check).stroke)).not.toBeNull();
  });

  it('S5 ki-tooltip is an opaque surface with an edge', async (test) => {
    await underForcedColors(test);
    const fixture = await mount(
      `<ki-tooltip label="Explains the save action" style="--ki-tooltip-bg-image: ${CUSTOM_IMAGE}"><button type="button">Save</button></ki-tooltip>`,
    );
    const surface = await partOf(fixture, 'ki-tooltip', '[part="tooltip"]');

    expect(getComputedStyle(surface).backgroundImage).toBe('none');
    expect(isOpaqueCanvas(surface), 'the page shows through the tooltip').toBe(true);
    expect(edgeOf(surface), 'the tooltip has no edge against the page').not.toBeNull();
  });

  it('ki-tooltip paints the arrow it points with', async (test) => {
    await underForcedColors(test);
    const fixture = await mount(
      '<ki-tooltip label="Explains the save action"><button type="button">Save</button></ki-tooltip>',
    );
    const surface = await partOf(fixture, 'ki-tooltip', '[part="tooltip"]');
    const arrow = surface.firstElementChild;
    if (arrow === null) {
      throw new Error('ki-tooltip drew no arrow');
    }

    expect(
      fillOf(arrow),
      'the arrow is Canvas on Canvas: the tooltip points nowhere',
    ).not.toBeNull();
  });

  it('ki-counter preserves a visible dot and readable count', async (test) => {
    await underForcedColors(test);
    const fixture = await mount('<ki-counter dot></ki-counter><ki-counter value="3"></ki-counter>');
    const dot = await partOf(fixture, 'ki-counter[dot]', '[part="indicator"]');
    const count = await partOf(fixture, 'ki-counter[value]', '[part="indicator"]');

    expect(fillOf(dot)).not.toBeNull();
    expect(fillOf(count)).not.toBeNull();
    expect(parseColor(getComputedStyle(count).color).ink).not.toBe(textBackdropOf(count));
  });

  it('ki-divider paints its rule', async (test) => {
    await underForcedColors(test);
    const fixture = await mount('<ki-divider></ki-divider>');
    const rule = await partOf(fixture, 'ki-divider', '[part="divider"]');

    expect(fillOf(rule), 'the divider is Canvas on Canvas').not.toBeNull();
  });

  it('ki-indicator draws every resting dot and paints the current one differently', async (test) => {
    await underForcedColors(test);
    const fixture = await mount(
      '<ki-indicator label="Slide position" count="3" current="2"></ki-indicator>',
    );
    const resting = await partOf(fixture, 'ki-indicator', '[part="dot"]');
    const current = await partOf(fixture, 'ki-indicator', '[part~="dot-current"]');

    expect(
      fillOf(resting) ?? edgeOf(resting),
      'a resting dot paints nothing: the number of positions is lost',
    ).not.toBeNull();
    expect(paintOf(current), 'the current dot paints like a resting one').not.toBe(
      paintOf(resting),
    );
  });

  it('S10 preserves Stepper glyphs and distinct current and upcoming edges', async (test) => {
    await underForcedColors(test);
    const fixture = await mount(
      '<ki-stepper label="Setup progress" orientation="vertical">' +
        '<ki-step state="done">Account</ki-step><ki-step state="current">Invite</ki-step>' +
        '<ki-step>Review</ki-step><ki-step state="error">Publish</ki-step></ki-stepper>',
    );
    const done = await partOf(fixture, 'ki-stepper', '[data-state="done"] [part="marker"]');
    const current = await partOf(fixture, 'ki-stepper', '[data-state="current"] [part="marker"]');
    const upcoming = await partOf(fixture, 'ki-stepper', '[data-state="upcoming"] [part="marker"]');
    const error = await partOf(fixture, 'ki-stepper', '[data-state="error"] [part="marker"]');
    const glyph = (marker: HTMLElement): SVGElement | null | undefined =>
      marker.querySelector('ki-icon')?.shadowRoot?.querySelector('svg');

    await expect.poll(() => glyph(done)?.getBoundingClientRect().width ?? 0).toBeGreaterThan(0);
    await expect.poll(() => glyph(error)?.getBoundingClientRect().width ?? 0).toBeGreaterThan(0);
    const checkMark = glyph(done);
    const errorMark = glyph(error);
    if (!checkMark || !errorMark) throw new Error('The Stepper glyphs did not render');
    expect(getComputedStyle(checkMark).stroke).not.toBe(getComputedStyle(done).backgroundColor);
    expect(inkOnCanvas(getComputedStyle(errorMark).stroke)).not.toBeNull();
    expect(edgeOf(current)).not.toBeNull();
    expect(edgeOf(upcoming)).not.toBeNull();
    expect(getComputedStyle(current).borderBlockStartStyle).not.toBe(
      getComputedStyle(upcoming).borderBlockStartStyle,
    );
  });

  it('S14: ki-details keeps its edge and keyboard focus under forced colors', async (test) => {
    await underForcedColors(test);
    const fixture = await mount(
      '<button tabindex="0">Before</button><ki-details summary="Permissions">Invite users.</ki-details>',
    );
    const details = fixture.querySelector('ki-details');
    const findPanel = () => details?.shadowRoot?.querySelector('details') ?? null;
    await expect.poll(findPanel).not.toBeNull();
    const panel = findPanel();
    const summary = panel?.querySelector('summary');
    if (!panel || !summary) throw new Error('Missing native disclosure');

    fixture.querySelector('button')?.focus();
    await userEvent.keyboard('{Tab}');
    expect(details?.shadowRoot?.activeElement).toBe(summary);
    expect(edgeOf(panel)).not.toBeNull();
    expect(edgeOf(summary)).not.toBeNull();
  });

  it.for([
    ['ki-card', '<ki-card>Quarterly report</ki-card>', '[part="card"]'],
    ['ki-alert', '<ki-alert heading="Saved">Your changes are live.</ki-alert>', '[part="alert"]'],
    ['ki-badge', '<ki-badge tone="success">Active</ki-badge>', '[part="badge"]'],
  ] as const)('%s keeps an edge against the page', async ([tag, html, part], test) => {
    await underForcedColors(test);
    const fixture = await mount(html);
    const surface = await partOf(fixture, tag, part);

    expect(
      edgeOf(surface),
      `${tag} dissolves into the page: its fill was its only edge`,
    ).not.toBeNull();
  });
});
