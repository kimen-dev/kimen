/**
 * The A2UI-to-catalog compatibility matrix (constitution Art. VIII / specs 029
 * FR-004 and 039 FR-008): the single machine-readable statement of which A2UI
 * protocol versions and catalogs this adapter accepts, how every component
 * type of each version's basic catalog maps to neutral `ki-*` catalog
 * components, which types it refuses on security grounds, and which client
 * functions it evaluates. `COMPAT.md` is the human-readable projection of this
 * data and the coverage suites fail if the two drift or if a mapped catalog
 * counterpart leaves the catalog (Art. I).
 *
 * Two version families are supported side by side (spec 039): A2UI 1.0
 * (preferred) and A2UI 0.9.1. The unprefixed `A2UI_*` constants keep
 * describing 0.9.1 (spec 029); the `A2UI_V1_*` constants describe 1.0, and
 * `A2UI_PROTOCOLS` lists both, preferred first.
 *
 * Every rendered surface is still a neutral catalog spec handed to the guarded
 * renderer; nothing here renders.
 */
import type { A2uiEmittedVersion } from './protocol.js';

/**
 * The A2UI 0.9.1 specification, as published in `specification/v0_9_1/` of
 * github.com/google/A2UI at commit 85120b91e2fe94cb20c8ddef0b545d3da2ae161f.
 */
export const A2UI_SPEC_VERSION = '0.9.1';

/** The upstream commit the 0.9.1 family is pinned to. */
export const A2UI_SPEC_COMMIT = '85120b91e2fe94cb20c8ddef0b545d3da2ae161f';

/**
 * The A2UI 1.0 specification, as published at github.com/google/A2UI commit
 * 57f961f143da23f4212313e432a64b5843d978f9: `specification/v1_0/` (protocol
 * and schemas) and `catalogs/basic/v1/` (basic catalog and examples).
 */
export const A2UI_V1_SPEC_VERSION = '1.0';

/** The upstream commit the 1.0 family is pinned to (no 1.0 tag exists upstream). */
export const A2UI_V1_SPEC_COMMIT = '57f961f143da23f4212313e432a64b5843d978f9';

/** The version the adapter prefers and advertises first (spec 039 S17). */
export const PREFERRED_A2UI_VERSION = '1.0';

/**
 * Envelope `version` values accepted on server messages, every family
 * (FR-004, SC-003, spec 039 FR-001). 1.0 envelopes carry the bare `"1.0"`
 * (`agent_to_renderer.json`); the 0.9.1 schemas (`server_to_client.json`)
 * accept exactly `"v0.9"` and `"v0.9.1"`, which are payload-compatible
 * (`v0_9_1/docs/evolution_guide.md` §3). Anything else is rejected naming
 * this set.
 */
export const SUPPORTED_A2UI_VERSIONS: readonly string[] = ['1.0', 'v0.9.1', 'v0.9'];

/** The `version` written on every client-to-server message of a 0.9.1 surface. */
export const EMITTED_A2UI_VERSION: A2uiEmittedVersion = 'v0.9.1';

/** The `version` written on every renderer-to-agent message of a 1.0 surface. */
export const A2UI_V1_EMITTED_VERSION: A2uiEmittedVersion = '1.0';

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
 * CatalogComponentCommon`). Only Image reads `accessibility` when rendering.
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
  Row: { catalog: ['ki-stack'], kind: 'mapped', properties: ['children', 'justify', 'align'] },
  Column: { catalog: ['ki-stack'], kind: 'mapped', properties: ['children', 'justify', 'align'] },
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
    catalog: ['ki-radio-group', 'ki-radio', 'ki-checkbox-group', 'ki-checkbox'],
    kind: 'mapped',
    properties: ['label', 'variant', 'options', 'value', 'displayStyle', 'filterable', CHECKS],
  },
  Image: { catalog: ['ki-image'], kind: 'mapped', properties: ['url', 'fit', 'variant'] },
  Icon: { catalog: ['ki-icon'], kind: 'mapped', properties: ['name'] },
  Video: {
    kind: 'unmapped',
    reason: 'ki-video needs a native video child the spec cannot carry',
  },
  AudioPlayer: { catalog: ['ki-audio'], kind: 'mapped', properties: ['url', 'description'] },
  Modal: {
    catalog: ['ki-button', 'ki-dialog'],
    kind: 'mapped',
    properties: ['trigger', 'content'],
  },
  Slider: {
    catalog: ['ki-slider'],
    kind: 'mapped',
    properties: ['label', 'min', 'max', 'value', CHECKS],
  },
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
 * The fallback container for an inline or empty A2UI root. The guarded
 * renderer accepts one root catalog node.
 */
export const ROOT_CONTAINER_TAG = 'ki-card';

/** A coverage matrix: A2UI component type → how it renders. */
export type A2uiCoverageMatrix = Readonly<Record<string, A2uiCoverageEntry>>;

/**
 * The single decision point for "is this A2UI type forbidden?" (S7): the
 * security reason when the matrix declares the type forbidden, else null.
 */
export function forbiddenReason(
  type: string,
  coverage: A2uiCoverageMatrix = A2UI_COVERAGE,
): string | null {
  const entry = Object.hasOwn(coverage, type) ? coverage[type] : undefined;
  return entry?.kind === 'forbidden' ? entry.reason : null;
}

/** The coverage entry for a type, own keys only (a type named `toString` is unmapped). */
export function coverageOf(
  type: string,
  coverage: A2uiCoverageMatrix = A2UI_COVERAGE,
): A2uiCoverageEntry | undefined {
  return Object.hasOwn(coverage, type) ? coverage[type] : undefined;
}

// ---------------------------------------------------------------------------
// A2UI 1.0 (spec 039)
// ---------------------------------------------------------------------------

/**
 * The one catalog id a 1.0 surface, component (`@catalogId`) or function call
 * (`catalogId`) may name: the 1.0 basic catalog (`catalogs/basic/v1/
 * catalog.json`, `protocolVersion: "1.0"`). Kimen advertises no inline
 * catalogs, so 1.0 catalog mixing reduces to this one catalog.
 */
export const A2UI_V1_BASIC_CATALOG_IDS: readonly string[] = [
  'https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json',
];

/**
 * Basic-catalog functions evaluated on 1.0 surfaces: the 0.9.1 set plus the
 * system function `@index` (template scope only).
 */
export const A2UI_V1_EVALUATED_FUNCTIONS: readonly string[] = [
  ...A2UI_EVALUATED_FUNCTIONS,
  '@index',
];

/**
 * Envelope keys every 1.0 component may carry (`common_types.json#/$defs/
 * ComponentCommon`), plus `weight`, which every 1.0 basic-catalog component
 * declares. Only Image reads `@accessibility` when rendering. `@catalogId`
 * must name the 1.0 basic catalog (S19).
 */
export const A2UI_V1_COMMON_PROPERTIES: readonly string[] = [
  'id',
  'component',
  '@catalogId',
  '@accessibility',
  '@metadata',
  'weight',
];

/** 1.0 `Checkable` components accept `@checks` (`common_types.json`). */
const V1_CHECKS = '@checks';

/**
 * The coverage matrix for the A2UI 1.0 basic catalog: the same 18 types and
 * the same mappings as 0.9.1, with the 1.0 property sets (`@checks`,
 * `TextField.placeholder`, no `validationRegexp`).
 */
export const A2UI_V1_COVERAGE: A2uiCoverageMatrix = {
  Text: { kind: 'inline', properties: ['text', 'variant'] },
  Row: { catalog: ['ki-stack'], kind: 'mapped', properties: ['children', 'justify', 'align'] },
  Column: { catalog: ['ki-stack'], kind: 'mapped', properties: ['children', 'justify', 'align'] },
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
    properties: ['child', 'variant', 'action', V1_CHECKS],
  },
  TextField: {
    catalog: ['ki-input', 'ki-textarea'],
    kind: 'mapped',
    properties: ['label', 'value', 'variant', 'placeholder', V1_CHECKS],
  },
  CheckBox: {
    catalog: ['ki-checkbox'],
    kind: 'mapped',
    properties: ['label', 'value', V1_CHECKS],
  },
  ChoicePicker: {
    catalog: ['ki-radio-group', 'ki-radio', 'ki-checkbox-group', 'ki-checkbox'],
    kind: 'mapped',
    properties: ['label', 'variant', 'options', 'value', 'displayStyle', 'filterable', V1_CHECKS],
  },
  Image: { catalog: ['ki-image'], kind: 'mapped', properties: ['url', 'fit', 'variant'] },
  Icon: { catalog: ['ki-icon'], kind: 'mapped', properties: ['name'] },
  Video: {
    kind: 'unmapped',
    reason: 'ki-video needs a native video child the spec cannot carry',
  },
  AudioPlayer: { catalog: ['ki-audio'], kind: 'mapped', properties: ['url', 'description'] },
  Modal: {
    catalog: ['ki-button', 'ki-dialog'],
    kind: 'mapped',
    properties: ['trigger', 'content'],
  },
  Slider: {
    catalog: ['ki-slider'],
    kind: 'mapped',
    properties: ['label', 'min', 'max', 'steps', 'value', V1_CHECKS],
  },
  DateTimeInput: {
    kind: 'unmapped',
    reason: 'no date or time input in the catalog',
  },
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
 * The component type 1.0 reserves for the implicit surface container
 * (`common_types.json#/$defs/Surface`): it can never be sent as a component.
 */
export const A2UI_V1_RESERVED_TYPE = 'Surface';

/** A supported A2UI version family. */
export type A2uiProtocolFamily = '1.0' | '0.9.1';

/** Everything the adapter declares about one supported version family. */
export interface A2uiProtocol {
  readonly family: A2uiProtocolFamily;
  readonly specVersion: string;
  /** The github.com/google/A2UI commit the family is pinned to. */
  readonly commit: string;
  /** Envelope `version` values that select this family. */
  readonly envelopeVersions: readonly string[];
  /** The `version` written on client-to-server messages of its surfaces. */
  readonly emittedVersion: A2uiEmittedVersion;
  readonly basicCatalogIds: readonly string[];
  readonly coverage: A2uiCoverageMatrix;
  readonly commonProperties: readonly string[];
  readonly evaluatedFunctions: readonly string[];
}

const V1_PROTOCOL: A2uiProtocol = {
  basicCatalogIds: A2UI_V1_BASIC_CATALOG_IDS,
  commit: A2UI_V1_SPEC_COMMIT,
  commonProperties: A2UI_V1_COMMON_PROPERTIES,
  coverage: A2UI_V1_COVERAGE,
  emittedVersion: A2UI_V1_EMITTED_VERSION,
  envelopeVersions: ['1.0'],
  evaluatedFunctions: A2UI_V1_EVALUATED_FUNCTIONS,
  family: '1.0',
  specVersion: A2UI_V1_SPEC_VERSION,
};

const V091_PROTOCOL: A2uiProtocol = {
  basicCatalogIds: A2UI_BASIC_CATALOG_IDS,
  commit: A2UI_SPEC_COMMIT,
  commonProperties: A2UI_COMMON_PROPERTIES,
  coverage: A2UI_COVERAGE,
  emittedVersion: EMITTED_A2UI_VERSION,
  envelopeVersions: ['v0.9.1', 'v0.9'],
  evaluatedFunctions: A2UI_EVALUATED_FUNCTIONS,
  family: '0.9.1',
  specVersion: A2UI_SPEC_VERSION,
};

/** The supported version families, preferred first (spec 039 S16/S17). */
export const A2UI_PROTOCOLS: readonly A2uiProtocol[] = [V1_PROTOCOL, V091_PROTOCOL];

/** The family an envelope `version` selects, or undefined when unsupported. */
export function protocolFor(version: string): A2uiProtocol | undefined {
  return A2UI_PROTOCOLS.find((protocol) => protocol.envelopeVersions.includes(version));
}

/**
 * One renderer-capabilities declaration a host transport attaches to its
 * messages: `value` goes under the transport metadata key `metadataKey`
 * (`a2uiRendererCapabilities` for 1.0, `a2uiClientCapabilities` for 0.9.1;
 * `renderer_capabilities.json` / `client_capabilities.json`).
 */
export interface A2uiRendererCapabilities {
  readonly metadataKey: 'a2uiRendererCapabilities' | 'a2uiClientCapabilities';
  readonly value: Readonly<Record<string, { readonly supportedCatalogIds: readonly string[] }>>;
}

/**
 * The capabilities the adapter declares, preferred version first (S17). Both
 * advertise only the basic catalog of their version and no inline catalogs.
 */
export const A2UI_RENDERER_CAPABILITIES: readonly A2uiRendererCapabilities[] = [
  {
    metadataKey: 'a2uiRendererCapabilities',
    value: { '1.0': { supportedCatalogIds: [...A2UI_V1_BASIC_CATALOG_IDS] } },
  },
  {
    metadataKey: 'a2uiClientCapabilities',
    value: { 'v0.9': { supportedCatalogIds: [...A2UI_BASIC_CATALOG_IDS] } },
  },
];
