/**
 * The A2UI adapter (spec 029): the disposable boundary where untrusted A2UI
 * protocol messages become neutral catalog specs and reach the DOM through the
 * guarded renderer ALONE (constitution Art. VIII). It owns no rendering path —
 * every surface mutation is a call to the injected guarded renderer (default
 * `renderUiSpec`), which is why S12/SC-006 can prove the guarantee by
 * substituting an instrumented double. Protocol churn is absorbed here; the
 * catalog and elements never change for A2UI's sake.
 */
import type { ActionEvent, RenderBudgets, RenderOptions, RenderResult } from '@kimen/catalog';
import { renderUiSpec } from '@kimen/catalog';

import { SUPPORTED_A2UI_VERSIONS } from './coverage.js';
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
  /** Applies one A2UI message: translate, then render through the guardrail. */
  apply(message: A2uiMessage): A2uiApplyResult;
}

interface SurfaceState {
  rootId: string | null;
  readonly components: Map<string, A2uiComponentInstance>;
  dataModel: Record<string, unknown>;
  /** Frozen on first successful render; a later new action can never join it (S8). */
  declaredActions: readonly string[] | null;
  /** Neutral node path → A2UI id, from the last successful render (action round-trip). */
  pathToComponentId: ReadonlyMap<string, string>;
}

const rejection = (diagnostic: A2uiDiagnostic): A2uiApplyResult => ({
  degradations: [],
  diagnostics: [diagnostic],
  ok: false,
});

function setModelPath(
  model: Record<string, unknown>,
  path: string | undefined,
  contents: unknown,
): Record<string, unknown> {
  const segments = (path ?? '').split('/').filter((segment) => segment !== '');
  const leaf = segments.pop();
  if (leaf === undefined) {
    // A pathless update replaces the whole model when it carries an object.
    return contents !== null && typeof contents === 'object' && !Array.isArray(contents)
      ? (contents as Record<string, unknown>)
      : model;
  }
  let cursor = model;
  for (const segment of segments) {
    const next = cursor[segment];
    if (next === null || typeof next !== 'object' || Array.isArray(next)) {
      const created: Record<string, unknown> = {};
      cursor[segment] = created;
      cursor = created;
    } else {
      cursor = next as Record<string, unknown>;
    }
  }
  cursor[leaf] = contents;
  return model;
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

  const renderSurface = (surfaceId: string, state: SurfaceState): A2uiApplyResult => {
    if (state.rootId === null) {
      return rejection({
        message: `surface "${surfaceId}" has no root component to render`,
        path: 'surface',
        rule: 'unknown-surface',
        value: surfaceId,
      });
    }
    const translation = translateSurface({
      components: state.components,
      dataModel: state.dataModel,
      declaredActions: state.declaredActions,
      rootId: state.rootId,
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
        userAction: {
          context: event.data,
          name: event.action,
          sourceComponentId,
          surfaceId,
        },
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
      // leaves the previous surface intact and the declared action set frozen.
      return { degradations: [], diagnostics: result.diagnostics, ok: false };
    }

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
    const version = message.protocolVersion ?? options.protocolVersion;
    if (!SUPPORTED_A2UI_VERSIONS.includes(version)) {
      return rejection({
        message: `A2UI protocol version "${version}" is outside the supported set (${SUPPORTED_A2UI_VERSIONS.join(', ')})`,
        path: 'message.protocolVersion',
        rule: 'unsupported-version',
        value: version,
      });
    }

    if ('beginRendering' in message) {
      const { surfaceId, root } = message.beginRendering;
      const state = ensureSurface(surfaceId);
      state.rootId = root;
      return { degradations: [], diagnostics: [], ok: true };
    }

    if ('surfaceUpdate' in message) {
      const { surfaceId, root, components } = message.surfaceUpdate;
      const state = ensureSurface(surfaceId);
      if (root !== undefined) {
        state.rootId = root;
      }
      for (const instance of components) {
        state.components.set(instance.id, instance);
      }
      return renderSurface(surfaceId, state);
    }

    if ('dataModelUpdate' in message) {
      const { surfaceId, path, contents } = message.dataModelUpdate;
      const state = surfaces.get(surfaceId);
      if (state === undefined) {
        return rejection({
          message: `data-model update references unknown surface "${surfaceId}"`,
          path: 'dataModelUpdate.surfaceId',
          rule: 'unknown-surface',
          value: surfaceId,
        });
      }
      state.dataModel = setModelPath(state.dataModel, path, contents);
      return renderSurface(surfaceId, state);
    }

    if ('deleteSurface' in message) {
      // Drop adapter state; the host owns teardown of its surface element
      // (the adapter never mutates the DOM outside the guarded renderer).
      surfaces.delete(message.deleteSurface.surfaceId);
      return { degradations: [], diagnostics: [], ok: true };
    }

    return rejection({
      message: 'unrecognized A2UI message shape',
      path: 'message',
      rule: 'malformed-message',
    });
  };

  return { apply };
}
