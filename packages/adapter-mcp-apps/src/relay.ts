/**
 * The relay text of a declared action (spec 040 D4, D5): the one line a
 * surface sends the host as `ui/message` so the model learns that the person
 * activated a declared action. Built here, from the action and data the
 * surface itself dispatched, and from nothing else — no spec label, host
 * message or server field reaches it (FR-003).
 *
 *   kimen-surface-action {"action":"add-to-cart","data":{"sku":"A-12"}}
 *
 * Language-neutral by construction (no prose, Art. IV): its meaning is taught
 * to the model by the description of the tool that rendered the surface.
 */

/** The fixed start of every relay text; the JSON of `{ action, data }` follows. */
export const SURFACE_ACTION_RELAY_PREFIX = 'kimen-surface-action ';

/** Largest relay text, in UTF-8 bytes (D5). A longer one is not sent, never cut. */
export const RELAY_MAX_BYTES = 8192;

/**
 * What JSON leaves unescaped or escapes in short form, matched left to right:
 * an escaped backslash (kept, so the `n` of `\\n` is never mistaken for an
 * escape), a short escape (rewritten as its `\uXXXX` form), or a line
 * terminator or bidirectional formatting character JSON writes raw (U+0085,
 * U+061C, U+200E, U+200F, U+2028, U+2029, U+202A–U+202E, U+2066–U+2069).
 * They only ever occur inside a JSON string, where `\uXXXX` is the same value.
 */
const UNSAFE =
  /\\\\|\\([bfnrt])|[\u0085\u061c\u200e\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069]/gu;

const SHORT_ESCAPES: Readonly<Record<string, string>> = {
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
};

const unicodeEscape = (character: string): string =>
  `\\u${(character.codePointAt(0) ?? 0).toString(16).padStart(4, '0')}`;

/**
 * The relay text of one dispatched action: the prefix, then the JSON of a
 * fresh `{ action, data }`. The line holds no line terminator and no
 * bidirectional formatting character unescaped, so data can neither start a
 * line of its own nor reorder what a host shows the person; stripping the
 * prefix and parsing the rest returns exactly `{ action, data }` (SC-002) —
 * for every value JSON can carry, which is every value the guarded renderer
 * dispatches (finite numbers, strings, booleans).
 */
export function formatActionRelay(
  action: string,
  data: Readonly<Record<string, boolean | number | string>>,
): string {
  const json = JSON.stringify({ action, data: { ...data } });
  return `${SURFACE_ACTION_RELAY_PREFIX}${json.replace(UNSAFE, (match, short?: string) => {
    if (short !== undefined) {
      return unicodeEscape(SHORT_ESCAPES[short] ?? '');
    }
    return match === '\\\\' ? match : unicodeEscape(match);
  })}`;
}

/** The UTF-8 length of a relay text; the text is well formed (JSON escapes lone surrogates). */
export function relayBytes(text: string): number {
  return new TextEncoder().encode(text).length;
}
