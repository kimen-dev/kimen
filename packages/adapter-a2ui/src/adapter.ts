/**
 * The A2UI adapter (spec 029): the disposable boundary where untrusted A2UI
 * protocol messages become neutral catalog specs and reach the DOM through the
 * guarded renderer ALONE (constitution Art. VIII). It owns no rendering path —
 * every surface mutation is a call to the injected guarded renderer (default
 * `renderUiSpec`), which is why S12/SC-006 can prove the guarantee by
 * substituting an instrumented double. Protocol churn is absorbed here; the
 * catalog and elements never change for A2UI's sake.
 *
 * The message is untrusted runtime data (transport is caller-owned): the
 * envelope is validated before any field is read (a malformed payload fails
 * closed, never throws), a surface's state is committed only after a render
 * succeeds (a rejected message never poisons prior state), forbidden types are
 * rejected whole across every updated component, and data-model paths can
 * neither pollute a prototype nor grow the model beyond the translation budget.
 */
import type { ActionEvent, RenderBudgets, RenderOptions, RenderResult } from '@kimen/catalog';
import { renderUiSpec } from '@kimen/catalog';

import { forbiddenReason, SUPPORTED_A2UI_VERSIONS } from './coverage.js';
import type { A2uiComponentInstance, A2uiMessage, A2uiUserAction } from './protocol.js';
import type { A2uiDegradationReport, A2uiDiagnostic } from './translate.js';
import { translateSurface } from './translate.js';

export type { A2uiDegradationReport, A2uiDiagnostic } from './translate.js';

/** The guarded-renderer contract the adapter depends on (injection seam, S12). */
export type GuardedRender = (input: unknown, options: RenderOptions) => RenderResult;

export interface A2uiAdapterOptions {
  /** The host-owned surface element every render targets. */
  readonly surface: Element;
  /** The negotiated A2UI protocol version for this session (a message may override it). */
  readonly protocolVersion: string;
  /** Receives an A2UI `userAction` each time a declared action fires. */
  readonly onUserAction?: (event: A2uiUserAction) => void;
  /** Receives a report for each unmapped node that degraded to a fallback (S4). */
  readonly onDegradation?: (report: A2uiDegradationReport) => void;
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
  /** Applies one A2UI message: validate the envelope, translate, then render through the guardrail. */
  apply(message: A2uiMessage): A2uiApplyResult;
}

interface SurfaceState {
  rootId: string | null;
  components: Map<string, A2uiComponentInstance>;
  dataModel: Record<string, unknown>;
  /** Frozen on first successful render; a later new action can never join it (S8). */
  declaredActions: readonly string[] | null;
  /** Neutral node path → A2UI id, from the last successful render (action round-trip). */
  pathToComponentId: ReadonlyMap<string, string>;
}

/** The staged next state of a surface — committed only after a successful render. */
interface Candidate {
  readonly rootId: string | null;
  readonly components: Map<string, A2uiComponentInstance>;
  readonly dataModel: Record<string, unknown>;
}

// Prototype-polluting path segments never address the data model: a
// `dataModelUpdate` naming one of these is rejected before any assignment, so a
// message can never reach `Object.prototype` through the adapter (Art. VIII).
const FORBIDDEN_PATH_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const rejection = (diagnostic: A2uiDiagnostic): A2uiApplyResult => ({
  degradations: [],
  diagnostics: [diagnostic],
  ok: false,
});

/**
 * Sets `contents` at a pre-validated (forbidden-key-free) path, returning a NEW
 * model with only the touched spine copied — the input is never mutated, so the
 * caller holds the prior model until a render commits. Spread with a computed
 * key defines own properties only; no assignment ever runs the `__proto__`
 * setter.
 */
function setModelPath(
  model: Record<string, unknown>,
  segments: readonly string[],
  contents: unknown,
): Record<string, unknown> {
  const [head, ...rest] = segments;
  if (head === undefined) {
    // A pathless update replaces the whole model when it carries an object.
    return isObject(contents) ? contents : model;
  }
  const existing = model[head];
  const child = isObject(existing) ? existing : {};
  return { ...model, [head]: rest.length === 0 ? contents : setModelPath(child, rest, contents) };
}

type Classified =
  | { readonly kind: 'beginRendering'; readonly surfaceId: string; readonly root: string }
  | {
      readonly kind: 'surfaceUpdate';
      readonly surfaceId: string;
      readonly root: string | undefined;
      readonly components: readonly A2uiComponentInstance[];
    }
  | {
      readonly kind: 'dataModelUpdate';
      readonly surfaceId: string;
      readonly path: string | undefined;
      readonly contents: unknown;
    }
  | { readonly kind: 'deleteSurface'; readonly surfaceId: string }
  | { readonly kind: 'error'; readonly diagnostic: A2uiDiagnostic };

const malformed = (path: string, message: string): Classified => ({
  diagnostic: { message, path, rule: 'malformed-message' },
  kind: 'error',
});

/**
 * Validates the untrusted message envelope and narrows it to a typed variant,
 * returning a structured `malformed-message` rejection instead of throwing on
 * any bad shape (null payloads, non-array component lists, missing ids).
 */
function classify(record: Record<string, unknown>): Classified {
  if ('beginRendering' in record) {
    const payload = record['beginRendering'];
    if (!isObject(payload)) {
      return malformed('beginRendering', 'beginRendering payload must be an object');
    }
    const { surfaceId, root } = payload;
    if (typeof surfaceId !== 'string' || typeof root !== 'string') {
      return malformed('beginRendering', 'beginRendering needs a string surfaceId and root');
    }
    return { kind: 'beginRendering', root, surfaceId };
  }

  if ('surfaceUpdate' in record) {
    const payload = record['surfaceUpdate'];
    if (!isObject(payload)) {
      return malformed('surfaceUpdate', 'surfaceUpdate payload must be an object');
    }
    const { surfaceId, root, components } = payload;
    if (typeof surfaceId !== 'string') {
      return malformed('surfaceUpdate.surfaceId', 'surfaceUpdate needs a string surfaceId');
    }
    if (root !== undefined && typeof root !== 'string') {
      return malformed('surfaceUpdate.root', 'surfaceUpdate root must be a string when present');
    }
    if (!Array.isArray(components)) {
      return malformed('surfaceUpdate.components', 'surfaceUpdate components must be an array');
    }
    const instances: A2uiComponentInstance[] = [];
    for (const element of components) {
      if (
        !isObject(element) ||
        typeof element['id'] !== 'string' ||
        !isObject(element['component'])
      ) {
        return malformed(
          'surfaceUpdate.components',
          'each component needs a string id and a component object',
        );
      }
      instances.push(element as unknown as A2uiComponentInstance);
    }
    return {
      components: instances,
      kind: 'surfaceUpdate',
      root: typeof root === 'string' ? root : undefined,
      surfaceId,
    };
  }

  if ('dataModelUpdate' in record) {
    const payload = record['dataModelUpdate'];
    if (!isObject(payload)) {
      return malformed('dataModelUpdate', 'dataModelUpdate payload must be an object');
    }
    const { surfaceId, path } = payload;
    if (typeof surfaceId !== 'string') {
      return malformed('dataModelUpdate.surfaceId', 'dataModelUpdate needs a string surfaceId');
    }
    if (path !== undefined && typeof path !== 'string') {
      return malformed(
        'dataModelUpdate.path',
        'dataModelUpdate path must be a string when present',
      );
    }
    return {
      contents: payload['contents'],
      kind: 'dataModelUpdate',
      path: typeof path === 'string' ? path : undefined,
      surfaceId,
    };
  }

  if ('deleteSurface' in record) {
    const payload = record['deleteSurface'];
    if (!isObject(payload) || typeof payload['surfaceId'] !== 'string') {
      return malformed('deleteSurface', 'deleteSurface needs a string surfaceId');
    }
    return { kind: 'deleteSurface', surfaceId: payload['surfaceId'] };
  }

  return malformed('message', 'unrecognized A2UI message shape');
}

export function createA2uiAdapter(options: A2uiAdapterOptions): A2uiAdapter {
  const render: GuardedRender = options.render ?? renderUiSpec;
  const surfaces = new Map<string, SurfaceState>();

  const ensureSurface = (surfaceId: string): SurfaceState => {
    let state = surfaces.get(surfaceId);
    if (state === undefined) {
      state = {
        components: new Map(),
        dataModel: {},
        declaredActions: null,
        pathToComponentId: new Map(),
        rootId: null,
      };
      surfaces.set(surfaceId, state);
    }
    return state;
  };

  const commitAndRender = (
    surfaceId: string,
    state: SurfaceState,
    candidate: Candidate,
  ): A2uiApplyResult => {
    if (candidate.rootId === null) {
      return rejection({
        message: `surface "${surfaceId}" has no root component to render`,
        path: 'surface',
        rule: 'unknown-surface',
        value: surfaceId,
      });
    }
    const translation = translateSurface({
      components: candidate.components,
      dataModel: candidate.dataModel,
      declaredActions: state.declaredActions,
      rootId: candidate.rootId,
      surfaceId,
    });
    if (!translation.ok || translation.spec === undefined) {
      return { degradations: [], diagnostics: translation.diagnostics, ok: false };
    }

    const pathToComponentId = translation.pathToComponentId;
    const onAction = (event: ActionEvent): void => {
      const sourceComponentId = pathToComponentId.get(event.path);
      if (sourceComponentId === undefined || options.onUserAction === undefined) {
        return;
      }
      options.onUserAction({
        userAction: { context: event.data, name: event.action, sourceComponentId, surfaceId },
      });
    };

    const renderOptions: RenderOptions = {
      onAction,
      surface: options.surface,
      ...(options.budgets !== undefined ? { budgets: options.budgets } : {}),
      ...(options.catalogSchemaVersion !== undefined
        ? { catalogSchemaVersion: options.catalogSchemaVersion }
        : {}),
    };

    const result = render(translation.spec, renderOptions);
    if (!result.ok) {
      // The guarded renderer is atomic and fail-closed: a rejected re-render
      // leaves the previous surface intact — and, because state is committed
      // only below, the rejected message poisons neither components nor model.
      return { degradations: [], diagnostics: result.diagnostics, ok: false };
    }

    state.rootId = candidate.rootId;
    state.components = candidate.components;
    state.dataModel = candidate.dataModel;
    // Freeze the declared action set on first success; a later update can then
    // never smuggle a new action past it (S8).
    state.declaredActions ??= translation.actions;
    state.pathToComponentId = pathToComponentId;
    for (const report of translation.degradations) {
      options.onDegradation?.(report);
    }
    return { degradations: translation.degradations, diagnostics: [], ok: true };
  };

  const apply = (message: A2uiMessage): A2uiApplyResult => {
    const raw: unknown = message;
    if (!isObject(raw)) {
      return rejection({
        message: 'A2UI message must be an object',
        path: 'message',
        rule: 'malformed-message',
      });
    }

    const declaredVersion = raw['protocolVersion'];
    const version = typeof declaredVersion === 'string' ? declaredVersion : options.protocolVersion;
    if (!SUPPORTED_A2UI_VERSIONS.includes(version)) {
      return rejection({
        message: `A2UI protocol version "${version}" is outside the supported set (${SUPPORTED_A2UI_VERSIONS.join(', ')})`,
        path: 'message.protocolVersion',
        rule: 'unsupported-version',
        value: version,
      });
    }

    const classified = classify(raw);
    if (classified.kind === 'error') {
      return { degradations: [], diagnostics: [classified.diagnostic], ok: false };
    }

    if (classified.kind === 'beginRendering') {
      const state = ensureSurface(classified.surfaceId);
      state.rootId = classified.root;
      return { degradations: [], diagnostics: [], ok: true };
    }

    if (classified.kind === 'surfaceUpdate') {
      // Reject the WHOLE message if ANY updated component declares a forbidden
      // type — reachable from the current root or not (FR-002/FR-004, S7).
      for (const instance of classified.components) {
        for (const type of Object.keys(instance.component)) {
          const reason = forbiddenReason(type);
          if (reason !== null) {
            return rejection({
              message: `A2UI type "${type}" is forbidden for security (${reason})`,
              path: 'surfaceUpdate',
              rule: 'forbidden-type',
              value: type,
            });
          }
        }
      }
      const state = ensureSurface(classified.surfaceId);
      const components = new Map(state.components);
      for (const instance of classified.components) {
        components.set(instance.id, instance);
      }
      return commitAndRender(classified.surfaceId, state, {
        components,
        dataModel: state.dataModel,
        rootId: classified.root ?? state.rootId,
      });
    }

    if (classified.kind === 'dataModelUpdate') {
      const state = surfaces.get(classified.surfaceId);
      if (state === undefined) {
        return rejection({
          message: `data-model update references unknown surface "${classified.surfaceId}"`,
          path: 'dataModelUpdate.surfaceId',
          rule: 'unknown-surface',
          value: classified.surfaceId,
        });
      }
      const segments = (classified.path ?? '').split('/').filter((segment) => segment !== '');
      const polluting = segments.find((segment) => FORBIDDEN_PATH_KEYS.has(segment));
      if (polluting !== undefined) {
        return rejection({
          message: `data-model path segment "${polluting}" is forbidden (prototype pollution)`,
          path: 'dataModelUpdate.path',
          rule: 'forbidden-key',
          value: polluting,
        });
      }
      return commitAndRender(classified.surfaceId, state, {
        components: state.components,
        dataModel: setModelPath(state.dataModel, segments, classified.contents),
        rootId: state.rootId,
      });
    }

    // deleteSurface: drop adapter state; the host owns teardown of its surface
    // element (the adapter never mutates the DOM outside the guarded renderer).
    surfaces.delete(classified.surfaceId);
    return { degradations: [], diagnostics: [], ok: true };
  };

  return { apply };
}
