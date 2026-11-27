// @spec:094-toggle-icon-button
// @spec:002-ki-button
// @spec:022-ki-icon-button
import '../icons/bookmark.js';
import material3Css from '@kimen/tokens/css/material3?raw';
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { defineCustomElement as defineKiButton } from '../dist/components/ki-button.js';
import { defineCustomElement as defineKiIcon } from '../dist/components/ki-icon.js';
import { defineCustomElement as defineKiIconButton } from '../dist/components/ki-icon-button.js';
import { expectAccessible, parkPointer } from './axe';
import {
  contrast,
  parseColor,
  SCHEMES,
  surfaceOf,
  textRatio,
  THEMES,
  themeDocument,
} from './modes';

const tags = ['ki-button', 'ki-icon-button'] as const;
type Tag = (typeof tags)[number];
type ToggleButton = HTMLElement & { selected: boolean; toggle: boolean };
type ChangeEvent = CustomEvent<{ selected: boolean }>;

const BOOKMARK =
  '<svg viewBox="0 0 24 24" fill="none"><path d="M6 3h12v18l-6-4-6 4z" stroke="currentColor" stroke-width="2"/></svg>';
const SELECTED_ICON =
  '<svg slot="selected" viewBox="0 0 24 24" fill="currentColor"><title>Selected bookmark</title><path d="M6 3h12v18l-6-4-6 4z"/></svg>';
const variants = ['primary', 'secondary', 'tertiary', 'quaternary', 'ghost', 'outline'] as const;

const browserCommands = commands as unknown as {
  emulateForcedColors: (forcedColors: 'active' | null) => Promise<boolean | undefined>;
  emulateReducedMotion: (reducedMotion: 'reduce' | null) => Promise<void>;
};

const styles = [tokensCss, material3Css].map((css) => {
  const style = document.createElement('style');
  style.textContent = css;
  return style;
});

beforeAll(() => {
  defineKiButton();
  defineKiIconButton();
  defineKiIcon();
  document.head.append(...styles);
});

afterEach(async () => {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
  await parkPointer();
});

afterAll(() => {
  for (const style of styles) style.remove();
});

function fixture(): HTMLElement {
  const main = document.createElement('main');
  main.style.backgroundColor = 'var(--ki-surface-s0)';
  main.style.padding = '24px';
  document.body.append(main);
  return main;
}

async function mount(tag: Tag, attributes = 'toggle', parent = fixture(), label = 'Bookmark') {
  parent.insertAdjacentHTML(
    'beforeend',
    tag === 'ki-icon-button'
      ? `<ki-icon-button ${attributes} label="${label}">${BOOKMARK}</ki-icon-button>`
      : `<ki-button ${attributes}>${label}</ki-button>`,
  );
  const host = parent.lastElementChild as ToggleButton;
  await expect
    .poll(() => host.shadowRoot?.querySelector('[part="button"]'))
    .toBeInstanceOf(HTMLButtonElement);
  const control = host.shadowRoot?.querySelector<HTMLButtonElement>('[part="button"]');
  if (!control) throw new Error(`${tag} rendered no button part`);
  return { host, control };
}

function changeEvents(): ChangeEvent[] {
  const events: ChangeEvent[] = [];
  document.querySelector('main')?.addEventListener('ki-change', (event) => {
    events.push(event as ChangeEvent);
  });
  return events;
}

async function expectSelection(host: ToggleButton, control: HTMLButtonElement, selected: boolean) {
  await expect.poll(() => control.getAttribute('aria-pressed')).toBe(String(selected));
  expect(host.hasAttribute('selected')).toBe(selected);
  expect(host.selected).toBe(selected);
}

it.each(tags)('S1 S19 %s toggles and emits one change on each pointer activation', async (tag) => {
  const { host, control } = await mount(tag);
  const events = changeEvents();

  expect(host.hasAttribute('toggle')).toBe(true);
  expect(host.toggle).toBe(true);
  await expectSelection(host, control, false);

  await userEvent.click(control);
  await expectSelection(host, control, true);
  expect(events.map((event) => event.detail)).toEqual([{ selected: true }]);

  await userEvent.click(control);
  await expectSelection(host, control, false);
  expect(events.map((event) => event.detail)).toEqual([{ selected: true }, { selected: false }]);
  for (const event of events) {
    expect(event).toMatchObject({ bubbles: true, composed: true, cancelable: false });
    expect(event.target).toBe(host);
  }
});

it.each(tags)(
  'S2 %s updates silently from markup and script and keeps its momentary click',
  async (tag) => {
    const main = fixture();
    const events = changeEvents();
    const { host, control } = await mount(tag, 'toggle selected', main);
    await expectSelection(host, control, true);

    host.selected = false;
    await expectSelection(host, control, false);
    host.selected = true;
    await expectSelection(host, control, true);

    host.toggle = false;
    await expect.poll(() => control.hasAttribute('aria-pressed')).toBe(false);
    expect(host.hasAttribute('toggle')).toBe(false);
    const clicks: Event[] = [];
    host.addEventListener('click', (event) => clicks.push(event));
    await userEvent.click(control);

    expect(clicks).toHaveLength(1);
    expect(host.selected).toBe(true);
    expect(control.hasAttribute('aria-pressed')).toBe(false);
    expect(events).toEqual([]);
  },
);

it('S3 shows a selected icon when present and fills the default icon otherwise', async () => {
  const { host, control } = await mount('ki-icon-button');
  const defaultIcon = host.querySelector('svg');
  const defaultPath = defaultIcon?.querySelector('path');
  if (!defaultIcon || !defaultPath) throw new Error('missing fixture icon');

  expect(getComputedStyle(defaultPath).fill).toBe('none');
  await userEvent.click(control);
  await expectSelection(host, control, true);
  await expect
    .poll(() => getComputedStyle(defaultPath).fill === getComputedStyle(control).color)
    .toBe(true);
  expect(defaultIcon.getBoundingClientRect().width).toBeGreaterThan(0);

  host.insertAdjacentHTML('beforeend', SELECTED_ICON);
  const selectedIcon = host.querySelector('[slot="selected"]');
  if (!selectedIcon) throw new Error('missing selected fixture icon');
  await expect.poll(() => selectedIcon.getBoundingClientRect().width).toBeGreaterThan(0);
  expect(defaultIcon.getBoundingClientRect().width).toBe(0);

  await userEvent.click(control);
  await expectSelection(host, control, false);
  expect(defaultIcon.getBoundingClientRect().width).toBeGreaterThan(0);
  expect(selectedIcon.getBoundingClientRect().width).toBe(0);

  await userEvent.click(control);
  await expectSelection(host, control, true);
  selectedIcon.remove();
  await expect.poll(() => defaultIcon.getBoundingClientRect().width).toBeGreaterThan(0);
  expect(getComputedStyle(defaultPath).fill).toBe(getComputedStyle(control).color);
});

it.each(tags)('S4 %s blocks activation while disabled or loading', async (tag) => {
  const main = fixture();
  const events = changeEvents();
  const disabled = await mount(tag, 'toggle selected disabled', main, 'Disabled selection');
  const loading = await mount(tag, 'toggle selected loading', main, 'Loading selection');
  expect(disabled.control.disabled).toBe(true);
  expect(loading.control.getAttribute('aria-disabled')).toBe('true');

  await userEvent.click(disabled.control, { force: true });
  disabled.control.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
  await userEvent.click(loading.control, { force: true });
  loading.control.focus();
  await userEvent.keyboard('{Enter}');
  await userEvent.keyboard(' ');

  await expectSelection(disabled.host, disabled.control, true);
  await expectSelection(loading.host, loading.control, true);
  expect(events).toEqual([]);
});

it.each(tags)('S5 %s toggles once with Enter and Space and retains focus', async (tag) => {
  const main = fixture();
  const before = document.createElement('button');
  before.textContent = 'Before';
  before.tabIndex = 0;
  main.append(before);
  const { host, control } = await mount(tag, 'toggle', main);
  const events = changeEvents();

  before.focus();
  await userEvent.keyboard('{Tab}');
  expect(host.shadowRoot?.activeElement).toBe(control);

  await userEvent.keyboard('{Enter}');
  await expectSelection(host, control, true);
  expect(host.shadowRoot?.activeElement).toBe(control);
  expect(events.map((event) => event.detail)).toEqual([{ selected: true }]);

  await userEvent.keyboard(' ');
  await expectSelection(host, control, false);
  expect(host.shadowRoot?.activeElement).toBe(control);
  expect(events.map((event) => event.detail)).toEqual([{ selected: true }, { selected: false }]);
});

it('S6 gives both toggles stable accessible names and exposes the pressed state', async () => {
  const main = fixture();
  const text = await mount('ki-button', 'toggle', main, 'Bold');
  const icon = await mount('ki-icon-button', 'toggle', main);
  icon.host.insertAdjacentHTML('beforeend', SELECTED_ICON);

  for (const [name, { control }] of [
    ['Bold', text],
    ['Bookmark', icon],
  ] as const) {
    await expect
      .element(page.getByRole('button', { name, exact: true, pressed: false }))
      .toBeInTheDocument();
    await userEvent.click(control);
    await expect
      .element(page.getByRole('button', { name, exact: true, pressed: true }))
      .toBeInTheDocument();
  }

  await expectAccessible(main);
});

it.for(tags)('S7 %s has distinct selected paint in forced colors', async (tag, test) => {
  const emulated = await browserCommands.emulateForcedColors('active');
  try {
    if (emulated === false) {
      test.skip('this engine cannot emulate forced colors');
    }
    await expect.poll(() => matchMedia('(forced-colors: active)').matches).toBe(true);
    const main = fixture();
    const { control: off } = await mount(tag, 'toggle variant="outline"', main);
    const { control: on } = await mount(tag, 'toggle selected variant="outline"', main);
    const palette = document.createElement('span');
    palette.style.cssText =
      'forced-color-adjust:none;background-color:Highlight;color:HighlightText';
    main.append(palette);

    await expect
      .poll(() => getComputedStyle(on).backgroundColor)
      .toBe(getComputedStyle(palette).backgroundColor);
    expect(getComputedStyle(on).color).toBe(getComputedStyle(palette).color);
    expect(getComputedStyle(on).backgroundColor).not.toBe(getComputedStyle(off).backgroundColor);
    expect(getComputedStyle(on).borderStartStartRadius).not.toBe(
      getComputedStyle(off).borderStartStartRadius,
    );
  } finally {
    await browserCommands.emulateForcedColors(null);
  }
});

it.each(['submit', 'reset'])(
  'S8 toggle activation leaves the form alone with type=%s',
  async (type) => {
    const form = document.createElement('form');
    const input = document.createElement('input');
    input.name = 'title';
    input.defaultValue = 'Original';
    input.value = 'Edited';
    form.append(input);
    fixture().append(form);
    const attrs = `type="${type}" name="intent" value="apply"`;
    const text = await mount('ki-button', `toggle ${attrs}`, form);
    const icon = await mount('ki-icon-button', `toggle ${attrs}`, form);
    const { control: momentary } = await mount('ki-button', attrs, form, 'Apply');
    const submissions: Record<string, FormDataEntryValue>[] = [];
    let resets = 0;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submissions.push(Object.fromEntries(new FormData(form, event.submitter)));
    });
    form.addEventListener('reset', () => {
      resets += 1;
    });

    for (const { host, control } of [text, icon]) {
      await userEvent.click(control);
      await expectSelection(host, control, true);
    }
    expect(submissions).toEqual([]);
    expect(resets).toBe(0);
    expect(input.value).toBe('Edited');

    await userEvent.click(momentary);
    if (type === 'submit') {
      expect(submissions).toEqual([{ title: 'Edited', intent: 'apply' }]);
    } else {
      expect(resets).toBe(1);
      expect(input.value).toBe('Original');
    }
  },
);

const themeCases = THEMES.flatMap((theme) => SCHEMES.map((scheme) => ({ theme, scheme })));

it.each(themeCases)(
  'S9 distinguishes every variant in $theme $scheme',
  async ({ theme, scheme }) => {
    themeDocument(theme, scheme);
    const main = fixture();
    for (const tag of tags) {
      for (const variant of variants) {
        const attributes = `toggle variant="${variant}"`;
        const { control: off } = await mount(tag, attributes, main);
        const { control: on } = await mount(tag, `${attributes} selected`, main);
        const cell = `${tag} ${variant}`;
        const minInk = tag === 'ki-icon-button' ? 3 : 4.5;

        expect(
          contrast(surfaceOf(on), surfaceOf(off)),
          `${cell} selected vs unselected fill`,
        ).toBeGreaterThanOrEqual(3);
        expect(textRatio(on), `${cell} selected ink`).toBeGreaterThanOrEqual(minInk);
        expect(textRatio(off), `${cell} unselected ink`).toBeGreaterThanOrEqual(minInk);
        expect(getComputedStyle(on).borderStartStartRadius, `${cell} selected shape`).not.toBe(
          getComputedStyle(off).borderStartStartRadius,
        );
        if (variant === 'outline') {
          const style = getComputedStyle(off);
          expect(style.borderInlineStartStyle).toBe('solid');
          expect(Number.parseFloat(style.borderInlineStartWidth)).toBeGreaterThan(0);
          expect(parseColor(style.borderInlineStartColor).a).toBeGreaterThan(0);
          expect(style.borderInlineStartColor).not.toBe(style.backgroundColor);
        }
      }
    }
  },
);

it.each(tags)(
  'S10 %s draws the selected shape without a transition under reduced motion',
  async (tag) => {
    const { host, control } = await mount(tag);
    await expectSelection(host, control, false);
    const unselected = getComputedStyle(control).borderStartStartRadius;

    // WebKit re-evaluates the motion media query in shadow roots already
    // mounted when the preference changes.
    try {
      await browserCommands.emulateReducedMotion('reduce');
      expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
      await expect.poll(() => getComputedStyle(control).transitionDuration).toBe('0s');

      await userEvent.click(control);
      await expectSelection(host, control, true);
      await expect
        .poll(() => {
          const style = getComputedStyle(control);
          return {
            shapeChanged: style.borderStartStartRadius !== unselected,
            transitionDuration: style.transitionDuration,
          };
        })
        .toEqual({ shapeChanged: true, transitionDuration: '0s' });
    } finally {
      await browserCommands.emulateReducedMotion(null);
    }
  },
);

it('S11 preserves toggle activation and logical slot positions under RTL', async () => {
  const main = fixture();
  main.dir = 'rtl';
  const text = await mount('ki-button', 'toggle variant="outline"', main, 'Bold');
  const icon = await mount('ki-icon-button', 'toggle variant="outline"', main);
  const leading = document.createElement('span');
  leading.slot = 'start';
  leading.textContent = 'A';
  const trailing = document.createElement('span');
  trailing.slot = 'end';
  trailing.textContent = 'Z';
  text.host.prepend(leading);
  text.host.append(trailing);
  icon.host.insertAdjacentHTML('beforeend', SELECTED_ICON);

  await userEvent.click(text.control);
  await expectSelection(text.host, text.control, true);
  expect(getComputedStyle(text.control).direction).toBe('rtl');
  expect(leading.getBoundingClientRect().left).toBeGreaterThan(
    trailing.getBoundingClientRect().left,
  );

  await userEvent.click(icon.control);
  await expectSelection(icon.host, icon.control, true);
  expect(getComputedStyle(icon.control).direction).toBe('rtl');
  const selectedIcon = icon.host.querySelector('[slot="selected"]');
  if (!selectedIcon) throw new Error('missing selected fixture icon');
  await expect.poll(() => selectedIcon.getBoundingClientRect().width).toBeGreaterThan(0);
  const glyph = selectedIcon.getBoundingClientRect();
  const button = icon.control.getBoundingClientRect();
  expect(
    Math.abs(glyph.left + glyph.width / 2 - (button.left + button.width / 2)),
  ).toBeLessThanOrEqual(0.5);
});

async function withReducedMotion(check: () => Promise<void>) {
  try {
    await browserCommands.emulateReducedMotion('reduce');
    await check();
  } finally {
    await parkPointer();
    await browserCommands.emulateReducedMotion(null);
  }
}

function surfacePaint(control: HTMLElement) {
  const { backgroundColor, backgroundImage, borderInlineStartColor, borderBlockEndColor, color } =
    getComputedStyle(control);
  return { backgroundColor, backgroundImage, borderInlineStartColor, borderBlockEndColor, color };
}

async function hoverPaint(control: HTMLElement) {
  await parkPointer();
  const rest = surfacePaint(control);
  await userEvent.hover(control);
  expect(control.matches(':hover')).toBe(true);
  return { rest, hover: surfacePaint(control) };
}

it.each([
  { tag: 'ki-button', id: 'S27', attrs: 'variant="outline"' },
  { tag: 'ki-button', id: 'S27', attrs: 'variant="outline" href="#details"' },
  { tag: 'ki-icon-button', id: 'S20', attrs: 'variant="outline"' },
] as const)('$id $tag gives the outline action hover feedback ($attrs)', async ({ tag, attrs }) => {
  await withReducedMotion(async () => {
    const main = fixture();
    main.insertAdjacentHTML(
      'beforeend',
      `<${tag} ${attrs} label="Details">${tag === 'ki-button' ? 'Details' : BOOKMARK}</${tag}>`,
    );
    const host = main.firstElementChild;
    await expect
      .poll(() => host?.shadowRoot?.querySelector<HTMLElement>('[part="button"]'))
      .toBeInstanceOf(HTMLElement);
    const button = host?.shadowRoot?.querySelector<HTMLElement>('[part="button"]');
    if (!button) throw new Error('missing outline control');
    const { rest, hover } = await hoverPaint(button);
    expect(hover.backgroundColor).not.toBe(rest.backgroundColor);
  });
});

it.each(themeCases)(
  'S28 S21 every unselected toggle responds to hover in $theme $scheme',
  async ({ theme, scheme }) => {
    themeDocument(theme, scheme);
    await withReducedMotion(async () => {
      const main = fixture();
      for (const tag of tags) {
        for (const variant of variants) {
          const { control } = await mount(tag, `toggle variant="${variant}"`, main);
          const { rest, hover } = await hoverPaint(control);
          const property = variant === 'outline' ? 'backgroundColor' : 'backgroundImage';
          expect(hover[property], `${tag} ${variant} hover ${property}`).not.toBe(rest[property]);
          expect(textRatio(control), `${tag} ${variant} hovered ink`).toBeGreaterThanOrEqual(4.5);
        }
      }
    });
  },
);

it.each(tags)('S29 S22 %s keeps selected paint on hover for every variant', async (tag) => {
  await withReducedMotion(async () => {
    const main = fixture();
    for (const variant of variants) {
      const { control } = await mount(tag, `toggle selected variant="${variant}"`, main);
      const { rest, hover } = await hoverPaint(control);
      expect(hover, variant).toEqual(rest);
    }
  });
});

it.each(tags)('S30 S23 %s uses reassigned outline hover colors', async (tag) => {
  await withReducedMotion(async () => {
    const main = fixture();
    for (const mode of ['', 'toggle']) {
      const { host, control } = await mount(tag, `${mode} variant="outline"`, main);
      host.style.setProperty(`--${tag}-outline-hover-bg`, 'rgb(20 30 40)');
      host.style.setProperty(`--${tag}-outline-hover-fg`, 'rgb(225 230 235)');
      host.style.setProperty(`--${tag}-outline-hover-border`, 'rgb(65 75 85)');
      const { rest, hover } = await hoverPaint(control);
      expect(hover).toMatchObject({
        backgroundColor: 'rgb(20, 30, 40)',
        color: 'rgb(225, 230, 235)',
        borderInlineStartColor: 'rgb(65, 75, 85)',
        borderBlockEndColor: 'rgb(65, 75, 85)',
      });
      expect(rest.backgroundColor).not.toBe(hover.backgroundColor);
      expect(rest.color).not.toBe(hover.color);
      expect(rest.borderInlineStartColor).not.toBe(hover.borderInlineStartColor);
    }
  });
});

it.each(tags)('S31 S24 %s uses a reassigned selected outline border', async (tag) => {
  await withReducedMotion(async () => {
    const { host, control } = await mount(tag, 'toggle selected variant="outline"');
    host.style.setProperty(`--${tag}-outline-selected-border`, 'rgb(65 75 85)');
    const { rest, hover } = await hoverPaint(control);
    expect(rest.borderInlineStartColor).toBe('rgb(65, 75, 85)');
    expect(rest.borderBlockEndColor).toBe('rgb(65, 75, 85)');
    expect(hover).toEqual(rest);
  });
});

it.each(tags)('S32 S25 %s uses a reassigned unselected toggle hover wash', async (tag) => {
  await withReducedMotion(async () => {
    const main = fixture();
    for (const variant of ['primary', 'ghost']) {
      const { host, control } = await mount(tag, `toggle variant="${variant}"`, main);
      host.style.setProperty(`--${tag}-toggle-unselected-hover-overlay`, 'rgb(20 30 40)');
      const { rest, hover } = await hoverPaint(control);
      expect(rest.backgroundImage).toBe('none');
      expect(hover.backgroundImage).toBe('linear-gradient(rgb(20, 30, 40), rgb(20, 30, 40))');
      expect(hover.backgroundColor).toBe(rest.backgroundColor);
    }
  });
});

const iconSizes = ['md', 'xs', 'sm', 'lg', 'xl'] as const;

function slotIcons(host: HTMLElement, tag: Tag, explicitSize = false): Element[] {
  const slots = tag === 'ki-button' ? ['start', 'end'] : ['', 'selected'];
  const size = explicitSize ? 'size="lg"' : '';
  host.innerHTML = slots
    .map((slot) => `<ki-icon ${size} ${slot ? `slot="${slot}"` : ''} name="bookmark"></ki-icon>`)
    .join('');
  if (tag === 'ki-button') host.append('Bookmark');
  return [...host.querySelectorAll('ki-icon')];
}

async function expectGlyphSize(icon: Element, size: number) {
  await expect.poll(() => icon.shadowRoot?.querySelector('svg')).toBeInstanceOf(SVGElement);
  const bounds = icon.shadowRoot?.querySelector('svg')?.getBoundingClientRect();
  expect(
    bounds?.width,
    `glyph inside a ${String(icon.getBoundingClientRect().width)}px slot`,
  ).toBeCloseTo(size);
  expect(bounds?.height).toBeCloseTo(size);
}

it.each(tags)('S33 S26 %s sizes slotted glyphs at every default size', async (tag) => {
  const main = fixture();
  const theme = document.createElement('div');
  main.append(theme);
  for (const size of iconSizes) {
    const { host } = await mount(tag, `size="${size}"`, main);
    const icons = slotIcons(host, tag);
    theme.style.inlineSize = `var(--${tag}-${size}-icon-size)`;
    const expected = theme.getBoundingClientRect().width;
    expect(expected).toBeGreaterThan(0);
    for (const icon of tag === 'ki-button' ? icons : icons.slice(0, 1)) {
      await expectGlyphSize(icon, expected);
    }
  }
});

it.each(tags)('S34 S27 %s uses the reassigned glyph size in both slots', async (tag) => {
  await withReducedMotion(async () => {
    const main = fixture();
    for (const size of iconSizes) {
      const { host, control } = await mount(tag, `size="${size}" toggle`, main);
      host.style.setProperty(`--${tag}-${size}-icon-size`, '19.5px');
      const icons = slotIcons(host, tag, size !== 'md');
      for (const [index, icon] of icons.entries()) {
        if (tag === 'ki-icon-button' && index === 1) {
          host.selected = true;
          await expectSelection(host, control, true);
        }
        await expectGlyphSize(icon, 19.5);
        icon.setAttribute('size', 'lg');
        await expectGlyphSize(icon, 19.5);
      }
    }
  });
});

it('S35 the inline-size token fills a grid cell for both button and link', async () => {
  await withReducedMotion(async () => {
    const main = fixture();
    main.style.cssText += 'display:grid; grid-template-columns:240px 300px; gap:16px;';
    main.insertAdjacentHTML(
      'beforeend',
      '<ki-button variant="outline" toggle>Use existing workspace</ki-button>' +
        '<ki-button href="#setup">Read the setup guide</ki-button>',
    );
    for (const [index, host] of [...main.querySelectorAll('ki-button')].entries()) {
      await expect
        .poll(() => host.shadowRoot?.querySelector('[part="button"]'))
        .toBeInstanceOf(index === 0 ? HTMLButtonElement : HTMLAnchorElement);
      const control = host.shadowRoot?.querySelector('[part="button"]');
      if (!control) throw new Error('missing grid control');
      const cellWidth = index === 0 ? 240 : 300;
      expect(control.getBoundingClientRect().width).toBeLessThan(cellWidth);
      host.style.setProperty('--ki-button-inline-size', '100%');
      expect(host.getBoundingClientRect().width).toBeCloseTo(cellWidth);
      expect(control.getBoundingClientRect().width).toBeCloseTo(cellWidth);
      host.style.setProperty('--ki-button-inline-size', '50%');
      expect(host.getBoundingClientRect().width).toBeCloseTo(cellWidth / 2);
      expect(control.getBoundingClientRect().width).toBeCloseTo(cellWidth / 2);
    }
  });
});
