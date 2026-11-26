import { readFileSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transpile } from '@stencil/core/compiler';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { shortenVdomKeys, shortVdomKeys } from './short-vdom-keys.mjs';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const drawerPath = join(packageRoot, 'src/components/ki-drawer/ki-drawer.tsx');
const readDrawer = () => readFileSync(drawerPath, 'utf8');

// Stencil's key as its transpiler writes it, and any string key.
const COMPILER_KEY = /\bkey:\s*(["'])[0-9a-f]{40}\1/u;
const STRING_KEYS = /\bkey:\s*(["'])([^"'\n]*)\1/gu;
const SHORT_KEY = /^~[0-9a-z]+$/u;

const stringKeys = (code: string): string[] =>
  [...code.matchAll(STRING_KEYS)].map(([, , key]) => key ?? '');

/** ki-drawer as Stencil's transpiler writes it, compiler keys and all. */
async function compiledDrawer(): Promise<string> {
  const { code, diagnostics } = await transpile(readDrawer(), {
    file: 'ki-drawer.tsx',
    sourceMap: false,
  });
  expect(diagnostics).toEqual([]);
  return code;
}

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Every segment of a source map's mappings: [line, column, original line, original column]. */
function decodeMappings(mappings: string): [number, number, number, number][] {
  const segments: [number, number, number, number][] = [];
  let originalLine = 0;
  let originalColumn = 0;
  for (const [line, text] of mappings.split(';').entries()) {
    let column = 0;
    for (const segment of text === '' ? [] : text.split(',')) {
      const values: number[] = [];
      let value = 0;
      let shift = 0;
      for (const character of segment) {
        const digit = BASE64.indexOf(character);
        value += (digit & 31) << shift;
        shift += 5;
        if ((digit & 32) === 0) {
          values.push(value & 1 ? -(value >>> 1) : value >>> 1);
          value = 0;
          shift = 0;
        }
      }
      const [columnDelta = 0, source, lineDelta = 0, columnOffset = 0] = values;
      expect(values).toHaveLength(4);
      expect(source).toBe(0);
      column += columnDelta;
      originalLine += lineDelta;
      originalColumn += columnOffset;
      segments.push([line, column, originalLine, originalColumn]);
    }
  }
  return segments;
}

describe('short vDOM keys', () => {
  it("shortens a component's compiler keys and keeps the keys its source writes", async () => {
    const code = await compiledDrawer();
    const before = stringKeys(code);
    expect(before.filter((key) => /^[0-9a-f]{40}$/u.test(key))).toHaveLength(9);

    const result = shortenVdomKeys(code, drawerPath, readDrawer);
    if (result === null) throw new Error('ki-drawer has compiler keys');
    const after = stringKeys(result.code);

    expect(result.keys).toBe(9);
    expect(result.code).not.toMatch(COMPILER_KEY);
    expect(after.filter((key) => SHORT_KEY.test(key))).toEqual(
      ['0', '1', '2', '3', '4', '5', '6', '7', '8'].map((n) => `~${n}`),
    );
    expect(after.filter((key) => !SHORT_KEY.test(key))).toEqual(['drawer', 'close', 'body']);
    expect(after.map((key, index) => (SHORT_KEY.test(key) ? before[index]?.length : key))).toEqual(
      before.map((key) => (/^[0-9a-f]{40}$/u.test(key) ? 40 : key)),
    );
    // Nothing but the keys changed, and the module still parses.
    expect(result.code.replaceAll(/'~[0-9a-z]+'/gu, "''")).toBe(
      code.replaceAll(/'[0-9a-f]{40}'/gu, "''"),
    );
    expect(ts.transpileModule(result.code, { reportDiagnostics: true }).diagnostics).toEqual([]);
  });

  it('gives a repeated hash its short key again and counts each module from zero', () => {
    const a = 'a'.repeat(40);
    const b = 'b'.repeat(40);
    const code = `h("i", { key: '${a}' }); h("b", { key: "${b}" }); h("i", { key: '${a}' });`;
    const first = shortenVdomKeys(code, 'one.tsx', () => '');
    const second = shortenVdomKeys(code, 'two.tsx', () => '');
    expect(first?.code).toBe(
      `h("i", { key: '~0' }); h("b", { key: "~1" }); h("i", { key: '~0' });`,
    );
    expect(first?.keys).toBe(2);
    expect(second?.code).toBe(first?.code);
    expect(second?.map.mappings).toBe(first?.map.mappings);
    expect(second?.map.sources).toEqual(['two.tsx']);
  });

  it('counts past ten in base 36', () => {
    const hashes = Array.from({ length: 37 }, (_, n) => n.toString(16).padStart(40, 'e'));
    const code = hashes.map((hash) => `h("p", { key: '${hash}' })`).join('\n');
    const keys = stringKeys(shortenVdomKeys(code, 'many.tsx', () => '')?.code ?? '');
    expect(keys.slice(0, 2)).toEqual(['~0', '~1']);
    expect(keys.slice(-3)).toEqual(['~y', '~z', '~10']);
  });

  it('maps every output character to the input character it came from', async () => {
    const code = await compiledDrawer();
    const result = shortenVdomKeys(code, drawerPath, readDrawer);
    if (result === null) throw new Error('ki-drawer has compiler keys');
    const lines = result.code.split('\n');
    // Before each column of a line, the characters the shortened keys removed.
    const removed = lines.map((line) => {
      const offsets = new Array<number>(line.length).fill(0);
      for (const { index } of line.matchAll(/(?<=key: ')~[0-9a-z]+(?=')/gu)) {
        const end = index + line.slice(index).indexOf("'");
        for (let column = end; column < line.length; column += 1) {
          offsets[column] = (offsets[column] ?? 0) + 40 - (end - index);
        }
      }
      return offsets;
    });
    const segments = decodeMappings(result.map.mappings);

    expect(segments).toEqual(
      lines.flatMap((line, index) =>
        Array.from({ length: line.length }, (_unused, column) => [
          index,
          column,
          index,
          column + (removed[index]?.[column] ?? 0),
        ]),
      ),
    );
    expect(removed.flat().some((offset) => offset > 0)).toBe(true);
  });

  it('maps an empty line and a line after it', () => {
    const code = `\n\nh("a", { key: '${'f'.repeat(40)}', b: 1 });`;
    const result = shortenVdomKeys(code, 'gaps.tsx', () => '');
    expect(result?.code).toBe(`\n\nh("a", { key: '~0', b: 1 });`);
    expect(result?.map).toEqual({
      version: 3,
      sources: ['gaps.tsx'],
      names: [],
      // Line 3 from column 0; the short key's two characters point at the
      // hash's first two, and the rest of the line resumes 38 columns later.
      mappings: `;;AAEA${',CAAC'.repeat(16)},CAAuC${',CAAC'.repeat(10)}`,
    });
  });

  it('leaves a module without compiler keys as it is', () => {
    const code =
      'h("a", { key: "button" }); h("b", { key: this.name }); const x = "' + 'a'.repeat(40) + '";';
    expect(shortenVdomKeys(code, 'plain.tsx', () => '')).toBeNull();
  });

  it.each([`key: "~0"`, `key: '~a'`, 'key:`~${x}`'])(
    'refuses a module that writes a key starting like a short key (%s)',
    (written) => {
      const message = /short-vdom-keys: mine\.tsx writes a key that starts with "~"/u;
      const compiled = `h("b", { key: '${'c'.repeat(40)}' });`;
      expect(() =>
        shortenVdomKeys(`h("a", { ${written} }); ${compiled}`, 'mine.tsx', () => ''),
      ).toThrow(message);
      expect(() => shortenVdomKeys(`h("a", { ${written} });`, 'mine.tsx', () => '')).toThrow(
        message,
      );
    },
  );

  it('refuses a 40-character key that the source writes itself', () => {
    const hash = 'd'.repeat(40);
    const code = `h("a", { key: '${hash}' }); h("b", { key: '${'e'.repeat(40)}' });`;
    expect(() => shortenVdomKeys(code, 'authored.tsx', () => `<a key="${hash}" />`)).toThrow(
      `short-vdom-keys: authored.tsx writes the key ${hash} itself, and a key Stencil did not insert cannot be told from one it did`,
    );
  });
});

describe('the Rollup plugin', () => {
  const meta = (keys: number) => ({ 'kimen-short-vdom-keys': { keys } });

  it('rewrites each module it transforms and records how many keys it shortened', async () => {
    const code = await compiledDrawer();
    expect(shortVdomKeys.name).toBe('kimen-short-vdom-keys');
    const id = `${drawerPath}?tag=ki-drawer`;
    const shortened = shortenVdomKeys(code, id, readDrawer);
    if (shortened === null) throw new Error('ki-drawer has compiler keys');
    const { keys, ...rewrite } = shortened;
    expect(shortVdomKeys.transform(code, id)).toEqual({ ...rewrite, meta: meta(keys) });
    expect(shortVdomKeys.transform('export const a = 1;', '/r/a.ts')).toBeNull();
    expect(() => shortVdomKeys.transform(code, '/r/missing.tsx?tag=x')).toThrow(
      'short-vdom-keys: cannot read /r/missing.tsx, the source of /r/missing.tsx?tag=x',
    );
  });

  it('stops a build that shortened no key, unless the build already failed', () => {
    const build = (metas: Record<string, unknown>[]) => ({
      getModuleIds: () => metas.map((_meta, index) => String(index)).values(),
      getModuleInfo: (id: string) => ({ meta: metas[Number(id)] ?? {} }),
    });
    expect(() => {
      shortVdomKeys.buildEnd.call(build([{}, meta(2)]));
    }).not.toThrow();
    for (const metas of [[], [{}, { other: { keys: 3 } }], [meta(0)]]) {
      expect(() => {
        shortVdomKeys.buildEnd.call(build(metas));
      }).toThrow(
        "short-vdom-keys: the build shortened no compiler key: Stencil no longer writes them as key: '<sha1>'",
      );
    }
    expect(() => {
      shortVdomKeys.buildEnd.call(build([]), new Error('earlier'));
    }).not.toThrow();
  });
});

// What a consumer installs: both builds that ship Stencil's keys.
describe('the built modules', () => {
  const lazy = join(packageRoot, 'dist/esm');
  const perComponent = join(packageRoot, 'dist/components');
  const modules = async (directory: string, pattern: RegExp) =>
    (await readdir(directory))
      .filter((name) => pattern.test(name))
      .map((name) => join(directory, name));

  /** The string keys a component's source writes, in JSX or to h(), through TypeScript's parser. */
  function authoredKeys(tag: string): string[] {
    const path = join(packageRoot, 'src/components', tag, `${tag}.tsx`);
    const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest);
    const keys: string[] = [];
    const visit = (node: ts.Node) => {
      if (
        (ts.isJsxAttribute(node) || ts.isPropertyAssignment(node)) &&
        node.name.getText(source) === 'key' &&
        node.initializer
      ) {
        const value = ts.isJsxExpression(node.initializer)
          ? node.initializer.expression
          : node.initializer;
        if (value && ts.isStringLiteral(value)) keys.push(value.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    return keys;
  }

  it('ship no compiler key in either build', async () => {
    for (const module of [
      ...(await modules(lazy, /\.js$/u)),
      ...(await modules(perComponent, /\.js$/u)),
    ]) {
      expect(await readFile(module, 'utf8'), module).not.toMatch(COMPILER_KEY);
    }
  });

  it("keep each component's own keys and give each element of its render a distinct short key", async () => {
    const entries = await modules(lazy, /^ki-[a-z-]+\.entry\.js$/u);
    expect(entries.length).toBeGreaterThan(100);
    let shortened = 0;
    for (const entry of entries) {
      const tag = entry.slice(lazy.length + 1, -'.entry.js'.length);
      const keys = stringKeys(await readFile(entry, 'utf8'));
      const short = keys.filter((key) => SHORT_KEY.test(key));
      const remaining = keys.filter((key) => !SHORT_KEY.test(key));
      for (const key of authoredKeys(tag)) {
        expect(remaining, `${tag} keeps key="${key}"`).toContain(key);
        remaining.splice(remaining.indexOf(key), 1);
      }
      expect(remaining, `${tag}'s keys that are neither its own nor short`).toEqual([]);
      expect(new Set(short).size, `${tag}'s short keys`).toBe(short.length);
      shortened += short.length;
    }
    expect(shortened).toBeGreaterThan(200);
  });

  it('ship the same keys through the per-component modules as through the lazy build', async () => {
    const keysOf = async (paths: string[]) =>
      (await Promise.all(paths.map(async (path) => stringKeys(await readFile(path, 'utf8')))))
        .flat()
        .sort();
    expect(await keysOf(await modules(perComponent, /\.js$/u))).toEqual(
      await keysOf(await modules(lazy, /\.js$/u)),
    );
  });
});
