// Short vDOM keys in place of the 40-character ones Stencil's compiler
// inserts. A Rollup plugin of the Stencil build (stencil.config.ts), in both
// builds that ship the keys, the per-component modules and the lazy build;
// nothing it writes is edited by hand.
//
// Stencil's compiler gives eligible JSX elements of a single-return `render()`
// a `key` unless the source writes one: a 40-character sha1
// (`performAutomaticKeyInsertion` in @stencil/core's compiler, with no option
// to turn it off). The vDOM only compares the keys of siblings, by tag and
// key, so a key has to differ from the other keys of its render and nothing
// else. This plugin rewrites each module's compiler keys to `~0`, `~1`, … in
// the order they appear: a hash keeps its short key wherever it repeats, so
// two elements whose keys differed still do. Keys the source writes stay as
// written, and no source may write one that starts with `~`. A key the source
// computes at run time is the source's to keep apart: one that starts with
// `~` beside a compiler-keyed sibling of its tag could match its short key.
//
// The plugin refuses to guess. The build stops if a module writes a key that
// starts like a short key, if a 40-character key a module carries is written
// in its source (an authored key cannot be told from a compiler one), if a
// 40-character key survives the rewrite in a shape it does not read, or if a
// build shortens no key at all (Stencil no longer writes them this way).

import { readFileSync } from 'node:fs';

const NAME = 'kimen-short-vdom-keys';
const PREFIX = '~';
// A key as Stencil writes it into an element's vnode data, in any quotes a
// printer uses for a plain string: single, double or a template literal.
const COMPILER_KEY = /\bkey:\s*(["'`])([0-9a-f]{40})\1/gu;
// A 40-character key in any shape, a quoted property name included: none may
// be left once the module is rewritten.
const SURVIVING_KEY = /\bkey["'`]?\s*:\s*["'`][0-9a-f]{40}["'`]/u;
// A string key a module writes that starts with the short keys' prefix.
const PREFIXED_KEY = /\bkey["'`]?\s*:\s*["'`](?:~|\\(?:x7[eE]|u007[eE]|u\{0*7[eE]\}))/u;
// TypeScript decodes numeric entities in JSX attributes when it emits the
// string. ASCII is sufficient for the hex digits we compare.
const NUMERIC_ENTITY = /&#(x[0-9a-f]+|[0-9]+);/giu;

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** One base64 VLQ field of a source map's mappings. */
function vlq(value) {
  let rest = value < 0 ? (-value << 1) | 1 : value << 1;
  let digits = '';
  do {
    const digit = rest & 31;
    rest >>>= 5;
    digits += BASE64[rest > 0 ? digit | 32 : digit];
  } while (rest > 0);
  return digits;
}

/**
 * The source map of `edits` over `code`, each `[start, end, text]` within one
 * line: every output character points at the input character it came from, as
 * magic-string's high-resolution maps do. Stencil's transpiler writes a whole
 * JSX tree on one line, which its own map spreads over many lines of the
 * component's source, so a map that kept only lines would send a debugger to
 * the wrong line of the source.
 */
function sourceMap(code, edits, id) {
  const lines = [];
  let previousLine = 0;
  let previousColumn = 0;
  let next = 0;
  let lineStart = 0;
  for (const [index, text] of code.split('\n').entries()) {
    const lineEnd = lineStart + text.length;
    // The line's output as runs of characters, each copied from one input column on.
    const runs = [];
    let at = lineStart;
    for (; next < edits.length && edits[next][0] < lineEnd; next += 1) {
      const [start, end, replacement] = edits[next];
      runs.push([at - lineStart, start - at], [start - lineStart, replacement.length]);
      at = end;
    }
    runs.push([at - lineStart, lineEnd - at]);
    let segments = '';
    for (const [column, length] of runs) {
      if (length === 0) continue;
      const lineDelta = index - previousLine;
      segments += `${segments === '' ? 'A' : ',C'}A${vlq(lineDelta)}${vlq(column - previousColumn)}`;
      segments += ',CAAC'.repeat(length - 1);
      previousLine = index;
      previousColumn = column + length - 1;
    }
    lines.push(segments);
    lineStart = lineEnd + 1;
  }
  return { version: 3, sources: [id], names: [], mappings: lines.join(';') };
}

/**
 * `code` with its compiler keys shortened, the map of that edit and how many
 * keys it shortened; null when the module carries none. `readSource` returns
 * the module's source, read only if it carries compiler keys.
 */
export function shortenVdomKeys(code, id, readSource) {
  if (PREFIXED_KEY.test(code)) {
    throw new Error(`short-vdom-keys: ${id} writes a key that starts with "${PREFIX}"`);
  }
  const short = new Map();
  const edits = [];
  for (const match of code.matchAll(COMPILER_KEY)) {
    const [whole, , hash] = match;
    if (!short.has(hash)) short.set(hash, `${PREFIX}${short.size.toString(36)}`);
    const start = match.index + whole.length - 1 - hash.length;
    edits.push([start, start + hash.length, short.get(hash)]);
  }
  if (edits.length === 0) {
    refuseSurvivingKey(code, id);
    return null;
  }
  const source = readSource();
  const decodedSource = source.replaceAll(NUMERIC_ENTITY, (entity, value) => {
    const hex = value[0].toLowerCase() === 'x';
    const point = Number.parseInt(hex ? value.slice(1) : value, hex ? 16 : 10);
    return point <= 0x7f ? String.fromCodePoint(point) : entity;
  });
  for (const hash of short.keys()) {
    if (source.includes(hash) || decodedSource.includes(hash)) {
      throw new Error(
        `short-vdom-keys: ${id} writes the key ${hash} itself, and a key Stencil did not insert cannot be told from one it did`,
      );
    }
  }
  let shortened = '';
  let at = 0;
  for (const [start, end, replacement] of edits) {
    shortened += code.slice(at, start) + replacement;
    at = end;
  }
  shortened += code.slice(at);
  refuseSurvivingKey(shortened, id);
  return { code: shortened, map: sourceMap(code, edits, id), keys: short.size };
}

function refuseSurvivingKey(code, id) {
  const survivor = code.match(SURVIVING_KEY);
  if (survivor !== null) {
    throw new Error(
      `short-vdom-keys: ${id} keeps a 40-character key in a shape the plugin does not rewrite: ${survivor[0]}`,
    );
  }
}

/** The Rollup plugin: shortens the compiler keys of every module a build transforms. */
export const shortVdomKeys = {
  name: NAME,
  /**
   * @param {string} code
   * @param {string} id
   */
  transform(code, id) {
    const path = id.split('?')[0] ?? id;
    const result = shortenVdomKeys(code, id, () => {
      try {
        return readFileSync(path, 'utf8');
      } catch (error) {
        throw new Error(`short-vdom-keys: cannot read ${path}, the source of ${id}`, {
          cause: error,
        });
      }
    });
    if (result === null) return null;
    const { keys, ...rewrite } = result;
    return { ...rewrite, meta: { [NAME]: { keys } } };
  },
  /**
   * @this {{
   *   getModuleIds(): IterableIterator<string>,
   *   getModuleInfo(id: string): { meta: Record<string, unknown> } | null,
   * }}
   * @param {Error} [error]
   */
  buildEnd(error) {
    if (error) return;
    let keys = 0;
    for (const id of this.getModuleIds()) keys += this.getModuleInfo(id)?.meta[NAME]?.keys ?? 0;
    if (keys === 0) {
      throw new Error(
        "short-vdom-keys: the build shortened no compiler key: Stencil no longer writes them as key: '<sha1>'",
      );
    }
  },
};
