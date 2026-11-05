/**
 * A2UI v0.9.1 protocol vocabulary (constitution Art. VIII: protocol types live
 * ONLY inside this disposable adapter and never leak into @kimen/elements or
 * @kimen/catalog — enforced mechanically by the `scope:adapter` module
 * boundary).
 *
 * Source of truth: the A2UI specification repository (github.com/google/A2UI,
 * also served as github.com/a2ui-project/a2ui), directory
 * `specification/v0_9_1/`, verified at commit
 * 85120b91e2fe94cb20c8ddef0b545d3da2ae161f:
 *
 * - `json/server_to_client.json` — the four server messages, each carrying a
 *   mandatory `version` (`"v0.9"` or `"v0.9.1"`: the v0.9.1 schema accepts
 *   both) and exactly one of `createSurface`, `updateComponents`,
 *   `updateDataModel`, `deleteSurface`;
 * - `json/common_types.json` — `DynamicValue` (literal, `{ path }` or
 *   `FunctionCall`), `ChildList`, `Action`;
 * - `json/client_to_server.json` — the `action` event and the `error` report;
 * - `catalogs/basic/catalog.json` — the basic catalog (component and function
 *   definitions).
 *
 * Only the subset this adapter consumes or emits is modelled. The exact
 * supported versions are pinned in `COMPAT.md` and `SUPPORTED_A2UI_VERSIONS`.
 */

/** The envelope `version` values the v0.9.1 schema accepts. */
export type A2uiVersion = 'v0.9' | 'v0.9.1';

/** A JSON-pointer data binding (`common_types.json#/$defs/DataBinding`). */
export interface A2uiDataBinding {
  readonly path: string;
}

/** A client-side function invocation (`common_types.json#/$defs/FunctionCall`). */
export interface A2uiFunctionCall {
  readonly call: string;
  readonly args?: Readonly<Record<string, unknown>>;
  readonly returnType?: string;
}

/**
 * A property value that is a literal, a data binding or a function call
 * (`DynamicValue` / `DynamicString` / `DynamicNumber` / `DynamicBoolean` /
 * `DynamicStringList`).
 */
export type A2uiDynamicValue =
  | string
  | number
  | boolean
  | readonly unknown[]
  | A2uiDataBinding
  | A2uiFunctionCall;

/**
 * A container's children (`common_types.json#/$defs/ChildList`): a static
 * array of component ids, or a template instantiated once per item of the
 * data-model list at `path`.
 */
export type A2uiChildList =
  | readonly string[]
  | { readonly componentId: string; readonly path: string };

/**
 * An interaction handler (`common_types.json#/$defs/Action`): a server event
 * with an optional context of dynamic values, or a local client function.
 */
export type A2uiAction =
  | {
      readonly event: {
        readonly name: string;
        readonly context?: Readonly<Record<string, A2uiDynamicValue>>;
      };
    }
  | { readonly functionCall: A2uiFunctionCall };

/**
 * One component in the flat component list: a unique `id`, the catalog
 * component name as the `component` discriminator, and the component's own
 * properties alongside it (`catalog.json#/$defs/anyComponent`).
 */
export interface A2uiComponent {
  readonly id: string;
  readonly component: string;
  readonly [property: string]: unknown;
}

/** Creates a surface bound to one catalog; components and data arrive later. */
export interface A2uiCreateSurface {
  readonly version: A2uiVersion;
  readonly createSurface: {
    readonly surfaceId: string;
    readonly catalogId: string;
    readonly theme?: Readonly<Record<string, unknown>>;
    readonly sendDataModel?: boolean;
  };
}

/** Upserts components by id; the component with id `root` is the tree root. */
export interface A2uiUpdateComponents {
  readonly version: A2uiVersion;
  readonly updateComponents: {
    readonly surfaceId: string;
    readonly components: readonly A2uiComponent[];
  };
}

/**
 * Replaces (or creates) the value at `path`; an absent `value` removes the
 * key; an absent `path` or `/` addresses the whole data model.
 */
export interface A2uiUpdateDataModel {
  readonly version: A2uiVersion;
  readonly updateDataModel: {
    readonly surfaceId: string;
    readonly path?: string;
    readonly value?: unknown;
  };
}

/** Deletes a surface; the host owns teardown of its element (see README). */
export interface A2uiDeleteSurface {
  readonly version: A2uiVersion;
  readonly deleteSurface: {
    readonly surfaceId: string;
  };
}

/** A server-to-client A2UI message the adapter consumes (transport is caller-owned). */
export type A2uiServerMessage =
  | A2uiCreateSurface
  | A2uiUpdateComponents
  | A2uiUpdateDataModel
  | A2uiDeleteSurface;

/** The `version` this adapter writes on every client-to-server message. */
export type A2uiEmittedVersion = 'v0.9.1';

/**
 * The client-to-server `action` event (`client_to_server.json`): emitted when
 * a component's declared `action.event` fires. `context` holds the event's
 * context with every data binding already resolved.
 */
export interface A2uiActionMessage {
  readonly version: A2uiEmittedVersion;
  readonly action: {
    readonly name: string;
    readonly surfaceId: string;
    readonly sourceComponentId: string;
    readonly timestamp: string;
    readonly context: Readonly<Record<string, unknown>>;
  };
}

/**
 * The client-to-server `error` report, validation variant
 * (`client_to_server.json`): lets the agent correct a message the adapter
 * rejected.
 */
export interface A2uiErrorMessage {
  readonly version: A2uiEmittedVersion;
  readonly error: {
    readonly code: 'VALIDATION_FAILED';
    readonly surfaceId: string;
    readonly path: string;
    readonly message: string;
  };
}

/**
 * The transport metadata a client attaches when a surface was created with
 * `sendDataModel: true` (`client_data_model.json`); the caller's transport
 * places it under the `a2uiClientDataModel` metadata key.
 */
export interface A2uiClientDataModel {
  readonly version: A2uiEmittedVersion;
  readonly surfaces: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
}
