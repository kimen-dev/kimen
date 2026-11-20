/**
 * The A2UI adapter (specs 029 and 039): the disposable boundary where
 * untrusted A2UI 0.9.1 and 1.0 messages become neutral catalog specs and reach
 * the DOM through the guarded renderer ALONE (constitution Art. VIII). It owns
 * the protocol state of each surface — version family, catalog, component
 * map, data model, frozen action set — and hands every revision to the single
 * render point (`render-point.ts`), which is why S12/SC-006 can prove the
 * guarantee by substituting an instrumented renderer double.
 *
 * Messages are untrusted runtime data (transport is caller-owned): the
 * envelope is validated against the shapes of the version it declares before
 * any other field is read (`envelope.ts`; a malformed payload fails closed,
 * never throws), a surface only ever accepts messages of the version family
 * that created it, a surface's state is committed only after its render
 * succeeds (a rejected message never poisons prior state, and a rejected 1.0
 * creation creates nothing), forbidden types are rejected whole across every
 * updated component, data-model paths can never address a prototype, and no
 * agent request ever runs a renderer function.
 */
import type { ActionEvent, RenderBudgets } from '@kimen/catalog';
import { renderUiSpec } from '@kimen/catalog';

import { A2UI_V1_RESERVED_TYPE, forbiddenReason } from './coverage.js';
import { isPlainObject, parsePointer, writeAt } from './data-model.js';
import type { Dialect } from './dialect.js';
import { dialectOf } from './dialect.js';
import type { Classified } from './envelope.js';
import { classify } from './envelope.js';
import type {
  A2uiActionMessage,
  A2uiClientDataModel,
  A2uiComponent,
  A2uiErrorMessage,
  A2uiRendererDataModel,
} from './protocol.js';
import type { A2uiRendererFunctionResponse } from './protocol-v1.js';
import type { GuardedRender } from './render-point.js';
import { renderSurface } from './render-point.js';
import type {
  A2uiDegradationReport,
  A2uiDiagnostic,
  ActionBinding,
  WriteBackBinding,
} from './translate.js';
import { translateSurface, undeclaredProperty } from './translate.js';
import { resolveDynamic, toText } from './values.js';

export type { GuardedRender } from './render-point.js';
export type { A2uiDegradationReport, A2uiDiagnostic } from './translate.js';

/**
 * Transport metadata accompanying an action when the surface asked for
 * `sendDataModel`: `a2uiClientDataModel` on 0.9.1 surfaces,
 * `a2uiRendererDataModel` on 1.0 surfaces.
 */
export type A2uiActionMetadata =
  | { readonly a2uiClientDataModel: A2uiClientDataModel }
  | { readonly a2uiRendererDataModel: A2uiRendererDataModel };

export interface A2uiAdapterOptions {
  /**
   * The host-owned element a surface renders into: one element for every
   * surface, or a resolver called once per `createSurface` (return `null` to
   * refuse the surface).
   */
  readonly surface: Element | ((surfaceId: string) => Element | null);
  /**
   * Receives the A2UI `action` event each time a declared action fires, in
   * the version of its surface, plus the data-model metadata when the
   * surface was created with `sendDataModel: true` (the caller's transport
   * attaches it).
   */
  readonly onAction?: (event: A2uiActionMessage, metadata?: A2uiActionMetadata) => void;
  /**
   * Receives an A2UI `error` (VALIDATION_FAILED) for each rejected message
   * that names a known surface, in that surface's version.
   */
  readonly onError?: (error: A2uiErrorMessage) => void;
  /**
   * Receives the A2UI 1.0 `rendererFunctionResponse` refusing each
   * `callRendererFunction` (`INVALID_FUNCTION_CALL`, spec 039 S21): no
   * basic-catalog function may be called by the agent.
   */
  readonly onFunctionResponse?: (response: A2uiRendererFunctionResponse) => void;
  /** Receives a report for each component that degraded to the declared fallback (S4). */
  readonly onDegradation?: (report: A2uiDegradationReport) => void;
  /**
   * The declared action set (S8). When given, only these `action.event`
   * names ever dispatch. When absent, the first successful render that binds
   * at least one action freezes the set of a surface.
   */
  readonly actions?: readonly string[];
  /** Locale for `formatNumber`, `formatCurrency` and `pluralize`; defaults to the runtime's. */
  readonly locale?: string;
  /** Clock for the action `timestamp`; defaults to `new Date()`. */
  readonly now?: () => Date;
  readonly budgets?: Partial<RenderBudgets>;
  readonly catalogSchemaVersion?: string;
  /** Guarded renderer to use; defaults to `renderUiSpec`. The adapter mutates the DOM only through it. */
  readonly render?: GuardedRender;
}

export interface A2uiApplyResult {
  readonly ok: boolean;
  readonly diagnostics: readonly A2uiDiagnostic[];
  readonly degradations: readonly A2uiDegradationReport[];
}

export interface A2uiAdapter {
  /**
   * Applies one agent-to-renderer A2UI message (`A2uiServerMessage` or
   * `A2uiV1ServerMessage`; typed `unknown` because it arrives untrusted from
   * the transport): validate, update state, translate, render through the
   * guardrail.
   */
  apply(message: unknown): A2uiApplyResult;
}

interface SurfaceState {
  readonly element: Element;
  readonly sendDataModel: boolean;
  /** The version family the surface was created with; every later message must match it. */
  readonly dialect: Dialect;
  /** The surface's catalog (in 1.0, the optional default for components without `@catalogId`). */
  readonly catalogId: string | undefined;
  components: ReadonlyMap<string, A2uiComponent>;
  dataModel: Record<string, unknown>;
  /** Frozen on the first successful render that binds an action (S8). */
  declaredActions: readonly string[] | null;
}

const OK: A2uiApplyResult = { degradations: [], diagnostics: [], ok: true };

/**
 * The data-model value a bound input reports (spec 039 FR-010): a string for
 * a text field, a boolean for a checkbox, a finite number for a slider, and a
 * one-item list (empty when cleared) for a single-selection choice picker.
 */
function committedValue(
  kind: WriteBackBinding['kind'],
  data: Readonly<Record<string, unknown>>,
): unknown {
  const value = data['value'];
  switch (kind) {
    case 'boolean':
      return typeof data['checked'] === 'boolean' ? data['checked'] : undefined;
    case 'list':
      return typeof value === 'string' ? (value === '' ? [] : [value]) : undefined;
    case 'number': {
      const number =
        typeof value === 'number'
          ? value
          : typeof value === 'string' && value.trim() !== ''
            ? Number(value)
            : Number.NaN;
      return Number.isFinite(number) ? number : undefined;
    }
    case 'string':
      return typeof value === 'string' ? value : undefined;
  }
}

const failure = (diagnostic: A2uiDiagnostic): A2uiApplyResult => ({
  degradations: [],
  diagnostics: [diagnostic],
  ok: false,
});

/**
 * The receipt checks every incoming component passes before it joins a
 * surface, reachable from the root or not: a forbidden type rejects the whole
 * message (FR-002/FR-004, S7), the 1.0 reserved `Surface` type and any
 * catalog other than the 1.0 basic catalog reject it too (spec 039 S18, S19),
 * and an unknown property rejects it at receipt so a component buffered
 * before its root exists cannot carry one (S9).
 */
function receive(
  components: readonly A2uiComponent[],
  dialect: Dialect,
  catalogId: string | undefined,
  base: string,
): A2uiDiagnostic | null {
  for (const [index, instance] of components.entries()) {
    const reason = forbiddenReason(instance.component, dialect.protocol.coverage);
    if (reason !== null) {
      return {
        message: `A2UI type "${instance.component}" is forbidden for security (${reason})`,
        path: `${base}/${String(index)}/component`,
        rule: 'forbidden-type',
        value: instance.component,
      };
    }
  }
  if (dialect.reservedNamespace) {
    const supported = dialect.protocol.basicCatalogIds;
    for (const [index, instance] of components.entries()) {
      const at = `${base}/${String(index)}`;
      if (instance.component === A2UI_V1_RESERVED_TYPE) {
        return {
          message: `A2UI type "${instance.component}" is reserved for the implicit surface container`,
          path: `${at}/component`,
          rule: 'reserved-type',
          value: instance.component,
        };
      }
      const own = instance['@catalogId'];
      if (own !== undefined && typeof own !== 'string') {
        return {
          message: '@catalogId must be a string',
          path: `${at}/@catalogId`,
          rule: 'malformed-message',
        };
      }
      const resolved = own ?? catalogId;
      if (resolved === undefined) {
        return {
          message: `component "${instance.id}" names no catalog and the surface has no default catalogId`,
          path: `${at}/@catalogId`,
          rule: 'unresolved-catalog',
          value: instance.id,
        };
      }
      if (!supported.includes(resolved)) {
        return {
          message: `catalog "${resolved}" is not supported (${supported.join(', ')})`,
          path: `${at}/@catalogId`,
          rule: 'unsupported-catalog',
          value: resolved,
        };
      }
    }
  }
  for (const instance of components) {
    const undeclared = undeclaredProperty(instance.id, instance, dialect);
    if (undeclared !== null) {
      return undeclared;
    }
  }
  return null;
}

export function createA2uiAdapter(options: A2uiAdapterOptions): A2uiAdapter {
  const render: GuardedRender = options.render ?? renderUiSpec;
  const surfaces = new Map<string, SurfaceState>();
  const now = options.now ?? (() => new Date());

  const reject = (diagnostic: A2uiDiagnostic, surfaceId?: string): A2uiApplyResult => {
    const state = surfaceId === undefined ? undefined : surfaces.get(surfaceId);
    if (state !== undefined && surfaceId !== undefined && options.onError !== undefined) {
      options.onError({
        error: {
          code: 'VALIDATION_FAILED',
          message: diagnostic.message,
          path: diagnostic.path,
          surfaceId,
        },
        version: state.dialect.protocol.emittedVersion,
      });
    }
    return failure(diagnostic);
  };

  const dispatch = (surfaceId: string, state: SurfaceState, binding: ActionBinding): void => {
    if (options.onAction === undefined) {
      return;
    }
    // Resolve the event context against the data model as it is NOW, in the
    // collection scope of the component instance that fired.
    const values = {
      dialect: state.dialect,
      locale: options.locale,
      model: state.dataModel,
      scope: binding.scope,
    };
    const context: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(binding.context)) {
      const resolved = resolveDynamic(raw, values, { literal: true });
      if (resolved.ok && resolved.value !== undefined) {
        Object.defineProperty(context, key, {
          enumerable: true,
          value: resolved.value,
        });
      }
    }
    const surfacesData = { [surfaceId]: state.dataModel };
    const base = {
      context,
      name: binding.name,
      sourceComponentId: binding.componentId,
      surfaceId,
      timestamp: now().toISOString(),
    };
    if (state.dialect.protocol.family === '1.0') {
      const message =
        binding.userMessage === undefined ? undefined : resolveDynamic(binding.userMessage, values);
      const userMessage = message?.ok === true ? toText(message.value) : '';
      const event: A2uiActionMessage = {
        action: userMessage === '' ? base : { ...base, userMessage },
        version: '1.0',
      };
      if (state.sendDataModel) {
        options.onAction(event, {
          a2uiRendererDataModel: { surfaces: surfacesData, version: '1.0' },
        });
      } else {
        options.onAction(event);
      }
      return;
    }
    const event: A2uiActionMessage = { action: base, version: 'v0.9.1' };
    if (state.sendDataModel) {
      options.onAction(event, {
        a2uiClientDataModel: { surfaces: surfacesData, version: 'v0.9.1' },
      });
    } else {
      options.onAction(event);
    }
  };

  /**
   * Two-way binding (spec 039 A1): writes the value the person committed in
   * a bound input to its own path of the surface's data model, before any
   * action that follows resolves its context. Never re-renders (FR-011) and
   * never reaches the agent (FR-012); a value of the wrong shape writes
   * nothing.
   */
  const writeBack = (
    state: SurfaceState,
    write: WriteBackBinding,
    data: Readonly<Record<string, unknown>>,
  ): void => {
    const value = committedValue(write.kind, data);
    if (value === undefined) {
      return;
    }
    const written = writeAt(state.dataModel, write.segments, value);
    if (written.ok) {
      state.dataModel = written.model;
    }
  };

  /** Translates and renders a candidate state; commits it only after the render succeeds. */
  const commit = (
    surfaceId: string,
    state: SurfaceState,
    components: ReadonlyMap<string, A2uiComponent>,
    dataModel: Record<string, unknown>,
  ): A2uiApplyResult => {
    const declared = options.actions ?? state.declaredActions;
    const translation = translateSurface({
      components,
      dataModel,
      declaredActions: declared,
      dialect: state.dialect,
      locale: options.locale,
      surfaceId,
    });
    if (!translation.ok) {
      const [first] = translation.diagnostics;
      return reject(
        first ?? { message: 'translation failed', path: '/', rule: 'malformed-message' },
        surfaceId,
      );
    }
    if (declared !== null) {
      const undeclared = translation.actions.find((name) => !declared.includes(name));
      if (undeclared !== undefined) {
        return reject(
          {
            message: `action "${undeclared}" is outside the surface's declared action set`,
            path: '/updateComponents',
            rule: 'undeclared-action',
            value: undeclared,
          },
          surfaceId,
        );
      }
    }
    if (translation.spec !== undefined) {
      const { bindings, writes } = translation;
      const result = renderSurface(render, {
        budgets: options.budgets,
        catalogSchemaVersion: options.catalogSchemaVersion,
        element: state.element,
        onAction: (event: ActionEvent) => {
          const write = writes.get(event.path);
          if (write !== undefined) {
            writeBack(state, write, event.data);
            return;
          }
          const binding = bindings.get(event.path);
          if (binding !== undefined) {
            dispatch(surfaceId, state, binding);
          }
        },
        spec: translation.spec,
      });
      if (!result.ok) {
        // The guarded renderer is atomic and fail-closed: the previous surface
        // stays intact and, because state commits only below, so does the model.
        const [first] = result.diagnostics;
        return reject(
          first ?? { message: 'render rejected', path: '/', rule: 'render-rejected' },
          surfaceId,
        );
      }
      if (state.declaredActions === null && translation.actions.length > 0) {
        state.declaredActions = translation.actions;
      }
    }
    state.components = components;
    state.dataModel = dataModel;
    for (const report of translation.degradations) {
      options.onDegradation?.(report);
    }
    return { degradations: translation.degradations, diagnostics: [], ok: true };
  };

  /** Refuses an agent-initiated function call (spec 039 S21, FR-007). */
  const refuseFunctionCall = (functionCallId: string, name: string): A2uiApplyResult => {
    const message = `function "${name}" cannot be called by the agent: no function of the A2UI 1.0 basic catalog allows agent callers`;
    options.onFunctionResponse?.({
      rendererFunctionResponse: {
        error: { code: 'INVALID_FUNCTION_CALL', message },
        functionCallId,
      },
      version: '1.0',
    });
    return failure({
      message,
      path: '/callRendererFunction/callFunction',
      rule: 'invalid-function-call',
      value: name,
    });
  };

  const createSurface = (
    classified: Extract<Classified, { kind: 'createSurface' }>,
  ): A2uiApplyResult => {
    const { surfaceId } = classified;
    if (surfaces.has(surfaceId)) {
      return reject(
        {
          message: `surface "${surfaceId}" already exists; delete it before creating it again`,
          path: '/createSurface/surfaceId',
          rule: 'surface-exists',
          value: surfaceId,
        },
        surfaceId,
      );
    }
    const dialect = dialectOf(classified.protocol.family);
    const supported = dialect.protocol.basicCatalogIds;
    if (classified.catalogId !== undefined && !supported.includes(classified.catalogId)) {
      return failure({
        message: `catalog "${classified.catalogId}" is not supported for ${dialect.label} (${supported.join(', ')})`,
        path: '/createSurface/catalogId',
        rule: 'unsupported-catalog',
        value: classified.catalogId,
      });
    }
    // 1.0 inline content is checked before the host is asked for an element:
    // a rejected creation creates nothing (spec 039, atomic creation).
    const inline = classified.components ?? [];
    const received = receive(inline, dialect, classified.catalogId, '/createSurface/components');
    if (received !== null) {
      return failure(received);
    }
    let dataModel: Record<string, unknown> = {};
    if (classified.dataModel !== undefined) {
      const written = writeAt(dataModel, [], classified.dataModel);
      if (!written.ok) {
        return failure({
          message: `createSurface dataModel cannot apply: ${written.detail}`,
          path: '/createSurface/dataModel',
          rule: 'malformed-message',
        });
      }
      dataModel = written.model;
    }
    const element =
      typeof options.surface === 'function' ? options.surface(surfaceId) : options.surface;
    if (element === null) {
      return failure({
        message: `the host provides no element for surface "${surfaceId}"`,
        path: '/createSurface/surfaceId',
        rule: 'no-host-surface',
        value: surfaceId,
      });
    }
    const state: SurfaceState = {
      catalogId: classified.catalogId,
      components: new Map(),
      dataModel: {},
      declaredActions: null,
      dialect,
      element,
      sendDataModel: classified.sendDataModel,
    };
    if (classified.components === undefined && classified.dataModel === undefined) {
      surfaces.set(surfaceId, state);
      return OK;
    }
    const components = new Map(inline.map((instance) => [instance.id, instance] as const));
    const result = commit(surfaceId, state, components, dataModel);
    if (result.ok) {
      surfaces.set(surfaceId, state);
    }
    return result;
  };

  const apply = (message: unknown): A2uiApplyResult => {
    if (!isPlainObject(message)) {
      return reject({
        message: 'an A2UI message must be a JSON object',
        path: '/',
        rule: 'malformed-message',
      });
    }
    const classified = classify(message);
    if (classified.kind === 'error') {
      return reject(classified.diagnostic, classified.surfaceId);
    }
    if (classified.kind === 'callRendererFunction') {
      return refuseFunctionCall(classified.functionCallId, classified.name);
    }
    if (classified.kind === 'agentFunctionResponse') {
      return failure({
        message: 'the adapter never calls agent functions, so no agentFunctionResponse is expected',
        path: '/agentFunctionResponse',
        rule: 'unexpected-message',
      });
    }
    if (classified.kind === 'createSurface') {
      return createSurface(classified);
    }

    const { surfaceId } = classified;
    const state = surfaces.get(surfaceId);
    if (state === undefined) {
      return reject({
        message: `${classified.kind} references surface "${surfaceId}" that no createSurface created`,
        path: `/${classified.kind}/surfaceId`,
        rule: 'unknown-surface',
        value: surfaceId,
      });
    }
    if (state.dialect.protocol.family !== classified.protocol.family) {
      const spoken = state.dialect.protocol.specVersion;
      return reject(
        {
          message: `surface "${surfaceId}" speaks A2UI ${spoken}; a message tagged "${classified.version}" cannot address it`,
          path: '/version',
          rule: 'version-mismatch',
          value: spoken,
        },
        surfaceId,
      );
    }

    if (classified.kind === 'deleteSurface') {
      // Drop adapter state; the host owns teardown of its surface element
      // (the adapter never mutates the DOM outside the guarded renderer).
      surfaces.delete(surfaceId);
      return OK;
    }

    if (classified.kind === 'updateComponents') {
      const received = receive(
        classified.components,
        state.dialect,
        state.catalogId,
        '/updateComponents/components',
      );
      if (received !== null) {
        return reject(received, surfaceId);
      }
      const components = new Map(state.components);
      for (const instance of classified.components) {
        components.set(instance.id, instance);
      }
      return commit(surfaceId, state, components, state.dataModel);
    }

    const pointer = parsePointer(classified.path);
    if (!pointer.ok) {
      return reject(
        {
          message:
            pointer.reason === 'forbidden-key'
              ? `data-model path segment "${pointer.detail}" is forbidden (prototype pollution)`
              : 'updateDataModel path is not a valid JSON Pointer',
          path: '/updateDataModel/path',
          rule: pointer.reason === 'forbidden-key' ? 'forbidden-key' : 'malformed-message',
          value: pointer.detail,
        },
        surfaceId,
      );
    }
    const written = writeAt(state.dataModel, pointer.segments, classified.value);
    if (!written.ok) {
      return reject(
        {
          message: `updateDataModel cannot apply: ${written.detail}`,
          path: '/updateDataModel',
          rule: 'malformed-message',
        },
        surfaceId,
      );
    }
    return commit(surfaceId, state, state.components, written.model);
  };

  return { apply };
}
