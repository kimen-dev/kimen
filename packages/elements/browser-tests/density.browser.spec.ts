// @spec:045-density
//
// Compact density (spec 045). Each test mounts real components inside a
// region, declares a density on the region (or the page, or a nested region)
// and measures what the browser laid out: block sizes, paddings, font and
// icon sizes, and every interactive target against WCAG 2.5.8's 24 x 24 CSS
// px. Sizes are compared with the same component outside the region, never
// with a token name.
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  byPart,
  deepElements,
  findDeep,
  installKimen,
  mount,
  resetPreferences,
  resetRoot,
  THEMES,
  uninstallKimen,
  unmountAll,
} from './modes';

const TARGET_MIN = 24;

function host(root: ParentNode, selector: string): HTMLElement {
  const found = root.querySelector<HTMLElement>(selector);
  if (found === null) throw new Error(`no ${selector} mounted`);
  return found;
}

/** The two mounted matches of `selector`, outside the region first. */
function pair(root: ParentNode, selector: string): [HTMLElement, HTMLElement] {
  const [first, second] = [...root.querySelectorAll<HTMLElement>(selector)];
  if (first === undefined || second === undefined) throw new Error(`two ${selector} expected`);
  return [first, second];
}

const heightOf = (element: Element): number =>
  Math.round(element.getBoundingClientRect().height * 100) / 100;

/** The painted box of a control: its interactive internal part. */
function controlOf(element: HTMLElement): HTMLElement {
  switch (element.localName) {
    case 'ki-button':
    case 'ki-icon-button':
      return findDeep(element, byPart('button'));
    case 'ki-input':
    case 'ki-textarea':
      return findDeep(element, byPart('field'));
    case 'ki-select':
      return findDeep(element, byPart('trigger'));
    default:
      return element;
  }
}

// Every interactive component, in every size it offers.
const SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
const INTERACTIVE_GALLERY = [
  ...SIZES.map((size) => `<ki-button size="${size}">Save</ki-button>`),
  ...SIZES.map((size) => `<ki-icon-button size="${size}" label="Close"></ki-icon-button>`),
  '<ki-input label="Email"></ki-input>',
  '<ki-textarea label="Notes"></ki-textarea>',
  '<ki-select label="Country"><ki-option value="es">Spain</ki-option></ki-select>',
  '<ki-checkbox>Accept</ki-checkbox>',
  '<ki-switch>Alerts</ki-switch>',
  '<ki-radio-group label="Plan"><ki-radio value="basic">Basic</ki-radio></ki-radio-group>',
  '<ki-tabs label="Sections"><ki-tab>One</ki-tab><ki-tab>Two</ki-tab>' +
    '<ki-tab-panel>A</ki-tab-panel><ki-tab-panel>B</ki-tab-panel></ki-tabs>',
  '<ki-list><ki-list-item href="#a">Invoice</ki-list-item></ki-list>',
].join('');

/** Every element a pointer can activate under `root`, shadow trees included. */
function targetsOf(root: Element): HTMLElement[] {
  return deepElements(root).filter((element) => {
    if (!element.checkVisibility()) return false;
    const role = element.getAttribute('role');
    return (
      element instanceof HTMLButtonElement ||
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLAnchorElement ||
      role === 'tab' ||
      role === 'radio' ||
      role === 'checkbox' ||
      role === 'switch' ||
      role === 'combobox'
    );
  });
}

beforeAll(async () => {
  await installKimen();
});

afterEach(async () => {
  unmountAll();
  resetRoot();
  document.documentElement.removeAttribute('data-ki-density');
  await resetPreferences();
});

afterAll(async () => {
  await uninstallKimen();
});

describe('045 compact density', () => {
  it('S1: a compact region shortens its controls', async () => {
    const controls = '<ki-button>Save</ki-button><ki-input label="Email"></ki-input>';
    const fixture = await mount(
      `${controls}<section data-ki-density="compact">${controls}</section>`,
    );
    const [outsideButton, insideButton] = pair(fixture, 'ki-button');
    const [outsideField, insideField] = pair(fixture, 'ki-input');

    expect(heightOf(controlOf(insideButton))).toBe(32);
    expect(heightOf(controlOf(insideField))).toBe(32);
    expect(heightOf(controlOf(outsideButton))).toBe(40);
    expect(heightOf(controlOf(outsideField))).toBe(40);
  });

  it('S2: a compact region tightens container spacing', async () => {
    const card = '<ki-card>Invoice total</ki-card>';
    const fixture = await mount(`${card}<section data-ki-density="compact">${card}</section>`);
    const [outside, inside] = pair(fixture, 'ki-card');
    const padding = (element: HTMLElement): number =>
      Number.parseFloat(getComputedStyle(findDeep(element, byPart('body'))).paddingInlineStart);

    expect(padding(outside)).toBe(16);
    expect(padding(inside)).toBe(12);
  });

  it('S3: compact keeps text and icon sizes', async () => {
    const button =
      '<ki-button><svg slot="start" viewBox="0 0 16 16"><path d="M0 0h16v16H0z"/></svg>Save</ki-button>';
    const fixture = await mount(`${button}<section data-ki-density="compact">${button}</section>`);
    const [outside, inside] = pair(fixture, 'ki-button');
    const metrics = (element: HTMLElement): [string, number, number] => {
      const label = findDeep(element, byPart('label'));
      const icon = element.querySelector('svg');
      if (icon === null) throw new Error('the button lost its icon');
      return [
        getComputedStyle(label).fontSize,
        icon.getBoundingClientRect().width,
        icon.getBoundingClientRect().height,
      ];
    };

    expect(metrics(inside)).toEqual(metrics(outside));
  });

  it('S4: no interactive target shrinks below 24 by 24 pixels', async () => {
    const fixture = await mount(
      '<section data-ki-density="compact">' +
        '<ki-button size="xs">Undo</ki-button>' +
        '<ki-icon-button size="xs" label="Close"></ki-icon-button></section>',
    );
    for (const selector of ['ki-button', 'ki-icon-button']) {
      const box = controlOf(host(fixture, selector)).getBoundingClientRect();
      expect(box.width, selector).toBeGreaterThanOrEqual(TARGET_MIN);
      expect(box.height, selector).toBeGreaterThanOrEqual(TARGET_MIN);
    }
  });

  describe.each(THEMES)('S5: every interactive target meets the minimum in %s', (theme) => {
    it(`S5: every interactive component in every size is at least 24 by 24 in a compact ${theme} region`, async () => {
      const fixture = await mount(
        `<section data-ki-theme="${theme}" data-ki-density="compact">${INTERACTIVE_GALLERY}</section>`,
      );
      const targets = targetsOf(fixture);
      expect(targets.length).toBeGreaterThan(15);

      const small = targets
        .map((target) => {
          // A labelled control's target is its labelled row (WCAG 2.5.8
          // counts the whole activatable area): the host box.
          const root = target.getRootNode();
          const owner = root instanceof ShadowRoot ? root.host : target;
          const box = (
            ['ki-checkbox', 'ki-radio', 'ki-switch'].includes(owner.localName) ? owner : target
          ).getBoundingClientRect();
          return {
            name: `${owner.localName} ${target.localName}`,
            width: box.width,
            height: box.height,
          };
        })
        .filter(({ width, height }) => width < TARGET_MIN || height < TARGET_MIN);
      expect(small).toEqual([]);
    });
  });

  it("S6: compact follows the active theme's own sizes", async () => {
    const field = '<ki-input label="Email"></ki-input>';
    const fixture = await mount(
      `<section data-ki-theme="material3">${field}<div data-ki-density="compact">${field}</div></section>`,
    );
    const [standard, compact] = pair(fixture, 'ki-input');

    expect(heightOf(controlOf(standard))).toBe(48);
    expect(heightOf(controlOf(compact))).toBe(40);
  });

  it('S7: a nested region can return to the default density', async () => {
    const fixture = await mount(
      '<section data-ki-density="compact"><ki-button id="between">Save</ki-button>' +
        '<div data-ki-density="default"><ki-button id="nested">Save</ki-button></div></section>',
    );

    expect(heightOf(controlOf(host(fixture, '#nested')))).toBe(40);
    expect(heightOf(controlOf(host(fixture, '#between')))).toBe(32);
  });

  it('S8: a themed region inside a compact region stays compact', async () => {
    const fixture = await mount(
      '<section data-ki-density="compact"><div data-ki-theme="material3">' +
        '<ki-input label="Email"></ki-input></div></section>',
    );

    expect(heightOf(controlOf(host(fixture, 'ki-input')))).toBe(40);
  });

  it('S9: the whole page can be compact', async () => {
    document.documentElement.setAttribute('data-ki-density', 'compact');
    const fixture = await mount('<ki-button>Save</ki-button>');

    expect(heightOf(controlOf(host(fixture, 'ki-button')))).toBe(32);
  });

  it('S10: without a declaration every component keeps its standard dimensions', async () => {
    const gallery = `${INTERACTIVE_GALLERY}<ki-card>Invoice</ki-card><ki-alert>Saved</ki-alert>`;
    const fixture = await mount(
      `<div id="plain">${gallery}</div><div id="explicit" data-ki-density="default">${gallery}</div>`,
    );
    const boxes = (root: Element): string[] =>
      deepElements(root)
        .slice(1)
        .map((element) => {
          const box = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return `${element.localName} ${box.width.toFixed(2)}x${box.height.toFixed(2)} ${style.padding}`;
        });

    expect(boxes(host(fixture, '#explicit'))).toEqual(boxes(host(fixture, '#plain')));
    // Every size still measures its own size token: the target floor never
    // lifts a default size (the smallest default control is exactly 24px).
    for (const size of SIZES) {
      const probe = document.createElement('div');
      probe.style.blockSize = `var(--ki-button-${size}-height)`;
      fixture.append(probe);
      const button = [...host(fixture, '#plain').querySelectorAll('ki-button')].find(
        (element) => element.getAttribute('size') === size,
      ) as HTMLElement;
      expect(heightOf(controlOf(button)), size).toBe(heightOf(probe));
      probe.remove();
    }
  });

  it('S11: an unknown density falls back to the default', async () => {
    const fixture = await mount(
      '<section data-ki-density="cozy"><ki-button>Save</ki-button></section>',
    );

    expect(heightOf(controlOf(host(fixture, 'ki-button')))).toBe(40);
  });

  it('S12: reassigning the compact step restyles compact regions', async () => {
    const own = document.createElement('style');
    own.textContent = "[data-ki-density='compact'] { --ki-density-control-offset: -4px; }";
    document.head.append(own);
    try {
      const fixture = await mount(
        '<section data-ki-density="compact"><ki-button>Save</ki-button></section>',
      );

      expect(heightOf(controlOf(host(fixture, 'ki-button')))).toBe(36);
    } finally {
      own.remove();
    }
  });
});
