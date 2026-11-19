// @spec:050-size-axes
//
// Size axes (spec 050, issue #316). Each test mounts real components in a
// size and measures what the browser laid out: block sizes, radii, paddings,
// text sizes, and, in a touch region, where a pointer reaches a control.
// Every expected number is the Figma master's, in CSS px (spec 050
// design-source analysis), never a token name. S16 needs a coarse primary
// pointer and lives in touch-field-text.browser.spec.ts.
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  byPart,
  deepElements,
  findDeep,
  installKimen,
  mount,
  resetRoot,
  uninstallKimen,
  unmountAll,
} from './modes';

type Field = 'ki-input' | 'ki-select' | 'ki-textarea';

const round = (value: number): number => Math.round(value * 100) / 100;
const heightOf = (element: Element): number => round(element.getBoundingClientRect().height);
const widthOf = (element: Element): number => round(element.getBoundingClientRect().width);
const boxOf = (element: Element): string =>
  `${String(widthOf(element))} x ${String(heightOf(element))}`;
const square = (side: number): string => `${String(side)} x ${String(side)}`;
const px = (value: string): number => round(Number.parseFloat(value));
const fontSizeOf = (element: Element): number => px(getComputedStyle(element).fontSize);

function only(root: ParentNode, selector: string): HTMLElement {
  const found = root.querySelector<HTMLElement>(selector);
  if (found === null) throw new Error(`no ${selector} mounted`);
  return found;
}

function all(root: ParentNode, selector: string): HTMLElement[] {
  const found = [...root.querySelectorAll<HTMLElement>(selector)];
  if (found.length === 0) throw new Error(`no ${selector} mounted`);
  return found;
}

const part = (host: Element, name: string): HTMLElement => findDeep(host, byPart(name));

const sizeAttribute = (size?: string): string => (size === undefined ? '' : ` size="${size}"`);

function fieldHtml(field: Field, size?: string, extra = ''): string {
  const open = `<${field} label="Email"${sizeAttribute(size)} ${extra}>`;
  const options = field === 'ki-select' ? '<ki-option value="a">Alpha</ki-option>' : '';
  return `${open}${options}</${field}>`;
}

/** The painted field box: the enclosure, or the select's trigger. */
const fieldBox = (host: HTMLElement): HTMLElement =>
  part(host, host.localName === 'ki-select' ? 'trigger' : 'field');

/** The element that renders the text a person types or picks. */
function fieldText(host: HTMLElement): HTMLElement {
  switch (host.localName) {
    case 'ki-select':
      return part(host, 'value');
    case 'ki-textarea':
      return part(host, 'textarea');
    default:
      return part(host, 'input');
  }
}

/** Width, height, text size, inline padding and radius of the host and each part. */
function signature(host: HTMLElement): string[] {
  const elements = [host, ...deepElements(host).filter((element) => element.hasAttribute('part'))];
  return elements.map((element) => {
    const style = getComputedStyle(element);
    return [
      element.getAttribute('part') ?? element.localName,
      boxOf(element),
      style.fontSize,
      style.lineHeight,
      style.paddingInlineStart,
      style.paddingBlockStart,
      style.borderStartStartRadius,
    ].join(' ');
  });
}

async function signaturesOf(html: string): Promise<string[][]> {
  const root = await mount(html);
  const hosts = [...root.children].filter((element): element is HTMLElement =>
    element.localName.startsWith('ki-'),
  );
  const result = hosts.map(signature);
  unmountAll();
  return result;
}

// Pointer hit-testing, as density.browser.spec.ts measures touch targets.

/** The element painted behind `node` in the flat tree. */
function flatParent(node: Element): Element | null {
  const slot = (node as HTMLElement).assignedSlot;
  if (slot !== null) return slot;
  if (node.parentElement !== null) return node.parentElement;
  const root = node.getRootNode();
  return root instanceof ShadowRoot ? root.host : null;
}

/** The slot that a text node of `host` painted under (x, y) is assigned to. */
function slottedTextAt(host: Element, x: number, y: number): Element | null {
  const range = document.createRange();
  for (const node of host.childNodes) {
    if (!(node instanceof Text) || node.assignedSlot === null) continue;
    range.selectNodeContents(node);
    const under = [...range.getClientRects()].some(
      (rect) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom,
    );
    if (under) return node.assignedSlot;
  }
  return null;
}

/** The deepest element a pointer at (x, y) lands on, open shadow trees included. */
function hitAt(x: number, y: number): Element | null {
  let hit = document.elementFromPoint(x, y);
  while (hit?.shadowRoot) {
    const inner = hit.shadowRoot.elementFromPoint(x, y);
    if (inner === null || inner === hit) return slottedTextAt(hit, x, y) ?? hit;
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
 * pointer misses it, measured as the spec 045 touch sweep does. Empty: the
 * target reaches `side` CSS px across both axes, whatever the control paints.
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
  return edges.filter(([, ex, ey]) => !reachesAt(target, ex, ey)).map(([edge]) => edge);
}

/** The element a pointer activates inside a choice control. */
const activationTargetOf = (host: HTMLElement): HTMLElement =>
  findDeep(
    host,
    (element) =>
      element instanceof HTMLInputElement ||
      element instanceof HTMLButtonElement ||
      element.getAttribute('role') === 'switch',
  );

beforeAll(installKimen);

afterEach(() => {
  unmountAll();
  resetRoot();
});

afterAll(uninstallKimen);

describe('050 size axes: text fields', () => {
  it.each([
    ['ki-input', 'xs', 24],
    ['ki-input', 'sm', 32],
    ['ki-input', 'md', 40],
    ['ki-input', 'lg', 48],
    ['ki-input', 'xl', 56],
    ['ki-select', 'xs', 24],
    ['ki-select', 'sm', 32],
    ['ki-select', 'lg', 48],
    ['ki-select', 'xl', 56],
  ] as const)('S1: a %s of size %s measures %ipx tall', async (field, size, height) => {
    const root = await mount(fieldHtml(field, size));
    expect(heightOf(fieldBox(only(root, field)))).toBe(height);
  });

  it.each([
    ['ki-input', 'xs', 12, 6, 6],
    ['ki-input', 'sm', 12, 8, 8],
    ['ki-input', 'lg', 15, 12, 12],
    ['ki-input', 'xl', 18, 14, 14],
    ['ki-select', 'xs', 12, 6, 6],
    ['ki-select', 'xl', 18, 14, 14],
  ] as const)(
    'S2: a %s of size %s has %ipx text, a %ipx radius and %ipx inline padding',
    async (field, size, text, radius, padding) => {
      const root = await mount(fieldHtml(field, size));
      const host = only(root, field);
      const box = getComputedStyle(fieldBox(host));
      expect(fontSizeOf(fieldText(host))).toBe(text);
      expect(px(box.borderStartStartRadius)).toBe(radius);
      expect(px(box.paddingInlineStart)).toBe(padding);
    },
  );

  it('S3: a large textarea has 15px text, a 12px radius, 10px block padding and keeps 3 rows', async () => {
    const root = await mount('<ki-textarea label="Notes" rows="3" size="lg"></ki-textarea>');
    const host = only(root, 'ki-textarea');
    const textarea = part(host, 'textarea');
    const style = getComputedStyle(textarea);
    expect(fontSizeOf(textarea)).toBe(15);
    expect(px(getComputedStyle(part(host, 'field')).borderStartStartRadius)).toBe(12);
    expect(px(style.paddingBlockStart)).toBe(10);
    const lines =
      (textarea.clientHeight - px(style.paddingBlockStart) - px(style.paddingBlockEnd)) /
      px(style.lineHeight);
    expect(round(lines)).toBe(3);
  });

  it.each([
    ['ki-input', 'xs', 12, 12],
    ['ki-input', 'sm', 12, 12],
    ['ki-input', 'md', 13, 12],
    ['ki-input', 'lg', 15, 15],
    ['ki-input', 'xl', 15, 15],
    ['ki-textarea', 'sm', 12, 12],
    ['ki-select', 'lg', 15, 15],
  ] as const)(
    'S4: a %s of size %s has a %ipx label and %ipx help text',
    async (field, size, label, help) => {
      const root = await mount(fieldHtml(field, size, 'help-text="We never share it"'));
      const host = only(root, field);
      expect(fontSizeOf(part(host, 'label'))).toBe(label);
      expect(fontSizeOf(part(host, 'help'))).toBe(help);
    },
  );
});

describe('050 size axes: tabs, list rows, choice controls and badges', () => {
  it.each([
    ['xs', 24, 12, 20],
    ['sm', 32, 13, 24],
    ['md', 40, 13, 26],
    ['lg', 48, 15, 28],
    ['xl', 56, 18, 32],
  ] as const)(
    'S5: a tab strip of size %s has %ipx tabs with %ipx text, %ipx apart',
    async (size, height, text, gap) => {
      const root = await mount(
        `<ki-tabs label="Sections" size="${size}">` +
          '<ki-tab><span>Overview</span></ki-tab><ki-tab><span>Activity</span></ki-tab>' +
          '<ki-tab-panel>A</ki-tab-panel><ki-tab-panel>B</ki-tab-panel></ki-tabs>',
      );
      const tabs = all(root, 'ki-tab');
      for (const tab of tabs) {
        expect(heightOf(tab)).toBe(height);
        expect(fontSizeOf(only(tab, 'span'))).toBe(text);
      }
      const [first, second] = tabs.map((tab) => tab.getBoundingClientRect());
      if (first === undefined || second === undefined) throw new Error('two tabs expected');
      expect(round(Math.abs(second.left - first.right))).toBe(gap);
    },
  );

  it.each([
    ['sm', 48, 13, 12],
    ['md', 56, 13, 12],
    ['lg', 64, 15, 12],
    ['xl', 72, 18, 13],
  ] as const)(
    'S6: a list row of size %s measures %ipx with %ipx primary and %ipx secondary text',
    async (size, height, primary, secondary) => {
      const root = await mount(
        `<ki-list><ki-list-item size="${size}"><span class="primary">Invoice 42</span>` +
          '<span slot="secondary">Due today</span></ki-list-item></ki-list>',
      );
      const row = only(root, 'ki-list-item');
      expect(heightOf(part(row, 'item'))).toBe(height);
      expect(fontSizeOf(only(row, '.primary'))).toBe(primary);
      expect(fontSizeOf(only(row, '[slot="secondary"]'))).toBe(secondary);
    },
  );

  it.each([
    ['sm', 18, 13],
    ['md', 20, 15],
    ['lg', 24, 15],
  ] as const)(
    'S7: a checkbox of size %s has a %ipx box and %ipx label text',
    async (size, box, label) => {
      const root = await mount(
        `<ki-checkbox size="${size}"><span>Accept the terms</span></ki-checkbox>`,
      );
      const host = only(root, 'ki-checkbox');
      expect(boxOf(part(host, 'control'))).toBe(square(box));
      expect(fontSizeOf(only(host, 'span'))).toBe(label);
    },
  );

  it.each([
    ['sm', 18, 13],
    ['md', 20, 15],
  ] as const)(
    'S8: a radio group of size %s has %ipx circles and %ipx labels',
    async (size, circle, label) => {
      const root = await mount(
        `<ki-radio-group label="Plan" size="${size}">` +
          '<ki-radio value="basic"><span>Basic</span></ki-radio>' +
          '<ki-radio value="pro"><span>Pro</span></ki-radio></ki-radio-group>',
      );
      for (const radio of all(root, 'ki-radio')) {
        expect(boxOf(part(radio, 'control'))).toBe(square(circle));
        expect(fontSizeOf(only(radio, 'span'))).toBe(label);
      }
    },
  );

  it.each([
    ['sm', '32 x 18', '18 x 14', 13],
    ['md', '40 x 22', '22 x 18', 15],
    ['lg', '48 x 26', '26 x 20', 15],
    ['xl', '56 x 32', '32 x 24', 15],
  ] as const)(
    'S9: a switch of size %s has a %s track, a %s thumb and %ipx label text',
    async (size, track, thumb, label) => {
      const root = await mount(`<ki-switch size="${size}"><span>Alerts</span></ki-switch>`);
      const host = only(root, 'ki-switch');
      expect(boxOf(part(host, 'track'))).toBe(track);
      expect(boxOf(part(host, 'thumb'))).toBe(thumb);
      expect(fontSizeOf(only(host, 'span'))).toBe(label);
    },
  );

  it('S10: an extra-small badge is 20px tall with 12px text', async () => {
    const root = await mount('<ki-badge size="xs">New</ki-badge>');
    const badge = part(only(root, 'ki-badge'), 'badge');
    expect(heightOf(badge)).toBe(20);
    expect(fontSizeOf(badge)).toBe(12);
  });
});

describe('050 size axes: medium stays medium', () => {
  const gallery = (size?: string): string =>
    [
      `<ki-input label="Email"${sizeAttribute(size)}></ki-input>`,
      `<ki-textarea label="Notes"${sizeAttribute(size)}></ki-textarea>`,
      `<ki-select label="Country"${sizeAttribute(size)}><ki-option value="es">Spain</ki-option></ki-select>`,
      `<ki-tabs label="Sections"${sizeAttribute(size)}><ki-tab>One</ki-tab><ki-tab>Two</ki-tab>` +
        '<ki-tab-panel>A</ki-tab-panel><ki-tab-panel>B</ki-tab-panel></ki-tabs>',
      `<ki-list><ki-list-item${sizeAttribute(size)}>Invoice<span slot="secondary">Due</span></ki-list-item></ki-list>`,
      `<ki-checkbox${sizeAttribute(size)}>Accept</ki-checkbox>`,
      `<ki-radio-group label="Plan"${sizeAttribute(size)}><ki-radio value="basic">Basic</ki-radio></ki-radio-group>`,
      `<ki-switch${sizeAttribute(size)}>Alerts</ki-switch>`,
      `<ki-badge${sizeAttribute(size)}>New</ki-badge>`,
    ].join('');

  it('S11: without a size every component measures exactly its medium', async () => {
    const unsized = await signaturesOf(gallery());
    const medium = await signaturesOf(gallery('md'));
    expect(unsized).toEqual(medium);
  });

  it('S12: an unknown size renders medium', async () => {
    const unknown = await signaturesOf('<ki-input label="Email" size="huge"></ki-input>');
    const medium = await signaturesOf('<ki-input label="Email" size="md"></ki-input>');
    expect(unknown).toEqual(medium);
  });
});

describe('050 size axes: density and themes', () => {
  it.each([
    ['xs', 24],
    ['sm', 24],
    ['md', 32],
    ['lg', 40],
    ['xl', 48],
  ] as const)('S13: in a compact region a field of size %s measures %ipx', async (size, height) => {
    const root = await mount(`<div data-ki-density="compact">${fieldHtml('ki-input', size)}</div>`);
    expect(heightOf(fieldBox(only(root, 'ki-input')))).toBe(height);
  });

  it.each([
    ['xs', 44],
    ['sm', 44],
    ['md', 44],
    ['lg', 52],
    ['xl', 60],
  ] as const)('S14: in a touch region a field of size %s measures %ipx', async (size, height) => {
    const root = await mount(`<div data-ki-density="touch">${fieldHtml('ki-input', size)}</div>`);
    expect(heightOf(fieldBox(only(root, 'ki-input')))).toBe(height);
  });

  it('S15: touch extends the targets of small choice controls and keeps their painted size', async () => {
    const root = await mount(
      '<div data-ki-density="touch" style="display: grid; justify-items: start; gap: 64px">' +
        '<ki-checkbox size="sm">Accept</ki-checkbox><ki-switch size="sm">Alerts</ki-switch></div>',
    );
    const checkbox = only(root, 'ki-checkbox');
    const toggle = only(root, 'ki-switch');
    expect(boxOf(part(checkbox, 'control'))).toBe('18 x 18');
    expect(boxOf(part(toggle, 'track'))).toBe('32 x 18');
    for (const host of [checkbox, toggle]) {
      expect(missesAcross(activationTargetOf(host), 44), host.localName).toEqual([]);
    }
  });

  it('S17: material3 keeps its own medium and takes the shared ramp elsewhere', async () => {
    const root = await mount(
      '<div data-ki-theme="material3">' +
        ['sm', 'md', 'lg', 'xl'].map((size) => fieldHtml('ki-input', size)).join('') +
        '<ki-switch size="sm">Alerts</ki-switch><ki-switch size="lg">Sound</ki-switch></div>',
    );
    expect(all(root, 'ki-input').map((host) => heightOf(fieldBox(host)))).toEqual([32, 48, 48, 56]);
    expect(all(root, 'ki-switch').map((host) => boxOf(part(host, 'track')))).toEqual([
      '52 x 32',
      '52 x 32',
    ]);
  });

  it('S18: reassigning one size token restyles that size alone', async () => {
    const root = await mount(
      `<div style="--ki-input-lg-height: 52px">${fieldHtml('ki-input', 'lg')}${fieldHtml('ki-input', 'md')}</div>`,
    );
    const [large, medium] = all(root, 'ki-input');
    if (large === undefined || medium === undefined) throw new Error('two fields expected');
    expect(heightOf(fieldBox(large))).toBe(52);
    expect(heightOf(fieldBox(medium))).toBe(40);
  });
});
