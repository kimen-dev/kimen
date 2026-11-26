import { describe, expect, it } from 'vitest';

import {
  shortenVdomKeys,
  shortVdomKeys,
} from '../../packages/elements/scripts/short-vdom-keys.mjs';

// The elements build's Rollup plugin for the keys Stencil's compiler inserts.
const A = 'a'.repeat(40);
const B = 'b'.repeat(40);
const C = 'c'.repeat(40);
const run = (n) => ',CAAC'.repeat(n);
const noSource = () => '';
const unread = () => {
  throw new Error('the source was read');
};

describe('short-vdom-keys', () => {
  it('shortens every compiler key, line by line, and maps each character back', () => {
    const code = [
      `h("a", { key: '${A}' }, h("b", {key:"${B}"}));`,
      '',
      `  h("c", { key: '${A}', x: 1 });`,
    ].join('\n');
    expect(shortenVdomKeys(code, 'probe.tsx', noSource)).toEqual({
      code: [
        `h("a", { key: '~0' }, h("b", {key:"~1"}));`,
        '',
        `  h("c", { key: '~0', x: 1 });`,
      ].join('\n'),
      keys: 2,
      map: {
        version: 3,
        sources: ['probe.tsx'],
        names: [],
        // Each run of copied characters is one segment and a CAAC per
        // character after it; a run after a key resumes 38 columns later
        // (uC), and a line restarts at column 0 of its own input line (ErH:
        // two lines down, 117 columns back).
        mappings: [
          `AAAA${run(16)},CAAuC${run(19)},CAAuC${run(4)}`,
          '',
          `AAErH${run(18)},CAAuC${run(10)}`,
        ].join(';'),
      },
    });
  });

  it.each([
    ['a key without a space', `{key:'${A}'}`, `{key:'~0'}`],
    ['a key after spaces', `{ key:   "${A}" }`, `{ key:   "~0" }`],
    ['a key on a new line', `{\n  key:\n  '${A}'\n}`, `{\n  key:\n  '~0'\n}`],
  ])('reads %s', (_label, code, shortened) => {
    expect(shortenVdomKeys(code, 'k.tsx', noSource)?.code).toBe(shortened);
  });

  it.each([
    ['mismatched quotes', `{ key: '${A}" }`],
    ['39 characters', `{ key: '${A.slice(1)}' }`],
    ['41 characters', `{ key: '${A}a' }`],
    ['upper-case hex', `{ key: '${A.toUpperCase()}' }`],
    ['a longer property name', `{ monkey: '${A}' }`],
    ['a hash that is not a key', `const id = '${A}';`],
    ['a dynamic key', '{ key: this.name }'],
  ])('leaves %s alone and reads no source', (_label, code) => {
    expect(shortenVdomKeys(code, 'k.tsx', unread)).toBeNull();
  });

  it('keeps a repeated hash on its short key and counts in base 36 per module', () => {
    const hashes = Array.from({ length: 37 }, (_, n) => n.toString(16).padStart(40, 'd'));
    const code = [...hashes, hashes[0]].map((hash) => `{ key: '${hash}' }`).join(' ');
    const result = shortenVdomKeys(code, 'many.tsx', noSource);
    expect(result?.keys).toBe(37);
    expect(result?.code.split(' } ').at(-2)).toBe(`{ key: '~10'`);
    expect(result?.code.endsWith(`{ key: '~0' }`)).toBe(true);
    expect(result?.code.startsWith(`{ key: '~0' } { key: '~1' }`)).toBe(true);
    expect(result?.code).toContain(`{ key: '~a' } { key: '~b' }`);
  });

  it.each([
    ['double quotes', 'key: "~0"'],
    ['single quotes', "key:'~'"],
    ['a template', 'key: `~${n}`'],
  ])('refuses a module that writes a short-looking key in %s', (_label, written) => {
    for (const code of [`{ ${written} }`, `{ ${written} } { key: '${A}' }`]) {
      expect(() => shortenVdomKeys(code, 'own.tsx', unread)).toThrowError(
        'short-vdom-keys: own.tsx writes a key that starts with "~"',
      );
    }
  });

  it.each([
    ['a key that only contains the prefix', "{ key: 'a~' }"],
    ['a longer property name', "{ monkey: '~a' }"],
  ])('accepts %s', (_label, code) => {
    expect(shortenVdomKeys(code, 'own.tsx', unread)).toBeNull();
  });

  it('refuses a compiler-shaped key its source writes, and reads the source once', () => {
    let reads = 0;
    const source = () => {
      reads += 1;
      return `<i key="${B}" />`;
    };
    expect(() =>
      shortenVdomKeys(`{ key: '${A}' } { key: '${B}' } { key: '${C}' }`, 'own.tsx', source),
    ).toThrowError(
      `short-vdom-keys: own.tsx writes the key ${B} itself, and a key Stencil did not insert cannot be told from one it did`,
    );
    expect(reads).toBe(1);
  });

  it('transforms a module by its source file, without the query, and records its keys', () => {
    expect(shortVdomKeys.name).toBe('kimen-short-vdom-keys');
    const id = `${new URL(import.meta.url).pathname}?tag=x`;
    expect(shortVdomKeys.transform(`{ key: '${A}' }`, id)).toEqual({
      code: `{ key: '~0' }`,
      map: { version: 3, sources: [id], names: [], mappings: `AAAA${run(9)},CAAuC${run(2)}` },
      meta: { 'kimen-short-vdom-keys': { keys: 1 } },
    });
    expect(shortVdomKeys.transform('const a = 1;', '/nowhere.ts')).toBeNull();
    expect(() => shortVdomKeys.transform(`{ key: '${A}' }`, '/nowhere/a.tsx?x')).toThrowError(
      'short-vdom-keys: cannot read /nowhere/a.tsx, the source of /nowhere/a.tsx?x',
    );
    expect(() => shortVdomKeys.transform(`{ key: '${A}' }`, '/nowhere/b.tsx')).toThrowError(
      expect.objectContaining({
        message: 'short-vdom-keys: cannot read /nowhere/b.tsx, the source of /nowhere/b.tsx',
        cause: expect.objectContaining({ code: 'ENOENT' }),
      }),
    );
  });

  it('stops a build that shortened no key, and only then', () => {
    const build = (metas) => ({
      getModuleIds: () => Object.keys(metas).values(),
      getModuleInfo: (id) => (metas[id] === null ? null : { meta: metas[id] }),
    });
    const keys = (n) => ({ 'kimen-short-vdom-keys': { keys: n } });
    const none =
      "short-vdom-keys: the build shortened no compiler key: Stencil no longer writes them as key: '<sha1>'";
    expect(shortVdomKeys.buildEnd.call(build({ a: {}, b: keys(1), c: null }))).toBeUndefined();
    expect(shortVdomKeys.buildEnd.call(build({ a: keys(2), b: keys(3) }))).toBeUndefined();
    for (const metas of [{}, { a: {}, b: null }, { a: keys(0) }, { a: { other: { keys: 2 } } }]) {
      expect(() => shortVdomKeys.buildEnd.call(build(metas))).toThrowError(none);
    }
    expect(shortVdomKeys.buildEnd.call(build({}), new Error('earlier'))).toBeUndefined();
  });
});
