/**
 * Resolution of A2UI dynamic values (`common_types.json` `DynamicValue`), in
 * the dialect of the surface (spec 039): a literal passes through, a binding
 * (`{ path }` in 0.9.1, `{ "@path" }` in 1.0) reads the adapter-held data
 * model in the current collection scope, and a function call (`call` /
 * `@call`) is evaluated only when it is one of the pure basic-catalog
 * functions its version evaluates. In 1.0, a plain object is a literal value
 * where a `DynamicValue` is expected (an action context): `@@x` keys unescape
 * to `@x` and an unknown single-`@` key is rejected. Nothing here reaches a
 * browser capability: a capability function (`openUrl`) is `forbidden`, and
 * every other function is `unsupported` (its component degrades, reported).
 */

import { isPlainObject, readAt, resolveScopedPointer } from './data-model.js';
import type { Dialect } from './dialect.js';
import { isReservedKey } from './dialect.js';

/** Basic-catalog functions that reach a browser capability (never evaluated). */
const CAPABILITY_FUNCTIONS = new Set(['openUrl']);

/** The 1.0 system function returning the template iteration index. */
const INDEX_FUNCTION = '@index';

/** Nesting budget for function arguments (untrusted input, fail closed). */
const MAX_VALUE_DEPTH = 16;

type ValueFailureReason =
  | 'malformed'
  | 'forbidden-key'
  | 'unsupported-function'
  | 'forbidden-function'
  | 'reserved-key'
  | 'unsupported-catalog';

export type ValueOutcome =
  | { readonly ok: true; readonly value: unknown }
  | {
      readonly ok: false;
      readonly reason: ValueFailureReason;
      readonly detail: string;
    };

export interface ValueContext {
  readonly model: unknown;
  readonly scope: readonly string[];
  readonly locale: string | undefined;
  readonly dialect: Dialect;
}

const malformed = (detail: string): ValueOutcome => ({
  detail,
  ok: false,
  reason: 'malformed',
});

function isBinding(value: Record<string, unknown>, dialect: Dialect): boolean {
  const keys = Object.keys(value);
  return keys.length === 1 && keys[0] === dialect.bindingKey;
}

/**
 * The data-model path a dynamic value is bound to (`{ path }` in 0.9.1,
 * `{ "@path" }` in 1.0), or undefined for a literal or a function call.
 */
export function bindingPath(raw: unknown, dialect: Dialect): string | undefined {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }
  const value = raw as Record<string, unknown>;
  const path = value[dialect.bindingKey];
  return isBinding(value, dialect) && typeof path === 'string' ? path : undefined;
}

function isFunctionCall(value: Record<string, unknown>, dialect: Dialect): boolean {
  return (
    typeof value[dialect.callKey] === 'string' &&
    Object.keys(value).every((key) => dialect.callKeys.includes(key))
  );
}

/** The first key of `value` the 1.0 reserved namespace owns, if any. */
function reservedKeyOf(value: Record<string, unknown>): string | undefined {
  return Object.keys(value).find(isReservedKey);
}

/**
 * A 1.0 function call may name its catalog; only the 1.0 basic catalog is
 * available (spec 039 S19).
 */
function catalogFailure(call: Record<string, unknown>, dialect: Dialect): ValueOutcome | null {
  if (!Object.hasOwn(call, 'catalogId')) {
    return null;
  }
  const catalogId = call['catalogId'];
  if (typeof catalogId !== 'string') {
    return malformed('function catalogId must be a string');
  }
  return dialect.protocol.basicCatalogIds.includes(catalogId)
    ? null
    : { detail: catalogId, ok: false, reason: 'unsupported-catalog' };
}

/** Reads a binding path in scope; a missing path resolves to `undefined` (spec: progressive rendering). */
function readBinding(path: string, context: ValueContext): ValueOutcome {
  const pointer = resolveScopedPointer(path, context.scope);
  if (!pointer.ok) {
    return { detail: pointer.detail, ok: false, reason: pointer.reason };
  }
  return { ok: true, value: readAt(context.model, pointer.segments) };
}

/** Converts a resolved value to display text: scalars only, never structure. */
export function toText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function interpolate(template: string, context: ValueContext): ValueOutcome {
  let output = '';
  let index = 0;
  while (index < template.length) {
    if (template.startsWith('\\${', index)) {
      output += '${';
      index += 3;
      continue;
    }
    if (template.startsWith('${', index)) {
      const end = template.indexOf('}', index + 2);
      if (end === -1) {
        return malformed('formatString has an unterminated ${ expression');
      }
      const expression = template.slice(index + 2, end).trim();
      if (expression.includes('(') || expression.includes('${')) {
        // Function-call expressions inside formatString are not evaluated.
        return {
          detail: 'formatString expression',
          ok: false,
          reason: 'unsupported-function',
        };
      }
      const read = readBinding(expression, context);
      if (!read.ok) {
        return read;
      }
      output += toText(read.value);
      index = end + 1;
      continue;
    }
    output += template.charAt(index);
    index += 1;
  }
  return { ok: true, value: output };
}

function numberFormat(
  options: Intl.NumberFormatOptions,
  value: unknown,
  locale: string | undefined,
): ValueOutcome {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { ok: true, value: '' };
  }
  try {
    return {
      ok: true,
      value: new Intl.NumberFormat(locale, options).format(value),
    };
  } catch {
    // An invalid currency code or digit count shows the empty state, never throws.
    return { ok: true, value: '' };
  }
}

function digits(decimals: unknown): Intl.NumberFormatOptions {
  if (
    typeof decimals === 'number' &&
    Number.isInteger(decimals) &&
    decimals >= 0 &&
    decimals <= 20
  ) {
    return { maximumFractionDigits: decimals, minimumFractionDigits: decimals };
  }
  return {};
}

function evaluate(
  name: string,
  args: Readonly<Record<string, unknown>>,
  context: ValueContext,
): ValueOutcome {
  switch (name) {
    case 'formatString': {
      const template = args['value'];
      return typeof template === 'string'
        ? interpolate(template, context)
        : malformed('formatString value');
    }
    case 'formatNumber':
      return numberFormat(
        {
          ...digits(args['decimals']),
          useGrouping: args['grouping'] !== false,
        },
        args['value'],
        context.locale,
      );
    case 'formatCurrency':
      return typeof args['currency'] === 'string'
        ? numberFormat(
            {
              ...digits(args['decimals']),
              currency: args['currency'],
              style: 'currency',
              useGrouping: args['grouping'] !== false,
            },
            args['value'],
            context.locale,
          )
        : { ok: true, value: '' };
    case 'pluralize': {
      const count = args['value'];
      if (typeof count !== 'number' || !Number.isFinite(count)) {
        return { ok: true, value: toText(args['other']) };
      }
      const category =
        count === 0 && args['zero'] !== undefined
          ? 'zero'
          : new Intl.PluralRules(context.locale).select(count);
      const chosen = Object.hasOwn(args, category) ? args[category] : args['other'];
      return { ok: true, value: toText(chosen) };
    }
    default:
      return { detail: name, ok: false, reason: 'unsupported-function' };
  }
}

/**
 * A 1.0 literal value inside a `DynamicValue` (an action context): JSON data,
 * copied with `@@` keys unescaped; an unknown single-`@` key is rejected at
 * any depth (`INVALID_RESERVED_KEY`). Keys become own data properties, so a
 * `__proto__` key never reaches a prototype.
 */
function literalValue(raw: unknown, depth: number): ValueOutcome {
  if (depth > MAX_VALUE_DEPTH) {
    return malformed('a literal value nests beyond the value depth budget');
  }
  if (
    raw === null ||
    typeof raw === 'string' ||
    typeof raw === 'number' ||
    typeof raw === 'boolean'
  ) {
    return { ok: true, value: raw };
  }
  if (Array.isArray(raw)) {
    const items: unknown[] = [];
    for (const item of raw) {
      const copied = literalValue(item, depth + 1);
      if (!copied.ok) {
        return copied;
      }
      items.push(copied.value);
    }
    return { ok: true, value: items };
  }
  if (!isPlainObject(raw)) {
    return malformed('not a JSON value');
  }
  const copy: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(raw)) {
    if (isReservedKey(key)) {
      return { detail: key, ok: false, reason: 'reserved-key' };
    }
    const copied = literalValue(entry, depth + 1);
    if (!copied.ok) {
      return copied;
    }
    Object.defineProperty(copy, key.startsWith('@@') ? key.slice(1) : key, {
      configurable: true,
      enumerable: true,
      value: copied.value,
      writable: true,
    });
  }
  return { ok: true, value: copy };
}

/** `@index` (1.0): the innermost template iteration index plus `offset`. */
function templateIndex(
  call: Record<string, unknown>,
  context: ValueContext,
  depth: number,
): ValueOutcome {
  const last = context.scope.at(-1);
  if (last === undefined || !/^(?:0|[1-9]\d*)$/u.test(last)) {
    return malformed('@index is evaluated only inside a list template');
  }
  const rawArgs = call['args'] ?? {};
  if (!isPlainObject(rawArgs) || Object.keys(rawArgs).some((key) => key !== 'offset')) {
    return malformed('@index takes only an optional offset');
  }
  let offset = 0;
  if (rawArgs['offset'] !== undefined) {
    const resolved = resolveAt(rawArgs['offset'], context, depth + 1, false);
    if (!resolved.ok) {
      return resolved;
    }
    if (typeof resolved.value !== 'number' || !Number.isFinite(resolved.value)) {
      return malformed('@index offset must be a number');
    }
    offset = resolved.value;
  }
  return { ok: true, value: Number(last) + offset };
}

function resolveAt(
  raw: unknown,
  context: ValueContext,
  depth: number,
  literal: boolean,
): ValueOutcome {
  const { dialect } = context;
  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
    return { ok: true, value: raw };
  }
  if (Array.isArray(raw)) {
    if (literal && dialect.reservedNamespace) {
      return literalValue(raw, depth);
    }
    // A literal list (`DynamicStringList`, `DynamicValue` array): scalars only.
    return raw.every(
      (item) => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean',
    )
      ? { ok: true, value: [...(raw as unknown[])] }
      : malformed('a literal list may hold scalars only');
  }
  if (!isPlainObject(raw)) {
    return malformed('not a literal, binding or function call');
  }
  if (isBinding(raw, dialect)) {
    const path = raw[dialect.bindingKey];
    return typeof path === 'string'
      ? readBinding(path, context)
      : malformed('path must be a string');
  }
  if (!isFunctionCall(raw, dialect)) {
    if (Object.hasOwn(raw, dialect.bindingKey) || Object.hasOwn(raw, dialect.callKey)) {
      return malformed('not a well-formed binding or function call');
    }
    if (dialect.reservedNamespace) {
      const reserved = reservedKeyOf(raw);
      if (reserved !== undefined) {
        return { detail: reserved, ok: false, reason: 'reserved-key' };
      }
      if (literal) {
        return literalValue(raw, depth);
      }
    }
    return malformed('not a literal, binding or function call');
  }
  const name = raw[dialect.callKey] as string;
  if (CAPABILITY_FUNCTIONS.has(name)) {
    return { detail: name, ok: false, reason: 'forbidden-function' };
  }
  if (dialect.reservedNamespace) {
    const catalog = catalogFailure(raw, dialect);
    if (catalog !== null) {
      return catalog;
    }
    if (name === INDEX_FUNCTION) {
      // `@index` arguments nest under the same budget as every evaluated
      // function, so a pathologically deep offset fails closed instead of
      // exhausting the stack.
      return depth >= MAX_VALUE_DEPTH
        ? malformed('function arguments nest beyond the value depth budget')
        : templateIndex(raw, context, depth);
    }
  }
  if (!dialect.protocol.evaluatedFunctions.includes(name)) {
    return { detail: name, ok: false, reason: 'unsupported-function' };
  }
  if (depth >= MAX_VALUE_DEPTH) {
    return malformed('function arguments nest beyond the value depth budget');
  }
  const rawArgs = raw['args'] ?? {};
  if (!isPlainObject(rawArgs)) {
    return malformed('function args must be an object');
  }
  const args: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawArgs)) {
    const resolved = resolveAt(value, context, depth + 1, false);
    if (!resolved.ok) {
      return resolved;
    }
    Object.defineProperty(args, key, {
      enumerable: true,
      value: resolved.value,
    });
  }
  return evaluate(name, args, context);
}

export interface ResolveOptions {
  /**
   * The value sits where the schema expects a `DynamicValue` (an action
   * context): in 1.0, plain objects and nested lists are literal data.
   */
  readonly literal?: boolean;
}

/** Resolves one dynamic value in scope. */
export function resolveDynamic(
  raw: unknown,
  context: ValueContext,
  options: ResolveOptions = {},
): ValueOutcome {
  return resolveAt(raw, context, 0, options.literal === true);
}

/**
 * Where a value sits, for the receipt-time check: `context` is a
 * `DynamicValue` that may be a literal (an action context entry), `value` one
 * that may not (a user message, a function argument), `literal` is data inside
 * a literal.
 */
type StaticMode = 'context' | 'value' | 'literal';

/**
 * The receipt-time check of a 1.0 value that is resolved only later (an
 * action context or user message): a reserved key, a capability function or a
 * foreign catalog anywhere inside it rejects the message now (spec 039
 * S19/S20/S22). Bindings are not read and functions are not evaluated, so a
 * function the adapter cannot evaluate still only drops at dispatch.
 */
export function staticFailure(
  raw: unknown,
  dialect: Dialect,
  mode: StaticMode,
  depth = 0,
): ValueOutcome | null {
  if (depth > MAX_VALUE_DEPTH) {
    return malformed('a value nests beyond the value depth budget');
  }
  const each = (items: readonly unknown[], next: StaticMode): ValueOutcome | null => {
    for (const item of items) {
      const failure = staticFailure(item, dialect, next, depth + 1);
      if (failure !== null) {
        return failure;
      }
    }
    return null;
  };
  if (Array.isArray(raw)) {
    return each(raw, mode === 'value' ? 'value' : 'literal');
  }
  if (!isPlainObject(raw)) {
    return null;
  }
  if (mode !== 'literal') {
    if (isBinding(raw, dialect)) {
      return null;
    }
    if (isFunctionCall(raw, dialect)) {
      const name = raw[dialect.callKey] as string;
      if (CAPABILITY_FUNCTIONS.has(name)) {
        return { detail: name, ok: false, reason: 'forbidden-function' };
      }
      const catalog = catalogFailure(raw, dialect);
      if (catalog !== null) {
        return catalog;
      }
      const args = raw['args'];
      return isPlainObject(args) ? each(Object.values(args), 'value') : null;
    }
  }
  const reserved = reservedKeyOf(raw);
  if (reserved !== undefined) {
    return { detail: reserved, ok: false, reason: 'reserved-key' };
  }
  return mode === 'value' ? null : each(Object.values(raw), 'literal');
}
