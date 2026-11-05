/**
 * The A2UI-to-catalog compatibility matrix (constitution Art. VIII / spec 029
 * FR-004): the single machine-readable statement of which A2UI protocol
 * versions and catalogs this adapter accepts, how every component type of the
 * A2UI v0.9.1 basic catalog maps to neutral `ki-*` catalog components, which
 * types it refuses on security grounds, and which client functions it
 * evaluates. `COMPAT.md` is the human-readable projection of this data and the
 * `coverage.spec.ts` suite fails if the two drift or if a mapped catalog
 * counterpart leaves the catalog (Art. I).
 *
 * Every rendered surface is still a neutral catalog spec handed to the guarded
 * renderer; nothing here renders.
 */
import type { A2uiEmittedVersion } from './protocol.js';

/**
 * The exact A2UI specification this adapter release implements: v0.9.1, as
 * published in `specification/v0_9_1/` of github.com/google/A2UI at commit
 * 85120b91e2fe94cb20c8ddef0b545d3da2ae161f.
 */
export const A2UI_SPEC_VERSION = '0.9.1';

/**
 * Envelope `version` values accepted on server messages (FR-004, SC-003). The
 * v0.9.1 schemas (`server_to_client.json`) accept exactly `"v0.9"` and
 * `"v0.9.1"`: v0.9.1 is payload-compatible with v0.9
 * (`v0_9_1/docs/evolution_guide.md` §3), and the spec's own example corpus is
 * tagged `"v0.9"`. Anything else is rejected naming this set (S5).
 */
export const SUPPORTED_A2UI_VERSIONS: readonly string[] = ['v0.9.1', 'v0.9'];

/** The `version` written on every client-to-server message. */
export const EMITTED_A2UI_VERSION: A2uiEmittedVersion = 'v0.9.1';

/**
 * Catalog ids a `createSurface` may name. Both spellings designate the one
 * basic catalog of v0.9.1: `catalogs/basic/catalog.json` declares the `v0_9`
 * id (also used by the spec's example corpus), while `docs/a2ui_protocol.md`
 * writes the `v0_9_1` id in its examples. Any other id is rejected
 * (`unsupported-catalog`): Kimen publishes no catalog of its own yet.
 */
export const A2UI_BASIC_CATALOG_IDS: readonly string[] = [
  'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json',
  'https://a2ui.org/specification/v0_9_1/catalogs/basic/catalog.json',
];

/**
 * Basic-catalog functions the adapter evaluates as pure value computations
 * inside a dynamic value. They read only the surface's data model and never
 * reach a browser capability. Any other function in a value degrades its
 * component to the declared fallback (reported); see COMPAT.md.
 */
export const A2UI_EVALUATED_FUNCTIONS: readonly string[] = [
  'formatString',
  'formatNumber',
  'formatCurrency',
  'pluralize',
];

/**
 * Client functions an `Action.functionCall` may run. Empty by design: such
 * functions reach browser capabilities (`openUrl` navigates), so a component
 * binding one rejects the whole message (`forbidden-function`). Widening this
 * list is a security decision recorded in COMPAT.md and spec 029.
 */
export const A2UI_CLIENT_FUNCTION_ALLOWLIST: readonly string[] = [];

/**
 * Properties every basic-catalog component may carry
 * (`common_types.json#/$defs/ComponentCommon`, `catalog.json#/$defs/
 * CatalogComponentCommon`). `accessibility` and `weight` are accepted and not
 * rendered (COMPAT.md, lossy mappings).
 */
export const A2UI_COMMON_PROPERTIES: readonly string[] = [
  'id',
  'component',
  'accessibility',
  'weight',
];

/**
 * A mapped A2UI type: it renders through the listed `ki-*` catalog
 * components. `properties` is the exact set of type-specific A2UI properties
 * the basic catalog declares for it; any other property rejects the message
 * (`unknown-property`, S9).
 */
export interface A2uiMappedEntry {
  readonly kind: 'mapped';
  readonly catalog: readonly string[];
  readonly properties: readonly string[];
}

/** An inline type: its resolved string becomes inert text in the parent slot. */
export interface A2uiInlineEntry {
  readonly kind: 'inline';
  readonly properties: readonly string[];
}

/**
 * A layout type with no catalog counterpart: it renders no element of its
 * own and its children join the parent slot in order (direction and
 * alignment are not rendered; COMPAT.md, lossy mappings).
 */
export interface A2uiLayoutEntry {
  readonly kind: 'layout';
  readonly properties: readonly string[];
}

/**
 * A basic-catalog type with no catalog counterpart: it degrades per node to
 * the declared fallback (FR-002, S4/S11).
 */
export interface A2uiUnmappedEntry {
  readonly kind: 'unmapped';
  readonly reason: string;
}

/**
 * A security-forbidden type (FR-002/FR-004, S7): a message declaring it is
 * rejected WHOLE — the soft degradation path never applies.
 */
export interface A2uiForbiddenEntry {
  readonly kind: 'forbidden';
  readonly reason: string;
}

export type A2uiCoverageEntry =
  | A2uiMappedEntry
  | A2uiInlineEntry
  | A2uiLayoutEntry
  | A2uiUnmappedEntry
  | A2uiForbiddenEntry;

/** `Checkable` components additionally accept `checks` (`common_types.json`). */
const CHECKS = 'checks';

/**
 * The coverage matrix for the A2UI v0.9.1 basic catalog. It lists all 18
 * basic component types plus the forbidden markup carriers. A type absent
 * from this matrix (not part of the basic catalog) degrades like an
 * `unmapped` one.
 */
export const A2UI_COVERAGE: Readonly<Record<string, A2uiCoverageEntry>> = {
  Text: { kind: 'inline', properties: ['text', 'variant'] },
  Row: { kind: 'layout', properties: ['children', 'justify', 'align'] },
  Column: { kind: 'layout', properties: ['children', 'justify', 'align'] },
  List: {
    catalog: ['ki-list', 'ki-list-item'],
    kind: 'mapped',
    properties: ['children', 'direction', 'align'],
  },
  Card: { catalog: ['ki-card'], kind: 'mapped', properties: ['child'] },
  Tabs: {
    catalog: ['ki-tabs', 'ki-tab', 'ki-tab-panel'],
    kind: 'mapped',
    properties: ['tabs'],
  },
  Divider: { catalog: ['ki-divider'], kind: 'mapped', properties: ['axis'] },
  Button: {
    catalog: ['ki-button'],
    kind: 'mapped',
    properties: ['child', 'variant', 'action', CHECKS],
  },
  TextField: {
    catalog: ['ki-input', 'ki-textarea'],
    kind: 'mapped',
    properties: ['label', 'value', 'variant', 'validationRegexp', CHECKS],
  },
  CheckBox: {
    catalog: ['ki-checkbox'],
    kind: 'mapped',
    properties: ['label', 'value', CHECKS],
  },
  ChoicePicker: {
    catalog: ['ki-radio-group', 'ki-radio'],
    kind: 'mapped',
    properties: ['label', 'variant', 'options', 'value', 'displayStyle', 'filterable', CHECKS],
  },
  Image: { kind: 'unmapped', reason: 'no image component in the catalog' },
  Icon: {
    kind: 'unmapped',
    reason: 'no named or path icon component in the catalog',
  },
  Video: {
    kind: 'unmapped',
    reason: 'ki-video needs a native video child the spec cannot carry',
  },
  AudioPlayer: {
    kind: 'unmapped',
    reason: 'no audio component in the catalog',
  },
  Modal: {
    kind: 'unmapped',
    reason: 'opening ki-dialog from a trigger needs host code',
  },
  Slider: { kind: 'unmapped', reason: 'no range input in the catalog' },
  DateTimeInput: {
    kind: 'unmapped',
    reason: 'no date or time input in the catalog',
  },
  // Security-forbidden types: raw-markup and code carriers reject the message.
  html: { kind: 'forbidden', reason: 'raw HTML is a markup-injection vector' },
  RawHtml: {
    kind: 'forbidden',
    reason: 'raw HTML is a markup-injection vector',
  },
  script: {
    kind: 'forbidden',
    reason: 'script is an executable-content vector',
  },
  iframe: {
    kind: 'forbidden',
    reason: 'nested browsing contexts are a smuggling vector',
  },
};

/**
 * The declared fallback for an unmapped type or an unevaluated function
 * (FR-002, S4/S11): a fixed neutral node built from catalog values ONLY — no
 * agent-supplied content ever reaches it.
 */
export const FALLBACK_LABEL = 'Unsupported component';
export const FALLBACK_CATALOG_TAG = 'ki-badge';
export const FALLBACK_TONE = 'warning';

/**
 * The container used when the A2UI root does not translate to exactly one
 * catalog node (a `Column` or `Row` root with several children, or a `Text`
 * root): the guarded renderer renders one root node, and the catalog has no
 * neutral layout element yet (COMPAT.md, pending core work).
 */
export const ROOT_CONTAINER_TAG = 'ki-card';

/**
 * The single decision point for "is this A2UI type forbidden?" (S7): the
 * security reason when the matrix declares the type forbidden, else null.
 */
export function forbiddenReason(type: string): string | null {
  const entry = Object.hasOwn(A2UI_COVERAGE, type) ? A2UI_COVERAGE[type] : undefined;
  return entry?.kind === 'forbidden' ? entry.reason : null;
}

/** The coverage entry for a type, own keys only (a type named `toString` is unmapped). */
export function coverageOf(type: string): A2uiCoverageEntry | undefined {
  return Object.hasOwn(A2UI_COVERAGE, type) ? A2UI_COVERAGE[type] : undefined;
}
