/**
 * @kimen/adapter-a2ui (spec 029, constitution Art. VIII): the first protocol
 * adapter. It translates declarative A2UI messages into the neutral catalog
 * (@kimen/catalog) and renders every surface through the guarded renderer
 * alone — the durable catalog and `ki-*` elements never learn A2UI's
 * vocabulary. The adapter is disposable by design: the exact supported
 * protocol version(s) live in `COMPAT.md` and `SUPPORTED_A2UI_VERSIONS`,
 * protocol churn is absorbed here, and an unabsorbable break retires this
 * package without touching core.
 */
export { createA2uiAdapter } from './adapter.js';
export type {
  A2uiAdapter,
  A2uiAdapterOptions,
  A2uiApplyResult,
  A2uiDegradationReport,
  A2uiDiagnostic,
  GuardedRender,
} from './adapter.js';
export {
  A2UI_COVERAGE,
  FALLBACK_CATALOG_TAG,
  FALLBACK_LABEL,
  FALLBACK_TONE,
  SUPPORTED_A2UI_VERSIONS,
} from './coverage.js';
export type {
  A2uiCoverageEntry,
  A2uiForbiddenEntry,
  A2uiInlineEntry,
  A2uiMappedEntry,
} from './coverage.js';
export type {
  A2uiAction,
  A2uiBeginRendering,
  A2uiBoundValue,
  A2uiChildren,
  A2uiComponentBody,
  A2uiComponentInstance,
  A2uiDataModelUpdate,
  A2uiDeleteSurface,
  A2uiMessage,
  A2uiSurfaceUpdate,
  A2uiUserAction,
} from './protocol.js';
