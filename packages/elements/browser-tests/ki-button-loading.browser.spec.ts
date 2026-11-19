// @spec:046-button-loading
// The loading state of ki-button and ki-icon-button, asserted on the BUILT
// custom elements (Art. III): what the button measures, what it paints, which
// events reach the application, what its form does and what the engine's own
// accessibility tree exposes. The accessibility tree is read over CDP, which
// only Chromium has, so those assertions run on Chromium (the PR engine);
// everything a page can observe runs on every engine of the release matrix.
import material3Css from '@kimen/tokens/css/material3?raw';
import tokensCss from '@kimen/tokens/css?raw';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

import { defineCustomElement as defineKiButton } from '../dist/components/ki-button.js';
import { defineCustomElement as defineKiIconButton } from '../dist/components/ki-icon-button.js';
import { expectAccessible, parkPointer } from './axe';
import {
  contrast,
  over,
  parseColor,
  resetRoot,
  type Scheme,
  surfaceOf,
  type Theme,
  themeDocument,
} from './modes';

interface AxNode {
  readonly role: string;
  readonly name: string;
  readonly live: unknown;
  readonly text: string;
  readonly disabled: boolean;
  readonly focusable: boolean;
}

const browserCommands = commands as unknown as {
  accessibilityTree: () => Promise<AxNode[] | null>;
  emulateForcedColors: (forcedColors: 'active' | 'none' | null) => Promise<void>;
  emulateReducedMotion: (reducedMotion: 'reduce' | 'no-preference' | null) => Promise<void>;
};

type Kind = 'ki-button' | 'ki-icon-button';

type LoadingButton = HTMLElement & {
  disabled: boolean;
  loading: boolean;
  loadingLabel: string;
};

const IS_CHROMIUM = navigator.userAgent.includes('Chrome/');
const STYLE_IDS = ['button-loading-tokens', 'button-loading-material3'] as const;
const VARIANTS = ['primary', 'secondary', 'tertiary', 'quaternary', 'ghost'] as const;
const TONES = ['neutral', 'success', 'danger'] as const;
const SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
const KINDS: readonly { kind: Kind; name: string }[] = [
  { kind: 'ki-button', name: 'Save changes' },
  { kind: 'ki-icon-button', name: 'Refresh' },
];
const REFRESH_ICON =
  '<svg viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 0 1 14-5l2 2M20 12a8 8 0 0 1-14 5l-2-2" stroke="currentColor" stroke-width="2"/></svg>';
/** Sub-pixel layout rounding: a box that did not move measures within half a pixel. */
const LAYOUT_TOLERANCE = 0.5;
const SETTLE_DEADLINE_MS = 2000;

beforeAll(() => {
  defineKiButton();
  defineKiIconButton();
  for (const [index, css] of [tokensCss, material3Css].entries()) {
    const id = STYLE_IDS[index];
    if (id === undefined || document.getElementById(id) !== null) continue;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.append(style);
  }
});

afterEach(() => {
  document.body.replaceChildren();
  resetRoot();
  document.documentElement.removeAttribute('style');
});

async function nextFrame(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

/** Stencil renders on the next frames after a property changes. */
async function settle(): Promise<void> {
  await nextFrame();
  await nextFrame();
}

/** Markup of one button: a ki-button names itself with its label, an icon button with `label`. */
function markup(kind: Kind, name: string, attributes = ''): string {
  return kind === 'ki-button'
    ? `<ki-button ${attributes}>${name}</ki-button>`
    : `<ki-icon-button label="${name}" ${attributes}>${REFRESH_ICON}</ki-icon-button>`;
}

/** Mount markup in a landmark that paints the page surface and wait for every button to render. */
async function mount(html: string): Promise<HTMLElement> {
  await parkPointer();
  const fixture = document.createElement('main');
  fixture.style.backgroundColor = 'var(--ki-surface-s0)';
  fixture.style.padding = '48px';
  fixture.innerHTML = html;
  document.body.append(fixture);
  const hosts = [...fixture.querySelectorAll<LoadingButton>('ki-button, ki-icon-button')];
  await Promise.all(hosts.map((host) => customElements.whenDefined(host.localName)));
  const deadline = Date.now() + SETTLE_DEADLINE_MS;
  while (
    hosts.some((host) => host.shadowRoot?.querySelector('button') == null) &&
    Date.now() < deadline
  ) {
    await nextFrame();
  }
  await settle();
  return fixture;
}

function found<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`${what} is not rendered`);
  return value;
}

function hostIn(fixture: ParentNode, selector = 'ki-button, ki-icon-button'): LoadingButton {
  return found(fixture.querySelector<LoadingButton>(selector), selector);
}

function innerButton(host: LoadingButton): HTMLButtonElement {
  return found(host.shadowRoot?.querySelector('button'), `${host.localName}'s native button`);
}

function spinnerOf(host: LoadingButton): SVGElement | null {
  return host.shadowRoot?.querySelector<SVGElement>('[part="spinner"]') ?? null;
}

/** The painted shape of the spinner: the stroked ring. */
function spinnerRing(host: LoadingButton): SVGElement {
  const spinner = found(spinnerOf(host), `${host.localName}'s spinner`);
  return spinner.querySelector('circle') ?? spinner;
}

/** What the button shows of its content: the label of a ki-button, the icon of an icon button. */
function contentOf(host: LoadingButton): HTMLElement {
  const part = host.localName === 'ki-button' ? 'label' : 'icon';
  return found(host.shadowRoot?.querySelector<HTMLElement>(`[part="${part}"]`), `the ${part}`);
}

/** The text of the button's status region, '' when it holds none. */
function statusText(host: LoadingButton): string {
  return host.shadowRoot?.querySelector('[role="status"]')?.textContent.trim() ?? '';
}

function sizeOf(element: Element): { height: number; width: number } {
  const box = element.getBoundingClientRect();
  return { height: box.height, width: box.width };
}

/** Center of a box. A rotating spinner keeps its center, whatever its bounding box does. */
function centerOf(element: Element): { x: number; y: number } {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

function expectSameSize(actual: { height: number; width: number }, rest: typeof actual): void {
  expect(Math.abs(actual.width - rest.width), 'width changed').toBeLessThanOrEqual(
    LAYOUT_TOLERANCE,
  );
  expect(Math.abs(actual.height - rest.height), 'height changed').toBeLessThanOrEqual(
    LAYOUT_TOLERANCE,
  );
}

function expectSpinnerCentered(host: LoadingButton): void {
  const spinner = found(spinnerOf(host), `${host.localName}'s spinner`);
  const button = centerOf(innerButton(host));
  const center = centerOf(spinner);
  expect(Math.abs(center.x - button.x), 'spinner off center inline').toBeLessThanOrEqual(
    LAYOUT_TOLERANCE,
  );
  expect(Math.abs(center.y - button.y), 'spinner off center block').toBeLessThanOrEqual(
    LAYOUT_TOLERANCE,
  );
}

/** The rendered size of the spinner box: its computed size, which a rotation leaves alone. */
function spinnerSize(host: LoadingButton): { height: string; width: string } {
  const style = getComputedStyle(found(spinnerOf(host), `${host.localName}'s spinner`));
  return { height: style.height, width: style.width };
}

/** Every click event that reaches the host, and proof that the input reached the button at all. */
function observeActivation(host: LoadingButton): { activations: number; inputs: number } {
  const seen = { activations: 0, inputs: 0 };
  host.addEventListener('click', () => {
    seen.activations += 1;
  });
  for (const type of ['mousedown', 'keydown']) {
    host.addEventListener(type, () => {
      seen.inputs += 1;
    });
  }
  return seen;
}

/** A real pointer click. `force` skips actionability: Playwright never clicks an aria-disabled control. */
async function clickButton(host: LoadingButton): Promise<void> {
  await userEvent.click(innerButton(host), { force: true });
  await settle();
}

async function setLoading(hosts: LoadingButton | readonly LoadingButton[], value = true) {
  for (const host of Array.isArray(hosts) ? hosts : [hosts]) {
    (host as LoadingButton).loading = value;
  }
  await settle();
}

async function tree(): Promise<AxNode[]> {
  await settle();
  const nodes = await browserCommands.accessibilityTree();
  if (nodes === null) {
    throw new Error('Chromium stopped answering its accessibility tree over CDP');
  }
  return nodes;
}

async function politeTexts(): Promise<string[]> {
  return (await tree()).filter((node) => node.live === 'polite').map((node) => node.text);
}

function runningLoops(element: Element): Animation[] {
  return element.getAnimations().filter((animation) => {
    const timing = animation.effect?.getComputedTiming();
    return animation.playState === 'running' && timing?.iterations === Number.POSITIVE_INFINITY;
  });
}

describe('a loading button holds its place', () => {
  it.each(KINDS)(
    'S1 a loading $kind keeps its size and draws a spinner at its center in place of its content',
    async ({ kind, name }) => {
      const fixture = await mount(markup(kind, name));
      const host = hostIn(fixture);
      const rest = sizeOf(innerButton(host));
      expect(spinnerOf(host), 'a spinner at rest').toBeNull();

      await setLoading(host);

      expectSameSize(sizeOf(innerButton(host)), rest);
      expectSpinnerCentered(host);
      expect(getComputedStyle(contentOf(host)).opacity, 'the content still shows').toBe('0');
    },
  );

  it.each([
    ['xs', '14px', '16px'],
    ['sm', '16px', '18px'],
    ['md', '18px', '20px'],
    ['lg', '20px', '24px'],
    ['xl', '24px', '28px'],
  ] as const)(
    'S2 at size %s the spinner of a ki-button measures %s and of a ki-icon-button %s',
    async (size, button, icon) => {
      const fixture = await mount(
        `${markup('ki-button', 'Save changes', `size="${size}"`)}${markup('ki-icon-button', 'Refresh', `size="${size}"`)}`,
      );
      const kiButton = hostIn(fixture, 'ki-button');
      const iconButton = hostIn(fixture, 'ki-icon-button');

      await setLoading([kiButton, iconButton]);

      expect(spinnerSize(kiButton)).toEqual({ height: button, width: button });
      expect(spinnerSize(iconButton)).toEqual({ height: icon, width: icon });
    },
  );

  it.each([
    ['a right-to-left direction', 'dir="rtl"'],
    ['the compact density', 'data-ki-density="compact"'],
  ] as const)('S3 a loading button keeps its place inside a region with %s', async (_, region) => {
    const fixture = await mount(
      `<section ${region}>${markup('ki-button', 'Save changes')}</section>`,
    );
    const host = hostIn(fixture);
    const rest = sizeOf(innerButton(host));

    await setLoading(host);

    expectSameSize(sizeOf(innerButton(host)), rest);
    expectSpinnerCentered(host);
  });

  it('S4 clearing the loading state brings the label back and makes the button usable', async () => {
    const fixture = await mount(markup('ki-button', 'Save changes', 'type="button" loading'));
    const host = hostIn(fixture);
    expect(spinnerOf(host), 'the button was not loading').not.toBeNull();
    const seen = observeActivation(host);

    await setLoading(host, false);

    expect(getComputedStyle(contentOf(host)).opacity).toBe('1');
    expect(spinnerOf(host)).toBeNull();
    expect(statusText(host)).toBe('');
    expect(innerButton(host).hasAttribute('aria-disabled')).toBe(false);
    if (IS_CHROMIUM) {
      expect(await politeTexts()).toEqual(['']);
    }
    await userEvent.click(innerButton(host));
    expect(seen.activations).toBe(1);
  });

  it('S5 a disabled button stays disabled when it is also set loading', async () => {
    const fixture = await mount(
      `${markup('ki-button', 'Save changes', 'variant="primary" disabled')}${markup('ki-button', 'Save', 'variant="primary" disabled id="reference"')}`,
    );
    const host = hostIn(fixture);
    const reference = innerButton(hostIn(fixture, '#reference'));

    await setLoading(host);

    expect(host.hasAttribute('loading'), 'loading is not a reflected property').toBe(true);
    const button = innerButton(host);
    expect(button.disabled).toBe(true);
    expect(button.hasAttribute('aria-disabled')).toBe(false);
    expect(button.tabIndex, 'a disabled button is out of the Tab order').toBe(-1);
    expect(spinnerOf(host)).toBeNull();
    expect(getComputedStyle(contentOf(host)).opacity).toBe('1');
    expect(statusText(host)).toBe('');
    const paint = (element: HTMLElement): string[] => {
      const style = getComputedStyle(element);
      return [style.backgroundColor, style.color, style.borderTopColor];
    };
    expect(paint(button), 'the disabled appearance').toEqual(paint(reference));
  });

  it('S5 a button disabled by its fieldset stays disabled when it is also set loading', async () => {
    const fixture = await mount(
      `<form><fieldset disabled>${markup('ki-button', 'Save changes')}</fieldset></form>`,
    );
    const host = hostIn(fixture);

    await setLoading(host);

    expect(host.hasAttribute('loading'), 'loading is not a reflected property').toBe(true);
    expect(innerButton(host).disabled).toBe(true);
    expect(innerButton(host).hasAttribute('aria-disabled')).toBe(false);
    expect(spinnerOf(host)).toBeNull();
    expect(statusText(host)).toBe('');
  });
});

describe('a loading button blocks activation', () => {
  it.each(KINDS)(
    'S6 a click on a loading $kind reaches no application listener',
    async ({ kind, name }) => {
      const fixture = await mount(markup(kind, name, 'type="button"'));
      const host = hostIn(fixture);
      await setLoading(host);
      const seen = observeActivation(host);

      await clickButton(host);

      expect(seen.inputs, 'the pointer never reached the button').toBe(1);
      expect(seen.activations).toBe(0);
    },
  );

  it.each(
    KINDS.flatMap(({ kind, name }) =>
      (['Enter', 'Space'] as const).map((key) => ({ kind, name, key })),
    ),
  )('S7 $key on a focused loading $kind does nothing', async ({ kind, name, key }) => {
    const fixture = await mount(markup(kind, name, 'type="button"'));
    const host = hostIn(fixture);
    await setLoading(host);
    host.focus();
    expect(host.shadowRoot?.activeElement, 'the loading button took no focus').toBe(
      innerButton(host),
    );
    const seen = observeActivation(host);

    await userEvent.keyboard(key === 'Enter' ? '{Enter}' : ' ');
    await settle();

    expect(seen.inputs, 'the key never reached the button').toBeGreaterThan(0);
    expect(seen.activations).toBe(0);
  });

  it.each(KINDS)(
    'S8 a loading $kind stays in the Tab order with a visible focus indicator',
    async ({ kind, name }) => {
      const fixture = await mount(
        `<label>Title <input type="text"></label>${markup(kind, name, 'loading')}`,
      );
      const host = hostIn(fixture);
      expect(innerButton(host).getAttribute('aria-disabled'), 'the button is not loading').toBe(
        'true',
      );
      found(fixture.querySelector('input'), 'the text field').focus();

      await userEvent.keyboard('{Tab}');

      const button = innerButton(host);
      expect(host.shadowRoot?.activeElement, 'Tab did not reach the loading button').toBe(button);
      const focused = getComputedStyle(button);
      expect(`${focused.outlineStyle} ${focused.boxShadow}`).not.toBe('none none');
    },
  );
});

describe('a loading button does not touch its form', () => {
  it('S9 a loading submit button does not submit its form', async () => {
    const fixture = await mount(
      `<form><input name="title" value="Mars" aria-label="Title">${markup('ki-button', 'Publish', 'type="submit" loading')}</form>`,
    );
    const host = hostIn(fixture);
    const form = found(fixture.querySelector('form'), 'the form');
    let submissions = 0;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submissions += 1;
    });
    const seen = observeActivation(host);

    await clickButton(host);

    expect(seen.inputs, 'the pointer never reached the button').toBe(1);
    expect(submissions).toBe(0);
  });

  it('S10 a loading reset button does not reset its form', async () => {
    const fixture = await mount(
      `<form><input name="title" value="Mars" aria-label="Title">${markup('ki-button', 'Reset', 'type="reset" loading')}</form>`,
    );
    const host = hostIn(fixture);
    const field = found(fixture.querySelector('input'), 'the field');
    field.value = 'Venus';

    await clickButton(host);

    expect(field.value).toBe('Venus');
  });
});

describe('assistive technology learns the action is in progress', () => {
  it.each(KINDS)(
    'S11 a loading $kind keeps its name and is exposed as unavailable',
    async ({ kind, name }) => {
      const fixture = await mount(markup(kind, name));
      const host = hostIn(fixture);

      await setLoading(host);

      await expect.element(page.getByRole('button', { name, disabled: true })).toBeInTheDocument();
      const button = innerButton(host);
      expect(button.disabled, 'native disabled would take it out of reach').toBe(false);
      expect(button.getAttribute('aria-disabled')).toBe('true');
      expect(button.tabIndex).toBe(0);
      if (IS_CHROMIUM) {
        const node = (await tree()).find((each) => each.role === 'button' && each.name === name);
        expect(node).toMatchObject({ disabled: true, focusable: true });
      }
    },
  );

  it.each(KINDS)(
    'S12 a polite status message says the action of a focused $kind is in progress',
    async ({ kind, name }) => {
      const fixture = await mount(markup(kind, name));
      const host = hostIn(fixture);
      host.focus();
      // The polite region is in the tree, empty, BEFORE its text arrives: a
      // region created together with its text is not announced (spec 042).
      if (IS_CHROMIUM) {
        expect(await politeTexts()).toEqual(['']);
      }

      await setLoading(host);

      await expect.element(page.getByRole('status')).toHaveTextContent('Loading');
      if (IS_CHROMIUM) {
        await expect.poll(politeTexts).toEqual(['Loading']);
      }
      expect(host.shadowRoot?.activeElement, 'the button lost focus').toBe(innerButton(host));
    },
  );

  it.each([
    { kind: 'ki-button' as const, name: 'Guardar', status: 'Guardando' },
    { kind: 'ki-icon-button' as const, name: 'Actualizar', status: 'Actualizando' },
  ])(
    'S13 the status message of a $kind speaks the page language: $status',
    async ({ kind, name, status }) => {
      const fixture = await mount(markup(kind, name, `loading-label="${status}"`));
      const host = hostIn(fixture);
      expect(host.loadingLabel).toBe(status);

      await setLoading(host);

      await expect.element(page.getByRole('status')).toHaveTextContent(status);
      if (IS_CHROMIUM) {
        await expect.poll(politeTexts).toEqual([status]);
      }
    },
  );
});

describe('the spinner follows the user motion preference', () => {
  it('S14 the spinner turns while motion is allowed', async () => {
    await browserCommands.emulateReducedMotion('no-preference');
    const fixture = await mount(markup('ki-button', 'Save changes'));
    const host = hostIn(fixture);

    await setLoading(host);

    const spinner = found(spinnerOf(host), 'the spinner');
    expect(runningLoops(spinner).length, 'no continuous turn').toBeGreaterThan(0);
  });

  it.each(KINDS)(
    'S15 under reduced motion the spinner of a $kind holds still',
    async ({ kind, name }) => {
      const fixture = await mount(markup(kind, name));
      const host = hostIn(fixture);
      // The preference changes with the button already in the document, as it
      // does for a person who turns it on: WebKit re-evaluates a component's
      // media queries only in the shadow roots present at the change.
      await browserCommands.emulateReducedMotion('reduce');
      try {
        expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);

        await setLoading(host);

        const spinner = found(spinnerOf(host), 'the spinner');
        expect(spinner.getBoundingClientRect().width).toBeGreaterThan(0);
        expect(runningLoops(spinner)).toHaveLength(0);
      } finally {
        await browserCommands.emulateReducedMotion(null);
      }
    },
  );
});

describe('the loading state restyles through tokens', () => {
  it.each([
    ['onmars', 'light'],
    ['onmars', 'dark'],
    ['material3', 'light'],
    ['material3', 'dark'],
  ] as const satisfies readonly (readonly [Theme, Scheme])[])(
    'S16 every variant, tone and size shows a legible loading state on a %s page in the %s scheme',
    async (theme, scheme) => {
      // Final frames only: no transition caught mid-way.
      await browserCommands.emulateReducedMotion('reduce');
      try {
        themeDocument(theme, scheme);
        const cells = KINDS.flatMap(({ kind, name }) =>
          VARIANTS.flatMap((variant) =>
            TONES.flatMap((tone) =>
              SIZES.map((size) =>
                markup(kind, name, `variant="${variant}" tone="${tone}" size="${size}"`),
              ),
            ),
          ),
        );
        const fixture = await mount(cells.join(''));
        const hosts = [...fixture.querySelectorAll<LoadingButton>('ki-button, ki-icon-button')];
        const rest = hosts.map((host) => sizeOf(innerButton(host)));

        await setLoading(hosts);
        await parkPointer();

        for (const [index, host] of hosts.entries()) {
          const cell = `${host.localName} ${host.getAttribute('variant') ?? ''} ${host.getAttribute('tone') ?? ''} ${host.getAttribute('size') ?? ''}`;
          const size = sizeOf(innerButton(host));
          const before = rest[index] ?? size;
          expect(Math.abs(size.width - before.width), `${cell} width`).toBeLessThanOrEqual(
            LAYOUT_TOLERANCE,
          );
          expect(Math.abs(size.height - before.height), `${cell} height`).toBeLessThanOrEqual(
            LAYOUT_TOLERANCE,
          );
          const fill = surfaceOf(innerButton(host));
          const ink = parseColor(getComputedStyle(spinnerRing(host)).stroke);
          expect(
            contrast(over(ink, fill), fill),
            `${cell} spinner contrast`,
          ).toBeGreaterThanOrEqual(3);
        }
        await expectAccessible(fixture);
      } finally {
        await browserCommands.emulateReducedMotion(null);
      }
    },
    120_000,
  );

  it('S17 the spinner takes the button foreground ink', async () => {
    document.documentElement.style.setProperty('--ki-button-primary-neutral-rest-fg', '#7a1fa2');
    const fixture = await mount(markup('ki-button', 'Save changes', 'variant="primary"'));
    const host = hostIn(fixture);

    await setLoading(host);

    expect(getComputedStyle(spinnerRing(host)).stroke).toBe('rgb(122, 31, 162)');
  });

  it.each([
    { kind: 'ki-button' as const, name: 'Save changes', token: '--ki-button-md-spinner-size' },
    { kind: 'ki-icon-button' as const, name: 'Refresh', token: '--ki-icon-button-md-spinner-size' },
  ])('S18 reassigning $token resizes the spinner of a $kind', async ({ kind, name, token }) => {
    document.documentElement.style.setProperty(token, '32px');
    const fixture = await mount(markup(kind, name, 'size="md"'));
    const host = hostIn(fixture);

    await setLoading(host);

    expect(spinnerSize(host)).toEqual({ height: '32px', width: '32px' });
  });

  it('S19 under forced colors the spinner is painted in the forced text color', async (context) => {
    const witness = document.createElement('span');
    witness.style.backgroundColor = 'rgb(1, 2, 3)';
    document.body.append(witness);
    await browserCommands.emulateForcedColors('active');
    try {
      const applied = (): boolean =>
        matchMedia('(forced-colors: active)').matches &&
        getComputedStyle(witness).backgroundColor !== 'rgb(1, 2, 3)';
      const deadline = Date.now() + SETTLE_DEADLINE_MS;
      while (!applied() && Date.now() < deadline) {
        await nextFrame();
      }
      if (IS_CHROMIUM) {
        expect(applied(), 'Chromium did not apply the forced palette').toBe(true);
      } else if (!applied()) {
        context.skip(`${navigator.userAgent} does not apply a forced palette under emulation`);
      }
      const fixture = await mount(markup('ki-button', 'Save changes', 'variant="primary"'));
      const host = hostIn(fixture);

      await setLoading(host);

      const button = getComputedStyle(innerButton(host));
      const ink = getComputedStyle(spinnerRing(host)).stroke;
      expect(ink).toBe(button.color);
      expect(ink).not.toBe(button.backgroundColor);
    } finally {
      await browserCommands.emulateForcedColors(null);
    }
  });
});
