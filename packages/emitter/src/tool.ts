/**
 * Provider-neutral tool derivation (spec 033, FR-004): the lowered schema
 * wrapped as a tool/function definition any provider surface accepts
 * without further transformation. The tool authorizes nothing — emissions
 * still cross `validateUiSpec` and the guarded renderer (FR-011).
 */
import type { Catalog } from '@kimen/catalog';

import type { Derivation } from './issues.js';
import { versionStamp } from './issues.js';
import type { DerivationOptions } from './schema.js';
import { uiSpecJsonSchema } from './schema.js';

/** A provider-neutral tool definition wrapping the lowered schema (S9). */
export interface UiSpecTool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
}

/**
 * Derives the tool definition for a catalog (S9): name `emit_ui`, a
 * model-facing description carrying the version stamp (S10), and exactly
 * the schema the same derivation options produce. Fail-closed on the same
 * classes as every derivation.
 */
export function uiSpecTool(
  catalog: Catalog,
  options: DerivationOptions = {},
): Derivation<UiSpecTool> {
  const schema = uiSpecJsonSchema(catalog, options);
  if (!schema.ok) {
    return schema;
  }
  return {
    artifact: {
      description: `Emit exactly one Kimen UI spec (${versionStamp(catalog)}): a JSON document composing only cataloged components with their declared props, slots and actions. The host validates and renders it through the Kimen guardrail; invalid specs are rejected with named issues.`,
      inputSchema: schema.artifact,
      name: 'emit_ui',
    },
    issues: [],
    ok: true,
  };
}
