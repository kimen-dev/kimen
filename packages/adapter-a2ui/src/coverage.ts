/**
 * The A2UI-to-catalog compatibility matrix (constitution Art. VIII / spec 029
 * FR-004): the single machine-readable statement of which A2UI component types
 * this adapter maps, to which neutral `ki-*` catalog counterpart, which it
 * refuses on security grounds, and the exact A2UI protocol version(s) it
 * supports. `COMPAT.md` is the human-readable projection of this data and the
 * `coverage.spec.ts` suite fails if the two drift or if a mapped catalog
 * counterpart leaves the catalog (Art. I: no hand-maintained mapping that can
 * silently drift).
 *
 * Every rendered surface is still a neutral catalog spec handed to the guarded
 * renderer; nothing here renders. A type absent from this matrix is
 * `unmapped` — it degrades per node to a fixed fallback (FR-002, S4/S11).
 */

/** Exact A2UI protocol version(s) this adapter release supports (FR-004, SC-003). */
export const SUPPORTED_A2UI_VERSIONS: readonly string[] = ['0.9.1'];

/**
 * A mapped A2UI type: it renders as `catalog` (a real `ki-*` tag). `text`, if
 * present, routes the named A2UI property's resolved string to the catalog
 * default slot, or to `asProp` when the catalog carries the text as a prop
 * (e.g. a field label). `propAliases` renames the few A2UI properties whose
 * name differs from the catalog prop; every other property flows through
 * under its own name so the guarded renderer — not a second allowlist here —
 * rejects the ones the catalog does not declare (FR-003, S9).
 */
export interface A2uiMappedEntry {
  readonly kind: 'mapped';
  readonly catalog: string;
  readonly text?: { readonly from: string; readonly asProp?: string };
  readonly propAliases?: Readonly<Record<string, string>>;
}

/**
 * An inline A2UI type (text/heading): it carries no element of its own but
 * contributes its resolved string to its parent's slot as an inert text node.
 */
export interface A2uiInlineEntry {
  readonly kind: 'inline';
  readonly text: { readonly from: string };
}

/**
 * A security-forbidden A2UI type (FR-002/FR-004, S7): a message declaring it
 * is rejected WHOLE — the soft degradation path never applies, so an attacker
 * gains nothing by preferring a forbidden type over an unmapped one.
 */
export interface A2uiForbiddenEntry {
  readonly kind: 'forbidden';
  readonly reason: string;
}

export type A2uiCoverageEntry = A2uiMappedEntry | A2uiInlineEntry | A2uiForbiddenEntry;

/**
 * The coverage matrix for the supported A2UI version. Keys are A2UI component
 * type names; a type not listed here is `unmapped` and degrades (S4).
 */
export const A2UI_COVERAGE: Readonly<Record<string, A2uiCoverageEntry>> = {
  // Inline text — resolved string flows into the parent slot, never markup.
  Text: { kind: 'inline', text: { from: 'text' } },
  Heading: { kind: 'inline', text: { from: 'text' } },
  // Containers — children flow into the neutral default slot.
  Card: { kind: 'mapped', catalog: 'ki-card' },
  List: { kind: 'mapped', catalog: 'ki-list' },
  ListItem: { kind: 'mapped', catalog: 'ki-list-item', text: { from: 'text' } },
  // Controls and leaves.
  Button: { kind: 'mapped', catalog: 'ki-button', text: { from: 'label' } },
  TextField: { kind: 'mapped', catalog: 'ki-input', text: { from: 'label', asProp: 'label' } },
  MultilineTextField: {
    kind: 'mapped',
    catalog: 'ki-textarea',
    text: { from: 'label', asProp: 'label' },
  },
  Checkbox: { kind: 'mapped', catalog: 'ki-checkbox', text: { from: 'label' } },
  Divider: { kind: 'mapped', catalog: 'ki-divider' },
  Badge: { kind: 'mapped', catalog: 'ki-badge', text: { from: 'text' } },
  Alert: { kind: 'mapped', catalog: 'ki-alert', text: { from: 'text' } },
  Progress: { kind: 'mapped', catalog: 'ki-progress', text: { from: 'label', asProp: 'label' } },
  // Security-forbidden types: raw-markup and code carriers reject the message.
  html: { kind: 'forbidden', reason: 'raw HTML is a markup-injection vector' },
  RawHtml: { kind: 'forbidden', reason: 'raw HTML is a markup-injection vector' },
  script: { kind: 'forbidden', reason: 'script is an executable-content vector' },
  iframe: { kind: 'forbidden', reason: 'nested browsing contexts are a smuggling vector' },
};

/**
 * The declared fallback for an unmapped type (FR-002, S4/S11): a fixed neutral
 * node built from catalog values ONLY — no agent-supplied content ever reaches
 * it, so a hostile payload under an unmapped type cannot ride the soft path.
 * `ki-badge` with a `warning` tone and a constant label marks the gap.
 */
export const FALLBACK_LABEL = 'Unsupported component';
export const FALLBACK_CATALOG_TAG = 'ki-badge';
export const FALLBACK_TONE = 'warning';
