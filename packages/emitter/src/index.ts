/**
 * Kimen emitter kit (spec 033): model-agnostic guidance artifacts and
 * emission ingest helpers, derived deterministically from a catalog value
 * (`@kimen/catalog` — the built-in catalog or one from `createCatalog`).
 *
 * The kit is ADVISORY reliability tooling: a derived prompt, schema or
 * tool definition improves a model's first-try validity, but authorizes
 * nothing — `validateUiSpec` and the guarded renderer remain the only
 * enforcement points (budgets, URL allowlist, purity wall are boundary
 * concerns, FR-011). No DOM, no network, no model calls, no protocol
 * vocabulary.
 */
export { normalizeEmission, repairPrompt } from './emission.js';
export type { Derivation, EmitterIssue, EmitterIssueCode } from './issues.js';
export { catalogPrompt } from './prompt.js';
export { type DerivationOptions, type EmitterTarget, uiSpecJsonSchema } from './schema.js';
export { type UiSpecTool, uiSpecTool } from './tool.js';
