/**
 * The wire dialect of each supported A2UI version family (spec 039 FR-002):
 * the keys that mark a data binding or a function call, and whether the 1.0
 * reserved `@` namespace applies (plain literal objects, `@@` escaping,
 * unknown `@` keys rejected). Values, translation and the adapter read the
 * dialect of the surface they work on, so a message can only ever be
 * interpreted with its own version's vocabulary: a 0.9.1 `{ "path" }` is not a
 * binding on a 1.0 surface, and a 1.0 `{ "@path" }` is not one on a 0.9.1
 * surface.
 */
import type { A2uiProtocol, A2uiProtocolFamily } from './coverage.js';
import { A2UI_PROTOCOLS } from './coverage.js';

export interface Dialect {
  readonly protocol: A2uiProtocol;
  /** Human-readable name used in diagnostics, e.g. `A2UI 1.0`. */
  readonly label: string;
  /** The only key of a data binding object. */
  readonly bindingKey: 'path' | '@path';
  /** The key that names the function of a function call. */
  readonly callKey: 'call' | '@call';
  /** Every key a function-call object may carry. */
  readonly callKeys: readonly string[];
  /**
   * 1.0 only: the `@` prefix is reserved for protocol keys. Plain objects are
   * literal values where a `DynamicValue` is expected, `@@x` unescapes to
   * `@x`, and an unknown single-`@` key is rejected.
   */
  readonly reservedNamespace: boolean;
}

const protocol = (family: A2uiProtocolFamily): A2uiProtocol => {
  const found = A2UI_PROTOCOLS.find((candidate) => candidate.family === family);
  if (found === undefined) {
    throw new Error(`no A2UI protocol family ${family}`);
  }
  return found;
};

const V091_DIALECT: Dialect = {
  bindingKey: 'path',
  callKey: 'call',
  callKeys: ['call', 'args', 'returnType'],
  label: 'A2UI 0.9.1',
  protocol: protocol('0.9.1'),
  reservedNamespace: false,
};

const V1_DIALECT: Dialect = {
  bindingKey: '@path',
  callKey: '@call',
  callKeys: ['@call', 'args', 'catalogId'],
  label: 'A2UI 1.0',
  protocol: protocol('1.0'),
  reservedNamespace: true,
};

export function dialectOf(family: A2uiProtocolFamily): Dialect {
  return family === '1.0' ? V1_DIALECT : V091_DIALECT;
}

/** A key the 1.0 reserved namespace owns: a single `@` not followed by another `@`. */
export function isReservedKey(key: string): boolean {
  return /^@(?:[^@]|$)/u.test(key);
}
