/**
 * The prop-name grammar shared by the registration boundary (`createCatalog`)
 * and the renderers' defence-in-depth re-check (spec 032): one definition, so
 * the two checks can never drift apart. A prop name becomes a DOM attribute
 * name through `setAttribute`, so the grammar is about what an attribute
 * written from spec data must never be. Internal module — not part of the
 * package's public surface.
 */

/** Why a prop name cannot be written as an attribute from spec data. */
export type PropNameViolation = 'event-handler' | 'reserved' | 'malformed';

// HTML inline event-handler content attributes (onclick, onerror, …) install
// EXECUTABLE code the moment setAttribute sets them: the whole on* namespace,
// case-insensitive because setAttribute lowercases the name.
const EVENT_HANDLER_PROP = /^on/iu;

// Attributes spec data must never write onto a component (032 FR-015):
// `style` is a CSS-injection path and breaks a CSP with style-src-attr 'none',
// `class` couples spec data to the host page's stylesheets, `slot` fights the
// renderer's own slot assignment and `id` collides with the host page's ids.
// Case-insensitive for the same setAttribute reason.
const RESERVED_ATTRIBUTE_PROP = /^(?:class|id|slot|style)$/iu;

// A conservative DOM attribute name: a lowercase ASCII start then letters,
// digits, hyphen or underscore. An empty or exotic name would throw
// InvalidCharacterError out of setAttribute; rejecting it up front keeps the
// failure an inert diagnostic. Every built-in catalog prop name (kebab-case)
// satisfies it.
const SAFE_PROP_NAME = /^[a-z][a-z0-9_-]*$/u;

/**
 * Why `name` cannot be a prop written from spec data, or null when it can.
 * The checks run in order, so a reserved or handler name is reported as
 * such whatever its letter case, never as a merely malformed name.
 */
export function propNameViolation(name: string): PropNameViolation | null {
  if (EVENT_HANDLER_PROP.test(name)) {
    return 'event-handler';
  }
  if (RESERVED_ATTRIBUTE_PROP.test(name)) {
    return 'reserved';
  }
  if (!SAFE_PROP_NAME.test(name)) {
    return 'malformed';
  }
  return null;
}
