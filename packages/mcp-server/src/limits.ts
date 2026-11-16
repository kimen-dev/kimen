/**
 * The server's own bounds (spec 038 D3). Spec budgets are NOT here: the
 * byte, depth and node budgets are the catalog's and the guarded renderer's
 * (`VALIDATION_MAX_BYTES`, `DEFAULT_RENDER_BUDGETS`), applied through
 * `preflightUiSpec` so they can never drift from what the surface enforces.
 */

/** Longest inbound stdio line accepted; a longer one is discarded unparsed (FR-011). */
export const MAX_MESSAGE_BYTES = 4 * 1024 * 1024;

/** Issues listed in one report; the total count always travels with them. */
export const MAX_REPORTED_ISSUES = 50;

/** Characters of an offending value echoed back; longer values are cut. */
export const MAX_VALUE_CHARS = 256;

/** Lines of the render outline; the rest is summarized. */
export const MAX_OUTLINE_LINES = 200;

/** Rendered surfaces whose declared actions a connection remembers (D6). */
export const REMEMBERED_SURFACES = 32;

/** Longest component tag `kimen_describe_component` accepts. */
export const MAX_TAG_CHARS = 128;
