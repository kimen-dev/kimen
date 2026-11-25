/**
 * The native primitives at the guarded boundary (spec 037, Art. VIII): the
 * closed set of native HTML elements a UI spec may carry next to catalog
 * components. Their catalog entries are generated (Art. I) from
 * `scripts/primitives.mjs`; this module holds what the boundary does with
 * them and nothing a catalog value could widen:
 *
 * - the canonical-definition check: a native tag renders only when the
 *   entry of the catalog in use is exactly Kimen's generated one;
 * - the content model (D7, and spec 158 D3 for tables): which children a
 *   primitive accepts, where a table part sits, and which may be a root;
 * - the writers (D4, D6): layout through the CSSOM only, the image's pinned
 *   referrer policy and container-fit sizing. No path here writes a `style`
 *   or `class` attribute, so a CSP without `'unsafe-inline'` for styles
 *   holds (verified in Chromium, browser-tests/native-csp.browser.spec.ts).
 *
 * Internal module — `NATIVE_PRIMITIVE_TAGS` is re-exported by the package.
 */
import type { catalogData } from './generated/catalog.js';
import { catalogStructure } from './generated/catalog-structure.js';

type Scalar = boolean | number | string;

/** The closed set of native elements (037 D1, 158 D1), in sorted order. */
export const NATIVE_PRIMITIVE_TAGS: readonly string[] = Object.freeze([
  'caption',
  'div',
  'em',
  'h2',
  'h3',
  'h4',
  'img',
  'p',
  'strong',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
]);

const NATIVE_SET: ReadonlySet<string> = new Set(NATIVE_PRIMITIVE_TAGS);

/** Whether `tag` names a native primitive (exact, case-sensitive). */
export function isNativePrimitive(tag: string): boolean {
  return NATIVE_SET.has(tag);
}

/** The primitives whose content is phrasing only (037 D7; a caption, 158 D3). */
const PHRASING_PARENTS: ReadonlySet<string> = new Set([
  'caption',
  'em',
  'h2',
  'h3',
  'h4',
  'p',
  'strong',
]);

/** The only elements a phrasing parent accepts as children (D7). */
const PHRASING_CHILDREN: ReadonlySet<string> = new Set(['em', 'strong']);

/**
 * The table parts and the only parents each sits in (158 D3): never in a
 * `div`, a cell, a catalog component's slot, or at a root.
 */
const TABLE_PART_PARENTS: ReadonlyMap<string, readonly string[]> = new Map([
  ['caption', ['table']],
  ['tbody', ['table']],
  ['td', ['tr']],
  ['th', ['tr']],
  ['thead', ['table']],
  ['tr', ['thead', 'tbody']],
]);

/** The table elements that hold only their own parts and no text (158 D3). */
const TABLE_STRUCTURE: ReadonlyMap<string, readonly string[]> = new Map([
  ['table', ['caption', 'thead', 'tbody']],
  ['tbody', ['tr']],
  ['thead', ['tr']],
  ['tr', ['th', 'td']],
]);

/** A table's parts in order: caption?, thead?, tbody* (158 D3). */
const TABLE_ORDER: ReadonlyMap<string, number> = new Map([
  ['caption', 0],
  ['thead', 1],
  ['tbody', 2],
]);

const TABLE_CELLS: ReadonlySet<string> = new Set(['td', 'th']);

/** "a", "a or b", "a, b and c" (`last` joins the final pair). */
function listOf(tags: readonly string[], last: 'and' | 'or'): string {
  return tags.length < 2
    ? tags.join('')
    : `${tags.slice(0, -1).join(', ')} ${last} ${tags.at(-1) ?? ''}`;
}

/** Whether `child` may not follow `previous` among a table's parts. */
function outOfTableOrder(previous: string | undefined, child: string): boolean {
  const before = previous === undefined ? undefined : TABLE_ORDER.get(previous);
  const rank = TABLE_ORDER.get(child);
  if (before === undefined || rank === undefined) {
    return false;
  }
  return rank < before || (rank === before && child !== 'tbody');
}

/**
 * Why `child` may not sit inside `parent` after its previous element sibling
 * `previous`, or null when the content model allows it. A table part sits
 * only in its own parent; text is covered by `textViolation`, and an `img`
 * declares no slot at all, so the existing unknown-slot check covers it.
 */
export function contentModelViolation(
  parent: string,
  child: string,
  previous?: string,
): string | null {
  const homes = TABLE_PART_PARENTS.get(child);
  if (homes !== undefined && !homes.includes(parent)) {
    return `${child} belongs only in ${listOf(homes, 'or')}; it cannot be a child of ${parent}`;
  }
  if (PHRASING_PARENTS.has(parent) && !PHRASING_CHILDREN.has(child)) {
    return `${parent} accepts only text, strong and em; "${child}" cannot be its child`;
  }
  const parts = TABLE_STRUCTURE.get(parent);
  if (parts !== undefined && !parts.includes(child)) {
    return `${parent} accepts only ${listOf(parts, 'and')}; "${child}" cannot be its child`;
  }
  if (parent === 'table' && outOfTableOrder(previous, child)) {
    return `a table holds at most one caption, then at most one thead, then tbody elements; "${child}" cannot follow "${previous ?? ''}"`;
  }
  return null;
}

/** Whether `tag` is a table cell, below which no table sits (158 D3). */
export function isTableCell(tag: string): boolean {
  return TABLE_CELLS.has(tag);
}

/**
 * Why `child` may not sit below a table cell, at any depth (through a
 * `div` or a component's slot as well), or null when it may (158 D3).
 */
export function belowCellViolation(child: string): string | null {
  return child === 'table'
    ? 'a table cannot sit inside a td or th, at any depth: tables never nest'
    : null;
}

/** Why `parent` may not hold text, or null when it may (158 D3). */
export function textViolation(parent: string): string | null {
  const parts = TABLE_STRUCTURE.get(parent);
  return parts === undefined
    ? null
    : `${parent} accepts only ${listOf(parts, 'and')}; text cannot be its child`;
}

/**
 * Why `tag` may not be a root — of a spec, of a streamed chunk or among a
 * live surface's top-level nodes — or null when it may (158 D3).
 */
export function rootViolation(tag: string): string | null {
  const homes = TABLE_PART_PARENTS.get(tag);
  return homes === undefined
    ? null
    : `${tag} belongs only in ${listOf(homes, 'or')}; it cannot be a root`;
}

/** Plain-data equality, key order ignored (both sides are catalog data). */
function samePlainData(left: unknown, right: unknown): boolean {
  if (left === right) {
    return true;
  }
  if (
    typeof left !== 'object' ||
    typeof right !== 'object' ||
    left === null ||
    right === null ||
    Array.isArray(left) !== Array.isArray(right)
  ) {
    return false;
  }
  const leftKeys = Object.keys(left);
  if (leftKeys.length !== Object.keys(right).length) {
    return false;
  }
  return leftKeys.every(
    (key) =>
      Object.hasOwn(right, key) &&
      samePlainData(
        (left as Record<string, unknown>)[key],
        (right as Record<string, unknown>)[key],
      ),
  );
}

// The structure carries the native primitives whole, guidance prose included
// (only custom elements' prose is left out of it), so this compares the
// complete generated definition.
const canonicalEntries: Readonly<Record<string, unknown>> = catalogStructure.components;

/**
 * Why a native tag must not render with `entry`, or null when `tag` is a
 * native primitive whose entry is exactly Kimen's generated definition
 * (D9). A hand-built `Catalog` value can declare `script`, `h1` or a laxer
 * `img`; none of them reaches `createElement`.
 */
export function nativeEntryViolation(tag: string, entry: unknown): string | null {
  if (!isNativePrimitive(tag)) {
    return 'is not a native primitive';
  }
  return samePlainData(entry, canonicalEntries[tag])
    ? null
    : "is a native primitive whose catalog entry is not Kimen's definition";
}

// The structure is typed as any `Catalog`; its `div` entry is the whole
// generated one, so it has the literal type `catalogData` gives it.
const divProps = (catalogStructure.components as typeof catalogData.components).div.props;

/** A validated layout value, or the declared default when absent or unknown. */
function layoutValue(
  name: 'align' | 'direction' | 'gap' | 'justify',
  props: Readonly<Record<string, Scalar>>,
): string {
  const constraint = divProps[name];
  const value = props[name];
  return typeof value === 'string' && (constraint.values as readonly string[]).includes(value)
    ? value
    : constraint.default;
}

/** Writes one style property through the CSSOM, only when it changes. */
function setStyle(element: Element, property: string, value: string): void {
  const style = (element as HTMLElement).style as CSSStyleDeclaration | undefined;
  if (style !== undefined && style.getPropertyValue(property) !== value) {
    style.setProperty(property, value);
  }
}

/**
 * The layout of a `div` (D4, D5): flex layout through the CSSOM, the gap as
 * the named spacing token. Every value is one of the closed enums (an
 * unknown one falls back to the default), so nothing spec-shaped reaches a
 * CSS value beyond a validated token step.
 */
function applyLayout(element: Element, props: Readonly<Record<string, Scalar>>): void {
  setStyle(element, 'display', 'flex');
  setStyle(element, 'flex-direction', layoutValue('direction', props));
  setStyle(element, 'gap', `var(--ki-space-${layoutValue('gap', props)})`);
  setStyle(element, 'align-items', layoutValue('align', props));
  setStyle(element, 'justify-content', layoutValue('justify', props));
  setStyle(element, 'flex-wrap', props['wrap'] === true ? 'wrap' : 'nowrap');
}

/**
 * What the renderer pins on a freshly created native element (D6): an image
 * is sent without a referrer and never overflows its container. The agent
 * cannot set or override any of it (none is a declared prop).
 */
export function pinNative(element: Element, tag: string): void {
  if (tag === 'img') {
    element.setAttribute('referrerpolicy', 'no-referrer');
    setStyle(element, 'max-inline-size', '100%');
    setStyle(element, 'block-size', 'auto');
  }
}

/**
 * Writes the props of a native layout element and reports whether it did:
 * a `div`'s props are layout, written through the CSSOM, never as
 * attributes. Every other primitive's props are plain attributes, written
 * by the caller.
 */
export function writeNativeLayout(
  element: Element,
  tag: string,
  props: Readonly<Record<string, Scalar>>,
): boolean {
  if (tag !== 'div') {
    return false;
  }
  applyLayout(element, props);
  return true;
}
