/**
 * Pure translation of an A2UI surface (0.9.1 or 1.0, in the dialect of the
 * surface) into one neutral catalog spec (spec 029 FR-001/FR-002/FR-005,
 * spec 039 FR-005). No DOM, no rendering, no protocol I/O: it
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
  A2UI_V1_RESERVED_TYPE,
  coverageOf,
  FALLBACK_CATALOG_TAG,
  FALLBACK_LABEL,
  FALLBACK_TONE,
  ROOT_CONTAINER_TAG,
} from './coverage.js';
import { isPlainObject, readAt, resolveScopedPointer } from './data-model.js';
import type { Dialect } from './dialect.js';
import type { A2uiComponent } from './protocol.js';
import type { ValueContext, ValueOutcome } from './values.js';
import { bindingPath, resolveDynamic, staticFailure, toText } from './values.js';

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
  readonly reason:
    | 'missing-image-alt'
    | 'unmapped-type'
    | 'unsupported-function'
    | 'unsupported-variant';
  readonly detail?: string | undefined;
}

/** The A2UI side of one rendered action: who fired it and what context to resolve. */
export interface ActionBinding {
  readonly name: string;
  readonly componentId: string;
  readonly context: Readonly<Record<string, unknown>>;
  /** The raw 1.0 `userMessage` (a dynamic string), resolved at dispatch. */
  readonly userMessage?: unknown;
  readonly scope: readonly string[];
}

/**
 * Where a bound input writes what the person commits (spec 039 A1): its own
 * value binding, resolved against the template scope it was rendered in, and
 * the shape A2UI expects there.
 */
export interface WriteBackBinding {
  readonly componentId: string;
  readonly segments: readonly string[];
  readonly kind: 'boolean' | 'list' | 'number' | 'string';
}

/**
 * The internal action a bound input carries in the neutral spec, so the
 * guarded renderer reports its committed value (spec 039 FR-012). It never
 * reaches the agent and never joins the surface's declared action set.
 */
const WRITE_BACK_ACTION = 'kimen-a2ui-write-back';

export interface TranslationResult {
  readonly ok: boolean;
  readonly diagnostics: readonly A2uiDiagnostic[];
  readonly degradations: readonly A2uiDegradationReport[];
  readonly spec?: UiSpec | undefined;
  /** The action names this tree binds. */
  readonly actions: readonly string[];
  /** Neutral node path (the guarded renderer's scheme) → the A2UI action behind it. */
  readonly bindings: ReadonlyMap<string, ActionBinding>;
  /** Neutral node path → the data-model path a bound input writes back to. */
  readonly writes: ReadonlyMap<string, WriteBackBinding>;
}

export interface TranslateInput {
  readonly surfaceId: string;
  /** The wire dialect of the surface's version family. */
  readonly dialect: Dialect;
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
type TextPresentation = 'markdown' | 'literal';

interface WalkContext {
  readonly surfaceId: string;
  readonly dialect: Dialect;
  readonly components: ReadonlyMap<string, A2uiComponent>;
  readonly dataModel: unknown;
  readonly locale: string | undefined;
  readonly degradations: A2uiDegradationReport[];
  readonly encounteredActions: Set<string>;
  readonly actionNodes: WeakMap<UiSpecNode, ActionBinding>;
  readonly writeNodes: WeakMap<UiSpecNode, WriteBackBinding>;
  /** Ids on the recursion stack — a repeat is a cycle (fail closed). */
  readonly ancestors: Set<string>;
  nodes: number;
  abort: A2uiDiagnostic | null;
}

/** Thrown inside a builder to degrade the current component to the fallback. */
class Degrade extends Error {
  constructor(
    readonly reason: A2uiDegradationReport['reason'],
    readonly detail?: string,
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
    readonly textPresentation: TextPresentation = 'markdown',
  ) {}

  private get values(): ValueContext {
    return {
      dialect: this.context.dialect,
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
      case 'reserved-key':
        throw new Abort({
          message: `key "${outcome.detail}" is reserved by ${this.context.dialect.label} (escape a literal leading @ as @@)`,
          path: where(this.id, property),
          rule: 'reserved-key',
          value: outcome.detail,
        });
      case 'unsupported-catalog':
        throw new Abort({
          message: `catalog "${outcome.detail}" is not supported (${this.context.dialect.protocol.basicCatalogIds.join(', ')})`,
          path: where(this.id, property),
          rule: 'unsupported-catalog',
          value: outcome.detail,
        });
      default:
        throw this.malformed(
          property,
          `${this.type} property "${property}" is malformed for ${this.context.dialect.label} (${outcome.detail})`,
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
  child(property: string, textPresentation = this.textPresentation): Piece[] {
    const raw = this.body[property];
    if (raw === undefined) {
      return [];
    }
    if (typeof raw !== 'string') {
      throw this.malformed(property, `${this.type} property "${property}" must be a component id`);
    }
    return this.resolve(raw, this.scope, textPresentation);
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

  private resolve(
    childId: string,
    scope: readonly string[],
    textPresentation = this.textPresentation,
  ): Piece[] {
    const pieces = resolveComponent(childId, scope, this.depth + 1, this.context, textPresentation);
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

  /**
   * Makes a bound input report what the person commits (spec 039 A1): when
   * its `value` is a data binding, the node carries the internal write-back
   * action and the binding is recorded; a literal or computed value writes
   * nothing (FR-012).
   */
  writeBack(target: UiSpecNode, kind: WriteBackBinding['kind']): UiSpecNode {
    const path = bindingPath(this.body['value'], this.context.dialect);
    if (path === undefined) {
      return target;
    }
    const pointer = resolveScopedPointer(path, this.scope);
    if (!pointer.ok) {
      return target;
    }
    const bound: UiSpecNode = { ...target, action: WRITE_BACK_ACTION };
    this.context.writeNodes.set(bound, { componentId: this.id, kind, segments: pointer.segments });
    return bound;
  }

  /** Records a declared `Action.event`, or rejects a client function call. */
  action(target: UiSpecNode): UiSpecNode {
    const raw = this.body['action'];
    if (raw === undefined) {
      return target;
    }
    if (isPlainObject(raw) && Object.keys(raw).length === 1 && isPlainObject(raw['functionCall'])) {
      const call = raw['functionCall'][this.context.dialect.callKey];
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
    const { dialect } = this.context;
    const eventKeys = dialect.reservedNamespace
      ? ['name', 'context', 'userMessage']
      : ['name', 'context'];
    const context = event['context'] ?? {};
    if (!isPlainObject(context) || Object.keys(event).some((key) => !eventKeys.includes(key))) {
      throw this.malformed(
        'action',
        `${this.type} action event may carry only ${eventKeys.join(', ')} in ${dialect.label}, with an object context`,
      );
    }
    if (dialect.reservedNamespace) {
      // 1.0 context and user message resolve only at dispatch: a reserved key,
      // a capability function or a foreign catalog in them rejects the
      // message now (spec 039 S19, S20, S22).
      const entries: [unknown, 'context' | 'value'][] = [
        ...Object.values(context).map((value): [unknown, 'context'] => [value, 'context']),
        ...(event['userMessage'] === undefined
          ? []
          : [[event['userMessage'], 'value'] as [unknown, 'value']]),
      ];
      for (const [value, mode] of entries) {
        const failure = staticFailure(value, dialect, mode);
        if (failure !== null) {
          this.settle(failure, 'action');
        }
      }
    }
    const name = event['name'];
    this.context.encounteredActions.add(name);
    const withAction: UiSpecNode = { ...target, action: name };
    this.context.actionNodes.set(withAction, {
      componentId: this.id,
      context,
      name,
      scope: this.scope,
      ...(event['userMessage'] === undefined ? {} : { userMessage: event['userMessage'] }),
    });
    return withAction;
  }
}

type Builder = (instance: Instance) => Piece[];

const BUTTON_VARIANTS: Readonly<Record<string, string>> = {
  borderless: 'ghost',
  primary: 'primary',
};

const LAYOUT_ALIGN = new Set(['start', 'center', 'end', 'stretch', 'baseline']);
const LAYOUT_JUSTIFY: ReadonlyMap<string, string> = new Map([
  ['start', 'start'],
  ['center', 'center'],
  ['end', 'end'],
  ['spaceBetween', 'between'],
]);

/** A local clock time, capturing the minute precision of ki-time-input. */
const LOCAL_TIME = /^((?:[01]\d|2[0-3]):[0-5]\d)(?::[0-5]\d)?$/u;

function layout(it: Instance, direction?: 'row'): UiSpecNode {
  const align = it.literal('align');
  const justify = LAYOUT_JUSTIFY.get(it.literal('justify') ?? '');
  const items = it
    .children('children')
    .map((child) => (typeof child === 'string' ? node('ki-stack', {}, [child]) : child));

  return node(
    'ki-stack',
    {
      ...(direction === undefined ? {} : { direction }),
      ...(align === undefined || !LAYOUT_ALIGN.has(align) ? {} : { align }),
      ...(justify === undefined ? {} : { justify }),
    },
    items,
  );
}

/** Reads the label leaves while keeping the rendered Row and Column stacks intact. */
function modalLabelContent(label: readonly Piece[]): Piece[] {
  return label.flatMap((piece) =>
    typeof piece !== 'string' && piece.component === 'ki-stack'
      ? modalLabelContent(piece.slots?.[''] ?? [])
      : [piece],
  );
}

/** Basic-catalog Icon names whose Lucide names differ, in both A2UI versions. */
const ICON_NAMES: Readonly<Record<string, string>> = {
  accountCircle: 'circle-user-round',
  add: 'plus',
  arrowBack: 'arrow-left',
  arrowForward: 'arrow-right',
  attachFile: 'paperclip',
  calendarToday: 'calendar-days',
  call: 'phone',
  close: 'x',
  delete: 'trash-2',
  edit: 'pencil',
  error: 'circle-alert',
  event: 'calendar',
  fastForward: 'fast-forward',
  favorite: 'heart',
  favoriteOff: 'heart-off',
  help: 'circle-question-mark',
  locationOn: 'map-pin',
  lockOpen: 'lock-open',
  moreHoriz: 'ellipsis',
  moreVert: 'ellipsis-vertical',
  notifications: 'bell',
  notificationsOff: 'bell-off',
  payment: 'credit-card',
  person: 'user-round',
  photo: 'image',
  print: 'printer',
  refresh: 'refresh-cw',
  shoppingCart: 'shopping-cart',
  skipNext: 'skip-forward',
  skipPrevious: 'skip-back',
  starHalf: 'star-half',
  starOff: 'star-off',
  stop: 'square',
  visibility: 'eye',
  visibilityOff: 'eye-off',
  volumeDown: 'volume-1',
  volumeMute: 'volume',
  volumeOff: 'volume-x',
  volumeUp: 'volume-2',
  warning: 'triangle-alert',
};

function isSvgPathIcon(value: unknown): boolean {
  return isPlainObject(value) && Object.keys(value).length === 1 && Object.hasOwn(value, 'svgPath');
}

/** Per-type builders for every `mapped`, `inline` and `layout` basic-catalog type. */
export const BUILDERS: Readonly<Record<string, Builder>> = {
  AudioPlayer: (it) => {
    const src = it.value('url');
    const title = it.text('description');
    if (src === undefined && it.body['url'] !== undefined) {
      // A missing binding can resolve when the data model arrives.
      return [];
    }
    if (typeof src !== 'string') {
      throw it.malformed('url', 'AudioPlayer url must resolve to a string');
    }
    return [node('ki-audio', { src, ...(title.trim() === '' ? {} : { title }) }, [])];
  },
  Button: (it) => {
    const variant = it.literal('variant');
    const mapped = variant === undefined ? undefined : BUTTON_VARIANTS[variant];
    return [
      it.action(
        node(
          'ki-button',
          mapped === undefined ? {} : { variant: mapped },
          it.child('child', 'literal'),
        ),
      ),
    ];
  },
  Card: (it) => [node('ki-card', {}, it.child('child'))],
  CheckBox: (it) => {
    const label = it.text('label');
    return [
      it.writeBack(
        node(
          'ki-checkbox',
          it.value('value') === true ? { checked: true } : {},
          label === '' ? [] : [label],
        ),
        'boolean',
      ),
    ];
  },
  ChoicePicker: (it) => {
    const variant = it.literal('variant') ?? 'mutuallyExclusive';
    if (variant !== 'mutuallyExclusive' && variant !== 'multipleSelection') {
      throw new Degrade('unsupported-variant', variant);
    }
    const multiple = variant === 'multipleSelection';
    const options = it.body['options'];
    if (!Array.isArray(options)) {
      throw it.malformed('options', 'ChoicePicker options must be a list');
    }
    const searchable = options.length > 15;
    const selected = it.value('value');
    const first = Array.isArray(selected) ? toText(selected[0]) : toText(selected);
    const selectedValues = new Set(
      multiple && !searchable && Array.isArray(selected)
        ? selected.filter((value): value is string => typeof value === 'string')
        : [],
    );
    const choices = options.map((option, index) => {
      if (!isPlainObject(option) || typeof option['value'] !== 'string') {
        throw it.malformed(
          `options/${String(index)}`,
          'each ChoicePicker option needs a string value',
        );
      }
      const label =
        option['label'] === undefined ? '' : toText(resolveOption(it, option['label'], index));
      const value = option['value'];
      return node(
        searchable ? 'ki-option' : multiple ? 'ki-checkbox' : 'ki-radio',
        { value, ...(selectedValues.has(value) ? { checked: true } : {}) },
        label === '' ? [] : [label],
      );
    });
    const label = it.text('label');
    if (multiple && label.trim() === '') {
      throw new Degrade('unsupported-variant', 'multipleSelection requires a group label');
    }
    const value =
      searchable && multiple
        ? JSON.stringify(
            Array.isArray(selected) ? selected.map(toText) : first === '' ? [] : [first],
          )
        : first;
    const picker = node(
      searchable ? 'ki-combobox' : multiple ? 'ki-checkbox-group' : 'ki-radio-group',
      {
        ...(label === '' ? {} : { label }),
        ...(searchable && multiple ? { multiple: true } : {}),
        ...((searchable || !multiple) && value !== '' ? { value } : {}),
      },
      choices,
    );
    // A multiple-selection picker reports no single committed value yet
    // (spec 039 FR-013): its edits stay local.
    return [multiple ? picker : it.writeBack(picker, 'list')];
  },
  Column: (it) => [layout(it)],
  DateTimeInput: (it) => {
    for (const property of ['enableDate', 'enableTime']) {
      const flag = it.body[property];
      if (flag !== undefined && typeof flag !== 'boolean') {
        throw it.malformed(property, `DateTimeInput ${property} must be a boolean`);
      }
    }
    if (it.body['enableDate'] === true) {
      throw new Degrade('unsupported-variant', 'DatePicker is unavailable');
    }
    if (it.body['enableTime'] !== true) {
      throw new Degrade('unsupported-variant', 'enableTime must be true');
    }

    const label = it.text('label');
    const rawValue = it.value('value');
    if (label.trim() === '') {
      throw new Degrade('unsupported-variant', 'time-only input requires a label');
    }
    const time = typeof rawValue === 'string' ? LOCAL_TIME.exec(rawValue)?.[1] : undefined;
    if (rawValue !== undefined && rawValue !== '' && time === undefined) {
      throw it.malformed('value', 'DateTimeInput time must be HH:mm or HH:mm:ss');
    }
    return [node('ki-time-input', { label, ...(time === undefined ? {} : { value: time }) }, [])];
  },
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
  Image: (it) => {
    const src = it.value('url');
    if (src === undefined && it.body['url'] !== undefined) {
      // A missing binding can resolve when the data model arrives.
      return [];
    }
    if (typeof src !== 'string') {
      throw it.malformed('url', 'Image url must resolve to a string');
    }
    const fit = it.literal('fit');
    const accessibility =
      it.body[it.context.dialect.reservedNamespace ? '@accessibility' : 'accessibility'];
    const { hidden, label } = isPlainObject(accessibility) ? accessibility : {};
    const alt = typeof label === 'string' ? label : '';
    if (hidden !== true && alt.trim() === '') {
      throw new Degrade('missing-image-alt');
    }
    return [
      node(
        'ki-image',
        {
          src,
          ...(hidden === true ? { decorative: true } : { alt }),
          ...(fit === 'cover' || fit === 'contain' ? { fit } : {}),
        },
        [],
      ),
    ];
  },
  Icon: (it) => {
    const raw = it.body['name'];
    if (raw === undefined) {
      throw it.malformed('name', 'Icon needs a name');
    }
    const name = isSvgPathIcon(raw) ? raw : it.value('name');
    if (isSvgPathIcon(name)) {
      throw new Degrade('unsupported-variant', 'svgPath');
    }
    // Data may arrive after the component list. Keep the binding for that update.
    if (name === undefined) {
      return [];
    }
    if (typeof name !== 'string') {
      throw it.malformed('name', 'Icon name must resolve to a string');
    }
    const mapped = Object.hasOwn(ICON_NAMES, name) ? ICON_NAMES[name] : undefined;
    return [node('ki-icon', { name: mapped ?? name }, [])];
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
  Modal: (it) => {
    const triggerId = it.literal('trigger');
    const contentId = it.literal('content');
    if (!triggerId || !contentId) {
      throw it.malformed(
        triggerId ? 'content' : 'trigger',
        'Modal requires trigger and content component ids',
      );
    }
    const { actionNodes, components, nodes } = it.context;
    const triggerType = components.get(triggerId)?.component;
    if (triggerType === undefined || !components.has(contentId)) {
      // Progressive updates can deliver either reference in a later message.
      return [];
    }
    if (triggerType !== 'Button' && triggerType !== 'Text') {
      throw new Degrade('unsupported-variant', `Modal trigger: ${triggerType}`);
    }

    const [trigger] = it.child('trigger', 'literal');
    if (typeof trigger === 'object' && trigger.component !== 'ki-button') {
      return [trigger];
    }
    const button = typeof trigger === 'object' ? trigger : undefined;
    const label = typeof trigger === 'string' ? [trigger] : (button?.slots?.[''] ?? []);
    const content = modalLabelContent(label);
    const text = content
      .filter((piece): piece is string => typeof piece === 'string')
      .join('')
      .trim();
    // The adapter's icons are decorative. Keep their glyphs and name the opener.
    const needsFallback =
      text === '' &&
      content.every((piece) => typeof piece === 'string' || piece.component === 'ki-icon');
    const openerLabel = needsFallback
      ? [...label.filter((piece) => typeof piece !== 'string'), 'Open dialog']
      : label;
    // The visit number is unique even when a ChildList repeats the A2UI id.
    const id = `a2ui-modal-${String(nodes)}`;
    const opener = {
      ...button,
      ...node(
        'ki-button',
        { ...button?.props, command: 'show-modal', commandfor: id, type: 'button' },
        openerLabel,
      ),
    };
    const binding = button === undefined ? undefined : actionNodes.get(button);
    if (binding !== undefined) {
      actionNodes.set(opener, binding);
    }
    return [
      opener,
      {
        component: 'ki-dialog',
        id,
        props: { heading: text || 'Dialog' },
        slots: {
          '': it.child('content'),
          footer: [
            node('ki-button', { command: 'close', commandfor: id, type: 'button' }, ['Close']),
          ],
        },
      },
    ];
  },
  Row: (it) => [layout(it, 'row')],
  Slider: (it) => {
    const label = it.text('label');
    const min = it.body['min'] === undefined ? 0 : it.body['min'];
    const max = it.body['max'];
    const steps = it.body['steps'];
    if (it.body['value'] === undefined) {
      throw it.malformed('value', 'Slider needs a value or a numeric data binding');
    }
    const value = it.value('value');
    if (typeof min !== 'number' || !Number.isFinite(min)) {
      throw it.malformed('min', 'Slider min must be a finite number');
    }
    if (typeof max !== 'number' || !Number.isFinite(max)) {
      throw it.malformed('max', 'Slider max must be a finite number');
    }
    if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value))) {
      throw it.malformed('value', 'Slider value must resolve to a finite number');
    }
    let step: number | undefined;
    if (steps !== undefined) {
      if (typeof steps !== 'number' || !Number.isInteger(steps) || steps < 1) {
        throw it.malformed('steps', 'Slider steps must be a positive integer');
      }
      const span = max - min;
      const increment = Number.isFinite(span) ? span / steps : max / steps - min / steps;
      if (Number.isFinite(increment) && increment > 0) step = increment;
    }
    return [
      it.writeBack(
        node(
          'ki-slider',
          {
            ...(label === '' ? {} : { label }),
            min,
            max,
            ...(step === undefined ? {} : { step }),
            ...(value === undefined ? {} : { value }),
          },
          [],
        ),
        'number',
      ),
    ];
  },
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
        it.textPresentation,
      );
      pieces.push(node('ki-tab', { value }, title === '' ? [] : [title]));
      pieces.push(node('ki-tab-panel', { value }, scoped.child('child')));
    });
    return [node('ki-tabs', {}, pieces)];
  },
  Text: (it) => {
    const text = it.text('text');
    if (text === '') {
      return [];
    }
    return [it.textPresentation === 'literal' ? text : node('ki-markdown', {}, [text])];
  },
  TextField: (it) => {
    const label = it.text('label');
    const value = it.value('value');
    // `placeholder` exists in 1.0 only; on 0.9.1 the property check rejects it first.
    const placeholder = it.text('placeholder');
    const props: Record<string, string> = {
      ...(label === '' ? {} : { label }),
      ...(placeholder === '' ? {} : { placeholder }),
      ...(value === undefined || toText(value) === '' ? {} : { value: toText(value) }),
    };
    const variant = it.literal('variant');
    if (variant === 'longText') {
      return [it.writeBack(node('ki-textarea', props, []), 'string')];
    }
    return [
      it.writeBack(
        node('ki-input', variant === 'obscured' ? { ...props, type: 'password' } : props, []),
        'string',
      ),
    ];
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
export function undeclaredProperty(
  id: string,
  body: A2uiComponent,
  dialect: Dialect,
): A2uiDiagnostic | null {
  const entry = coverageOf(body.component, dialect.protocol.coverage);
  return entry === undefined ? null : checkProperties(id, body, entry, dialect);
}

function checkProperties(
  id: string,
  body: A2uiComponent,
  entry: A2uiCoverageEntry,
  dialect: Dialect,
): A2uiDiagnostic | null {
  if (entry.kind === 'unmapped' || entry.kind === 'forbidden') {
    return null;
  }
  const common = dialect.protocol.commonProperties;
  for (const property of Object.keys(body)) {
    if (!common.includes(property) && !entry.properties.includes(property)) {
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
  textPresentation: TextPresentation = 'markdown',
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
  if (context.dialect.reservedNamespace && type === A2UI_V1_RESERVED_TYPE) {
    return fail({
      message: `A2UI type "${type}" is reserved for the implicit surface container`,
      path: where(id, 'component'),
      rule: 'reserved-type',
      value: type,
    });
  }
  const entry = coverageOf(type, context.dialect.protocol.coverage);
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
  const unknown = checkProperties(id, body, entry, context.dialect);
  if (unknown !== null) {
    return fail(unknown);
  }
  context.ancestors.add(id);
  try {
    return builder(new Instance(id, type, body, scope, depth, context, textPresentation));
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

/** Collects action and write-back bindings under the guarded renderer's node-path scheme. */
function collectBindings(
  target: UiSpecNode,
  path: string,
  context: Pick<WalkContext, 'actionNodes' | 'writeNodes'>,
  into: Map<string, ActionBinding>,
  writes: Map<string, WriteBackBinding>,
): void {
  const binding = context.actionNodes.get(target);
  if (binding !== undefined) {
    into.set(path, binding);
  }
  const write = context.writeNodes.get(target);
  if (write !== undefined) {
    writes.set(path, write);
  }
  for (const [slotName, children] of Object.entries(target.slots ?? {})) {
    children.forEach((child, index) => {
      if (typeof child !== 'string') {
        collectBindings(
          child,
          `${path}.slots.${slotName}[${String(index)}]`,
          context,
          into,
          writes,
        );
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
  writes: new Map(),
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
    dialect: input.dialect,
    encounteredActions: new Set<string>(),
    locale: input.locale,
    nodes: 0,
    surfaceId: input.surfaceId,
    writeNodes: new WeakMap(),
  };
  if (!input.components.has(ROOT_ID)) {
    return {
      actions: [],
      bindings: new Map(),
      degradations: [],
      diagnostics: [],
      ok: true,
      writes: new Map(),
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
  const writes = new Map<string, WriteBackBinding>();
  collectBindings(root, 'root', context, bindings, writes);
  const encountered = [...context.encounteredActions];
  // The write-back action is declared to the guarded renderer only: it is
  // never part of the agent's action set (spec 039 FR-012).
  const actions = [
    ...new Set([
      ...(input.declaredActions ?? encountered),
      ...(writes.size > 0 ? [WRITE_BACK_ACTION] : []),
    ]),
  ];
  const spec: UiSpec = {
    version: 1,
    ...(actions.length > 0 ? { actions } : {}),
    root,
  };
  return {
    actions: encountered,
    bindings,
    degradations: context.degradations,
    diagnostics: [],
    ok: true,
    spec,
    writes,
  };
}
