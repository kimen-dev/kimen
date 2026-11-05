/**
 * The surface data model of A2UI v0.9.1, held and resolved INSIDE the adapter
 * (the catalog and renderer never learn about data models). Paths are JSON
 * Pointers (RFC 6901) with A2UI's one extension: a path without a leading `/`
 * is relative to the current collection scope of a `ChildList` template
 * (`v0_9_1/docs/a2ui_protocol.md`, "Path resolution & scope").
 *
 * Every function here is pure: writes return a new model and copy only the
 * touched spine, so a rejected message never poisons the prior model. Reads
 * follow own properties only, and the prototype-polluting segments
 * `__proto__`, `constructor` and `prototype` never address the model.
 */

const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);
const ARRAY_INDEX = /^(?:0|[1-9]\d*)$/u;

export type PointerOutcome =
  | { readonly ok: true; readonly segments: readonly string[] }
  | {
      readonly ok: false;
      readonly reason: 'forbidden-key' | 'malformed';
      readonly detail: string;
    };

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Parses a pointer into unescaped segments. `''` and `'/'` both address the
 * whole model (the spec's "omitted, or set to '/'"). A relative path is
 * parsed as if it began with `/`; the caller prefixes the scope.
 */
export function parsePointer(path: string): PointerOutcome {
  if (path === '' || path === '/') {
    return { ok: true, segments: [] };
  }
  const body = path.startsWith('/') ? path.slice(1) : path;
  const segments: string[] = [];
  for (const raw of body.split('/')) {
    if (/~(?![01])/u.test(raw)) {
      return { detail: path, ok: false, reason: 'malformed' };
    }
    const segment = raw.replaceAll('~1', '/').replaceAll('~0', '~');
    if (FORBIDDEN_SEGMENTS.has(segment)) {
      return { detail: segment, ok: false, reason: 'forbidden-key' };
    }
    segments.push(segment);
  }
  return { ok: true, segments };
}

/** Resolves a binding path against a collection scope (absolute paths ignore it). */
export function resolveScopedPointer(path: string, scope: readonly string[]): PointerOutcome {
  const parsed = parsePointer(path);
  if (!parsed.ok || path.startsWith('/')) {
    return parsed;
  }
  return { ok: true, segments: [...scope, ...parsed.segments] };
}

/** Reads the value at `segments`, own properties and array indices only. */
export function readAt(model: unknown, segments: readonly string[]): unknown {
  let cursor: unknown = model;
  for (const segment of segments) {
    if (Array.isArray(cursor)) {
      if (!ARRAY_INDEX.test(segment)) {
        return undefined;
      }
      cursor = cursor.at(Number(segment));
    } else if (isPlainObject(cursor) && Object.hasOwn(cursor, segment)) {
      // Own-property read only, after the forbidden-segment check in
      // parsePointer: the walk can never leave the model's own data.
      // nosemgrep: javascript.lang.security.audit.prototype-pollution.prototype-pollution-loop.prototype-pollution-loop
      cursor = cursor[segment];
    } else {
      return undefined;
    }
  }
  return cursor;
}

export type WriteOutcome =
  | { readonly ok: true; readonly model: Record<string, unknown> }
  | { readonly ok: false; readonly detail: string };

/** Marker for `updateDataModel` without `value`: remove the key at `path`. */
export const REMOVE: unique symbol = Symbol('remove');

function writeInto(container: unknown, segments: readonly string[], value: unknown): unknown {
  const [head, ...rest] = segments;
  if (head === undefined) {
    return value;
  }
  if (Array.isArray(container)) {
    if (!ARRAY_INDEX.test(head)) {
      throw new TypeError(`non-numeric segment "${head}" addresses an array`);
    }
    const index = Number(head);
    const copy: unknown[] = [...(container as unknown[])];
    const next = rest.length === 0 ? value : writeInto(copy[index], rest, value);
    // Removing an array element sets it to undefined, preserving the length
    // (`a2ui_protocol.md`, "Server to client updates").
    copy[index] = next === REMOVE ? undefined : next;
    return copy;
  }
  const base: Record<string, unknown> = isPlainObject(container) ? container : {};
  if (rest.length === 0 && value === REMOVE) {
    const copy: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(base)) {
      if (key !== head) {
        // Computed-key definition creates an own data property; it never runs
        // the `__proto__` setter.
        Object.defineProperty(copy, key, {
          configurable: true,
          enumerable: true,
          value: entry,
          writable: true,
        });
      }
    }
    return copy;
  }
  const existing = Object.hasOwn(base, head) ? base[head] : undefined;
  return {
    ...base,
    [head]: rest.length === 0 ? value : writeInto(existing, rest, value),
  };
}

/**
 * Applies an `updateDataModel`: replaces (or creates) the value at `segments`,
 * or removes it for `REMOVE`. The whole model (`segments` empty) must stay a
 * JSON object (`client_data_model.json` types each surface model as one).
 */
export function writeAt(
  model: Record<string, unknown>,
  segments: readonly string[],
  value: unknown,
): WriteOutcome {
  if (segments.length === 0) {
    if (value === REMOVE) {
      return { model: {}, ok: true };
    }
    return isPlainObject(value)
      ? { model: value, ok: true }
      : { detail: 'the whole data model must be a JSON object', ok: false };
  }
  try {
    return {
      model: writeInto(model, segments, value) as Record<string, unknown>,
      ok: true,
    };
  } catch (error) {
    return {
      detail: error instanceof Error ? error.message : 'invalid data-model path',
      ok: false,
    };
  }
}
