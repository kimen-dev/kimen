/**
 * The custom-element tag grammar shared by the registration boundary
 * (`createCatalog`) and the guarded renderer's defence-in-depth re-check
 * (032 FR-013): one definition, so the two checks can never drift apart.
 * Internal module — not part of the package's public surface.
 */
import { isNativePrimitive, nativeEntryViolation } from './primitives.js';

/**
 * A conservative custom-element name: lowercase ASCII, digit-friendly, a
 * hyphen mandatory. Deliberately NARROWER than the HTML PCENChar grammar
 * (no Unicode ranges): a registration boundary prefers rejecting exotic
 * names over accepting a spoofable one (Art. VIII).
 */
const CUSTOM_ELEMENT_TAG = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/u;

// The SVG/MathML names the custom-elements spec forbids even though they
// contain a hyphen.
const RESERVED_TAGS: ReadonlySet<string> = new Set([
  'annotation-xml',
  'color-profile',
  'font-face',
  'font-face-format',
  'font-face-name',
  'font-face-src',
  'font-face-uri',
  'missing-glyph',
]);

/**
 * Why `tag` is not an acceptable custom-element name, or null when it is.
 * The reason is a fixed phrase (never derived from the tag), so callers can
 * build an inert diagnostic around it.
 */
export function tagGrammarViolation(tag: string): string | null {
  if (RESERVED_TAGS.has(tag)) {
    return 'is a reserved SVG/MathML name and cannot be a custom element';
  }
  if (!CUSTOM_ELEMENT_TAG.test(tag)) {
    return 'is not a valid custom-element name (lowercase ASCII with a hyphen required)';
  }
  return null;
}

/**
 * Why the renderer must not create an element for `tag` under `entry` (the
 * entry of the catalog in use), or null when it may (spec 037 FR-007): a
 * custom element passes the tag grammar; a native tag passes only as a
 * native primitive whose entry is exactly Kimen's definition.
 */
export function renderableTagViolation(tag: string, entry: unknown): string | null {
  return isNativePrimitive(tag) ? nativeEntryViolation(tag, entry) : tagGrammarViolation(tag);
}
