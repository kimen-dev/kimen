/**
 * A2UI 1.0 protocol vocabulary (spec 039; constitution Art. VIII: protocol
 * types live ONLY inside this disposable adapter).
 *
 * Source of truth: github.com/google/A2UI (served as a2ui-project/a2ui) at
 * commit 57f961f143da23f4212313e432a64b5843d978f9:
 *
 * - `specification/v1_0/json/agent_to_renderer.json` — six agent messages,
 *   each carrying `version: "1.0"` and exactly one of `createSurface`,
 *   `updateComponents`, `updateDataModel`, `deleteSurface`,
 *   `callRendererFunction`, `agentFunctionResponse`;
 * - `specification/v1_0/json/common_types.json` — `DynamicValue` (literal,
 *   `{ "@path" }`, `{ "@call" }` or a plain literal object), `ChildList`,
 *   `Action`, `FunctionResponse`;
 * - `specification/v1_0/json/renderer_to_agent.json` — `action`, `error`,
 *   `rendererFunctionResponse`;
 * - `catalogs/basic/v1/catalog.json` — the 1.0 basic catalog.
 *
 * Only the subset this adapter consumes or emits is modelled; the shared
 * client-to-server messages (`action`, `error`) are in `protocol.ts`.
 */

/** The envelope `version` of every 1.0 message (bare, no `v`). */
export type A2uiV1Version = '1.0';

/** A JSON-pointer data binding (`common_types.json#/$defs/DataBinding`). */
export interface A2uiV1DataBinding {
  readonly '@path': string;
}

/** A function invocation (`common_types.json#/$defs/FunctionCall`). */
export interface A2uiV1FunctionCall {
  readonly '@call': string;
  readonly args?: Readonly<Record<string, unknown>>;
  readonly catalogId?: string;
}

/** One component: `id`, `component` and the `@`-prefixed envelope keys beside its own properties. */
export interface A2uiV1Component {
  readonly id: string;
  readonly component: string;
  readonly '@catalogId'?: string;
  readonly [property: string]: unknown;
}

/** Creates a surface, optionally carrying its components and data model. */
export interface A2uiV1CreateSurface {
  readonly version: A2uiV1Version;
  readonly createSurface: {
    readonly surfaceId: string;
    readonly catalogId?: string;
    readonly sendDataModel?: boolean;
    readonly components?: readonly A2uiV1Component[];
    readonly dataModel?: Readonly<Record<string, unknown>>;
    readonly metadata?: { readonly extensions?: Readonly<Record<string, unknown>> };
  };
}

/** Upserts components by id; the component with id `root` is the tree root. */
export interface A2uiV1UpdateComponents {
  readonly version: A2uiV1Version;
  readonly updateComponents: {
    readonly surfaceId: string;
    readonly components: readonly A2uiV1Component[];
  };
}

/** Replaces the value at `path` (`/` or absent: the whole model); `null` removes it. */
export interface A2uiV1UpdateDataModel {
  readonly version: A2uiV1Version;
  readonly updateDataModel: {
    readonly surfaceId: string;
    readonly path?: string;
    readonly value: unknown;
  };
}

/** Deletes a surface; the host owns teardown of its element. */
export interface A2uiV1DeleteSurface {
  readonly version: A2uiV1Version;
  readonly deleteSurface: { readonly surfaceId: string };
}

/** An agent request to run a renderer function; the adapter refuses every one (S21). */
export interface A2uiV1CallRendererFunction {
  readonly version: A2uiV1Version;
  readonly callRendererFunction: {
    readonly surfaceId?: string;
    readonly functionCallId: string;
    readonly callFunction: A2uiV1FunctionCall & { readonly catalogId: string };
  };
}

/** An agent-to-renderer A2UI 1.0 message (transport is caller-owned). */
export type A2uiV1ServerMessage =
  | A2uiV1CreateSurface
  | A2uiV1UpdateComponents
  | A2uiV1UpdateDataModel
  | A2uiV1DeleteSurface
  | A2uiV1CallRendererFunction;

/**
 * The `rendererFunctionResponse` the adapter returns for a
 * `callRendererFunction`: always the refusal `INVALID_FUNCTION_CALL`, since no
 * basic-catalog function is agent-callable (`allowedCallers` defaults to
 * `rendererOnly`).
 */
export interface A2uiRendererFunctionResponse {
  readonly version: A2uiV1Version;
  readonly rendererFunctionResponse: {
    readonly functionCallId: string;
    readonly error: {
      readonly code: 'INVALID_FUNCTION_CALL';
      readonly message: string;
    };
  };
}
