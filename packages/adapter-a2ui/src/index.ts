/**
 * @kimen/adapter-a2ui (specs 029 and 039, constitution Art. VIII): translates
 * A2UI 1.0 and 0.9.1 messages (`createSurface`, `updateComponents`,
 * `updateDataModel`, `deleteSurface`; each handled by the version its
 * envelope declares) into the neutral catalog (@kimen/catalog) and renders every
 * surface through the guarded renderer alone — the durable catalog and
 * `ki-*` elements never learn A2UI's vocabulary, and the A2UI data model is
 * resolved inside this package. The adapter is disposable by design: the
 * exact supported protocol versions live in `COMPAT.md` and
 * `A2UI_PROTOCOLS`, protocol churn is absorbed here, and an
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
  A2uiCoverageMatrix,
  A2uiForbiddenEntry,
  A2uiInlineEntry,
  A2uiLayoutEntry,
  A2uiMappedEntry,
  A2uiProtocol,
  A2uiProtocolFamily,
  A2uiRendererCapabilities,
  A2uiUnmappedEntry,
} from './coverage.js';
export {
  A2UI_BASIC_CATALOG_IDS,
  A2UI_CLIENT_FUNCTION_ALLOWLIST,
  A2UI_COMMON_PROPERTIES,
  A2UI_COVERAGE,
  A2UI_EVALUATED_FUNCTIONS,
  A2UI_PROTOCOLS,
  A2UI_RENDERER_CAPABILITIES,
  A2UI_SPEC_COMMIT,
  A2UI_SPEC_VERSION,
  A2UI_V1_BASIC_CATALOG_IDS,
  A2UI_V1_COMMON_PROPERTIES,
  A2UI_V1_COVERAGE,
  A2UI_V1_EMITTED_VERSION,
  A2UI_V1_EVALUATED_FUNCTIONS,
  A2UI_V1_RESERVED_TYPE,
  A2UI_V1_SPEC_COMMIT,
  A2UI_V1_SPEC_VERSION,
  EMITTED_A2UI_VERSION,
  FALLBACK_CATALOG_TAG,
  FALLBACK_LABEL,
  FALLBACK_TONE,
  PREFERRED_A2UI_VERSION,
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
  A2uiRendererDataModel,
  A2uiServerMessage,
  A2uiUpdateComponents,
  A2uiUpdateDataModel,
  A2uiV1ActionMessage,
  A2uiV09ActionMessage,
  A2uiVersion,
} from './protocol.js';
export type {
  A2uiRendererFunctionResponse,
  A2uiV1CallRendererFunction,
  A2uiV1Component,
  A2uiV1CreateSurface,
  A2uiV1DataBinding,
  A2uiV1DeleteSurface,
  A2uiV1FunctionCall,
  A2uiV1ServerMessage,
  A2uiV1UpdateComponents,
  A2uiV1UpdateDataModel,
  A2uiV1Version,
} from './protocol-v1.js';
