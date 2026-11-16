/**
 * The native primitives at the guarded boundary (spec 037, Art. VIII): the
 * closed set of native HTML elements a UI spec may carry next to catalog
 * components. Their catalog entries are generated (Art. I) from
 * `scripts/primitives.mjs`; this module holds what the boundary does with
 * them and nothing a catalog value could widen:
 *
 * - the canonical-definition check: a native tag renders only when the
 *   entry of the catalog in use is exactly Kimen's generated one;
 * - the content model (D7): which children a primitive accepts;
 * - the writers (D4, D6): layout through the CSSOM only, the image's pinned
 *   referrer policy and container-fit sizing. No path here writes a `style`
 *   or `class` attribute, so a CSP without `'unsafe-inline'` for styles
 *   holds (verified in Chromium, browser-tests/native-csp.browser.spec.ts).
 *
 * Internal module — `NATIVE_PRIMITIVE_TAGS` is re-exported by the package.
 */
import { catalogData } from './generated/catalog.js';

type Scalar = boolean | number | string;

/** The closed set of native elements (D1), in sorted order. */
export const NATIVE_PRIMITIVE_TAGS: readonly string[] = Object.freeze([
  'div',
  'em',
  'h2',
  'h3',
  'h4',
  'img',
  'p',
  'strong',
]);

const NATIVE_SET: ReadonlySet<string> = new Set(NATIVE_PRIMITIVE_TAGS);

/** Whether `tag` names a native primitive (exact, case-sensitive). */
export function isNativePrimitive(tag: string): boolean {
  return NATIVE_SET.has(tag);
}

/** The primitives whose content is phrasing only (D7). */
const PHRASING_PARENTS: ReadonlySet<string> = new Set(['em', 'h2', 'h3', 'h4', 'p', 'strong']);

/** The only elements a phrasing parent accepts as children (D7). */
const PHRASING_CHILDREN: ReadonlySet<string> = new Set(['em', 'strong']);

/**
 * Why `child` may not sit inside `parent`, or null when the content model
 * allows it. Text is always allowed where a slot exists; an `img` declares
 * no slot at all, so the existing unknown-slot check covers it.
 */
export function contentModelViolation(parent: string, child: string): string | null {
  if (PHRASING_PARENTS.has(parent) && !PHRASING_CHILDREN.has(child)) {
    return `${parent} accepts only text, strong and em; "${child}" cannot be its child`;
  }
  return null;
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

const canonicalEntries: Readonly<Record<string, unknown>> = catalogData.components;

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

const divProps = catalogData.components.div.props;

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
