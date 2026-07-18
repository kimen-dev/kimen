/**
 * Pure translation of an A2UI surface into one neutral catalog spec
 * (spec 029 FR-001/FR-002/FR-005). No DOM, no rendering, no protocol I/O: it
 * turns the flat adjacency list + data model into a `UiSpec` tree the guarded
 * renderer (spec 028) validates and renders. Every guardrail invariant is
 * still enforced downstream by @kimen/catalog — this layer only maps, degrades
 * unmapped types to a fixed fallback, rejects forbidden types whole, and
 * records the A2UI id behind each neutral node so a dispatched action can
 * travel back as a `userAction`.
 */
import type { UiSpec, UiSpecNode } from '@kimen/catalog';

import { A2UI_COVERAGE, FALLBACK_CATALOG_TAG, FALLBACK_LABEL, FALLBACK_TONE } from './coverage.js';
import type { A2uiComponentInstance } from './protocol.js';

/** A machine-readable, inert rejection (spec 029 FR-003): named, never markup. */
export interface A2uiDiagnostic {
  readonly path: string;
  readonly rule: string;
  readonly message: string;
  readonly value?: string | undefined;
}

/** A reported per-node degradation (FR-002, S4): the gap, as data, to the agent. */
export interface A2uiDegradationReport {
  readonly surfaceId: string;
  readonly componentId: string;
  readonly componentType: string;
}

export interface TranslationResult {
  readonly ok: boolean;
  readonly diagnostics: readonly A2uiDiagnostic[];
  readonly degradations: readonly A2uiDegradationReport[];
  readonly spec?: UiSpec | undefined;
  /** The declared action set the neutral spec commits to (frozen or derived). */
  readonly actions: readonly string[];
  /** Neutral node path → originating A2UI component id (for the action round-trip). */
  readonly pathToComponentId: ReadonlyMap<string, string>;
}

export interface TranslateInput {
  readonly surfaceId: string;
  readonly rootId: string;
  readonly components: ReadonlyMap<string, A2uiComponentInstance>;
  readonly dataModel: unknown;
  /**
   * The surface's frozen declared action set, or `null` on the first render —
   * when null the declared set is DERIVED from the initial tree and frozen by
   * the caller, so no later update can smuggle a new action past it (S8).
   */
  readonly declaredActions: readonly string[] | null;
}

/**
 * The translation depth budget: the component graph is untrusted protocol
 * input, so a pathologically deep (or cyclic) surface must fail closed as a
 * structured rejection BEFORE the recursive walk overflows the JS stack — the
 * guarded renderer's own depth budget only runs once a finite tree exists.
 * 256 matches the catalog validation depth budget and is far beyond any real
 * UI composition.
 */
const MAX_TRANSLATION_DEPTH = 256;

interface WalkContext {
  readonly surfaceId: string;
  readonly components: ReadonlyMap<string, A2uiComponentInstance>;
  readonly dataModel: unknown;
  readonly degradations: A2uiDegradationReport[];
  readonly encounteredActions: Set<string>;
  readonly pathToComponentId: Map<string, string>;
  /** Ids currently on the recursion stack — a repeat is a cycle (fail closed). */
  readonly ancestors: Set<string>;
  abort: A2uiDiagnostic | null;
}

type ResolvedScalar = boolean | number | string;

/** Reads a scalar at a JSON-pointer-style path (`/a/b`), or undefined if absent. */
function readModelPath(model: unknown, path: string): ResolvedScalar | undefined {
  const segments = path.split('/').filter((segment) => segment !== '');
  let cursor: unknown = model;
  for (const segment of segments) {
    if (cursor === null || typeof cursor !== 'object' || Array.isArray(cursor)) {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  if (typeof cursor === 'string' || typeof cursor === 'number' || typeof cursor === 'boolean') {
    return cursor;
  }
  return undefined;
}

/** True for an A2UI `BoundValue` shape (a literal and/or a data-model path). */
function isBoundValue(value: object): boolean {
  return 'literalString' in value || 'path' in value;
}

type ResolveOutcome =
  | { readonly ok: true; readonly value: ResolvedScalar | undefined }
  | { readonly ok: false };

/**
 * Resolves an A2UI property value to a neutral scalar: a bare scalar passes
 * through; a `BoundValue` resolves against the data model (a present path
 * wins, else the literal seed, else the declared empty value); any other
 * object shape is malformed and fails closed — never coerced.
 */
function resolveValue(raw: unknown, model: unknown): ResolveOutcome {
  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
    return { ok: true, value: raw };
  }
  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw) && isBoundValue(raw)) {
    const bound = raw as { literalString?: unknown; path?: unknown };
    if (typeof bound.path === 'string') {
      const fromModel = readModelPath(model, bound.path);
      if (fromModel !== undefined) {
        return { ok: true, value: fromModel };
      }
    }
    if (typeof bound.literalString === 'string') {
      return { ok: true, value: bound.literalString };
    }
    return { ok: true, value: undefined };
  }
  return { ok: false };
}

function abortWith(context: WalkContext, diagnostic: A2uiDiagnostic): null {
  context.abort ??= diagnostic;
  return null;
}

/**
 * Resolves one component id into a neutral node, an inline text string, or
 * null when the walk aborts fail-closed. `path` mirrors the guarded renderer's
 * own path scheme so a dispatched action maps back to its A2UI component id.
 */
function resolveNode(
  id: string,
  path: string,
  depth: number,
  context: WalkContext,
): UiSpecNode | string | null {
  if (context.abort !== null) {
    return null;
  }
  if (depth > MAX_TRANSLATION_DEPTH) {
    return abortWith(context, {
      message: `surface nesting exceeds the ${String(MAX_TRANSLATION_DEPTH)}-level translation depth budget`,
      path,
      rule: 'depth-budget',
      value: String(depth),
    });
  }
  if (context.ancestors.has(id)) {
    return abortWith(context, {
      message: `component id "${id}" references itself through the component graph (cycle)`,
      path,
      rule: 'cycle',
      value: id,
    });
  }
  const instance = context.components.get(id);
  if (instance === undefined) {
    return abortWith(context, {
      message: `references component id "${id}" that no surface update created`,
      path,
      rule: 'unknown-node',
      value: id,
    });
  }
  const typeKeys = Object.keys(instance.component);
  const type = typeKeys[0];
  if (typeKeys.length !== 1 || type === undefined) {
    return abortWith(context, {
      message: `component "${id}" must wrap exactly one component type`,
      path,
      rule: 'malformed-message',
      value: id,
    });
  }
  const body = instance.component[type];
  if (body === undefined) {
    return abortWith(context, {
      message: `component "${id}" has no body for type "${type}"`,
      path,
      rule: 'malformed-message',
      value: type,
    });
  }

  const coverage = A2UI_COVERAGE[type];

  if (coverage?.kind === 'forbidden') {
    // The whole message is rejected (S7): the soft path never applies here.
    return abortWith(context, {
      message: `A2UI type "${type}" is forbidden for security (${coverage.reason})`,
      path,
      rule: 'forbidden-type',
      value: type,
    });
  }

  if (coverage?.kind === 'inline') {
    const raw = body[coverage.text.from];
    if (raw === undefined) {
      return '';
    }
    const resolved = resolveValue(raw, context.dataModel);
    if (!resolved.ok) {
      return abortWith(context, {
        message: `inline "${type}" text is not a scalar or bound value`,
        path,
        rule: 'malformed-message',
        value: type,
      });
    }
    return resolved.value === undefined ? '' : String(resolved.value);
  }

  if (coverage === undefined) {
    // Unmapped type: degrade per node to a fixed fallback carrying NO agent
    // content (S4/S11), and report the gap to the agent as data.
    context.degradations.push({
      componentId: id,
      componentType: type,
      surfaceId: context.surfaceId,
    });
    context.pathToComponentId.set(path, id);
    return {
      component: FALLBACK_CATALOG_TAG,
      props: { tone: FALLBACK_TONE },
      slots: { '': [FALLBACK_LABEL] },
    };
  }

  // Only a mapped node can recurse into children; guard the recursion against
  // cycles by tracking this id as an ancestor for the duration of its subtree.
  context.ancestors.add(id);
  const node = buildMappedNode(id, type, body, coverage, path, depth, context);
  context.ancestors.delete(id);
  return node;
}

function buildMappedNode(
  id: string,
  type: string,
  body: Record<string, unknown>,
  coverage: Extract<(typeof A2UI_COVERAGE)[string], { kind: 'mapped' }>,
  path: string,
  depth: number,
  context: WalkContext,
): UiSpecNode | null {
  const props: Record<string, ResolvedScalar> = {};
  const slotChildren: (UiSpecNode | string)[] = [];
  const textFrom = coverage.text?.from;

  if (coverage.text !== undefined && textFrom !== undefined && body[textFrom] !== undefined) {
    const resolved = resolveValue(body[textFrom], context.dataModel);
    if (!resolved.ok) {
      return abortWith(context, {
        message: `${type} text property "${textFrom}" is not a scalar or bound value`,
        path,
        rule: 'malformed-message',
        value: textFrom,
      });
    }
    if (resolved.value !== undefined) {
      const text = String(resolved.value);
      if (coverage.text.asProp !== undefined) {
        props[coverage.text.asProp] = text;
      } else {
        slotChildren.push(text);
      }
    }
  }

  for (const [propName, raw] of Object.entries(body)) {
    if (propName === 'children' || propName === 'action' || propName === textFrom) {
      continue;
    }
    const resolved = resolveValue(raw, context.dataModel);
    if (!resolved.ok) {
      return abortWith(context, {
        message: `${type} property "${propName}" is not a scalar or bound value`,
        path,
        rule: 'malformed-message',
        value: propName,
      });
    }
    if (resolved.value !== undefined) {
      // Forward under the catalog name (or the aliased one); the guarded
      // renderer rejects any name the catalog does not declare (S9).
      props[coverage.propAliases?.[propName] ?? propName] = resolved.value;
    }
  }

  let action: string | undefined;
  const rawAction = body['action'];
  if (rawAction !== undefined) {
    if (
      rawAction === null ||
      typeof rawAction !== 'object' ||
      typeof (rawAction as { name?: unknown }).name !== 'string' ||
      (rawAction as { name: string }).name === ''
    ) {
      return abortWith(context, {
        message: `${type} action must declare a non-empty name`,
        path,
        rule: 'malformed-message',
        value: type,
      });
    }
    action = (rawAction as { name: string }).name;
    context.encounteredActions.add(action);
  }

  const rawChildren = body['children'];
  if (rawChildren !== undefined) {
    if (rawChildren === null || typeof rawChildren !== 'object') {
      return abortWith(context, {
        message: `${type} children must be an explicit list`,
        path,
        rule: 'malformed-message',
        value: type,
      });
    }
    const children = rawChildren as { explicitList?: unknown; template?: unknown };
    if (children.template !== undefined) {
      return abortWith(context, {
        message: `A2UI dynamic "template" children are a declared v1 gap (see COMPAT.md)`,
        path,
        rule: 'unsupported-feature',
        value: 'template',
      });
    }
    if (children.explicitList !== undefined) {
      if (!Array.isArray(children.explicitList)) {
        return abortWith(context, {
          message: `${type} explicitList must be an array of component ids`,
          path,
          rule: 'malformed-message',
          value: type,
        });
      }
      children.explicitList.forEach((childId, index) => {
        if (context.abort !== null || typeof childId !== 'string') {
          if (typeof childId !== 'string') {
            abortWith(context, {
              message: `${type} child reference at index ${String(index)} is not an id`,
              path,
              rule: 'malformed-message',
              value: type,
            });
          }
          return;
        }
        const childPath = `${path}.slots.[${String(slotChildren.length)}]`;
        const child = resolveNode(childId, childPath, depth + 1, context);
        if (child !== null) {
          slotChildren.push(child);
        }
      });
      if (context.abort !== null) {
        return null;
      }
    }
  }

  context.pathToComponentId.set(path, id);

  return {
    component: coverage.catalog,
    ...(Object.keys(props).length > 0 ? { props } : {}),
    ...(action !== undefined ? { action } : {}),
    ...(slotChildren.length > 0 ? { slots: { '': slotChildren } } : {}),
  };
}

/**
 * Translates a whole surface into one neutral spec (or a fail-closed rejection).
 * The declared action set is the frozen `declaredActions` when present, or the
 * set derived from this initial tree when null (frozen thereafter by the
 * caller). A translation that aborts renders nothing (the caller never calls
 * the guarded renderer for it).
 */
export function translateSurface(input: TranslateInput): TranslationResult {
  const context: WalkContext = {
    abort: null,
    ancestors: new Set<string>(),
    components: input.components,
    dataModel: input.dataModel,
    degradations: [],
    encounteredActions: new Set<string>(),
    pathToComponentId: new Map<string, string>(),
    surfaceId: input.surfaceId,
  };

  const root = resolveNode(input.rootId, 'root', 1, context);

  if (context.abort !== null) {
    return {
      actions: [],
      degradations: [],
      diagnostics: [context.abort],
      ok: false,
      pathToComponentId: new Map(),
    };
  }
  if (root === null || typeof root === 'string') {
    return {
      actions: [],
      degradations: [],
      diagnostics: [
        {
          message: 'the surface root must resolve to a component, not inline text',
          path: 'root',
          rule: 'malformed-message',
          value: input.rootId,
        },
      ],
      ok: false,
      pathToComponentId: new Map(),
    };
  }

  const actions = input.declaredActions ?? [...context.encounteredActions];
  const spec: UiSpec = {
    version: 1,
    ...(actions.length > 0 ? { actions } : {}),
    root,
  };

  return {
    actions,
    degradations: context.degradations,
    diagnostics: [],
    ok: true,
    pathToComponentId: context.pathToComponentId,
    spec,
  };
}
