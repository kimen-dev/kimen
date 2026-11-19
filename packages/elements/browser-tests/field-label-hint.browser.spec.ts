// @spec:047-field-label-hint
// The label hint of every form control that takes one: what is shown after
// the label, where, in which ink, and what the engine's own accessibility tree
// names the control. Asserted on the BUILT custom elements (Art. III). Names
// and descriptions are read from Chromium's computed accessibility tree over
// CDP, the only place that shows what a screen reader receives across shadow
// roots, so those assertions run on Chromium only; the shown hint, its
// geometry, its ink, focus, form submission and axe run on every engine.
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { commands, userEvent } from 'vitest/browser';

import { expectAccessible } from './axe';
import {
  installKimen,
  mount,
  parseColor,
  resetRoot,
  SCHEMES,
  textRatio,
  THEMES,
  themeDocument,
  uninstallKimen,
  unmountAll,
} from './modes';

interface AxNode {
  readonly role: string;
  readonly name: string;
  readonly description: string;
  readonly focused: boolean;
}

const browserCommands = commands as unknown as {
  accessibilityTree: () => Promise<AxNode[] | null>;
  emulateForcedColors: (forcedColors: 'active' | 'none' | null) => Promise<void>;
};

type Control = 'ki-checkbox' | 'ki-input' | 'ki-radio-group' | 'ki-select' | 'ki-textarea';

const controls: readonly Control[] = [
  'ki-input',
  'ki-textarea',
  'ki-select',
  'ki-checkbox',
  'ki-radio-group',
];

// The role each control exposes, so its node can be found in the tree.
const roleOf: Record<Control, string> = {
  'ki-input': 'textbox',
  'ki-textarea': 'textbox',
  'ki-select': 'combobox',
  'ki-checkbox': 'checkbox',
  'ki-radio-group': 'radiogroup',
};

// One control with the given label; `attrs` carries the hint and whatever
// state a scenario needs. The checkbox takes its label as slotted content.
function markup(control: Control, label: string, attrs = ''): string {
  switch (control) {
    case 'ki-input':
      return `<ki-input label="${label}" name="answer" ${attrs}></ki-input>`;
    case 'ki-textarea':
      return `<ki-textarea label="${label}" name="answer" ${attrs}></ki-textarea>`;
    case 'ki-select':
      return `<ki-select label="${label}" name="answer" ${attrs}><ki-option value="a">Alpha</ki-option><ki-option value="b">Beta</ki-option></ki-select>`;
    case 'ki-checkbox':
      return `<ki-checkbox name="answer" ${attrs}>${label}</ki-checkbox>`;
    case 'ki-radio-group':
      return `<ki-radio-group label="${label}" name="answer" ${attrs}><ki-radio value="a">Alpha</ki-radio><ki-radio value="b">Beta</ki-radio></ki-radio-group>`;
  }
}

const everyControlWithHint = controls
  .map((control) => markup(control, 'Email', 'label-hint="(optional)"'))
  .join('');

// The fixtures below are fixed markup: a missing element is a broken
// fixture, reported as such rather than as a confusing type error later.
function found<T extends Element>(element: T | null | undefined, what: string): T {
  if (!element) {
    throw new Error(`fixture is missing ${what}`);
  }
  return element;
}

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

// A blocked submission leaves Firefox's validation bubble over the page until
// the invalid control loses focus, and removing the focused control does not
// blur it: the bubble then swallows the next test's click. Blur first.
function releaseFocus(): void {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  if (active instanceof HTMLElement) {
    active.blur();
  }
}

async function mountControl(control: Control, label: string, attrs = ''): Promise<HTMLElement> {
  const fixture = await mount(markup(control, label, attrs));
  return found(fixture.querySelector<HTMLElement>(control), control);
}

function labelOf(field: HTMLElement): HTMLElement {
  return found(field.shadowRoot?.querySelector<HTMLElement>('[part~="label"]'), 'the label');
}

function hintOf(field: HTMLElement): HTMLElement | null {
  return field.shadowRoot?.querySelector<HTMLElement>('[part~="label-hint"]') ?? null;
}

const isHint = (node: Node): boolean =>
  node instanceof Element &&
  (node.getAttribute('part')?.split(/\s+/u).includes('label-hint') ?? false);

// The text a control shows after its label: null when no hint element is
// rendered, rendered empty, or not visible.
function shownHint(field: HTMLElement): string | null {
  const hint = hintOf(field);
  if (!hint?.checkVisibility()) {
    return null;
  }
  const text = hint.textContent.trim();
  return text === '' ? null : text;
}

// Whether the hint is part of the label element, as the label's own text is.
function hintIsInLabel(field: HTMLElement): boolean {
  const hint = hintOf(field);
  return hint !== null && labelOf(field).contains(hint);
}

// The label's own text nodes in flat-tree order, slotted text included and
// the hint left out.
function labelTextNodes(element: Element): Text[] {
  const texts: Text[] = [];
  const visit = (node: Node): void => {
    if (isHint(node)) {
      return;
    }
    if (node instanceof Text) {
      if (node.data.trim() !== '') texts.push(node);
      return;
    }
    const children =
      node instanceof HTMLSlotElement
        ? node.assignedNodes({ flatten: true })
        : [...node.childNodes];
    for (const child of children) visit(child);
  };
  visit(element);
  return texts;
}

/** Inline extent of the label's own text, in viewport pixels. */
function labelTextExtent(field: HTMLElement): { left: number; right: number } {
  const rects = labelTextNodes(labelOf(field)).map((text) => {
    const range = document.createRange();
    range.selectNodeContents(text);
    return range.getBoundingClientRect();
  });
  if (rects.length === 0) {
    throw new Error(`${field.localName} renders no label text`);
  }
  return {
    left: Math.min(...rects.map((rect) => rect.left)),
    right: Math.max(...rects.map((rect) => rect.right)),
  };
}

// The engine's accessibility tree is read over CDP, which only Chromium
// exposes: `accessibilityTree` answers null on Firefox and WebKit. `Chrome/`
// and not a word-bounded match: headless Chromium reports `HeadlessChrome/`.
const IS_CHROMIUM = navigator.userAgent.includes('Chrome/');

async function tree(): Promise<AxNode[]> {
  await nextFrame();
  await nextFrame();
  const nodes = await browserCommands.accessibilityTree();
  if (nodes === null) {
    throw new Error('Chromium stopped answering its accessibility tree over CDP');
  }
  return nodes;
}

/** The names the tree gives every node of a role. */
async function namesOf(role: string): Promise<string[]> {
  return (await tree()).filter((node) => node.role === role).map((node) => node.name);
}

async function axNode(role: string, name: string): Promise<AxNode | undefined> {
  return (await tree()).find((node) => node.role === role && node.name === name);
}

const WITNESS_COLOUR = 'rgb(1, 2, 3)';
const FORCED_PALETTE_DEADLINE_MS = 2000;

/** Is the page really under a forced palette, or is it only announced? */
async function forcedPaletteApplies(): Promise<boolean> {
  const witness = document.createElement('span');
  witness.style.backgroundColor = WITNESS_COLOUR;
  document.body.append(witness);
  const applied = (): boolean =>
    matchMedia('(forced-colors: active)').matches &&
    getComputedStyle(witness).backgroundColor !== WITNESS_COLOUR;
  const deadline = Date.now() + FORCED_PALETTE_DEADLINE_MS;
  while (!applied() && Date.now() < deadline) {
    await nextFrame();
  }
  const result = applied();
  witness.remove();
  return result;
}

/** The colour a token resolves to where `scope` is, as the engine paints it. */
function inkOf(token: string, scope: Element): string {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  scope.append(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
}

/**
 * The ink a control paints its own label text in: the colour the text
 * inherits from its flat-tree parent, which for slotted label text is the
 * slot, not the light-DOM host.
 */
function labelInk(field: HTMLElement): string {
  const [text] = labelTextNodes(labelOf(field));
  const parent = found(
    text?.assignedSlot ?? text?.parentElement,
    `the label text of ${field.localName}`,
  );
  return getComputedStyle(parent).color;
}

beforeAll(async () => {
  await installKimen();
});

afterEach(async () => {
  releaseFocus();
  unmountAll();
  resetRoot();
  await browserCommands.emulateForcedColors(null);
});

afterAll(async () => {
  await uninstallKimen();
});

describe('the label hint joins the label', () => {
  for (const control of controls) {
    it(`S1 a ${control}'s label hint is shown after its label and joins its name`, async () => {
      const field = await mountControl(control, 'Email', 'label-hint="(optional)"');

      field.focus();

      await expect.poll(() => shownHint(field)).toBe('(optional)');
      expect(hintIsInLabel(field)).toBe(true);
      expect(hintOf(field)?.getBoundingClientRect().left).toBeGreaterThan(
        labelTextExtent(field).right,
      );
      if (IS_CHROMIUM) {
        await expect.poll(() => namesOf(roleOf[control])).toEqual(['Email (optional)']);
      }
    });
  }

  it('S1 a ki-checkbox label made of several slotted nodes stays one inline run before the hint', async () => {
    const fixture = await mount(
      '<ki-checkbox name="terms" label-hint="(required)">Accept the <a href="#terms">terms</a></ki-checkbox>',
    );
    const field = found(fixture.querySelector<HTMLElement>('ki-checkbox'), 'the checkbox');

    await expect.poll(() => shownHint(field)).toBe('(required)');

    // The hint lays the label out as two items, the label and the hint. Were
    // each slotted node an item of its own, the link would be blockified and
    // the space after "Accept the" collapsed away.
    const link = found(fixture.querySelector('a'), 'the terms link');
    expect(getComputedStyle(link).display).toBe('inline');
    expect(found(hintOf(field), 'the hint').getBoundingClientRect().left).toBeGreaterThan(
      link.getBoundingClientRect().right,
    );
    if (IS_CHROMIUM) {
      await expect.poll(() => namesOf('checkbox')).toEqual(['Accept the terms (required)']);
    }
  });

  for (const control of controls) {
    it(`S2 a required ${control} without a label hint shows no hint of its own`, async () => {
      const field = await mountControl(control, 'Email', 'required');

      await nextFrame();

      expect(hintOf(field)).toBeNull();
      expect(labelTextNodes(labelOf(field)).map((text) => text.data.trim())).toEqual(['Email']);
      if (IS_CHROMIUM) {
        await expect.poll(() => namesOf(roleOf[control])).toEqual(['Email']);
      }
    });
  }

  it('S3 a blank label hint shows nothing', async () => {
    const field = await mountControl('ki-input', 'Email', 'label-hint="   "');

    await nextFrame();

    expect(hintOf(field)).toBeNull();
    if (IS_CHROMIUM) {
      await expect.poll(() => namesOf('textbox')).toEqual(['Email']);
    }
  });

  it('S4 removing the label hint removes it from the name', async () => {
    const field = await mountControl('ki-input', 'Email', 'label-hint="(optional)"');
    await expect.poll(() => shownHint(field)).toBe('(optional)');
    if (IS_CHROMIUM) {
      await expect.poll(() => namesOf('textbox')).toEqual(['Email (optional)']);
    }

    field.removeAttribute('label-hint');

    await expect.poll(() => hintOf(field)).toBeNull();
    if (IS_CHROMIUM) {
      await expect.poll(() => namesOf('textbox')).toEqual(['Email']);
    }
  });

  it('S4 changing the label hint changes the name at once', async () => {
    const field = await mountControl('ki-input', 'Email', 'label-hint="(optional)"');
    await expect.poll(() => shownHint(field)).toBe('(optional)');

    (field as HTMLElement & { labelHint?: string }).labelHint = '(required)';

    await expect.poll(() => shownHint(field)).toBe('(required)');
    if (IS_CHROMIUM) {
      await expect.poll(() => namesOf('textbox')).toEqual(['Email (required)']);
    }
  });

  it('S5 the label hint sits a small space after the label text', async () => {
    const field = await mountControl('ki-input', 'Email', 'label-hint="(optional)"');

    await expect.poll(() => shownHint(field)).toBe('(optional)');

    const hint = found(hintOf(field), 'the label hint');
    expect(hint.getBoundingClientRect().left - labelTextExtent(field).right).toBeCloseTo(4, 0);
    const label = getComputedStyle(labelOf(field));
    expect(getComputedStyle(hint).fontSize).toBe(label.fontSize);
    expect(getComputedStyle(hint).lineHeight).toBe(label.lineHeight);
  });

  it('S5 a compact region keeps the gap and the type of the label hint', async () => {
    const fixture = await mount(
      `<div data-ki-density="compact">${markup('ki-input', 'Email', 'label-hint="(optional)"')}</div>${markup('ki-input', 'Email', 'label-hint="(optional)"')}`,
    );
    const [compact, standard] = [...fixture.querySelectorAll<HTMLElement>('ki-input')];
    const inside = found(compact, 'the compact field');
    const outside = found(standard, 'the standard field');

    await expect.poll(() => shownHint(inside)).toBe('(optional)');

    const gap = (field: HTMLElement): number =>
      found(hintOf(field), 'the label hint').getBoundingClientRect().left -
      labelTextExtent(field).right;
    expect(gap(inside)).toBeCloseTo(4, 0);
    expect(getComputedStyle(found(hintOf(inside), 'the hint')).fontSize).toBe(
      getComputedStyle(found(hintOf(outside), 'the hint')).fontSize,
    );
  });

  it('S6 on a right-to-left page the label hint follows the label in reading order', async () => {
    const fixture = await mount(
      `<div dir="rtl" lang="ar">${markup('ki-input', 'البريد', 'label-hint="(اختياري)"')}</div>`,
    );
    const field = found(fixture.querySelector<HTMLElement>('ki-input'), 'the field');

    await expect.poll(() => shownHint(field)).toBe('(اختياري)');

    const hint = found(hintOf(field), 'the label hint');
    expect(labelTextExtent(field).left - hint.getBoundingClientRect().right).toBeCloseTo(4, 0);
    if (IS_CHROMIUM) {
      await expect.poll(() => namesOf('textbox')).toEqual(['البريد (اختياري)']);
    }
  });

  it('S7 clicking the label hint of a ki-input focuses the field', async () => {
    const field = await mountControl('ki-input', 'Terms', 'label-hint="(optional)"');
    await expect.poll(() => shownHint(field)).toBe('(optional)');

    await userEvent.click(found(hintOf(field), 'the label hint'));

    expect(document.activeElement).toBe(field);
    expect(field.shadowRoot?.activeElement?.localName).toBe('input');
  });

  it('S7 clicking the label hint of a ki-checkbox checks it', async () => {
    const field = await mountControl('ki-checkbox', 'Terms', 'label-hint="(optional)"');
    await expect.poll(() => shownHint(field)).toBe('(optional)');

    await userEvent.click(found(hintOf(field), 'the label hint'));

    await expect.poll(() => (field as HTMLElement & { checked: boolean }).checked).toBe(true);
  });
});

describe('the label hint reaches the keyboard and assistive technology', () => {
  for (const control of ['ki-input', 'ki-select', 'ki-checkbox'] as const) {
    it(`S8 tabbing to a ${control} lands on it with its full name`, async () => {
      const fixture = await mount(
        `<input aria-label="Name">${markup(control, 'Phone', 'label-hint="(optional)"')}`,
      );
      const field = found(fixture.querySelector<HTMLElement>(control), control);
      await expect.poll(() => shownHint(field)).toBe('(optional)');
      found(fixture.querySelector<HTMLInputElement>('input'), 'the Name field').focus();

      await userEvent.tab();

      expect(document.activeElement).toBe(field);
      if (IS_CHROMIUM) {
        await expect
          .poll(() => axNode(roleOf[control], 'Phone (optional)'))
          .toMatchObject({ focused: true });
      }
    });
  }

  it('S9 the label hint joins the name while the help text stays the description', async () => {
    const field = await mountControl(
      'ki-input',
      'Email',
      'label-hint="(optional)" help-text="We never share your email"',
    );

    field.focus();

    await expect.poll(() => shownHint(field)).toBe('(optional)');
    if (IS_CHROMIUM) {
      await expect
        .poll(() => axNode('textbox', 'Email (optional)'))
        .toMatchObject({ description: 'We never share your email' });
    }
  });

  it('S10 an error message leaves the label hint in the name', async () => {
    const fixture = await mount(
      `<form>${markup('ki-select', 'Country', 'required label-hint="(required)" error-text="Choose a country"')}<button type="submit">Send</button></form>`,
    );
    const form = found(fixture.querySelector('form'), 'the form');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
    });
    const field = found(fixture.querySelector<HTMLElement>('ki-select'), 'the Country select');
    await expect.poll(() => shownHint(field)).toBe('(required)');

    await userEvent.click(found(form.querySelector('button'), 'the send button'));

    await expect
      .poll(() => field.shadowRoot?.querySelector('[part~="error"]')?.textContent.trim())
      .toBe('Choose a country');
    if (IS_CHROMIUM) {
      await expect
        .poll(() => axNode('combobox', 'Country (required)'))
        .toMatchObject({ description: 'Choose a country' });
    }
  });
});

describe('the label hint never sets a constraint', () => {
  for (const control of controls) {
    it(`S11 a ${control} whose label hint says required is not required by it`, async () => {
      const fixture = await mount(
        `<form>${markup(control, 'Answer', 'label-hint="(required)"')}<button type="submit">Send</button></form>`,
      );
      const form = found(fixture.querySelector('form'), 'the form');
      let submitted = 0;
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        submitted += 1;
      });
      const field = found(fixture.querySelector<HTMLElement>(control), control);
      await expect.poll(() => shownHint(field)).toBe('(required)');

      await userEvent.click(found(form.querySelector('button'), 'the send button'));

      await expect.poll(() => submitted).toBe(1);
    });
  }
});

describe('the label hint reads clearly in every theme and mode', () => {
  const hintRatios = (fixture: HTMLElement): Record<string, number> =>
    Object.fromEntries(
      [...fixture.querySelectorAll<HTMLElement>(controls.join(','))].map((field) => [
        field.localName,
        textRatio(found(hintOf(field), `the label hint of ${field.localName}`)),
      ]),
    );

  for (const theme of THEMES) {
    for (const scheme of SCHEMES) {
      it(`S12 the label hint reads at least 4.5:1 under ${theme} ${scheme}`, async () => {
        themeDocument(theme, scheme);

        const fixture = await mount(everyControlWithHint);

        for (const [control, ratio] of Object.entries(hintRatios(fixture))) {
          expect(ratio, control).toBeGreaterThanOrEqual(4.5);
        }
        await expectAccessible(fixture);
      });

      it(`S13 under more contrast the label hint reads at least 7:1 under ${theme} ${scheme}`, async () => {
        themeDocument(theme, scheme);
        const fixture = await mount(everyControlWithHint);

        document.documentElement.setAttribute('data-ki-contrast', 'more');
        await nextFrame();

        for (const [control, ratio] of Object.entries(hintRatios(fixture))) {
          expect(ratio, control).toBeGreaterThanOrEqual(7);
        }
      });

      it(`S12 under reduced transparency the label hint still reads at least 4.5:1 under ${theme} ${scheme}`, async () => {
        themeDocument(theme, scheme);
        const fixture = await mount(everyControlWithHint);

        document.documentElement.setAttribute('data-ki-transparency', 'reduce');
        await nextFrame();

        for (const [control, ratio] of Object.entries(hintRatios(fixture))) {
          expect(ratio, control).toBeGreaterThanOrEqual(4.5);
        }
      });
    }
  }

  for (const control of ['ki-input', 'ki-textarea', 'ki-select', 'ki-radio-group'] as const) {
    it(`S14 a disabled ${control}'s label hint follows the disabled ink of its label`, async () => {
      const field = await mountControl(control, 'Email', 'disabled label-hint="(optional)"');
      const hint = found(hintOf(field), 'the label hint');

      expect(getComputedStyle(hint).color).toBe(labelInk(field));
      // A disabled ink can coincide with the supporting ink the hint takes
      // when enabled (the radio group label dims to med-em, the supporting
      // role's own step). More contrast strengthens the supporting ink and
      // leaves every disabled ink as it is (spec 043 D1), so a hint that
      // kept the supporting ink parts from its label here.
      document.documentElement.setAttribute('data-ki-contrast', 'more');
      expect(getComputedStyle(hint).color).toBe(labelInk(field));
    });
  }

  it('S14 a ki-input disabled by its fieldset dims its label hint with its label', async () => {
    const fixture = await mount(
      `<fieldset disabled>${markup('ki-input', 'Email', 'label-hint="(optional)"')}</fieldset>`,
    );
    const field = found(fixture.querySelector<HTMLElement>('ki-input'), 'the field');

    await expect.poll(() => shownHint(field)).toBe('(optional)');

    expect(getComputedStyle(found(hintOf(field), 'the label hint')).color).toBe(labelInk(field));
  });

  it('S15 reassigning the semantic supporting ink restyles every label hint', async () => {
    const fixture = await mount(
      `<style>:root { --ki-text-supporting: #7a1fa2; }</style>${everyControlWithHint}`,
    );

    const inks = [...fixture.querySelectorAll<HTMLElement>(controls.join(','))].map(
      (field) =>
        getComputedStyle(found(hintOf(field), `the label hint of ${field.localName}`)).color,
    );

    expect(inks).toEqual(controls.map(() => 'rgb(122, 31, 162)'));
  });

  it("S16 reassigning one component's hint tokens restyles that component's hint alone", async () => {
    const fixture = await mount(
      `<style>:root { --ki-input-label-hint-fg: #7a1fa2; --ki-input-label-hint-gap: 8px; }</style>${markup('ki-input', 'Email', 'label-hint="(optional)"')}${markup('ki-textarea', 'Email', 'label-hint="(optional)"')}`,
    );
    const input = found(fixture.querySelector<HTMLElement>('ki-input'), 'the field');
    const textarea = found(fixture.querySelector<HTMLElement>('ki-textarea'), 'the textarea');
    await expect.poll(() => shownHint(input)).toBe('(optional)');

    const inputHint = found(hintOf(input), 'the input hint');
    const textareaHint = found(hintOf(textarea), 'the textarea hint');
    expect(getComputedStyle(inputHint).color).toBe('rgb(122, 31, 162)');
    expect(inputHint.getBoundingClientRect().left - labelTextExtent(input).right).toBeCloseTo(8, 0);
    expect(getComputedStyle(textareaHint).color).toBe(inkOf('--ki-text-supporting', fixture));
    expect(textareaHint.getBoundingClientRect().left - labelTextExtent(textarea).right).toBeCloseTo(
      4,
      0,
    );
  });

  for (const [state, control] of [
    ['enabled', 'ki-input'],
    ['disabled', 'ki-checkbox'],
  ] as const) {
    it(`S17 under forced colors the label hint of ${state === 'enabled' ? 'an enabled' : 'a disabled'} ${control} takes the forced ink of its label`, async (context) => {
      await browserCommands.emulateForcedColors('active');
      // An engine may flip the media feature without repainting anything
      // (forced-colors.browser.spec.ts): measuring there would test the
      // author's colours. Chromium, the PR gate's engine, must repaint.
      if (!(await forcedPaletteApplies())) {
        expect(IS_CHROMIUM, 'Chromium stopped applying the forced palette under emulation').toBe(
          false,
        );
        context.skip(`${navigator.userAgent} does not apply a forced palette under emulation`);
      }
      const field = await mountControl(
        control,
        'Terms',
        `${state === 'disabled' ? 'disabled ' : ''}label-hint="(optional)"`,
      );

      await expect.poll(() => shownHint(field)).toBe('(optional)');

      const hint = getComputedStyle(found(hintOf(field), 'the label hint')).color;
      expect(hint).toBe(labelInk(field));
      // The forced palette is opaque system ink, never the author's translucent one.
      expect(parseColor(hint).a).toBe(1);
    });
  }
});
