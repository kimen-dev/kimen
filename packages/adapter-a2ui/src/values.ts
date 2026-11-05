/**
 * Resolution of A2UI v0.9.1 dynamic values (`common_types.json`
 * `DynamicValue`): a literal passes through, a `{ path }` binding reads the
 * adapter-held data model in the current collection scope, and a
 * `FunctionCall` is evaluated only when it is one of the pure basic-catalog
 * functions in `A2UI_EVALUATED_FUNCTIONS`. Nothing here reaches a browser
 * capability: a capability function (`openUrl`) is `forbidden`, and every
 * other function is `unsupported` (its component degrades, reported).
 */
import { A2UI_EVALUATED_FUNCTIONS } from './coverage.js';
import { isPlainObject, readAt, resolveScopedPointer } from './data-model.js';

/** Basic-catalog functions that reach a browser capability (never evaluated). */
const CAPABILITY_FUNCTIONS = new Set(['openUrl']);

/** Nesting budget for function arguments (untrusted input, fail closed). */
const MAX_VALUE_DEPTH = 16;

export type ValueOutcome =
  | { readonly ok: true; readonly value: unknown }
  | {
      readonly ok: false;
      readonly reason:
        | 'malformed'
        | 'forbidden-key'
        | 'unsupported-function'
        | 'forbidden-function';
      readonly detail: string;
    };

export interface ValueContext {
  readonly model: unknown;
  readonly scope: readonly string[];
  readonly locale: string | undefined;
}

const malformed = (detail: string): ValueOutcome => ({
  detail,
  ok: false,
  reason: 'malformed',
});

function isBinding(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value);
  return keys.length === 1 && keys[0] === 'path';
}

function isFunctionCall(value: Record<string, unknown>): boolean {
  return (
    typeof value['call'] === 'string' &&
    Object.keys(value).every((key) => key === 'call' || key === 'args' || key === 'returnType')
  );
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

function resolveAt(raw: unknown, context: ValueContext, depth: number): ValueOutcome {
  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
    return { ok: true, value: raw };
  }
  if (Array.isArray(raw)) {
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
  if (isBinding(raw)) {
    return typeof raw['path'] === 'string'
      ? readBinding(raw['path'], context)
      : malformed('path must be a string');
  }
  if (!isFunctionCall(raw)) {
    return malformed('not a literal, binding or function call');
  }
  const name = raw['call'] as string;
  if (CAPABILITY_FUNCTIONS.has(name)) {
    return { detail: name, ok: false, reason: 'forbidden-function' };
  }
  if (!A2UI_EVALUATED_FUNCTIONS.includes(name)) {
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
    const resolved = resolveAt(value, context, depth + 1);
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

/** Resolves one dynamic value in scope. */
export function resolveDynamic(raw: unknown, context: ValueContext): ValueOutcome {
  return resolveAt(raw, context, 0);
}
