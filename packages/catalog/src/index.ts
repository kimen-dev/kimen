/**
 * Kimen neutral runtime catalog (spec 027, Art. VIII): the machine-readable
 * schema of what agents may emit — every published custom element with typed
 * props, slots and usage guidance, generated from the committed Custom
 * Elements Manifest (Art. I) — plus the validation entry point that accepts
 * or rejects agent-emitted UI specs at the GenUI boundary.
 *
 * The surface is protocol-neutral by contract (FR-009): no A2UI, MCP Apps,
 * AG-UI or json-render vocabulary; protocol churn belongs to the disposable
 * adapters built on top (specs 029/030). The guarded renderer (spec 028)
 * renders untrusted specs into the DOM through this same catalog.
 */
import { catalogStructure } from './generated/catalog-structure.js';

export { catalogData } from './generated/catalog.js';
export {
  createLiveSurface,
  DEFAULT_LIVE_BATCH_BUDGETS,
  type LiveActionEvent,
  type LiveBatch,
  type LiveBatchBudgets,
  type LiveBatchResult,
  type LiveInsertOp,
  type LiveOp,
  type LiveRemoveOp,
  type LiveReplaceOp,
  type LiveResetOp,
  type LiveSetOp,
  type LiveSnapshot,
  type LiveSurface,
  type LiveSurfaceOptions,
  type LiveTextOp,
} from './live.js';
export { NATIVE_PRIMITIVE_TAGS } from './primitives.js';
export {
  type CatalogCreationOptions,
  type CatalogCreationResult,
  type CatalogDefinition,
  createCatalog,
  type RegistrationIssue,
  type RegistrationIssueCode,
} from './register.js';
export {
  type ActionEvent,
  createStreamingRenderer,
  DEFAULT_RENDER_BUDGETS,
  type PreflightOptions,
  preflightUiSpec,
  type RenderBudgets,
  type RenderDiagnostic,
  type RenderOptions,
  type RenderResult,
  renderUiSpec,
  selectSpecIcons,
  type StreamingRenderer,
} from './render.js';
export {
  type ActionBinding,
  type Catalog,
  type CatalogEntry,
  type CatalogPropConstraint,
  COLLECT_MAX_ENTRIES,
  NODE_ID_GRAMMAR,
  type UiSpec,
  type UiSpecNode,
  VALIDATION_MAX_BYTES,
  VALIDATION_MAX_DEPTH,
  type ValidationContext,
  type ValidationIssue,
  type ValidationReport,
  validateUiSpec,
} from './validate.js';

/**
 * The catalog document format's own version (FR-010, Art. IX), read from the
 * generated artifact so code and artifact can never disagree. The elements
 * version the catalog derives from travels in `catalogData.elementsVersion`.
 */
export const CATALOG_SCHEMA_VERSION: string = catalogStructure.catalogSchemaVersion;
