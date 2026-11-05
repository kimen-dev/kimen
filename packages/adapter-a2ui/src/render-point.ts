/**
 * Isolated render point (spec 029 FR-001): the ONE place where the adapter
 * hands a translated surface to the guarded renderer. Today that is a full
 * re-render of the neutral spec into the host element on every accepted
 * update (`renderUiSpec` replaces the element's children). A future
 * incremental "live surface" renderer keyed by component id replaces this
 * module alone; the protocol layer (`adapter.ts`) and the translation
 * (`translate.ts`) never call a renderer directly.
 */
import type {
  ActionEvent,
  RenderBudgets,
  RenderOptions,
  RenderResult,
  UiSpec,
} from '@kimen/catalog';

/** The guarded-renderer contract the adapter depends on (injection seam, S12). */
export type GuardedRender = (input: unknown, options: RenderOptions) => RenderResult;

export interface RenderRequest {
  readonly element: Element;
  readonly spec: UiSpec;
  readonly onAction: (event: ActionEvent) => void;
  readonly budgets?: Partial<RenderBudgets> | undefined;
  readonly catalogSchemaVersion?: string | undefined;
}

/** Renders one surface revision through the guarded renderer, atomically and fail-closed. */
export function renderSurface(render: GuardedRender, request: RenderRequest): RenderResult {
  const options: RenderOptions = {
    onAction: request.onAction,
    surface: request.element,
    ...(request.budgets !== undefined ? { budgets: request.budgets } : {}),
    ...(request.catalogSchemaVersion !== undefined
      ? { catalogSchemaVersion: request.catalogSchemaVersion }
      : {}),
  };
  return render(request.spec, options);
}
