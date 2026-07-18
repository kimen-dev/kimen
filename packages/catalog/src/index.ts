/**
 * Kimen neutral runtime catalog (spec 027, Art. VIII): the machine-readable
 * schema of what agents may emit — every published custom element with typed
 * props, slots and usage guidance, generated from the committed Custom
 * Elements Manifest (Art. I) — plus the validation entry point that accepts
 * or rejects agent-emitted UI specs at the GenUI boundary.
 *
 * The surface is protocol-neutral by contract (FR-009): no A2UI, MCP Apps,
 * AG-UI or json-render vocabulary; protocol churn belongs to the disposable
 * adapters built on top (specs 029/030).
 */
import { catalogData } from './generated/catalog.js';

export { catalogData } from './generated/catalog.js';
export {
  type CatalogEntry,
  type CatalogPropConstraint,
  type UiSpec,
  type UiSpecNode,
  VALIDATION_MAX_BYTES,
  VALIDATION_MAX_DEPTH,
  type ValidationIssue,
  type ValidationReport,
  validateUiSpec,
} from './validate.js';

/**
 * The catalog document format's own version (FR-010, Art. IX), read from the
 * generated artifact so code and artifact can never disagree. The elements
 * version the catalog derives from travels in `catalogData.elementsVersion`.
 */
export const CATALOG_SCHEMA_VERSION: string = catalogData.catalogSchemaVersion;
