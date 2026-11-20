import { commands, page, userEvent } from 'vitest/browser';
import { beforeAll, describe, expect, it } from 'vitest';

// @spec:002-ki-button
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
import tokensCss from '@kimen/tokens/css?raw';
import material3Css from '@kimen/tokens/css/material3?raw';
import { defineCustomElement } from '../dist/components/ki-button.js';
import { expectAccessible, parkPointer } from './axe';
import { expectTertiaryAlias, expectTertiaryWarning } from './button-variant';
import { repaintedUnderForcedDark } from './color-scheme';
import { alphaOf, hasVisibleShadow } from './contracts';
import { moveToNewParent } from './reconnect';

const browserCommands = commands as unknown as {
  emulateReducedMotion: (reducedMotion: 'reduce' | 'no-preference' | null) => Promise<void>;
};

type KiButtonElement = HTMLElement & {
  disabled: boolean;
  name: string;
  size: string;
  tone: string;
  type: string;
  value: string;
  variant: string;
};
const defineKiButtonElement: () => void = defineCustomElement;

const STYLE_ID = 'ki-button-browser-token-style';
const MATERIAL3_STYLE_ID = 'ki-button-browser-material3-token-style';
const variants = ['primary', 'secondary', 'tertiary', 'quaternary', 'ghost'] as const;
const tones = ['neutral', 'success', 'danger'] as const;
const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

beforeAll(() => {
  defineKiButtonElement();
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

function ensureMaterial3Tokens(): void {
  if (document.getElementById(MATERIAL3_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = MATERIAL3_STYLE_ID;
  style.textContent = material3Css;
  document.head.append(style);
}

function cleanup(): void {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('dir');
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
}

/** Stencil renders async: wait until the shadow root has content. */
async function mount(
  label = 'Save',
  attributes: Partial<
    Record<'disabled' | 'name' | 'size' | 'tone' | 'type' | 'value' | 'variant', string | boolean>
  > = {},
  parent: ParentNode = document.body,
): Promise<KiButtonElement> {
  ensureTokens();
  const el = document.createElement('ki-button') as KiButtonElement;
  for (const [name, value] of Object.entries(attributes)) {
    if (typeof value === 'boolean') {
      el.toggleAttribute(name, value);
    } else {
      el.setAttribute(name, value);
    }
  }
  el.textContent = label;
  parent.appendChild(el);
  await customElements.whenDefined('ki-button');
  const deadline = Date.now() + 500;
  while (!el.shadowRoot?.hasChildNodes() && Date.now() < deadline) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  return el;
}

function innerButton(el: KiButtonElement): HTMLButtonElement | null {
  return el.shadowRoot?.querySelector('button') ?? null;
}

function requireButton(el: KiButtonElement): HTMLButtonElement {
  const button = innerButton(el);
  expect(button).toBeInstanceOf(HTMLButtonElement);
  if (!button) {
    throw new Error('ki-button did not render an internal native button');
  }
  return button;
}

async function waitForStyles(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

/** What the user sees of the control: its fill, its ink and its edge. */
function paintOf(button: HTMLButtonElement): Record<string, string> {
  const style = getComputedStyle(button);
  return {
    background: style.backgroundColor,
    color: style.color,
    border: style.borderTopColor,
  };
}

/** The x/y offsets of every layer of a computed box-shadow, in px. */
function shadowOffsets(boxShadow: string): [number, number][] {
  return boxShadow.split(/,(?![^(]*\))/u).map((layer) => {
    const lengths = layer.replaceAll(/rgba?\([^)]*\)/gu, '').match(/-?[\d.]+px/gu) ?? [];
    return [Number.parseFloat(lengths[0] ?? '0'), Number.parseFloat(lengths[1] ?? '0')];
  });
}

const PRESS_HOLD_MS = 500;

interface PressedGround {
  readonly ground: Readonly<Record<string, string>>;
  readonly shadow: string;
  readonly state: { focusRing: boolean; hovered: boolean; pressed: boolean };
}

function readPressedGround(el: KiButtonElement, button: HTMLButtonElement): PressedGround {
  const style = getComputedStyle(button);
  return {
    ground: {
      background: style.backgroundColor,
      overlay: style.backgroundImage,
      color: style.color,
      borderBlockStart: style.borderBlockStartColor,
      borderBlockEnd: style.borderBlockEndColor,
      borderInlineStart: style.borderInlineStartColor,
      borderInlineEnd: style.borderInlineEndColor,
    },
    shadow: style.boxShadow,
    state: {
      focusRing: button.matches(':focus-visible'),
      hovered: el.matches(':hover'),
      // `:active`, or the keyboard press the component marks itself where
      // the engine never matches `:active` on a button held with Space.
      pressed: button.matches(':active, [data-ki-pressed]'),
    },
  };
}

async function nextFrames(count: number): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

/** Read the button while a real mouse button is held down over it. */
async function holdWithPointer(
  el: KiButtonElement,
  button: HTMLButtonElement,
): Promise<PressedGround> {
  const down = new Promise<void>((resolve) => {
    button.addEventListener(
      'pointerdown',
      () => {
        resolve();
      },
      { once: true },
    );
  });
  // Vitest starts a userEvent action only once it is awaited or chained;
  // chaining starts the press without waiting for its release, so the state
  // can be read while the mouse button is still down.
  const release = userEvent.click(button, { delay: PRESS_HOLD_MS }).then(() => undefined);
  await Promise.race([down, release]);
  await nextFrames(2);
  const held = readPressedGround(el, button);
  await release;
  return held;
}

/**
 * Read the button while Space is held on it, reached the way a keyboard user
 * reaches it: with Tab. Focusing it from script after the pointer press would
 * leave Firefox without a focus ring whatever key follows; Chromium shows one
 * as soon as a key goes down, so only Tab is the same keyboard path everywhere.
 */
async function holdWithKeyboard(
  el: KiButtonElement,
  button: HTMLButtonElement,
): Promise<PressedGround> {
  button.blur();
  const before = document.createElement('button');
  before.type = 'button';
  before.textContent = 'Before';
  el.before(before);
  try {
    before.focus();
    await userEvent.keyboard('{Tab}');
    expect(el.shadowRoot?.activeElement, 'Tab did not reach the button').toBe(button);
    // `{ >}` holds the key down; the matching `{/ }` releases it.
    await userEvent.keyboard('{ >}');
    await nextFrames(2);
    const held = readPressedGround(el, button);
    await userEvent.keyboard('{/ }');
    return held;
  } finally {
    before.remove();
  }
}

/**
 * Reassigns the component radius scale where the theme declares it, the way a
 * Figma radius mode (Round, Flat, Pointed) reassigns `Radius/small-component`.
 * Declared on the root: a token that aliases the scale resolves it there.
 */
async function withComponentRadii(value: string, run: () => Promise<void>): Promise<void> {
  const steps = ['xs', 'sm', 'md', 'lg', 'xl'];
  for (const step of steps) {
    document.documentElement.style.setProperty(`--ki-radius-component-${step}`, value);
  }
  try {
    await run();
  } finally {
    for (const step of steps) {
      document.documentElement.style.removeProperty(`--ki-radius-component-${step}`);
    }
  }
}

describe('ki-button in a real browser', () => {
  it('S1 dispatches one activation for a real click', async () => {
    cleanup();
    const el = await mount();
    const button = requireButton(el);
    let activations = 0;
    el.addEventListener('click', () => {
      activations += 1;
    });

    await userEvent.click(button);

    expect(activations).toBe(1);
  });

  it('S3 reaches the button with Tab and shows a visible focus indication', async () => {
    cleanup();
    const el = await mount();
    const button = requireButton(el);

    await userEvent.keyboard('{Tab}');

    expect(el.shadowRoot?.activeElement).toBe(button);
    const focused = getComputedStyle(button);
    expect(`${focused.outlineStyle} ${focused.boxShadow}`).not.toBe('none none');
  });

  it('S4 activates the focused button exactly once for Enter and Space', async () => {
    cleanup();
    const el = await mount();
    const button = requireButton(el);
    let activations = 0;
    el.addEventListener('click', () => {
      activations += 1;
    });

    button.focus();
    await userEvent.keyboard('{Enter}');
    expect(activations).toBe(1);

    await userEvent.keyboard(' ');
    expect(activations).toBe(2);
  });

  it('S5 exposes a named native button from slotted label content', async () => {
    cleanup();
    await mount('Save');

    await expect.element(page.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('S6 exposes disabled state as unavailable', async () => {
    cleanup();
    const el = await mount('Save', { disabled: true });
    const button = requireButton(el);

    expect(button).toHaveProperty('disabled', true);
  });

  it('S14 forwards a host aria-description onto the delegated inner button', async () => {
    cleanup();
    ensureTokens();
    // Focus delegates to the inner <button>, so a description on the host (e.g.
    // written by a wrapping ki-tooltip) is only announced once mirrored down.
    const el = document.createElement('ki-button') as KiButtonElement;
    el.setAttribute('aria-description', 'Sends immediately');
    el.textContent = 'Save';
    document.body.append(el);
    await customElements.whenDefined('ki-button');
    const deadline = Date.now() + 500;
    while (!el.shadowRoot?.hasChildNodes() && Date.now() < deadline) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    const button = requireButton(el);

    // The observer schedules a re-render, so let the state change settle.
    const settle = async (): Promise<void> => {
      await waitForStyles();
      await waitForStyles();
    };

    // Present at mount.
    expect(button.getAttribute('aria-description')).toBe('Sends immediately');

    // Tracks a later change (a tooltip re-labelling its trigger).
    el.setAttribute('aria-description', 'Now sending');
    await settle();
    expect(button.getAttribute('aria-description')).toBe('Now sending');

    // Tracks removal (tooltip teardown).
    el.removeAttribute('aria-description');
    await settle();
    expect(button.hasAttribute('aria-description')).toBe(false);

    // No axe violations with the forwarded description present.
    el.setAttribute('aria-description', 'Sends immediately');
    await settle();
    await expectAccessible(document.body);
  });

  it('S14 keeps forwarding the host aria-description after the button moves to another parent', async () => {
    cleanup();
    const el = await mount('Save');
    const button = requireButton(el);

    // A sortable row re-inserts its controls; the tooltip around one of them
    // then describes its trigger again.
    moveToNewParent(el);
    el.setAttribute('aria-description', 'Sends immediately');

    await expect.poll(() => button.getAttribute('aria-description')).toBe('Sends immediately');

    el.removeAttribute('aria-description');
    await expect.poll(() => button.hasAttribute('aria-description')).toBe(false);
  });

  it('S14 forwards a description written while the button was out of the document', async () => {
    cleanup();
    const el = await mount('Save');
    const button = requireButton(el);

    el.remove();
    el.setAttribute('aria-description', 'Sends immediately');
    document.body.append(el);

    await expect.poll(() => button.getAttribute('aria-description')).toBe('Sends immediately');
  });

  it('S2 observes no activation from a real click on a disabled button', async () => {
    cleanup();
    const el = await mount('Save', { disabled: true });
    let activations = 0;
    el.addEventListener('click', () => {
      activations += 1;
    });

    // Pointer events pass through the disabled native button without
    // dispatching click; force:true skips actionability so the attempt
    // itself is what we assert.
    await userEvent.click(el, { force: true }).catch(() => undefined);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(activations).toBe(0);
  });

  it('S2 stays inert and takes the disabled appearance inside a disabled fieldset', async () => {
    cleanup();
    ensureTokens();
    const form = document.createElement('form');
    const fieldset = document.createElement('fieldset');
    fieldset.disabled = true;
    form.append(fieldset);
    document.body.append(form);
    const el = await mount('Save', { variant: 'primary' }, fieldset);
    const button = requireButton(el);
    const disabled = requireButton(await mount('Save', { variant: 'primary', disabled: true }));
    await waitForStyles();

    expect(button).toHaveProperty('disabled', true);
    // The disabled fieldset gives it exactly the look of a disabled button.
    expect(paintOf(button)).toEqual(paintOf(disabled));
  });

  it('exact heights, flat effects and zero axe violations across the variant tone size matrix (SC-003)', async () => {
    cleanup();
    ensureTokens();
    // Figma Button set heights per size; the Figma stroke is INNER, so the
    // 1px border must not add to the scale
    // (specs/002-ki-button/design-extraction.md §1).
    const expectedHeights = { xs: 24, sm: 32, md: 40, lg: 48, xl: 56 } as const;
    for (const variant of variants) {
      for (const tone of tones) {
        for (const size of sizes) {
          const el = await mount(`${variant} ${tone} ${size}`, { variant, tone, size });
          const button = requireButton(el);
          await waitForStyles();

          // Border-box height must be exactly 24/32/40/48/56 per size
          // (specs/002-ki-button/design-extraction.md §1: alturas exactas).
          expect(button.getBoundingClientRect().height, `${variant}/${tone}/${size} height`).toBe(
            expectedHeights[size],
          );

          if (tone !== 'neutral' || size !== 'md') {
            continue;
          }
          const style = getComputedStyle(button);
          if (variant === 'primary' || variant === 'secondary' || variant === 'tertiary') {
            // #342 lets Calma disable the filter entirely.
            expect(style.backdropFilter, `${variant} backdrop`).toBe('none');
          }
          if (variant === 'ghost' || variant === 'quaternary') {
            // Non-glass variants stay off the glass path entirely: computed
            // backdrop-filter is none, not blur(0)
            // (specs/002-ki-button/design-extraction.md §2: effects belong to
            // the primary/secondary Component_effect styles).
            expect(style.backdropFilter, `${variant} has no backdrop filter`).toBe('none');
          }
          if (variant === 'primary') {
            expect(alphaOf(style.borderBlockStartColor), 'primary edge at block start').toBe(0);
            expect(alphaOf(style.borderBlockEndColor), 'primary edge at block end').toBe(0);
          }
          if (variant === 'tertiary') {
            // Pixel pass: tertiary carries the SECONDARY bevel pair
            // (Outline/secondary_button_bottom on the block-end edge): its
            // edges paint exactly like a secondary button's.
            const reference = requireButton(await mount('Save', { variant: 'secondary' }));
            await waitForStyles();
            const secondary = getComputedStyle(reference);
            expect(style.borderBlockEndColor, 'tertiary bevel bottom (secondary pair)').toBe(
              secondary.borderBlockEndColor,
            );
            expect(style.borderBlockStartColor, 'tertiary bevel top (secondary pair)').toBe(
              secondary.borderBlockStartColor,
            );
          }
          if (variant === 'quaternary') {
            // Pixel pass: MarsUI quaternary draws NO border in any state: both
            // edges are fully transparent.
            expect(alphaOf(style.borderBlockStartColor), 'quaternary borderless (top)').toBe(0);
            expect(alphaOf(style.borderBlockEndColor), 'quaternary borderless (bottom)').toBe(0);
          }
        }
      }
    }

    await expectAccessible(document.body);
  });

  // Button master 8003:300: icon-to-text is the root gap plus Text_wrap's
  // inline padding, per size: xs 0 + 4, sm 2 + 4, md 2 + 4, lg 2 + 4, xl 2 + 6.
  it.each([
    ['xs', 4],
    ['sm', 6],
    ['md', 6],
    ['lg', 6],
    ['xl', 8],
  ] as const)('size %s puts the label text %ipx from its start icon', async (size, distance) => {
    cleanup();
    ensureTokens();
    const el = document.createElement('ki-button') as KiButtonElement;
    el.setAttribute('size', size);
    const icon = document.createElement('span');
    icon.slot = 'start';
    icon.style.display = 'inline-block';
    icon.style.inlineSize = '1em';
    icon.style.blockSize = '1em';
    el.append(icon, 'Save');
    document.body.append(el);
    await customElements.whenDefined('ki-button');
    await expect.poll(() => el.shadowRoot?.querySelector('[part="label"]')).not.toBeNull();
    await waitForStyles();
    const label = requireButton(el).querySelector('[part="label"]');
    if (!label) {
      throw new Error('ki-button did not render a label part');
    }

    const textStart =
      label.getBoundingClientRect().left +
      Number.parseFloat(getComputedStyle(label).paddingInlineStart);
    expect(textStart - icon.getBoundingClientRect().right).toBeCloseTo(distance, 0);
  });

  it('takes every size radius from the component radius scale, so a radius mode reaches it', async () => {
    cleanup();
    ensureTokens();
    await withComponentRadii('3px', async () => {
      for (const size of sizes) {
        const el = await mount('Save', { size });
        await waitForStyles();
        expect(getComputedStyle(requireButton(el)).borderTopLeftRadius, size).toBe('3px');
      }
    });
  });

  it('label Text_wrap padding: Space/xs inline padding with the composite gap preserved (Figma 8003:300 md anatomy)', async () => {
    cleanup();
    ensureTokens();
    const el = await mount('Save', { size: 'md' });
    const button = requireButton(el);
    await waitForStyles();
    const label = button.querySelector('[part="label"]');
    expect(label).not.toBeNull();
    if (!label) {
      throw new Error('ki-button did not render a label part');
    }

    // Figma Text_wrap carries its own Space/xs (4px) inline padding in every
    // size (pixel pass delta: text-only edge-to-label = 10 + 4 = 14 at md).
    const labelStyle = getComputedStyle(label);
    expect(labelStyle.paddingInlineStart, 'Text_wrap inline padding start').toBe('4px');
    expect(labelStyle.paddingInlineEnd, 'Text_wrap inline padding end').toBe('4px');

    // The per-size gap tokens encode the COMPOSITE icon-to-text distance
    // (root gap 2px + Text_wrap padding 4px = 6px at md), so the flex gap
    // compensates for the label padding: computed column-gap = 6 - 4 = 2.
    expect(getComputedStyle(button).columnGap, 'md flex gap (composite minus padding)').toBe('2px');

    // Rendered anatomy: the label TEXT box starts exactly 14px from the
    // button edge on a text-only md button (10px Figma padding containing
    // the inner stroke, plus the 4px Text_wrap padding).
    const inset =
      label.getBoundingClientRect().left -
      button.getBoundingClientRect().left +
      Number.parseFloat(labelStyle.paddingInlineStart);
    expect(inset, 'md text-only edge-to-text inset').toBe(14);
  });

  it('focus-visible paints a ring over a flat resting surface', async () => {
    cleanup();
    ensureTokens();
    const el = await mount('Save', { variant: 'primary' });
    const button = requireButton(el);
    await waitForStyles();
    const restShadow = getComputedStyle(button).boxShadow;
    expect(hasVisibleShadow(restShadow)).toBe(false);

    await userEvent.keyboard('{Tab}');
    expect(el.shadowRoot?.activeElement).toBe(button);
    // The box-shadow micro-transition (fast motion token, 150ms) must settle
    // before reading the focused stack.
    await new Promise((resolve) => setTimeout(resolve, 300));

    const focusedShadow = getComputedStyle(button).boxShadow;
    expect(hasVisibleShadow(focusedShadow), 'focused stack paints a ring').toBe(true);
    expect(
      shadowOffsets(focusedShadow).every(([x, y]) => x === 0 && y === 0),
      'focused stack is the ring alone',
    ).toBe(true);
  });

  // Amendment A1 (issue #321): the extra-small label rose from 10px to 12px,
  // the smallest size the library ships for informative text.
  it.each(['onmars', 'material3'] as const)(
    'S15 an extra-small button label is at least 12 pixels: %s',
    async (theme) => {
      cleanup();
      ensureTokens();
      if (theme === 'material3') {
        ensureMaterial3Tokens();
        document.documentElement.setAttribute('data-ki-theme', 'material3');
      }
      const el = await mount('Undo', { size: 'xs' });
      const label = el.shadowRoot?.querySelector<HTMLElement>('[part="label"]');
      expect(label, 'ki-button rendered no label part').toBeInstanceOf(HTMLElement);
      if (!label) {
        return;
      }

      expect(Number.parseFloat(getComputedStyle(label).fontSize)).toBeGreaterThanOrEqual(12);
    },
  );

  it('S13 keeps start and end slots in logical order under RTL', async () => {
    cleanup();
    document.documentElement.setAttribute('dir', 'rtl');
    const el = await mount('Save');
    const start = document.createElement('span');
    start.slot = 'start';
    start.textContent = 'A';
    const end = document.createElement('span');
    end.slot = 'end';
    end.textContent = 'Z';
    el.prepend(start);
    el.append(end);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const slots = [...(innerButton(el)?.querySelectorAll('slot') ?? [])].map((slot) =>
      slot.getAttribute('name'),
    );
    expect(slots).toEqual(['start', null, 'end']);

    // Rendered geometry, not just slot order: under RTL the start content
    // must sit visually to the RIGHT of the end content (leading edge), which
    // physical properties or a forced direction would break silently.
    const startRect = start.getBoundingClientRect();
    const endRect = end.getBoundingClientRect();
    expect(startRect.left, 'start leads (right side) under RTL').toBeGreaterThan(endRect.left);
  });

  it('S7 submits its form with field data and the submitter name value', async () => {
    cleanup();
    const form = document.createElement('form');
    const input = document.createElement('input');
    input.name = 'title';
    input.value = 'Mars';
    form.append(input);
    document.body.append(form);
    const el = await mount('Save', { name: 'intent', type: 'submit', value: 'publish' }, form);
    const button = requireButton(el);
    let submittedData: Record<string, string> | undefined;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const submitter = event.submitter;
      submittedData = Object.fromEntries(
        [...new FormData(form, submitter)].map(([name, value]) => [
          name,
          value instanceof File ? value.name : value,
        ]),
      );
    });

    await userEvent.click(button);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(submittedData).toEqual({ intent: 'publish', title: 'Mars' });
  });

  it('S7 pins the cancellation contract: click preventDefault does not stop submission, the submit event does', async () => {
    cleanup();
    const form = document.createElement('form');
    document.body.append(form);
    const el = await mount('Save', { type: 'submit' }, form);
    const button = requireButton(el);
    el.addEventListener('click', (event) => {
      event.preventDefault();
    });
    let submissions = 0;
    form.addEventListener('submit', (event) => {
      // preventDefault here IS the supported cancellation point (documented
      // divergence from native buttons, where click preventDefault cancels).
      event.preventDefault();
      submissions += 1;
    });

    await userEvent.click(button);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(submissions).toBe(1);
  });

  it('S8 does not submit when type is button', async () => {
    cleanup();
    const form = document.createElement('form');
    document.body.append(form);
    const el = await mount('Save', { type: 'button' }, form);
    const button = requireButton(el);
    let submissions = 0;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submissions += 1;
    });

    await userEvent.click(button);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(submissions).toBe(0);
  });

  it('S12 restores field defaults when type is reset', async () => {
    cleanup();
    const form = document.createElement('form');
    const input = document.createElement('input');
    input.name = 'title';
    input.defaultValue = 'Mars';
    input.value = 'Venus';
    form.append(input);
    document.body.append(form);
    const el = await mount('Reset', { type: 'reset' }, form);
    const button = requireButton(el);

    await userEvent.click(button);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(input.value).toBe('Mars');
  });

  it('S9 material3 repaints the brand cell of every variant and keeps its tones distinct', async () => {
    cleanup();
    ensureTokens();

    // Capture the onmars paint FIRST so the theme assertion cannot pass
    // tautologically: if the material3 stylesheet or the data-ki-theme wiring
    // silently broke, every cell would keep its onmars paint.
    const paintOfCell = async (variant: string, tone: string): Promise<Record<string, string>> => {
      const el = await mount('Save', { variant, tone });
      const button = requireButton(el);
      await parkPointer();
      await waitForStyles();
      const paint = paintOf(button);
      el.remove();
      return paint;
    };
    const onmars = new Map<string, Record<string, string>>();
    for (const variant of variants) {
      for (const tone of tones) {
        onmars.set(`${variant}/${tone}`, await paintOfCell(variant, tone));
      }
    }

    ensureMaterial3Tokens();
    document.documentElement.setAttribute('data-ki-theme', 'material3');

    for (const variant of variants) {
      const looks = new Set<string>();
      for (const tone of tones) {
        const cell = `${variant}/${tone}`;
        const paint = await paintOfCell(variant, tone);
        // The brand cell of every variant repaints in fill, ink or edge; the
        // success and danger tones may keep the shared status hues.
        if (tone === 'neutral') {
          expect(paint, `${cell} must restyle under material3`).not.toEqual(onmars.get(cell));
        }
        looks.add(JSON.stringify(paint));
      }
      // ...and the three tones of a variant stay visibly distinct.
      expect(looks.size, `${variant} tones are distinguishable under material3`).toBe(tones.length);
    }
  });

  it('S10 honors a forced dark scheme: the button repaints', async () => {
    cleanup();
    ensureTokens();
    // Probe the SECONDARY glass fill: per the Figma extraction
    // (specs/002-ki-button/design-extraction.md §2.1) the primary fill is
    // Surface/primary_med_em = brand 500 in BOTH schemes, so it can no longer
    // prove the dark switch; the secondary Surface/special/secondary_alpha_base
    // is scheme-dependent.
    const el = await mount('Save', { variant: 'secondary', tone: 'neutral' });
    await waitForStyles();

    expect(await repaintedUnderForcedDark(el)).toContain('button');
  });

  it('S11 renders an unknown variant with the default variant appearance', async () => {
    cleanup();
    ensureTokens();
    const fallback = requireButton(await mount('Save', { variant: 'loud' }));
    const secondary = requireButton(await mount('Save', { variant: 'secondary' }));
    await parkPointer();
    await waitForStyles();

    expect(paintOf(fallback)).toEqual(paintOf(secondary));
  });

  it.each(['light', 'dark'] as const)(
    'S16 tertiary shares secondary paint in onmars %s',
    async (scheme) => {
      cleanup();
      document.documentElement.setAttribute('data-ki-color-scheme', scheme);
      // No transitions: every hover read is a final frame, not a tween. The
      // preference changes with a button already in the document, as it does
      // for a person who turns it on: WebKit re-evaluates a component's media
      // queries only in the shadow roots present at the change, so buttons
      // mounted after a change made with none present keep the motion of
      // before. Release dry run 44750568442 read the danger hover fill partway
      // through its fade (rgb(75, 10, 24) between rgb(68, 9, 21) and
      // rgb(114, 16, 38)).
      const witness = requireButton(await mount('Save'));
      await browserCommands.emulateReducedMotion('reduce');
      try {
        await expect.poll(() => getComputedStyle(witness).transitionDuration).toBe('0s');
        await expectTertiaryAlias(async (variant, tone, disabled) =>
          requireButton(await mount('Save', { variant, tone, disabled })),
        );
      } finally {
        await browserCommands.emulateReducedMotion(null);
        cleanup();
      }
    },
  );

  it('S17 warns for tertiary only in a development build', async () => {
    cleanup();
    await expectTertiaryWarning('ki-button', (variant) => mount('Save', { variant }));
  });

  it('S2 renders one tone-independent disabled appearance in every variant', async () => {
    cleanup();
    ensureTokens();

    for (const variant of variants) {
      const rest = requireButton(await mount('Save', { variant, tone: 'neutral' }));
      const disabled = requireButton(
        await mount('Save', { variant, tone: 'neutral', disabled: true }),
      );
      await parkPointer();
      await waitForStyles();
      const disabledPaint = paintOf(disabled);
      expect(disabledPaint, `${variant} disabled differs from rest`).not.toEqual(paintOf(rest));

      // Disabled does not depend on the tone: every tone shows the same cell.
      for (const tone of tones) {
        const toned = requireButton(await mount('Save', { variant, tone, disabled: true }));
        await waitForStyles();
        expect(paintOf(toned), `${variant}/${tone} disabled`).toEqual(disabledPaint);
      }
    }
  });

  // Regression: onmars painted a disabled quaternary button with its resting
  // ink on a transparent ground, so disabled and enabled looked identical.
  it('S2 shows a disabled quaternary button differently from a resting one, in light and dark', async () => {
    cleanup();
    ensureTokens();
    const inkOf = async (): Promise<{ rest: string; disabled: string }> => {
      const rest = requireButton(await mount('Save', { variant: 'quaternary' }));
      const disabled = requireButton(
        await mount('Save', { variant: 'quaternary', disabled: true }),
      );
      await parkPointer();
      await waitForStyles();
      return { rest: getComputedStyle(rest).color, disabled: getComputedStyle(disabled).color };
    };

    const light = await inkOf();
    expect(light.disabled, 'light disabled ink').not.toBe(light.rest);

    document.documentElement.setAttribute('data-ki-color-scheme', 'dark');
    const dark = await inkOf();
    expect(dark.disabled, 'dark disabled ink').not.toBe(dark.rest);
  });

  /**
   * Issue #71: pressed paints over the RESTING appearance whatever the input,
   * the Material 3 rule of one state layer at a time — pressed replaces hover,
   * it does not stack on it. A pointer press used to keep the hover fill,
   * text, border and shadow underneath the pressed overlay, while the same
   * press from the keyboard (or a touch screen) composed over rest, so one
   * button looked two ways while held.
   *
   * The keyboard path always wears the focus ring, and the ring replaces the
   * whole box-shadow (Figma focus column), so the shadow is held against the
   * resting one instead: that is the elevation a keyboard press keeps under
   * its ring.
   *
   * Discriminating only where hover paint exists: hover lives behind
   * `@media (hover: hover)`, and on an engine that reports no hovering pointer
   * (headless CI) both paths already paint from rest.
   */
  it.each(variants.flatMap((variant) => tones.map((tone) => [variant, tone] as const)))(
    'a pointer press and a keyboard press paint the same resting ground: %s %s (#71)',
    async (variant, tone) => {
      cleanup();
      const el = await mount('Save', { variant, tone, type: 'button' });
      const button = requireButton(el);
      // No transitions: every read below is a final frame, not a tween. The
      // preference changes with the button already in the document, as it
      // does for a person who turns it on: WebKit re-evaluates a component's
      // media queries only in the shadow roots present at the change, so a
      // button mounted after it can keep the motion of one mounted before.
      await browserCommands.emulateReducedMotion('reduce');
      try {
        await parkPointer();
        await waitForStyles();
        const rest = readPressedGround(el, button);

        const pointer = await holdWithPointer(el, button);
        await parkPointer();
        const keyboard = await holdWithKeyboard(el, button);

        const cell = `${variant} ${tone}`;
        expect(rest.state, `${cell}: the resting read was not at rest`).toEqual({
          focusRing: false,
          hovered: false,
          pressed: false,
        });
        expect(pointer.state, `${cell}: the pointer read was not a held, hovered press`).toEqual({
          focusRing: false,
          hovered: true,
          pressed: true,
        });
        expect(keyboard.state, `${cell}: the keyboard read was not a held press`).toEqual({
          focusRing: true,
          hovered: false,
          pressed: true,
        });
        expect(
          pointer.ground,
          `${cell}: a pointer press composes over the hover appearance, a keyboard press over rest`,
        ).toEqual(keyboard.ground);
        expect(
          pointer.shadow,
          `${cell}: a pointer press keeps the hover elevation instead of the resting one`,
        ).toBe(rest.shadow);
      } finally {
        await browserCommands.emulateReducedMotion(null);
      }
    },
  );
});
