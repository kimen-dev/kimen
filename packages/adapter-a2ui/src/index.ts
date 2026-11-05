/**
 * @kimen/adapter-a2ui (spec 029, constitution Art. VIII): translates A2UI
 * v0.9.1 messages (`createSurface`, `updateComponents`, `updateDataModel`,
 * `deleteSurface`) into the neutral catalog (@kimen/catalog) and renders every
 * surface through the guarded renderer alone — the durable catalog and
 * `ki-*` elements never learn A2UI's vocabulary, and the A2UI data model is
 * resolved inside this package. The adapter is disposable by design: the
 * exact supported protocol version lives in `COMPAT.md` and
 * `SUPPORTED_A2UI_VERSIONS`, protocol churn is absorbed here, and an
 * unabsorbable break retires this package without touching core.
 */

export type {
  A2uiActionMetadata,
  A2uiAdapter,
  A2uiAdapterOptions,
  A2uiApplyResult,
  A2uiDegradationReport,
  A2uiDiagnostic,
  GuardedRender,
} from './adapter.js';
export { createA2uiAdapter } from './adapter.js';
export type {
  A2uiCoverageEntry,
  A2uiForbiddenEntry,
  A2uiInlineEntry,
  A2uiLayoutEntry,
  A2uiMappedEntry,
  A2uiUnmappedEntry,
} from './coverage.js';
export {
  A2UI_BASIC_CATALOG_IDS,
  A2UI_CLIENT_FUNCTION_ALLOWLIST,
  A2UI_COMMON_PROPERTIES,
  A2UI_COVERAGE,
  A2UI_EVALUATED_FUNCTIONS,
  A2UI_SPEC_VERSION,
  EMITTED_A2UI_VERSION,
  FALLBACK_CATALOG_TAG,
  FALLBACK_LABEL,
  FALLBACK_TONE,
  ROOT_CONTAINER_TAG,
  SUPPORTED_A2UI_VERSIONS,
} from './coverage.js';
export type {
  A2uiAction,
  A2uiActionMessage,
  A2uiChildList,
  A2uiClientDataModel,
  A2uiComponent,
  A2uiCreateSurface,
  A2uiDataBinding,
  A2uiDeleteSurface,
  A2uiDynamicValue,
  A2uiEmittedVersion,
  A2uiErrorMessage,
  A2uiFunctionCall,
  A2uiServerMessage,
  A2uiUpdateComponents,
  A2uiUpdateDataModel,
  A2uiVersion,
} from './protocol.js';
