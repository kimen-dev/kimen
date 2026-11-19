// @spec:045-density
//
// Compact density (spec 045) and touch density (its Amendment A1). Each test
// mounts real components inside a region, declares a density on the region
// (or the page, or a nested region) and measures what the browser laid out:
// block sizes, paddings, font and icon sizes, and every interactive target
// against WCAG 2.5.8's 24 x 24 CSS px, or WCAG 2.5.5's 44 x 44 in touch.
// Sizes are compared with the same component outside the region, never with
// a token name. A touch target may reach beyond what a control paints, so it
// is measured the way a pointer finds it: by hit-testing.
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
const TOUCH_TARGET_MIN = 44;

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
const INTERACTIVE_COMPONENTS = [
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
];
const INTERACTIVE_GALLERY = INTERACTIVE_COMPONENTS.join('');

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

/** The element painted behind `node` in the flat tree. */
function flatParent(node: Element): Element | null {
  const slot = (node as HTMLElement).assignedSlot;
  if (slot !== null) return slot;
  if (node.parentElement !== null) return node.parentElement;
  const root = node.getRootNode();
  return root instanceof ShadowRoot ? root.host : null;
}

/** The deepest element a pointer at (x, y) lands on, open shadow trees included. */
function hitAt(x: number, y: number): Element | null {
  let hit = document.elementFromPoint(x, y);
  while (hit?.shadowRoot) {
    const inner = hit.shadowRoot.elementFromPoint(x, y);
    if (inner === null || inner === hit) break;
    hit = inner;
  }
  return hit;
}

/** Whether a pointer at (x, y) reaches `target`: on it, inside it, or on its label. */
function reachesAt(target: Element, x: number, y: number): boolean {
  for (let node = hitAt(x, y); node !== null; node = flatParent(node)) {
    if (node === target) return true;
    if (node instanceof HTMLLabelElement && node.control === target) return true;
  }
  return false;
}

/**
 * The edges of the `side` x `side` square centred on `target` at which a
 * pointer misses it. Empty: the target reaches `side` CSS px across both axes
 * through its centre, whatever it paints.
 */
function missesAcross(target: Element, side: number): string[] {
  target.scrollIntoView({ block: 'center', inline: 'center' });
  const box = target.getBoundingClientRect();
  const [x, y] = [box.left + box.width / 2, box.top + box.height / 2];
  const half = side / 2 - 0.5;
  const edges: [string, number, number][] = [
    ['top', x, y - half],
    ['bottom', x, y + half],
    ['left', x - half, y],
    ['right', x + half, y],
  ];
  return edges.filter(([, px, py]) => !reachesAt(target, px, py)).map(([edge]) => edge);
}

/** What a pointer has to reach: a text field's target is its field box. */
function touchTargetOf(element: HTMLElement): HTMLElement {
  const root = element.getRootNode();
  const owner = root instanceof ShadowRoot ? root.host : element;
  return ['ki-input', 'ki-textarea'].includes(owner.localName)
    ? findDeep(owner, byPart('field'))
    : element;
}

/** Every style rule nested in a pointer media query of `sheet`. */
function pointerRules(sheet: CSSStyleSheet): CSSStyleRule[] {
  const walk = (rules: CSSRuleList, underPointer: boolean): CSSStyleRule[] =>
    [...rules].flatMap((rule) => {
      if (rule instanceof CSSMediaRule) {
        return walk(rule.cssRules, underPointer || rule.conditionText.includes('pointer'));
      }
      if (rule instanceof CSSGroupingRule) return walk(rule.cssRules, underPointer);
      return rule instanceof CSSStyleRule && underPointer ? [rule] : [];
    });
  return walk(sheet.cssRules, false);
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

describe('045 touch density (Amendment A1)', () => {
  it('S13: a touch region grows its medium controls to 44 pixels', async () => {
    const controls = '<ki-button>Save</ki-button><ki-input label="Email"></ki-input>';
    const fixture = await mount(
      `${controls}<section data-ki-density="touch">${controls}</section>`,
    );
    const [outsideButton, insideButton] = pair(fixture, 'ki-button');
    const [outsideField, insideField] = pair(fixture, 'ki-input');

    expect(heightOf(controlOf(insideButton))).toBe(44);
    expect(heightOf(controlOf(insideField))).toBe(44);
    expect(heightOf(controlOf(outsideButton))).toBe(40);
    expect(heightOf(controlOf(outsideField))).toBe(40);
  });

  it('S14: touch grows every button size by one step and leaves icon buttons their size', async () => {
    const sizes = SIZES.map(
      (size) =>
        `<ki-button size="${size}">Save</ki-button>` +
        `<ki-icon-button size="${size}" label="Close"></ki-icon-button>`,
    ).join('');
    const fixture = await mount(
      `<div id="outside">${sizes}</div><section data-ki-density="touch">${sizes}</section>`,
    );
    const squares = (root: Element): string[] =>
      [...root.querySelectorAll<HTMLElement>('ki-icon-button')].map((element) => {
        const box = controlOf(element).getBoundingClientRect();
        return `${element.getAttribute('size') ?? ''} ${box.width.toFixed(2)}x${box.height.toFixed(2)}`;
      });
    const heights = (root: Element): number[] =>
      [...root.querySelectorAll<HTMLElement>('ki-button')].map((button) =>
        heightOf(controlOf(button)),
      );

    expect(heights(host(fixture, 'section'))).toEqual(
      heights(host(fixture, '#outside')).map((height) => height + 4),
    );
    expect(squares(host(fixture, 'section'))).toEqual(squares(host(fixture, '#outside')));
  });

  it('S15: small controls keep their painted size and their place in touch', async () => {
    const small =
      '<ki-checkbox>Accept</ki-checkbox>' +
      '<ki-radio-group label="Plan"><ki-radio value="basic">Basic</ki-radio></ki-radio-group>' +
      '<ki-switch>Alerts</ki-switch>' +
      '<ki-alert dismissible heading="Saved">Done</ki-alert>';
    const fixture = await mount(
      `<div id="outside">${small}</div>` +
        `<section data-ki-density="touch"><ki-button>Save</ki-button>${small}</section>`,
    );
    const painted = (root: Element): string[] =>
      [
        findDeep(host(root, 'ki-checkbox'), byPart('control')),
        findDeep(host(root, 'ki-radio'), byPart('control')),
        findDeep(host(root, 'ki-switch'), byPart('track')),
        findDeep(host(root, 'ki-alert'), byPart('dismiss')),
        ...root.querySelectorAll<HTMLElement>('ki-checkbox, ki-radio-group, ki-switch, ki-alert'),
      ].map((element) => {
        const box = element.getBoundingClientRect();
        return `${element.localName} ${box.width.toFixed(2)}x${box.height.toFixed(2)}`;
      });

    // The region is touch: its medium button took the step.
    expect(heightOf(controlOf(host(fixture, 'section ki-button')))).toBe(44);
    expect(painted(host(fixture, 'section'))).toEqual(painted(host(fixture, '#outside')));
  });

  describe.each(THEMES)('S16: every interactive target reaches 44 by 44 in %s', (theme) => {
    it(`S16: a pointer reaches every interactive target across 44 by 44 pixels in a touch ${theme} region`, async () => {
      // One component per cell, so no target is measured through the target
      // of its neighbour.
      const cells = [
        ...INTERACTIVE_COMPONENTS,
        '<ki-alert dismissible heading="Saved">Done</ki-alert>',
      ].map((component) => `<div style="padding-block: 24px">${component}</div>`);
      const fixture = await mount(
        `<section data-ki-theme="${theme}" data-ki-density="touch">${cells.join('')}</section>`,
      );
      const targets = targetsOf(fixture).map(touchTargetOf);
      expect(targets.length).toBeGreaterThan(15);

      const unreachable = targets
        .map((target) => {
          const root = target.getRootNode();
          const owner = root instanceof ShadowRoot ? root.host : target;
          const name = `${owner.localName}[${owner.getAttribute('size') ?? ''}] ${target.localName}`;
          return { name, misses: missesAcross(target, TOUCH_TARGET_MIN) };
        })
        .filter(({ misses }) => misses.length > 0);
      expect(unreachable).toEqual([]);
    });
  });

  it('S17: touch keeps text sizes, icon sizes and container spacing', async () => {
    const content =
      '<ki-button><svg slot="start" viewBox="0 0 16 16"><path d="M0 0h16v16H0z"/></svg>Save</ki-button>' +
      '<ki-card>Invoice total</ki-card>';
    const fixture = await mount(`${content}<section data-ki-density="touch">${content}</section>`);
    const [outsideButton, insideButton] = pair(fixture, 'ki-button');
    const [outsideCard, insideCard] = pair(fixture, 'ki-card');
    const metrics = (button: HTMLElement, card: HTMLElement): [string, number, number, string] => {
      const icon = button.querySelector('svg');
      if (icon === null) throw new Error('the button lost its icon');
      return [
        getComputedStyle(findDeep(button, byPart('label'))).fontSize,
        icon.getBoundingClientRect().width,
        icon.getBoundingClientRect().height,
        getComputedStyle(findDeep(card, byPart('body'))).padding,
      ];
    };

    // The region is touch: its button took the step.
    expect(heightOf(controlOf(insideButton))).toBe(44);
    expect(metrics(insideButton, insideCard)).toEqual(metrics(outsideButton, outsideCard));
  });

  it("S18: touch follows the active theme's own sizes", async () => {
    const field = '<ki-input label="Email"></ki-input>';
    const fixture = await mount(
      `<section data-ki-theme="material3">${field}<div data-ki-density="touch">${field}</div></section>`,
    );
    const [standard, touch] = pair(fixture, 'ki-input');

    expect(heightOf(controlOf(standard))).toBe(48);
    expect(heightOf(controlOf(touch))).toBe(52);
  });

  it('S19: a touch region nested in a compact region is touch', async () => {
    const fixture = await mount(
      '<section data-ki-density="compact"><div data-ki-density="touch">' +
        '<ki-button>Save</ki-button><ki-card>Invoice total</ki-card></div></section>',
    );
    const body = findDeep(host(fixture, 'ki-card'), byPart('body'));

    expect(heightOf(controlOf(host(fixture, 'ki-button')))).toBe(44);
    expect(Number.parseFloat(getComputedStyle(body).paddingInlineStart)).toBe(16);
  });

  it('S20: a compact region nested in a touch region is compact', async () => {
    const fixture = await mount(
      '<section data-ki-density="touch"><ki-button id="touch">Save</ki-button>' +
        '<div data-ki-density="compact"><p><ki-button id="compact">Save</ki-button></p>' +
        '<p><ki-icon-button size="xs" label="Close"></ki-icon-button></p></div></section>',
    );
    const close = controlOf(host(fixture, 'ki-icon-button'));

    // The outer region is touch.
    expect(heightOf(controlOf(host(fixture, '#touch')))).toBe(44);
    expect(heightOf(controlOf(host(fixture, '#compact')))).toBe(32);
    expect(heightOf(close)).toBe(TARGET_MIN);
    expect(missesAcross(close, TARGET_MIN)).toEqual([]);
    expect(missesAcross(close, TARGET_MIN + 3)).toEqual(['top', 'bottom', 'left', 'right']);
  });

  it('S21: a coarse pointer alone does not change the density', async () => {
    // Emulating a coarse pointer is a CDP call that exists on Chromium alone
    // and lives in its own project (pointer-capability.browser.spec.ts). The
    // claim is proved in every engine instead: no stylesheet Kimen ships —
    // the token sheets and every component's shadow sheets — changes a
    // density token under a pointer media query, so no pointer can.
    const fixture = await mount(
      `<ki-button id="probe">Save</ki-button>${INTERACTIVE_GALLERY}` +
        '<ki-card>Invoice</ki-card><ki-alert dismissible>Saved</ki-alert>',
    );
    const sheets = [
      ...document.styleSheets,
      ...deepElements(fixture).flatMap((element) =>
        element.shadowRoot === null
          ? []
          : [...element.shadowRoot.adoptedStyleSheets, ...element.shadowRoot.styleSheets],
      ),
    ];
    const densityUnderPointer = sheets
      .flatMap(pointerRules)
      .filter((rule) => [...rule.style].some((name) => name.startsWith('--ki-density-')))
      .map((rule) => rule.cssText);

    expect(sheets.length).toBeGreaterThan(10);
    expect(densityUnderPointer).toEqual([]);
    expect(heightOf(controlOf(host(fixture, '#probe')))).toBe(40);
  });

  it('S22: a themed region inside a touch region stays touch', async () => {
    const fixture = await mount(
      '<section data-ki-density="touch"><div data-ki-theme="material3">' +
        '<ki-input label="Email"></ki-input><p><ki-checkbox>Accept</ki-checkbox></p></div></section>',
    );
    const checkbox = targetsOf(host(fixture, 'ki-checkbox')).find(
      (element) => element instanceof HTMLInputElement,
    );
    if (checkbox === undefined) throw new Error('the checkbox has no native control');

    expect(heightOf(controlOf(host(fixture, 'ki-input')))).toBe(52);
    expect(missesAcross(checkbox, TOUCH_TARGET_MIN)).toEqual([]);
  });

  it('S23: reassigning the touch target minimum restyles touch regions', async () => {
    const own = document.createElement('style');
    own.textContent = "[data-ki-density='touch'] { --ki-density-target-min: 48px; }";
    document.head.append(own);
    try {
      const fixture = await mount(
        '<section data-ki-density="touch"><ki-icon-button size="xs" label="Close"></ki-icon-button></section>',
      );
      const close = controlOf(host(fixture, 'ki-icon-button'));

      expect(missesAcross(close, 48)).toEqual([]);
      expect(heightOf(close)).toBe(TARGET_MIN);
    } finally {
      own.remove();
    }
  });
});
