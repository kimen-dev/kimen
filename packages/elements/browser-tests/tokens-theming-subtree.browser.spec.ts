// @spec:001-tokens-theming
//
// Subtree theming (S8-S12): a theme or a colour scheme declared on any element
// restyles that element's subtree and nothing else. And the document-level
// counterpart (S14): the colour scheme the tokens stylesheet declares for the
// page is a default, so the scheme a host page declares for itself wins.
//
// Every assertion reads what real components PAINT — the computed colours,
// shadows, radii and typeface of a ki-button and a ki-input, through their
// shadow trees — and compares it with what the same components paint in a
// document themed that way at the root. No token name is read anywhere: a
// token that resolves correctly but is never recomputed inside the subtree
// (the alias-inheritance trap) is exactly the defect a token-name assertion
// cannot see.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';

import material3Css from '@kimen/tokens/css/material3?raw';
import onmarsCss from '@kimen/tokens/css?raw';
import { defineCustomElement as defineKiButton } from '../dist/components/ki-button.js';
import { defineCustomElement as defineKiInput } from '../dist/components/ki-input.js';

type Theme = 'material3' | 'onmars';
type Scheme = 'dark' | 'light';

interface Context {
  theme?: Theme | 'acme';
  scheme?: Scheme;
}

interface Appearance {
  /** What the region itself paints from tokens: its surface and its text colour. */
  surface: string;
  button: string;
  field: string;
}

const browserCommands = commands as unknown as {
  emulateColorScheme: (scheme: 'dark' | 'light' | null) => Promise<void>;
  emulateReducedMotion: (value: 'no-preference' | 'reduce' | null) => Promise<void>;
  resetPointer: () => Promise<void>;
};

const ONMARS_STYLE_ID = 'subtree-onmars-tokens';
const MATERIAL3_STYLE_ID = 'subtree-material3-tokens';
const SHADOW_RENDER_DEADLINE_MS = 1500;
const COMPONENTS =
  '<ki-button variant="primary">Save</ki-button><ki-input label="Name" value="Ada Lovelace"></ki-input>';
// A region paints its own surface and text colour from tokens, as the page
// contract does for the document root. A theme or scheme declaration restyles
// what consumes tokens; it does not paint the element that carries it, and the
// text colour a subtree inherits was already computed for the page.
//
// The padding also keeps every component clear of the pointer, which rests at
// the page origin: a button mounted under it would be measured hovered.
const REGION_STYLE =
  'display:block;padding:48px;background-color:var(--ki-surface-s0);color:var(--ki-text-high-em)';

const PAINT_PROPERTIES = [
  'color',
  'backgroundColor',
  'backgroundImage',
  'borderTopColor',
  'borderBottomColor',
  'borderTopWidth',
  'borderTopLeftRadius',
  'boxShadow',
  'outlineColor',
  'fontFamily',
] as const;

function injectStylesheet(css: string, id: string): void {
  if (document.getElementById(id)) {
    return;
  }
  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  document.head.append(style);
}

async function nextFrame(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

async function waitForShadowRender(root: ParentNode): Promise<void> {
  const hosts = [...root.querySelectorAll<HTMLElement>('ki-button, ki-input')];
  const pending = (): boolean => hosts.some((host) => host.shadowRoot?.hasChildNodes() !== true);
  const deadline = Date.now() + SHADOW_RENDER_DEADLINE_MS;
  while (pending() && Date.now() < deadline) {
    await nextFrame();
  }
  expect(pending(), 'ki-button and ki-input must render their shadow trees').toBe(false);
  await nextFrame();
  await nextFrame();
}

/** Everything a component paints: its host plus every element of its shadow tree. */
function paintOf(host: Element): string {
  const elements = [host, ...(host.shadowRoot?.querySelectorAll('*') ?? [])];
  return elements
    .map((element) => {
      const style = getComputedStyle(element);
      const label = element.getAttribute('part') ?? element.localName;
      return `${label}: ${PAINT_PROPERTIES.map((property) => style[property]).join(' | ')}`;
    })
    .join('\n');
}

/** The appearance of one region: its own surface plus its two direct components. */
function appearanceIn(container: HTMLElement): Appearance {
  const button = container.querySelector(':scope > ki-button');
  const field = container.querySelector(':scope > ki-input');
  if (button === null || field === null) {
    throw new Error('the fixture must mount one ki-button and one ki-input per region');
  }
  const style = getComputedStyle(container);
  return {
    surface: `${style.backgroundColor} | ${style.color}`,
    button: paintOf(button),
    field: paintOf(field),
  };
}

function declare(element: Element, { theme, scheme }: Context): void {
  if (theme === undefined) {
    element.removeAttribute('data-ki-theme');
  } else {
    element.setAttribute('data-ki-theme', theme);
  }
  if (scheme === undefined) {
    element.removeAttribute('data-ki-color-scheme');
  } else {
    element.setAttribute('data-ki-color-scheme', scheme);
  }
}

/** The region nested directly inside a container. */
function regionIn(container: ParentNode): HTMLElement {
  const nested = container.querySelector<HTMLElement>(':scope > section');
  if (nested === null) {
    throw new Error('the fixture must nest a region directly inside this container');
  }
  return nested;
}

/** A subtree region: a plain element carrying the declaration plus the two components. */
function region(context: Context, children = ''): string {
  const attributes = [
    context.theme === undefined ? '' : ` data-ki-theme="${context.theme}"`,
    context.scheme === undefined ? '' : ` data-ki-color-scheme="${context.scheme}"`,
  ].join('');
  return `<section${attributes} style="${REGION_STYLE}">${COMPONENTS}${children}</section>`;
}

async function mount(page: Context, html: string): Promise<HTMLElement> {
  declare(document.documentElement, page);
  const main = document.createElement('main');
  main.style.cssText = REGION_STYLE;
  main.innerHTML = html;
  document.body.replaceChildren(main);
  await waitForShadowRender(main);
  return main;
}

/**
 * The reference: what the two components paint when the WHOLE document is
 * themed at its root — the behaviour S3 and S5 already guarantee.
 */
async function documentAppearance(theme: Theme, scheme: Scheme): Promise<Appearance> {
  const main = await mount(theme === 'onmars' ? { scheme } : { theme, scheme }, COMPONENTS);
  const appearance = appearanceIn(main);
  main.remove();
  return appearance;
}

const unmeasured: Appearance = { surface: '', button: '', field: '' };
const reference: Record<Theme, Record<Scheme, Appearance>> = {
  material3: { dark: unmeasured, light: unmeasured },
  onmars: { dark: unmeasured, light: unmeasured },
};

beforeAll(async () => {
  defineKiButton();
  defineKiInput();
  await browserCommands.emulateColorScheme('light');
  await browserCommands.emulateReducedMotion('reduce');
  await browserCommands.resetPointer();
  injectStylesheet(onmarsCss, ONMARS_STYLE_ID);
  injectStylesheet(material3Css, MATERIAL3_STYLE_ID);
  for (const theme of ['onmars', 'material3'] as const) {
    for (const scheme of ['light', 'dark'] as const) {
      reference[theme][scheme] = await documentAppearance(theme, scheme);
    }
  }
});

beforeEach(async () => {
  await browserCommands.resetPointer();
});

afterEach(() => {
  declare(document.documentElement, {});
  document.body.replaceChildren();
});

afterAll(async () => {
  document.getElementById(ONMARS_STYLE_ID)?.remove();
  document.getElementById(MATERIAL3_STYLE_ID)?.remove();
  await browserCommands.emulateReducedMotion('no-preference');
  await browserCommands.emulateColorScheme('light');
});

describe('document-level references are distinguishable', () => {
  // Without this the subtree assertions below could pass vacuously: a subtree
  // that "renders as a material3 document" proves nothing if a material3
  // document paints the same as an onmars one.
  it('paints a different button and text field for each theme and each scheme', () => {
    const appearances = [
      reference.onmars.light,
      reference.onmars.dark,
      reference.material3.light,
      reference.material3.dark,
    ];
    expect(new Set(appearances.map((appearance) => appearance.surface)).size).toBe(4);
    expect(new Set(appearances.map((appearance) => appearance.button)).size).toBe(4);
    expect(new Set(appearances.map((appearance) => appearance.field)).size).toBe(4);
  });
});

describe('subtree theme', () => {
  it('S8 restyles a subtree that declares material3 inside an onmars document', async () => {
    const main = await mount({}, `${COMPONENTS}${region({ theme: 'material3' })}`);

    expect(appearanceIn(regionIn(main))).toEqual(reference.material3.light);
    expect(appearanceIn(main)).toEqual(reference.onmars.light);
  });

  it('S9 returns a subtree to the default theme inside a material3 document', async () => {
    const main = await mount({ theme: 'material3' }, `${COMPONENTS}${region({ theme: 'onmars' })}`);

    expect(appearanceIn(regionIn(main))).toEqual(reference.onmars.light);
    expect(appearanceIn(main)).toEqual(reference.material3.light);
  });

  it('S9 falls back to the default theme for an unknown subtree theme, as S7 does at the root', async () => {
    const main = await mount({ theme: 'material3' }, `${COMPONENTS}${region({ theme: 'acme' })}`);

    expect(appearanceIn(regionIn(main))).toEqual(reference.onmars.light);
    expect(appearanceIn(main)).toEqual(reference.material3.light);
  });
});

describe.each(['onmars', 'material3'] as const)('subtree colour scheme [%s document]', (theme) => {
  const page = (scheme?: Scheme): Context => ({
    ...(theme === 'onmars' ? {} : { theme }),
    ...(scheme === undefined ? {} : { scheme }),
  });

  it('S10 forces dark in a subtree of a light document', async () => {
    const main = await mount(page(), `${COMPONENTS}${region({ scheme: 'dark' })}`);

    expect(appearanceIn(regionIn(main))).toEqual(reference[theme].dark);
    expect(appearanceIn(main)).toEqual(reference[theme].light);
  });

  it('S11 forces light in a subtree of a document forced dark', async () => {
    const main = await mount(page('dark'), `${COMPONENTS}${region({ scheme: 'light' })}`);

    expect(appearanceIn(regionIn(main))).toEqual(reference[theme].light);
    expect(appearanceIn(main)).toEqual(reference[theme].dark);
  });

  it('S11 forces light in a subtree of a document following a dark system preference', async () => {
    await browserCommands.emulateColorScheme('dark');
    try {
      const main = await mount(page(), `${COMPONENTS}${region({ scheme: 'light' })}`);

      expect(appearanceIn(regionIn(main))).toEqual(reference[theme].light);
      expect(appearanceIn(main)).toEqual(reference[theme].dark);
    } finally {
      await browserCommands.emulateColorScheme('light');
    }
  });
});

describe('nested subtrees', () => {
  it('S12 resolves each nested subtree from its nearest declaration', async () => {
    const innermost = region({ scheme: 'dark' });
    const inner = region({ theme: 'onmars', scheme: 'light' }, innermost);
    const outer = region({ theme: 'material3', scheme: 'dark' }, inner);
    const main = await mount({}, `${COMPONENTS}${outer}`);
    const outerRegion = regionIn(main);
    const innerRegion = regionIn(outerRegion);
    const innermostRegion = regionIn(innerRegion);

    expect(appearanceIn(main), 'the document itself').toEqual(reference.onmars.light);
    expect(appearanceIn(outerRegion), 'between the two subtrees').toEqual(reference.material3.dark);
    expect(appearanceIn(innerRegion), 'inside the nested subtree').toEqual(reference.onmars.light);
    // A scheme-only subtree redeclares nothing: it inherits the theme of the
    // nearest themed ancestor and flips its scheme alone.
    expect(appearanceIn(innermostRegion), 'scheme-only subtree, innermost').toEqual(
      reference.onmars.dark,
    );
  });

  it('S12 keeps a scheme-only subtree on the theme of a themed ancestor subtree', async () => {
    const inner = region({ scheme: 'dark' });
    const outer = region({ theme: 'material3' }, inner);
    const main = await mount({}, `${COMPONENTS}${outer}`);
    const outerRegion = regionIn(main);
    const innerRegion = regionIn(outerRegion);

    expect(appearanceIn(outerRegion)).toEqual(reference.material3.light);
    expect(appearanceIn(innerRegion)).toEqual(reference.material3.dark);
    expect(appearanceIn(main)).toEqual(reference.onmars.light);
  });
});

describe('host page colour scheme', () => {
  const HOST_STYLE_ID = 'subtree-host-page';

  /**
   * The host page's own stylesheet, declaring the scheme for its document the
   * way a page that knows nothing about Kimen does: a type selector on `html`.
   * `before` puts it ahead of the tokens stylesheet in the cascade — the order
   * a page gets when it loads the tokens after its own CSS, and the one a
   * later-wins tie could never rescue.
   */
  function declareHostScheme(scheme: Scheme, position: 'after' | 'before'): void {
    const style = document.createElement('style');
    style.id = HOST_STYLE_ID;
    style.textContent = `html { color-scheme: ${scheme}; }`;
    const tokens = document.getElementById(ONMARS_STYLE_ID);
    if (tokens === null) {
      throw new Error('the tokens stylesheet must be loaded before the host declares a scheme');
    }
    if (position === 'before') {
      tokens.before(style);
    } else {
      document.head.append(style);
    }
  }

  afterEach(async () => {
    document.getElementById(HOST_STYLE_ID)?.remove();
    await browserCommands.emulateColorScheme('light');
  });

  it.each(['before', 'after'] as const)(
    'S14 renders light for a host page that declares light %s the tokens stylesheet, under a dark system preference',
    async (position) => {
      await browserCommands.emulateColorScheme('dark');
      declareHostScheme('light', position);

      const main = await mount({}, COMPONENTS);

      expect(getComputedStyle(document.documentElement).colorScheme).toBe('light');
      expect(appearanceIn(main)).toEqual(reference.onmars.light);
    },
  );

  it('S14 renders dark for a host page that declares dark, under a light system preference', async () => {
    declareHostScheme('dark', 'before');

    const main = await mount({}, COMPONENTS);

    expect(getComputedStyle(document.documentElement).colorScheme).toBe('dark');
    expect(appearanceIn(main)).toEqual(reference.onmars.dark);
  });

  it('S14 applies the host page scheme to the material3 theme too', async () => {
    await browserCommands.emulateColorScheme('dark');
    declareHostScheme('light', 'before');

    const main = await mount({ theme: 'material3' }, COMPONENTS);

    expect(appearanceIn(main)).toEqual(reference.material3.light);
  });

  // The two guards around S14: the default it leaves in place, and the
  // explicit declaration it must not weaken.
  it('S14 keeps following the system preference when the host page declares no scheme', async () => {
    await browserCommands.emulateColorScheme('dark');

    const main = await mount({}, COMPONENTS);

    expect(getComputedStyle(document.documentElement).colorScheme).toBe('light dark');
    expect(appearanceIn(main)).toEqual(reference.onmars.dark);
  });

  it('S14 keeps a scheme forced on the root over the one the host page declares', async () => {
    declareHostScheme('light', 'after');

    const main = await mount({ scheme: 'dark' }, COMPONENTS);

    expect(getComputedStyle(document.documentElement).colorScheme).toBe('dark');
    expect(appearanceIn(main)).toEqual(reference.onmars.dark);
  });
});

describe('token reassignment in a themed subtree', () => {
  const STYLE_ID = 'subtree-consumer-theme';
  const REASSIGNED = 'rgb(11, 87, 208)';

  afterEach(() => {
    document.getElementById(STYLE_ID)?.remove();
  });

  // The reason a themed subtree redeclares every token: the primary button
  // fill aliases a semantic token that aliases the brand token. Reassigning
  // the brand token alone restyles the button only if both aliases are
  // recomputed on the subtree, which is the element the consumer names.
  it('recomputes every alias from a token a consumer reassigns on the subtree', async () => {
    injectStylesheet(`[data-ki-theme='acme'] { --ki-color-brand-500: ${REASSIGNED}; }`, STYLE_ID);
    const main = await mount({}, `${COMPONENTS}${region({ theme: 'acme' })}`);
    const fill = (container: HTMLElement): string => {
      const control = container
        .querySelector(':scope > ki-button')
        ?.shadowRoot?.querySelector('button');
      if (control === null || control === undefined) {
        throw new Error('ki-button must render a native button');
      }
      return getComputedStyle(control).backgroundColor;
    };

    expect(fill(regionIn(main))).toBe(REASSIGNED);
    expect(fill(main)).not.toBe(REASSIGNED);
    expect(appearanceIn(main)).toEqual(reference.onmars.light);
  });
});
