/**
 * The URL policy of the GenUI boundary (027 FR-018, 028 FR-004). Catalog
 * validation uses the scheme and origin rules shared with Markdown.
 *
 * A URL prop is a value the browser may load or navigate to the moment the
 * attribute is set, so two rules apply to it and to nothing else:
 *
 * 1. Scheme: only `http`, `https` and relative references pass; every other
 *    scheme (`javascript:`, `data:`, `blob:`, …) is rejected.
 * 2. Origin, only when the host declares allowed origins: the value must be
 *    an absolute http(s) URL whose origin is on the list. Relative
 *    references are rejected in that mode — the boundary cannot know the
 *    document they would resolve against, and a same-origin request carries
 *    the user's credentials wherever a spec points it.
 *
 * Which props are URL props comes from the catalog constraint
 * (`format: 'url'`, derived from the component contract). The attribute names
 * below stay URL-typed as a backstop for a catalog that declares no format —
 * a consumer definition written before the field existed, or a hand-built
 * `Catalog` value — so a missing declaration can never open the policy.
 */
import { absoluteHttpOrigin, offendingScheme } from './generated/url-scheme.js';

import type { CatalogPropConstraint } from './validate.js';

/**
 * The attribute names a browser treats as fetchable or navigable. A string
 * prop under one of them is a URL prop even without `format: 'url'`.
 */
const URL_PROP_NAMES: ReadonlySet<string> = new Set([
  'action',
  'background',
  'cite',
  'data',
  'formaction',
  'href',
  'ping',
  'poster',
  'src',
  'srcset',
  'xlink:href',
]);

/** Whether the policy applies to the prop `name` under `constraint`. */
export function isUrlProp(name: string, constraint: CatalogPropConstraint): boolean {
  return constraint.format === 'url' || URL_PROP_NAMES.has(name.toLowerCase());
}

/** One rejected URL value: the rule and the reason the message states. */
export interface UrlViolation {
  readonly code: 'url-origin' | 'url-scheme';
  readonly reason: string;
}

/**
 * Checks one URL prop value against the policy. `allowedOrigins` absent
 * means the scheme rule alone (the default); present — even empty — it adds
 * the origin rule, fail-closed. An entry matches only as `URL.origin`
 * serializes an origin (`https://cdn.example.com`, `https://localhost:8443`):
 * a host name alone, a trailing slash or a path matches nothing, so a typo
 * can only narrow what is accepted. The option arrives from untyped callers
 * too: anything but an array of origins (a bare string, `null`) allows no
 * origin at all rather than matching by substring or throwing.
 */
export function urlViolation(
  value: string,
  allowedOrigins: readonly string[] | undefined,
): UrlViolation | null {
  const scheme = offendingScheme(value);
  if (scheme !== null) {
    return { code: 'url-scheme', reason: `uses the rejected scheme "${scheme}"` };
  }
  if (allowedOrigins === undefined) {
    return null;
  }
  const origin = absoluteHttpOrigin(value);
  if (origin === null) {
    return {
      code: 'url-origin',
      reason: 'is not an absolute http(s) URL, the only form accepted under allowed URL origins',
    };
  }
  return Array.isArray(allowedOrigins) && allowedOrigins.includes(origin)
    ? null
    : { code: 'url-origin', reason: `points at "${origin}", outside the allowed URL origins` };
}
