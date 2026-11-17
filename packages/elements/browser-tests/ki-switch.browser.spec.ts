import material3Css from '@kimen/tokens/css/material3?raw';
import tokensCss from '@kimen/tokens/css?raw';
import { beforeAll, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

// @spec:008-ki-switch
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
import { defineCustomElement } from '../dist/components/ki-switch.js';
import { expectAccessible, settleEntryMotion } from './axe';
import { repaintedUnderForcedDark } from './color-scheme';
import { paintContrast } from './contracts';

type KiSwitchElement = HTMLElement & {
  checked: boolean;
  disabled: boolean;
  value?: string;
};

const STYLE_ID = 'ki-switch-browser-token-style';
const MATERIAL3_STYLE_ID = 'ki-switch-browser-material3-token-style';
const defineKiSwitchElement: () => void = defineCustomElement;

beforeAll(() => {
  defineKiSwitchElement();
  ensureTokens();
});

function ensureTokens(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = tokensCss;
  document.head.append(style);
}

function cleanup(): void {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('dir');
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
}

function ensureMaterial3Tokens(): void {
  if (document.getElementById(MATERIAL3_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = MATERIAL3_STYLE_ID;
  style.textContent = material3Css;
  document.head.append(style);
}

async function waitForHydration(el: KiSwitchElement): Promise<void> {
  await customElements.whenDefined('ki-switch');
  const deadline = Date.now() + 2000;
  while (!el.shadowRoot?.querySelector('input') && Date.now() < deadline) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

async function mount(attrs = '', label = 'Email notifications'): Promise<KiSwitchElement> {
  cleanup();
  const el = document.createElement('ki-switch') as KiSwitchElement;
  el.innerHTML = `<span id="label-text">${label}</span>`;
  for (const attr of attrs.split(/\s+/u).filter(Boolean)) {
    const [name, value] = attr.split('=');
    if (name) {
      el.setAttribute(name, value?.replace(/^"|"$/gu, '') ?? '');
    }
  }
  document.body.append(el);
  await waitForHydration(el);
  return el;
}

async function mountInForm(
  attrs = '',
  fieldsetDisabled = false,
): Promise<{
  form: HTMLFormElement;
  el: KiSwitchElement;
}> {
  cleanup();
  const form = document.createElement('form');
  const fieldset = document.createElement('fieldset');
  fieldset.disabled = fieldsetDisabled;
  const el = document.createElement('ki-switch') as KiSwitchElement;
  el.textContent = 'Newsletter';
  for (const attr of attrs.split(/\s+/u).filter(Boolean)) {
    const [name, value] = attr.split('=');
    if (name) {
      el.setAttribute(name, value?.replace(/^"|"$/gu, '') ?? '');
    }
  }
  fieldset.append(el);
  form.append(fieldset);
  document.body.append(form);
  await waitForHydration(el);
  return { form, el };
}

function formValue(form: HTMLFormElement, name: string): FormDataEntryValue | null {
  return new FormData(form).get(name);
}

function internalInput(el: KiSwitchElement): HTMLInputElement {
  const input = el.shadowRoot?.querySelector('input[type="checkbox"][role="switch"]');
  expect(input).toBeInstanceOf(HTMLInputElement);
  return input as HTMLInputElement;
}

function trackPart(el: KiSwitchElement): HTMLElement {
  const track = el.shadowRoot?.querySelector('[part="track"]');
  expect(track).toBeInstanceOf(HTMLElement);
  return track as HTMLElement;
}

function thumbPart(el: KiSwitchElement): HTMLElement {
  const thumb = el.shadowRoot?.querySelector('[part="thumb"]');
  expect(thumb).toBeInstanceOf(HTMLElement);
  return thumb as HTMLElement;
}

function labelPart(el: KiSwitchElement): HTMLElement {
  const label = el.shadowRoot?.querySelector('[part="label"]');
  expect(label).toBeInstanceOf(HTMLElement);
  return label as HTMLElement;
}

function glyphOf(el: KiSwitchElement, kind: 'check' | 'dash'): SVGElement {
  const glyph = el.shadowRoot?.querySelector(`.glyph-${kind}`);
  expect(glyph).toBeInstanceOf(SVGElement);
  return glyph as SVGElement;
}

/** Resolves a token to its computed value through a probe element. */
function baseOf(el: KiSwitchElement): HTMLElement {
  const base = el.shadowRoot?.querySelector('.base');
  expect(base).toBeInstanceOf(HTMLElement);
  return base as HTMLElement;
}

function eventCounts(el: KiSwitchElement): { input: () => number; change: () => number } {
  let input = 0;
  let change = 0;
  el.addEventListener('input', (event) => {
    if (event.composed) {
      input += 1;
    }
  });
  el.addEventListener('change', (event) => {
    if (event.composed) {
      change += 1;
    }
  });

  return {
    input: () => input,
    change: () => change,
  };
}

describe('ki-switch in a real browser', () => {
  it('S1 toggling the switch turns it on with exactly one composed input and change event', async () => {
    const el = await mount();
    const counts = eventCounts(el);

    await userEvent.click(internalInput(el), { force: true }).catch(() => undefined);

    expect(el.checked).toBe(true);
    expect(counts.input()).toBe(1);
    expect(counts.change()).toBe(1);
  });

  it('S2 toggling the switch again turns it off', async () => {
    const el = await mount('checked');

    await userEvent.click(internalInput(el), { force: true }).catch(() => undefined);

    expect(el.checked).toBe(false);
  });

  it('S1 turning the switch on from script reports no input or change event', async () => {
    const el = await mount();
    const counts = eventCounts(el);

    el.checked = true;

    await expect.element(page.getByRole('switch', { name: 'Email notifications' })).toBeChecked();
    expect(counts.input()).toBe(0);
    expect(counts.change()).toBe(0);
  });

  it('S3 a disabled switch does not toggle and reports no state change', async () => {
    const el = await mount('disabled');
    const counts = eventCounts(el);

    await userEvent.click(internalInput(el), { force: true }).catch(() => undefined);

    expect(el.checked).toBe(false);
    expect(counts.input()).toBe(0);
    expect(counts.change()).toBe(0);
  });

  it('S17 clicking the slotted label toggles the switch with exactly one change event', async () => {
    const el = await mount();
    const counts = eventCounts(el);
    const labelText = page.getByText('Email notifications');

    await labelText.click();

    expect(el.checked).toBe(true);
    expect(counts.change()).toBe(1);
  });

  it('S4 checked="maybe" renders on and toggles normally in a real browser', async () => {
    const el = await mount('checked="maybe"');

    expect(el.checked).toBe(true);
    await userEvent.click(internalInput(el));
    expect(el.checked).toBe(false);
  });

  it('S4 applies boolean presence semantics to checked set after hydration', async () => {
    const el = await mount();
    const input = internalInput(el);
    expect(el.checked).toBe(false);

    // Present-but-falsy attribute set post-hydration means on (presence).
    el.setAttribute('checked', 'false');
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(el.checked).toBe(true);
    expect(input.checked).toBe(true);

    // Reflection is not fought: a normal toggle still turns it off and stays off.
    await userEvent.click(input);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(el.checked).toBe(false);
    expect(el.hasAttribute('checked')).toBe(false);
  });

  it('S5 Tab reaches the switch and its focus indication is visible', async () => {
    const el = await mount();
    internalInput(el).blur();
    el.blur();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const track = trackPart(el);
    const before = getComputedStyle(track);

    await userEvent.tab();
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const after = getComputedStyle(track);
    expect(document.activeElement).toBe(el);
    expect(el.shadowRoot?.activeElement).toBe(internalInput(el));
    expect([before.outlineStyle, before.outlineColor, before.boxShadow]).toBeDefined();
    expect(after.outlineStyle).toBe('solid');
    expect(after.outlineColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  it('S6 Space toggles the focused switch and Enter remains inert', async () => {
    const el = await mount();

    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    expect(el.checked).toBe(false);

    await userEvent.keyboard(' ');
    expect(el.checked).toBe(true);
  });

  it('S20 Tab skips a disabled switch and lands on the following button', async () => {
    cleanup();
    const el = document.createElement('ki-switch') as KiSwitchElement;
    el.disabled = true;
    el.textContent = 'Email notifications';
    const button = document.createElement('button');
    button.tabIndex = 0;
    button.textContent = 'Next';
    document.body.append(el, button);
    await waitForHydration(el);

    await userEvent.tab();

    expect(document.activeElement).toBe(button);
  });

  it('S7 exposes a switch named Email notifications in the off state', async () => {
    await mount();
    const control = page.getByRole('switch', { name: 'Email notifications' });

    await expect.element(control).not.toBeChecked();
  });

  it('S8 exposes the on state after a user toggle', async () => {
    const el = await mount();
    const control = page.getByRole('switch', { name: 'Email notifications' });

    await userEvent.click(internalInput(el));

    await expect.element(control).toBeChecked();
  });

  it('S9 exposes disabled switches as unavailable', async () => {
    await mount('disabled');
    const control = page.getByRole('switch', { name: 'Email notifications' });

    await expect.element(control).toBeDisabled();
  });

  it('S7 S9 keeps the rendered pointer target at least 24 by 24 CSS pixels', async () => {
    const el = await mount();
    const rect = el.getBoundingClientRect();

    expect(rect.width).toBeGreaterThanOrEqual(24);
    expect(rect.height).toBeGreaterThanOrEqual(24);
  });

  it('S7 S8 S9 has zero axe violations across checked and disabled states', async () => {
    cleanup();
    const main = document.createElement('main');
    document.body.append(main);
    for (const checked of [false, true]) {
      for (const disabled of [false, true]) {
        const el = document.createElement('ki-switch') as KiSwitchElement;
        el.textContent = `Email notifications ${String(checked)} ${String(disabled)}`;
        if (checked) {
          el.setAttribute('checked', '');
        }
        if (disabled) {
          el.setAttribute('disabled', '');
        }
        main.append(el);
        await waitForHydration(el);
      }
    }

    await expectAccessible(document.body);
  });

  it('S10 submitted FormData contains newsletter=on when the switch is on', async () => {
    const { form } = await mountInForm('name="newsletter" checked');

    expect(formValue(form, 'newsletter')).toBe('on');
  });

  it('S11 submitted FormData omits newsletter when the switch is off', async () => {
    const { form } = await mountInForm('name="newsletter"');

    expect(formValue(form, 'newsletter')).toBeNull();
  });

  it('S1 exposes the current checked and form value during the composed input event', async () => {
    const { form, el } = await mountInForm('name="newsletter"');
    let checkedDuringInput: boolean | undefined;
    let formValueDuringInput: FormDataEntryValue | null | undefined;
    el.addEventListener('input', () => {
      checkedDuringInput = el.checked;
      formValueDuringInput = formValue(form, 'newsletter');
    });

    await userEvent.click(internalInput(el), { force: true }).catch(() => undefined);

    expect(checkedDuringInput).toBe(true);
    expect(formValueDuringInput).toBe('on');
  });

  it('S12 resetting restores an initially on switch after it was toggled off', async () => {
    const { form, el } = await mountInForm('name="newsletter" checked');

    await userEvent.click(internalInput(el), { force: true }).catch(() => undefined);
    expect(el.checked).toBe(false);
    form.reset();
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(el.checked).toBe(true);
  });

  it('S21 resetting restores an initially off switch after it was toggled on', async () => {
    const { form, el } = await mountInForm('name="newsletter"');

    await userEvent.click(internalInput(el), { force: true }).catch(() => undefined);
    expect(el.checked).toBe(true);
    form.reset();
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(el.checked).toBe(false);
  });

  it('S13 a switch inside disabled fieldset stays unchanged and contributes nothing', async () => {
    const { form, el } = await mountInForm('name="newsletter" checked', true);

    await userEvent.click(internalInput(el), { force: true }).catch(() => undefined);

    expect(el.checked).toBe(true);
    expect(formValue(form, 'newsletter')).toBeNull();
  });

  // Review round 1: a fieldset-disabled switch must ALSO look disabled. The
  // FACE host matches :host(:disabled) under fieldset ancestry — observed
  // through the label cursor, which the disabled rule flips from pointer to
  // default (an enabled switch would keep the pointer affordance on an inert
  // control before the fix).
  it('S13 a fieldset-disabled switch adopts the disabled affordance', async () => {
    const enabled = await mount('name="newsletter"');
    const enabledCursor = getComputedStyle(baseOf(enabled)).cursor;

    const directly = await mount('name="newsletter" disabled');
    const directlyCursor = getComputedStyle(baseOf(directly)).cursor;

    const { el } = await mountInForm('name="newsletter"', true);
    const fieldsetCursor = getComputedStyle(baseOf(el)).cursor;

    expect(enabledCursor).toBe('pointer');
    expect(directlyCursor).toBe('default');
    expect(fieldsetCursor, 'fieldset-disabled must match directly-disabled').toBe(directlyCursor);
  });

  it('S18 value="weekly" submits newsletter=weekly when on', async () => {
    const { form } = await mountInForm('name="newsletter" value="weekly" checked');

    expect(formValue(form, 'newsletter')).toBe('weekly');
  });

  it('S18 a value changed after render is the one submitted', async () => {
    const { form, el } = await mountInForm('name="newsletter" value="daily" checked');

    el.value = 'weekly';

    await expect.poll(() => formValue(form, 'newsletter')).toBe('weekly');
  });

  it('S15 honors a forced dark scheme: the off track and its thumb repaint', async () => {
    const el = await mount();

    expect(await repaintedUnderForcedDark(el)).toEqual(expect.arrayContaining(['track', 'thumb']));
  });

  it('S14 material3 restyles the checked and unchecked tracks without markup changes', async () => {
    const onmarsOff = await mount();
    const markup = onmarsOff.outerHTML;
    const onmarsOffTrack = getComputedStyle(trackPart(onmarsOff)).backgroundColor;
    const onmarsOnTrack = getComputedStyle(trackPart(await mount('checked'))).backgroundColor;

    ensureMaterial3Tokens();
    // mount() starts from a clean document, so the theme is declared after it.
    const inMaterial3 = async (attrs = ''): Promise<KiSwitchElement> => {
      const el = await mount(attrs);
      document.documentElement.setAttribute('data-ki-theme', 'material3');
      await settleEntryMotion();
      return el;
    };

    const materialOff = await inMaterial3();
    expect(materialOff.outerHTML).toBe(markup);
    expect(getComputedStyle(trackPart(materialOff)).backgroundColor).not.toBe(onmarsOffTrack);
    const materialOn = await inMaterial3('checked');
    expect(getComputedStyle(trackPart(materialOn)).backgroundColor).not.toBe(onmarsOnTrack);
  });

  it('S7 keeps MarsUI md pointer geometry: 22x18 thumb in a 40x22 track with its dark shadow', async () => {
    const el = await mount();
    const track = trackPart(el);
    const thumb = thumbPart(el);
    const trackRect = track.getBoundingClientRect();
    const thumbRect = thumb.getBoundingClientRect();

    // Figma md: track 40x22, pointer 22x18 — wider than tall.
    expect(trackRect.width).toBeCloseTo(40, 0);
    expect(trackRect.height).toBeCloseTo(22, 0);
    expect(thumbRect.width).toBeCloseTo(22, 0);
    expect(thumbRect.height).toBeCloseTo(18, 0);

    // Small_dark_shadow (0/2/3/-1.5 Elevation/shadow_dark) rides the thumb in
    // every state — it is what separates the dark-scheme thumb from the track.
    const shadow = getComputedStyle(thumb).boxShadow;
    expect(shadow).not.toBe('none');
    expect(shadow).toContain('0px 2px 3px -1.5px');
  });

  it('S8 places the checked thumb at the inline-end inset via transform travel', async () => {
    const el = await mount('checked');
    const trackRect = trackPart(el).getBoundingClientRect();
    const thumbRect = thumbPart(el).getBoundingClientRect();

    // Checked LTR: thumb rests 2px inset + 1px border from the track's right
    // edge (tolerance for subpixel rounding).
    expect(Math.abs(trackRect.right - thumbRect.right - 3)).toBeLessThanOrEqual(1.5);
    expect(getComputedStyle(thumbPart(el)).translate).not.toBe('none');
  });

  it('S7 sets the Toggle_label md typography: 15/24 medium, legible on the page', async () => {
    const el = await mount();
    const label = getComputedStyle(labelPart(el));

    expect(label.fontSize).toBe('15px');
    expect(label.lineHeight).toBe('24px');
    expect(label.fontWeight).toBe('500');
    expect(
      paintContrast(label.color, getComputedStyle(document.body).backgroundColor),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('S7 S9 shows the check glyph only when on and the dash only when off and disabled', async () => {
    const rest = await mount();
    expect(getComputedStyle(glyphOf(rest, 'check')).opacity).toBe('0');
    expect(getComputedStyle(glyphOf(rest, 'dash')).opacity).toBe('0');

    const on = await mount('checked');
    expect(getComputedStyle(glyphOf(on, 'check')).opacity).toBe('1');
    expect(getComputedStyle(glyphOf(on, 'dash')).opacity).toBe('0');
    // The ON check reads against the thumb it is drawn on (WCAG 1.4.11).
    const enabledInk = getComputedStyle(glyphOf(on, 'check')).color;
    expect(
      paintContrast(enabledInk, getComputedStyle(thumbPart(on)).backgroundColor),
    ).toBeGreaterThanOrEqual(3);

    const offDisabled = await mount('disabled');
    expect(getComputedStyle(glyphOf(offDisabled, 'dash')).opacity).toBe('1');
    expect(getComputedStyle(glyphOf(offDisabled, 'check')).opacity).toBe('0');
    const disabledDashInk = getComputedStyle(glyphOf(offDisabled, 'dash')).color;

    const onDisabled = await mount('checked disabled');
    expect(getComputedStyle(glyphOf(onDisabled, 'check')).opacity).toBe('1');
    expect(getComputedStyle(glyphOf(onDisabled, 'dash')).opacity).toBe('0');
    // Disabled glyphs share one muted ink, distinct from the enabled check.
    const disabledCheckInk = getComputedStyle(glyphOf(onDisabled, 'check')).color;
    expect(disabledCheckInk).toBe(disabledDashInk);
    expect(disabledCheckInk).not.toBe(enabledInk);
  });

  it('S16 mirrors label order and on-state thumb travel under RTL', async () => {
    cleanup();
    document.documentElement.setAttribute('dir', 'rtl');
    const el = document.createElement('ki-switch') as KiSwitchElement;
    el.setAttribute('checked', '');
    el.textContent = 'Email notifications';
    document.body.append(el);
    await waitForHydration(el);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const track = trackPart(el);
    const thumb = el.shadowRoot?.querySelector('[part="thumb"]');
    const label = el.shadowRoot?.querySelector('[part="label"]');
    expect(thumb).toBeInstanceOf(HTMLElement);
    expect(label).toBeInstanceOf(HTMLElement);

    const trackRect = track.getBoundingClientRect();
    const thumbRect = (thumb as HTMLElement).getBoundingClientRect();
    const labelRect = (label as HTMLElement).getBoundingClientRect();

    expect(trackRect.left).toBeGreaterThan(labelRect.left);
    expect(Math.abs(thumbRect.left - trackRect.left)).toBeLessThanOrEqual(8);
  });
});

// Boolean presence semantics (native HTML parity): a present attribute means
// true whatever its value. Stencil >= 4.45 removes a host attribute when it
// reflects a parsed `false`, so these run against the built output.
describe('ki-switch boolean presence in a real browser', () => {
  it('S22 disabled="false" in the markup keeps the switch disabled', async () => {
    const el = await mount('disabled="false"');
    const counts = eventCounts(el);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(internalInput(el).disabled).toBe(true);
    await userEvent.click(internalInput(el), { force: true }).catch(() => undefined);
    expect(el.checked).toBe(false);
    expect(counts.change()).toBe(0);
    // Presence is normalized: the host attribute stays, with an empty value.
    expect(el.getAttribute('disabled')).toBe('');
  });

  it('S22 disabled="false" written after the first render disables the switch', async () => {
    const el = await mount();
    const counts = eventCounts(el);
    el.setAttribute('disabled', 'false');
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(internalInput(el).disabled).toBe(true);
    await userEvent.click(internalInput(el), { force: true }).catch(() => undefined);
    expect(el.checked).toBe(false);
    expect(counts.change()).toBe(0);
    // Presence is normalized: the host attribute stays, with an empty value.
    expect(el.getAttribute('disabled')).toBe('');
  });

  // Stencil reflects a prop on its next render, so right after `checked =
  // false` the `checked` attribute is still on the host. Presence must be
  // re-read only for the attribute that was actually written: re-reading
  // every observed one turned an unrelated write into "checked is present".
  it('turning the switch off by property survives another attribute written in the same tick', async () => {
    const el = await mount('checked');
    expect(el.checked).toBe(true);

    el.checked = false;
    el.setAttribute('disabled', '');
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(el.checked).toBe(false);
    expect(internalInput(el).checked).toBe(false);
    expect(el.hasAttribute('checked')).toBe(false);
    expect(el.disabled).toBe(true);
  });
});
