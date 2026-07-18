/**
 * A2UI protocol vocabulary (constitution Art. VIII: protocol types live ONLY
 * inside this disposable adapter and never leak into @kimen/elements or
 * @kimen/catalog — enforced mechanically by the `scope:adapter` module
 * boundary). Faithful to A2UI's declarative design: a surface is a flat
 * adjacency list of components addressed by string `id`, each wrapped under a
 * single component-type key; values that vary bind to a separate data model;
 * surfaces revise incrementally; and user activation returns to the agent as
 * a `userAction`. An A2UI message is data — it never carries executable code.
 *
 * Only the subset this adapter maps is modelled here; the exact supported
 * protocol version is pinned in `COMPAT.md` and `SUPPORTED_A2UI_VERSIONS`.
 */

/**
 * A value that is either a literal or a reference into the surface's data
 * model (A2UI `BoundValue`). `path` is a JSON-pointer-style path (`/a/b`);
 * `literalString` is an inline constant. Both may be present (the literal
 * seeds the model). A property whose value is neither a scalar nor a
 * `BoundValue` is rejected as malformed — never coerced.
 */
export interface A2uiBoundValue {
  readonly literalString?: string;
  readonly path?: string;
}

/** A component's declarative action (A2UI): a named callback, no code. */
export interface A2uiAction {
  readonly name: string;
}

/**
 * Child references of a container component. `explicitList` is the static
 * adjacency list this adapter maps; A2UI's dynamic `template` list is a
 * declared v1 gap (see `COMPAT.md`) and is rejected as unsupported rather
 * than silently dropped.
 */
export interface A2uiChildren {
  readonly explicitList?: readonly string[];
  readonly template?: unknown;
}

/**
 * The body of one component: its `children`, its optional `action`, and any
 * number of type-specific properties (scalars or `BoundValue`s). The index
 * signature is what lets an agent-authored property of any name flow to the
 * catalog boundary, where the guarded renderer rejects the ones the catalog
 * does not declare — the adapter invents no allowlist of its own.
 */
export interface A2uiComponentBody {
  readonly children?: A2uiChildren;
  readonly action?: A2uiAction;
  readonly [property: string]: unknown;
}

/**
 * One component instance in the flat adjacency list: a unique `id` and a
 * `component` wrapper carrying exactly one key — the A2UI component type — to
 * its body.
 */
export interface A2uiComponentInstance {
  readonly id: string;
  readonly component: Readonly<Record<string, A2uiComponentBody>>;
}

/** Signals a surface is ready to render, naming its root component. */
export interface A2uiBeginRendering {
  readonly beginRendering: {
    readonly surfaceId: string;
    readonly root: string;
    readonly catalogId?: string;
  };
  readonly protocolVersion?: string;
}

/** Adds or replaces components in a surface's map, optionally (re)naming root. */
export interface A2uiSurfaceUpdate {
  readonly surfaceUpdate: {
    readonly surfaceId: string;
    readonly root?: string;
    readonly components: readonly A2uiComponentInstance[];
  };
  readonly protocolVersion?: string;
}

/** Revises the surface's data model at an optional path. */
export interface A2uiDataModelUpdate {
  readonly dataModelUpdate: {
    readonly surfaceId: string;
    readonly path?: string;
    readonly contents: unknown;
  };
  readonly protocolVersion?: string;
}

/** Removes a surface; the host owns teardown of its element (see README). */
export interface A2uiDeleteSurface {
  readonly deleteSurface: {
    readonly surfaceId: string;
  };
  readonly protocolVersion?: string;
}

/** A server-to-client A2UI message the adapter consumes (transport is caller-owned). */
export type A2uiMessage =
  | A2uiBeginRendering
  | A2uiSurfaceUpdate
  | A2uiDataModelUpdate
  | A2uiDeleteSurface;

/**
 * The client-to-server interaction event the adapter emits when a declared
 * action fires (A2UI `userAction`). `context` carries the activated
 * component's already-resolved values. Any transport timestamp is added by
 * the caller-supplied channel (transport is out of scope, spec Assumptions).
 */
export interface A2uiUserAction {
  readonly userAction: {
    readonly name: string;
    readonly surfaceId: string;
    readonly sourceComponentId: string;
    readonly context: Readonly<Record<string, boolean | number | string>>;
  };
}
