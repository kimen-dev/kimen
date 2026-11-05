/**
 * Pure translation of an A2UI v0.9.1 surface into one neutral catalog spec
 * (spec 029 FR-001/FR-002/FR-005). No DOM, no rendering, no protocol I/O: it
 * walks the flat component list from the component with id `root`, resolves
 * every dynamic value against the adapter-held data model (bindings,
 * collection scopes of `ChildList` templates, pure functions), maps each
 * basic-catalog type to `ki-*` catalog nodes, degrades unmapped types to a
 * fixed fallback, rejects forbidden types and capability functions whole, and
 * records which A2UI component (and scope) stands behind each node that
 * carries an action so a dispatched action can travel back as an A2UI
 * `action` event. Every guardrail invariant is still enforced downstream by
 * the guarded renderer (@kimen/catalog).
 */
import type { UiSpec, UiSpecNode } from '@kimen/catalog';
import type { A2uiCoverageEntry } from './coverage.js';
import {
  A2UI_CLIENT_FUNCTION_ALLOWLIST,
  A2UI_COMMON_PROPERTIES,
  coverageOf,
  FALLBACK_CATALOG_TAG,
  FALLBACK_LABEL,
  FALLBACK_TONE,
  ROOT_CONTAINER_TAG,
} from './coverage.js';
import { isPlainObject, readAt, resolveScopedPointer } from './data-model.js';
import type { A2uiComponent } from './protocol.js';
import type { ValueContext, ValueOutcome } from './values.js';
import { resolveDynamic, toText } from './values.js';

/** A machine-readable, inert rejection (spec 029 FR-003): named, never markup. */
export interface A2uiDiagnostic {
  readonly path: string;
  readonly rule: string;
  readonly message: string;
  readonly value?: string | undefined;
}

/**
 * A reported per-node degradation (FR-002, S4): the gap, as data. `reason`
 * says why the declared fallback replaced the component; `detail` names the
 * unevaluated function or unsupported variant when there is one.
 */
export interface A2uiDegradationReport {
  readonly surfaceId: string;
  readonly componentId: string;
  readonly componentType: string;
  readonly reason: 'unmapped-type' | 'unsupported-function' | 'unsupported-variant';
  readonly detail?: string | undefined;
}

/** The A2UI side of one rendered action: who fired it and what context to resolve. */
export interface ActionBinding {
  readonly name: string;
  readonly componentId: string;
  readonly context: Readonly<Record<string, unknown>>;
  readonly scope: readonly string[];
}

export interface TranslationResult {
  readonly ok: boolean;
  readonly diagnostics: readonly A2uiDiagnostic[];
  readonly degradations: readonly A2uiDegradationReport[];
  readonly spec?: UiSpec | undefined;
  /** The action names this tree binds. */
  readonly actions: readonly string[];
  /** Neutral node path (the guarded renderer's scheme) → the A2UI action behind it. */
  readonly bindings: ReadonlyMap<string, ActionBinding>;
}

export interface TranslateInput {
  readonly surfaceId: string;
  readonly components: ReadonlyMap<string, A2uiComponent>;
  readonly dataModel: unknown;
  /** The declared action set, or `null` to declare exactly the actions this tree binds. */
  readonly declaredActions: readonly string[] | null;
  readonly locale: string | undefined;
}

/** Id of the tree root (`server_to_client.json`, `updateComponents`). */
const ROOT_ID = 'root';

/**
 * Translation budgets: the component graph is untrusted, so a pathologically
 * deep, cyclic or template-amplified surface fails closed BEFORE the walk
 * overflows the stack or allocates without bound; the guarded renderer's own
 * budgets only run once a finite tree exists.
 */
const MAX_TRANSLATION_DEPTH = 256;
const MAX_TRANSLATED_NODES = 4096;

type Piece = UiSpecNode | string;

interface WalkContext {
  readonly surfaceId: string;
  readonly components: ReadonlyMap<string, A2uiComponent>;
  readonly dataModel: unknown;
  readonly locale: string | undefined;
  readonly degradations: A2uiDegradationReport[];
  readonly encounteredActions: Set<string>;
  readonly actionNodes: WeakMap<UiSpecNode, ActionBinding>;
  /** Ids on the recursion stack — a repeat is a cycle (fail closed). */
  readonly ancestors: Set<string>;
  nodes: number;
  abort: A2uiDiagnostic | null;
}

/** Thrown inside a builder to degrade the current component to the fallback. */
class Degrade extends Error {
  constructor(
    readonly reason: A2uiDegradationReport['reason'],
    readonly detail: string,
  ) {
    super(reason);
  }
}

/** Thrown inside a builder to reject the whole message. */
class Abort extends Error {
  constructor(readonly diagnostic: A2uiDiagnostic) {
    super(diagnostic.rule);
  }
}

const where = (id: string, property?: string): string =>
  property === undefined ? `/components/${id}` : `/components/${id}/${property}`;

function node(
  component: string,
  props: Record<string, string | number | boolean>,
  slot: readonly Piece[],
): UiSpecNode {
  return {
    component,
    ...(Object.keys(props).length > 0 ? { props } : {}),
    ...(slot.length > 0 ? { slots: { '': [...slot] } } : {}),
  };
}

function fallbackNode(): UiSpecNode {
  return {
    component: FALLBACK_CATALOG_TAG,
    props: { tone: FALLBACK_TONE },
    slots: { '': [FALLBACK_LABEL] },
  };
}

/** Builder helpers bound to one component instance and its collection scope. */
class Instance {
  constructor(
    readonly id: string,
    readonly type: string,
    readonly body: A2uiComponent,
    readonly scope: readonly string[],
    readonly depth: number,
    readonly context: WalkContext,
  ) {}

  private get values(): ValueContext {
    return {
      locale: this.context.locale,
      model: this.context.dataModel,
      scope: this.scope,
    };
  }

  private settle(outcome: ValueOutcome, property: string): unknown {
    if (outcome.ok) {
      return outcome.value;
    }
    switch (outcome.reason) {
      case 'unsupported-function':
        throw new Degrade('unsupported-function', outcome.detail);
      case 'forbidden-function':
        throw new Abort({
          message: `client function "${outcome.detail}" reaches a browser capability and is not allowlisted`,
          path: where(this.id, property),
          rule: 'forbidden-function',
          value: outcome.detail,
        });
      case 'forbidden-key':
        throw new Abort({
          message: `data-model path segment "${outcome.detail}" is forbidden (prototype pollution)`,
          path: where(this.id, property),
          rule: 'forbidden-key',
          value: outcome.detail,
        });
      default:
        throw this.malformed(
          property,
          `${this.type} property "${property}" is malformed (${outcome.detail})`,
        );
    }
  }

  malformed(property: string | undefined, message: string): Abort {
    return new Abort({
      message,
      path: where(this.id, property),
      rule: 'malformed-message',
      value: property ?? this.type,
    });
  }

  /** The resolved value of a dynamic property (undefined when absent). */
  value(property: string): unknown {
    const raw = this.body[property];
    return raw === undefined ? undefined : this.settle(resolveDynamic(raw, this.values), property);
  }

  text(property: string): string {
    return toText(this.value(property));
  }

  /** A static enum-like string property (not dynamic in the basic catalog). */
  literal(property: string): string | undefined {
    const raw = this.body[property];
    if (raw === undefined) {
      return undefined;
    }
    if (typeof raw !== 'string') {
      throw this.malformed(property, `${this.type} property "${property}" must be a string`);
    }
    return raw;
  }

  /** Resolves a single child reference (`ComponentId`). */
  child(property: string): Piece[] {
    const raw = this.body[property];
    if (raw === undefined) {
      return [];
    }
    if (typeof raw !== 'string') {
      throw this.malformed(property, `${this.type} property "${property}" must be a component id`);
    }
    return this.resolve(raw, this.scope);
  }

  /** Resolves a `ChildList` into the pieces it contributes, flattened. */
  children(property: string): Piece[] {
    return this.childGroups(property).flat();
  }

  /**
   * Resolves a `ChildList` (static ids, or a template over a data-model list)
   * into one group of pieces per child entry.
   */
  childGroups(property: string): Piece[][] {
    const raw = this.body[property];
    if (raw === undefined) {
      return [];
    }
    if (Array.isArray(raw)) {
      const groups: Piece[][] = [];
      for (const childId of raw) {
        if (typeof childId !== 'string') {
          throw this.malformed(property, `${this.type} children must be component ids`);
        }
        groups.push(this.resolve(childId, this.scope));
      }
      return groups;
    }
    if (
      isPlainObject(raw) &&
      typeof raw['componentId'] === 'string' &&
      typeof raw['path'] === 'string' &&
      Object.keys(raw).length === 2
    ) {
      const pointer = resolveScopedPointer(raw['path'], this.scope);
      if (!pointer.ok) {
        this.settle({ detail: pointer.detail, ok: false, reason: pointer.reason }, property);
        return [];
      }
      const list = readAt(this.context.dataModel, pointer.segments);
      if (!Array.isArray(list)) {
        // Data not arrived yet (progressive rendering) or not a list: no children.
        return [];
      }
      const groups: Piece[][] = [];
      for (let index = 0; index < list.length; index += 1) {
        groups.push(this.resolve(raw['componentId'], [...pointer.segments, String(index)]));
      }
      return groups;
    }
    throw this.malformed(property, `${this.type} children must be a list of ids or a template`);
  }

  private resolve(childId: string, scope: readonly string[]): Piece[] {
    const pieces = resolveComponent(childId, scope, this.depth + 1, this.context);
    if (pieces === null) {
      throw new Abort(
        this.context.abort ?? {
          message: 'translation aborted',
          path: where(childId),
          rule: 'malformed-message',
        },
      );
    }
    return pieces;
  }

  /** Records a declared `Action.event`, or rejects a client function call. */
  action(target: UiSpecNode): UiSpecNode {
    const raw = this.body['action'];
    if (raw === undefined) {
      return target;
    }
    if (isPlainObject(raw) && Object.keys(raw).length === 1 && isPlainObject(raw['functionCall'])) {
      const call = raw['functionCall']['call'];
      const name = typeof call === 'string' ? call : '';
      if (!A2UI_CLIENT_FUNCTION_ALLOWLIST.includes(name)) {
        throw new Abort({
          message: `action function "${name}" is not in the client function allowlist (empty by default)`,
          path: where(this.id, 'action'),
          rule: 'forbidden-function',
          value: name,
        });
      }
    }
    const event = isPlainObject(raw) && Object.keys(raw).length === 1 ? raw['event'] : undefined;
    if (!isPlainObject(event) || typeof event['name'] !== 'string' || event['name'] === '') {
      throw this.malformed(
        'action',
        `${this.type} action must be { event: { name } } with a non-empty name`,
      );
    }
    const context = event['context'] ?? {};
    if (
      !isPlainObject(context) ||
      Object.keys(event).some((key) => key !== 'name' && key !== 'context')
    ) {
      throw this.malformed(
        'action',
        `${this.type} action event must carry only name and an object context`,
      );
    }
    const name = event['name'];
    this.context.encounteredActions.add(name);
    const withAction: UiSpecNode = { ...target, action: name };
    this.context.actionNodes.set(withAction, {
      componentId: this.id,
      context,
      name,
      scope: this.scope,
    });
    return withAction;
  }
}

type Builder = (instance: Instance) => Piece[];

const BUTTON_VARIANTS: Readonly<Record<string, string>> = {
  borderless: 'ghost',
  primary: 'primary',
};

/** Per-type builders for every `mapped`, `inline` and `layout` basic-catalog type. */
export const BUILDERS: Readonly<Record<string, Builder>> = {
  Button: (it) => {
    const variant = it.literal('variant');
    const mapped = variant === undefined ? undefined : BUTTON_VARIANTS[variant];
    return [
      it.action(
        node('ki-button', mapped === undefined ? {} : { variant: mapped }, it.child('child')),
      ),
    ];
  },
  Card: (it) => [node('ki-card', {}, it.child('child'))],
  CheckBox: (it) => {
    const label = it.text('label');
    return [
      node(
        'ki-checkbox',
        it.value('value') === true ? { checked: true } : {},
        label === '' ? [] : [label],
      ),
    ];
  },
  ChoicePicker: (it) => {
    if ((it.literal('variant') ?? 'mutuallyExclusive') !== 'mutuallyExclusive') {
      throw new Degrade('unsupported-variant', 'multipleSelection');
    }
    const options = it.body['options'];
    if (!Array.isArray(options)) {
      throw it.malformed('options', 'ChoicePicker options must be a list');
    }
    const selected = it.value('value');
    const first = Array.isArray(selected) ? toText(selected[0]) : toText(selected);
    const radios = options.map((option, index) => {
      if (!isPlainObject(option) || typeof option['value'] !== 'string') {
        throw it.malformed(
          `options/${String(index)}`,
          'each ChoicePicker option needs a string value',
        );
      }
      const label =
        option['label'] === undefined ? '' : toText(resolveOption(it, option['label'], index));
      return node('ki-radio', { value: option['value'] }, label === '' ? [] : [label]);
    });
    const label = it.text('label');
    return [
      node(
        'ki-radio-group',
        {
          ...(label === '' ? {} : { label }),
          ...(first === '' ? {} : { value: first }),
        },
        radios,
      ),
    ];
  },
  Column: (it) => it.children('children'),
  Divider: (it) => {
    const axis = it.literal('axis');
    return [
      node(
        'ki-divider',
        axis === 'vertical' || axis === 'horizontal' ? { orientation: axis } : {},
        [],
      ),
    ];
  },
  List: (it) => [
    node(
      'ki-list',
      {},
      it
        .childGroups('children')
        .filter((group) => group.length > 0)
        .map((group) => node('ki-list-item', {}, group)),
    ),
  ],
  Row: (it) => it.children('children'),
  Tabs: (it) => {
    const tabs = it.body['tabs'];
    if (!Array.isArray(tabs) || tabs.length === 0) {
      throw it.malformed('tabs', 'Tabs needs a non-empty tabs list');
    }
    const pieces: Piece[] = [];
    tabs.forEach((tab, index) => {
      if (
        !isPlainObject(tab) ||
        typeof tab['child'] !== 'string' ||
        Object.keys(tab).some((key) => key !== 'title' && key !== 'child')
      ) {
        throw it.malformed(`tabs/${String(index)}`, 'each tab needs a title and a child id');
      }
      const value = `tab-${String(index)}`;
      const title = toText(resolveOption(it, tab['title'], index));
      const scoped = new Instance(
        it.id,
        it.type,
        { child: tab['child'], component: it.type, id: it.id },
        it.scope,
        it.depth,
        it.context,
      );
      pieces.push(node('ki-tab', { value }, title === '' ? [] : [title]));
      pieces.push(node('ki-tab-panel', { value }, scoped.child('child')));
    });
    return [node('ki-tabs', {}, pieces)];
  },
  Text: (it) => {
    const text = it.text('text');
    return text === '' ? [] : [text];
  },
  TextField: (it) => {
    const label = it.text('label');
    const value = it.value('value');
    const props: Record<string, string> = {
      ...(label === '' ? {} : { label }),
      ...(value === undefined || toText(value) === '' ? {} : { value: toText(value) }),
    };
    const variant = it.literal('variant');
    if (variant === 'longText') {
      return [node('ki-textarea', props, [])];
    }
    return [node('ki-input', variant === 'obscured' ? { ...props, type: 'password' } : props, [])];
  },
};

/** Resolves a nested dynamic value (option label, tab title) of an instance. */
function resolveOption(it: Instance, raw: unknown, index: number): unknown {
  const holder = new Instance(
    it.id,
    it.type,
    { component: it.type, id: it.id, value: raw },
    it.scope,
    it.depth,
    it.context,
  );
  try {
    return holder.value('value');
  } catch (error) {
    if (error instanceof Abort) {
      throw new Abort({
        ...error.diagnostic,
        path: where(it.id, String(index)),
      });
    }
    throw error;
  }
}

/**
 * The property a renderable basic-catalog component carries without the
 * catalog declaring it (S9), as a diagnostic; null when every property is
 * declared or the type is unmapped (its fallback carries nothing).
 */
export function undeclaredProperty(id: string, body: A2uiComponent): A2uiDiagnostic | null {
  const entry = coverageOf(body.component);
  return entry === undefined ? null : checkProperties(id, body, entry);
}

function checkProperties(
  id: string,
  body: A2uiComponent,
  entry: A2uiCoverageEntry,
): A2uiDiagnostic | null {
  if (entry.kind === 'unmapped' || entry.kind === 'forbidden') {
    return null;
  }
  for (const property of Object.keys(body)) {
    if (!A2UI_COMMON_PROPERTIES.includes(property) && !entry.properties.includes(property)) {
      return {
        message: `${body.component} does not declare the property "${property}"`,
        path: where(id, property),
        rule: 'unknown-property',
        value: property,
      };
    }
  }
  return null;
}

/**
 * Resolves one component id (in a collection scope) into the pieces it
 * contributes to its parent slot, or null when the walk aborts fail-closed.
 */
function resolveComponent(
  id: string,
  scope: readonly string[],
  depth: number,
  context: WalkContext,
): Piece[] | null {
  if (context.abort !== null) {
    return null;
  }
  const fail = (diagnostic: A2uiDiagnostic): null => {
    context.abort ??= diagnostic;
    return null;
  };
  if (depth > MAX_TRANSLATION_DEPTH) {
    return fail({
      message: `surface nesting exceeds the ${String(MAX_TRANSLATION_DEPTH)}-level translation depth budget`,
      path: where(id),
      rule: 'depth-budget',
      value: String(depth),
    });
  }
  context.nodes += 1;
  if (context.nodes > MAX_TRANSLATED_NODES) {
    return fail({
      message: `surface expands beyond the ${String(MAX_TRANSLATED_NODES)}-component translation budget`,
      path: where(id),
      rule: 'node-budget',
      value: String(context.nodes),
    });
  }
  if (context.ancestors.has(id)) {
    return fail({
      message: `component id "${id}" references itself through the component graph (cycle)`,
      path: where(id),
      rule: 'cycle',
      value: id,
    });
  }
  const body = context.components.get(id);
  if (body === undefined) {
    // Spec: children may arrive in a later updateComponents (progressive
    // rendering). An id no message delivered yet contributes nothing.
    return [];
  }
  const type = body.component;
  const entry = coverageOf(type);
  if (entry?.kind === 'forbidden') {
    return fail({
      message: `A2UI type "${type}" is forbidden for security (${entry.reason})`,
      path: where(id, 'component'),
      rule: 'forbidden-type',
      value: type,
    });
  }
  const degrade = (reason: A2uiDegradationReport['reason'], detail?: string): Piece[] => {
    context.degradations.push({
      componentId: id,
      componentType: type,
      reason,
      surfaceId: context.surfaceId,
      ...(detail === undefined ? {} : { detail }),
    });
    return [fallbackNode()];
  };
  const builder = Object.hasOwn(BUILDERS, type) ? BUILDERS[type] : undefined;
  if (entry === undefined || entry.kind === 'unmapped' || builder === undefined) {
    // Unmapped type: degrade per node to a fixed fallback carrying NO agent
    // content (S4/S11), and report the gap as data.
    return degrade('unmapped-type');
  }
  const unknown = checkProperties(id, body, entry);
  if (unknown !== null) {
    return fail(unknown);
  }
  context.ancestors.add(id);
  try {
    return builder(new Instance(id, type, body, scope, depth, context));
  } catch (error) {
    if (error instanceof Degrade) {
      return degrade(error.reason, error.detail);
    }
    if (error instanceof Abort) {
      return fail(error.diagnostic);
    }
    throw error;
  } finally {
    context.ancestors.delete(id);
  }
}

/** Collects action bindings under the guarded renderer's node-path scheme. */
function collectBindings(
  target: UiSpecNode,
  path: string,
  actionNodes: WeakMap<UiSpecNode, ActionBinding>,
  into: Map<string, ActionBinding>,
): void {
  const binding = actionNodes.get(target);
  if (binding !== undefined) {
    into.set(path, binding);
  }
  for (const [slotName, children] of Object.entries(target.slots ?? {})) {
    children.forEach((child, index) => {
      if (typeof child !== 'string') {
        collectBindings(child, `${path}.slots.${slotName}[${String(index)}]`, actionNodes, into);
      }
    });
  }
}

const failed = (diagnostic: A2uiDiagnostic): TranslationResult => ({
  actions: [],
  bindings: new Map(),
  degradations: [],
  diagnostics: [diagnostic],
  ok: false,
});

/**
 * Translates a whole surface into one neutral spec (or a fail-closed
 * rejection). Returns `spec: undefined` with `ok: true` while the surface has
 * no `root` component yet (nothing to render).
 */
export function translateSurface(input: TranslateInput): TranslationResult {
  const context: WalkContext = {
    abort: null,
    actionNodes: new WeakMap(),
    ancestors: new Set<string>(),
    components: input.components,
    dataModel: input.dataModel,
    degradations: [],
    encounteredActions: new Set<string>(),
    locale: input.locale,
    nodes: 0,
    surfaceId: input.surfaceId,
  };
  if (!input.components.has(ROOT_ID)) {
    return {
      actions: [],
      bindings: new Map(),
      degradations: [],
      diagnostics: [],
      ok: true,
    };
  }
  const pieces = resolveComponent(ROOT_ID, [], 1, context);
  if (context.abort !== null || pieces === null) {
    return failed(
      context.abort ?? {
        message: 'translation aborted',
        path: where(ROOT_ID),
        rule: 'malformed-message',
      },
    );
  }
  const only = pieces.length === 1 ? pieces[0] : undefined;
  const root: UiSpecNode =
    only !== undefined && typeof only !== 'string' ? only : node(ROOT_CONTAINER_TAG, {}, pieces);
  const bindings = new Map<string, ActionBinding>();
  collectBindings(root, 'root', context.actionNodes, bindings);
  const encountered = [...context.encounteredActions];
  const actions = input.declaredActions ?? encountered;
  const spec: UiSpec = {
    version: 1,
    ...(actions.length > 0 ? { actions: [...actions] } : {}),
    root,
  };
  return {
    actions: encountered,
    bindings,
    degradations: context.degradations,
    diagnostics: [],
    ok: true,
    spec,
  };
}
