import { describe, expect, it } from 'vitest';

import { resolveHighlights, tokenizeCode } from './ki-code-block.behavior';

describe('syntax coloring', () => {
  it('classifies TypeScript syntax without losing characters', () => {
    expect(tokenizeCode('const size = count(3); // items', ' TS ')).toEqual([
      [
        { kind: 'keyword', text: 'const' },
        { text: ' size = ' },
        { kind: 'function', text: 'count' },
        { text: '(' },
        { kind: 'number', text: '3' },
        { text: '); ' },
        { kind: 'comment', text: '// items' },
      ],
    ]);
  });

  it('keeps multiline comments colored and preserves blank and trailing lines', () => {
    expect(tokenizeCode('/* docs\r\n\r\n */\r\n', 'javascript')).toEqual([
      [{ kind: 'comment', text: '/* docs' }],
      [],
      [{ kind: 'comment', text: ' */' }],
      [],
    ]);
  });

  it('recognizes escaped quotes and keeps comments inside strings', () => {
    expect(tokenizeCode('"a\\"//b" then()', 'js')).toEqual([
      [
        { kind: 'string', text: '"a\\"//b"' },
        { text: ' ' },
        { kind: 'function', text: 'then' },
        { text: '()' },
      ],
    ]);
  });

  it('classifies JSON keys, literals and decimals', () => {
    expect(tokenizeCode('{"on":true,"delta":-2.5e-3}', 'json')).toEqual([
      [
        { text: '{' },
        { kind: 'string', text: '"on"' },
        { text: ':' },
        { kind: 'keyword', text: 'true' },
        { text: ',' },
        { kind: 'string', text: '"delta"' },
        { text: ':' },
        { kind: 'number', text: '-2.5e-3' },
        { text: '}' },
      ],
    ]);
  });

  it('takes incomplete strings, comments and templates as literal source', () => {
    expect(tokenizeCode('const a = "unfinished\n/* remaining\nsource', 'ts')).toEqual([
      [
        { kind: 'keyword', text: 'const' },
        { text: ' a = ' },
        { kind: 'string', text: '"unfinished' },
      ],
      [{ kind: 'comment', text: '/* remaining' }],
      [{ kind: 'comment', text: 'source' }],
    ]);
    expect(tokenizeCode('`first\n${second}`', 'ts')).toEqual([
      [{ kind: 'string', text: '`first' }],
      [{ kind: 'string', text: '${second}`' }],
    ]);
  });

  it('keeps missing and unknown grammars plain, with one row per line', () => {
    const source = ' <script>  \r\n\t</script>\r';
    const plain = [[{ text: ' <script>  ' }], [{ text: '\t</script>' }], []];
    expect(tokenizeCode(source, 'html')).toEqual(plain);
    expect(tokenizeCode(source)).toEqual(plain);
  });
});

describe('highlight selection', () => {
  it('sorts, merges and bounds inclusive line ranges', () => {
    expect(resolveHighlights('8-999, 4, 3 - 4, 1, 5, 8', 10)).toEqual([
      { start: 1, end: 1 },
      { start: 3, end: 5 },
      { start: 8, end: 10 },
    ]);
  });

  it('ignores malformed, reversed, unsafe and out-of-bounds ranges', () => {
    expect(resolveHighlights('0, -2, 2.5, 3-2, 2e1, 1-, 0-2, 3-9007199254740992, 8, 2', 5)).toEqual(
      [{ start: 2, end: 2 }],
    );
    expect(resolveHighlights(undefined, 5)).toEqual([]);
  });
});
