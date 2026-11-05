/**
 * The A2UI v0.9.1 adapter (spec 029): the disposable boundary where untrusted
 * A2UI messages become neutral catalog specs and reach the DOM through the
 * guarded renderer ALONE (constitution Art. VIII). It owns the protocol
 * state of each surface — catalog, component map, data model, frozen action
 * set — and hands every revision to the single render point
 * (`render-point.ts`), which is why S12/SC-006 can prove the guarantee by
 * substituting an instrumented renderer double.
 *
 * Messages are untrusted runtime data (transport is caller-owned): the
 * envelope is validated against the v0.9.1 shape before any field is read (a
 * malformed payload fails closed, never throws), a surface's state is
 * committed only after its render succeeds (a rejected message never poisons
 * prior state), forbidden types are rejected whole across every updated
 * component, and data-model paths can never address a prototype.
 */
import type { ActionEvent, RenderBudgets } from '@kimen/catalog';
import { renderUiSpec } from '@kimen/catalog';

import {
  A2UI_BASIC_CATALOG_IDS,
  EMITTED_A2UI_VERSION,
  forbiddenReason,
  SUPPORTED_A2UI_VERSIONS,
} from './coverage.js';
import { isPlainObject, parsePointer, REMOVE, writeAt } from './data-model.js';
import type {
  A2uiActionMessage,
  A2uiClientDataModel,
  A2uiComponent,
  A2uiEmittedVersion,
  A2uiErrorMessage,
} from './protocol.js';
import type { GuardedRender } from './render-point.js';
import { renderSurface } from './render-point.js';
import type { A2uiDegradationReport, A2uiDiagnostic, ActionBinding } from './translate.js';
import { translateSurface, undeclaredProperty } from './translate.js';
import { resolveDynamic } from './values.js';

export type { GuardedRender } from './render-point.js';
export type { A2uiDegradationReport, A2uiDiagnostic } from './translate.js';

/** Transport metadata accompanying an action when the surface asked for `sendDataModel`. */
export interface A2uiActionMetadata {
  readonly a2uiClientDataModel: A2uiClientDataModel;
}

export interface A2uiAdapterOptions {
  /**
   * The host-owned element a surface renders into: one element for every
   * surface, or a resolver called once per `createSurface` (return `null` to
   * refuse the surface).
   */
  readonly surface: Element | ((surfaceId: string) => Element | null);
  /**
   * Receives the A2UI `action` event each time a declared action fires, plus
   * the `a2uiClientDataModel` metadata when the surface was created with
   * `sendDataModel: true` (the caller's transport attaches it).
   */
  readonly onAction?: (event: A2uiActionMessage, metadata?: A2uiActionMetadata) => void;
  /** Receives an A2UI `error` (VALIDATION_FAILED) for each rejected message that names a known surface. */
  readonly onError?: (error: A2uiErrorMessage) => void;
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
   * Applies one server-to-client A2UI message (`A2uiServerMessage`; typed
   * `unknown` because it arrives untrusted from the transport): validate, update state, translate, render through the guardrail. */
  apply(message: unknown): A2uiApplyResult;
}

interface SurfaceState {
  readonly element: Element;
  readonly sendDataModel: boolean;
  components: ReadonlyMap<string, A2uiComponent>;
  dataModel: Record<string, unknown>;
  /** Frozen on the first successful render that binds an action (S8). */
  declaredActions: readonly string[] | null;
}

type Classified =
  | {
      readonly kind: 'createSurface';
      readonly surfaceId: string;
      readonly catalogId: string;
      readonly sendDataModel: boolean;
    }
  | {
      readonly kind: 'updateComponents';
      readonly surfaceId: string;
      readonly components: readonly A2uiComponent[];
    }
  | {
      readonly kind: 'updateDataModel';
      readonly surfaceId: string;
      readonly path: string;
      readonly value: unknown;
    }
  | { readonly kind: 'deleteSurface'; readonly surfaceId: string }
  | {
      readonly kind: 'error';
      readonly diagnostic: A2uiDiagnostic;
      readonly surfaceId?: string;
    };

const MESSAGE_KINDS = ['createSurface', 'updateComponents', 'updateDataModel', 'deleteSurface'];

const malformed = (path: string, message: string, surfaceId?: string): Classified => ({
  diagnostic: { message, path, rule: 'malformed-message' },
  kind: 'error',
  ...(surfaceId === undefined ? {} : { surfaceId }),
});

const onlyKeys = (
  record: Record<string, unknown>,
  allowed: readonly string[],
): string | undefined => Object.keys(record).find((key) => !allowed.includes(key));

/**
 * Validates the untrusted envelope against the v0.9.1 shapes
 * (`server_to_client.json`: a mandatory supported `version` plus exactly one
 * message key, `additionalProperties: false` at both levels) and narrows it.
 */
function classify(record: Record<string, unknown>): Classified {
  const version = record['version'];
  if (typeof version !== 'string') {
    return malformed('/version', 'an A2UI message needs a string "version"');
  }
  if (!SUPPORTED_A2UI_VERSIONS.includes(version)) {
    return {
      diagnostic: {
        message: `A2UI protocol version "${version}" is outside the supported set (${SUPPORTED_A2UI_VERSIONS.join(', ')})`,
        path: '/version',
        rule: 'unsupported-version',
        value: version,
      },
      kind: 'error',
    };
  }
  const kinds = Object.keys(record).filter((key) => key !== 'version');
  const kind = kinds[0];
  if (kinds.length !== 1 || kind === undefined || !MESSAGE_KINDS.includes(kind)) {
    return malformed(
      '/',
      `an A2UI message carries "version" and exactly one of ${MESSAGE_KINDS.join(', ')}`,
    );
  }
  const payload = record[kind];
  if (!isPlainObject(payload) || typeof payload['surfaceId'] !== 'string') {
    return malformed(
      `/${kind}/surfaceId`,
      `${kind} needs an object payload with a string surfaceId`,
    );
  }
  const surfaceId = payload['surfaceId'];

  if (kind === 'createSurface') {
    const extra = onlyKeys(payload, ['surfaceId', 'catalogId', 'theme', 'sendDataModel']);
    if (extra !== undefined) {
      return malformed(
        `/createSurface/${extra}`,
        `createSurface does not declare "${extra}"`,
        surfaceId,
      );
    }
    const { catalogId, sendDataModel, theme } = payload;
    if (typeof catalogId !== 'string') {
      return malformed(
        '/createSurface/catalogId',
        'createSurface needs a string catalogId',
        surfaceId,
      );
    }
    if (sendDataModel !== undefined && typeof sendDataModel !== 'boolean') {
      return malformed(
        '/createSurface/sendDataModel',
        'sendDataModel must be a boolean',
        surfaceId,
      );
    }
    if (theme !== undefined && !isPlainObject(theme)) {
      return malformed('/createSurface/theme', 'theme must be an object', surfaceId);
    }
    return {
      catalogId,
      kind,
      sendDataModel: sendDataModel === true,
      surfaceId,
    };
  }

  if (kind === 'updateComponents') {
    const extra = onlyKeys(payload, ['surfaceId', 'components']);
    if (extra !== undefined) {
      return malformed(
        `/updateComponents/${extra}`,
        `updateComponents does not declare "${extra}"`,
        surfaceId,
      );
    }
    const components = payload['components'];
    if (!Array.isArray(components) || components.length === 0) {
      return malformed(
        '/updateComponents/components',
        'components must be a non-empty list',
        surfaceId,
      );
    }
    const instances: A2uiComponent[] = [];
    for (const [index, element] of components.entries()) {
      if (
        !isPlainObject(element) ||
        typeof element['id'] !== 'string' ||
        typeof element['component'] !== 'string'
      ) {
        return malformed(
          `/updateComponents/components/${String(index)}`,
          'each component needs a string id and a string component type',
          surfaceId,
        );
      }
      instances.push(element as A2uiComponent);
    }
    return { components: instances, kind, surfaceId };
  }

  if (kind === 'updateDataModel') {
    const extra = onlyKeys(payload, ['surfaceId', 'path', 'value']);
    if (extra !== undefined) {
      return malformed(
        `/updateDataModel/${extra}`,
        `updateDataModel does not declare "${extra}"`,
        surfaceId,
      );
    }
    const path = payload['path'] ?? '/';
    if (typeof path !== 'string') {
      return malformed('/updateDataModel/path', 'updateDataModel path must be a string', surfaceId);
    }
    if (path !== '' && path !== '/' && !path.startsWith('/')) {
      return malformed(
        '/updateDataModel/path',
        'updateDataModel path must be an absolute JSON Pointer',
        surfaceId,
      );
    }
    return {
      kind,
      path,
      surfaceId,
      value: Object.hasOwn(payload, 'value') ? payload['value'] : REMOVE,
    };
  }

  const extra = onlyKeys(payload, ['surfaceId']);
  if (extra !== undefined) {
    return malformed(
      `/deleteSurface/${extra}`,
      `deleteSurface does not declare "${extra}"`,
      surfaceId,
    );
  }
  return { kind: 'deleteSurface', surfaceId };
}

const OK: A2uiApplyResult = { degradations: [], diagnostics: [], ok: true };
const EMITTED: A2uiEmittedVersion = EMITTED_A2UI_VERSION;

export function createA2uiAdapter(options: A2uiAdapterOptions): A2uiAdapter {
  const render: GuardedRender = options.render ?? renderUiSpec;
  const surfaces = new Map<string, SurfaceState>();
  const now = options.now ?? (() => new Date());

  const reject = (diagnostic: A2uiDiagnostic, surfaceId?: string): A2uiApplyResult => {
    if (surfaceId !== undefined && surfaces.has(surfaceId) && options.onError !== undefined) {
      options.onError({
        error: {
          code: 'VALIDATION_FAILED',
          message: diagnostic.message,
          path: diagnostic.path,
          surfaceId,
        },
        version: EMITTED,
      });
    }
    return { degradations: [], diagnostics: [diagnostic], ok: false };
  };

  const dispatch = (surfaceId: string, state: SurfaceState, binding: ActionBinding): void => {
    if (options.onAction === undefined) {
      return;
    }
    // Resolve the event context against the data model as it is NOW, in the
    // collection scope of the component instance that fired.
    const context: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(binding.context)) {
      const resolved = resolveDynamic(raw, {
        locale: options.locale,
        model: state.dataModel,
        scope: binding.scope,
      });
      if (resolved.ok && resolved.value !== undefined) {
        Object.defineProperty(context, key, {
          enumerable: true,
          value: resolved.value,
        });
      }
    }
    const event: A2uiActionMessage = {
      action: {
        context,
        name: binding.name,
        sourceComponentId: binding.componentId,
        surfaceId,
        timestamp: now().toISOString(),
      },
      version: EMITTED,
    };
    if (state.sendDataModel) {
      options.onAction(event, {
        a2uiClientDataModel: {
          surfaces: { [surfaceId]: state.dataModel },
          version: EMITTED,
        },
      });
    } else {
      options.onAction(event);
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
      locale: options.locale,
      surfaceId,
    });
    if (!translation.ok) {
      const [first] = translation.diagnostics;
      return first === undefined
        ? reject(
            {
              message: 'translation failed',
              path: '/',
              rule: 'malformed-message',
            },
            surfaceId,
          )
        : reject(first, surfaceId);
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
      const bindings = translation.bindings;
      const result = renderSurface(render, {
        budgets: options.budgets,
        catalogSchemaVersion: options.catalogSchemaVersion,
        element: state.element,
        onAction: (event: ActionEvent) => {
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
          first ?? {
            message: 'render rejected',
            path: '/',
            rule: 'render-rejected',
          },
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
    return {
      degradations: translation.degradations,
      diagnostics: [],
      ok: true,
    };
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
    const { surfaceId } = classified;
    const state = surfaces.get(surfaceId);

    if (classified.kind === 'createSurface') {
      if (state !== undefined) {
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
      if (!A2UI_BASIC_CATALOG_IDS.includes(classified.catalogId)) {
        return reject({
          message: `catalog "${classified.catalogId}" is not supported (${A2UI_BASIC_CATALOG_IDS.join(', ')})`,
          path: '/createSurface/catalogId',
          rule: 'unsupported-catalog',
          value: classified.catalogId,
        });
      }
      const element =
        typeof options.surface === 'function' ? options.surface(surfaceId) : options.surface;
      if (element === null) {
        return reject({
          message: `the host provides no element for surface "${surfaceId}"`,
          path: '/createSurface/surfaceId',
          rule: 'no-host-surface',
          value: surfaceId,
        });
      }
      surfaces.set(surfaceId, {
        components: new Map(),
        dataModel: {},
        declaredActions: null,
        element,
        sendDataModel: classified.sendDataModel,
      });
      return OK;
    }

    if (state === undefined) {
      return reject({
        message: `${classified.kind} references surface "${surfaceId}" that no createSurface created`,
        path: `/${classified.kind}/surfaceId`,
        rule: 'unknown-surface',
        value: surfaceId,
      });
    }

    if (classified.kind === 'deleteSurface') {
      // Drop adapter state; the host owns teardown of its surface element
      // (the adapter never mutates the DOM outside the guarded renderer).
      surfaces.delete(surfaceId);
      return OK;
    }

    if (classified.kind === 'updateComponents') {
      // Reject the WHOLE message if ANY updated component declares a forbidden
      // type — reachable from the root or not (FR-002/FR-004, S7).
      for (const [index, instance] of classified.components.entries()) {
        const reason = forbiddenReason(instance.component);
        if (reason !== null) {
          return reject(
            {
              message: `A2UI type "${instance.component}" is forbidden for security (${reason})`,
              path: `/updateComponents/components/${String(index)}/component`,
              rule: 'forbidden-type',
              value: instance.component,
            },
            surfaceId,
          );
        }
      }
      // Unknown properties are rejected at receipt too, so a component
      // buffered before its root exists cannot carry one (S9).
      for (const instance of classified.components) {
        const undeclared = undeclaredProperty(instance.id, instance);
        if (undeclared !== null) {
          return reject(undeclared, surfaceId);
        }
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
