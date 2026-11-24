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

describe('Gherkin coloring', () => {
  const keywords = (source: string) =>
    tokenizeCode(source, 'gherkin')
      .flat()
      .filter(({ kind }) => kind === 'keyword')
      .map(({ text }) => text);

  it('colors English keywords that open a line and leaves the same words mid-line plain', () => {
    expect(
      tokenizeCode(
        'Feature: Given When\n  Scenario: Pay\n    Given a cart\n    * And then',
        'gherkin',
      ),
    ).toEqual([
      [{ kind: 'keyword', text: 'Feature:' }, { text: ' Given When' }],
      [{ text: '  ' }, { kind: 'keyword', text: 'Scenario:' }, { text: ' Pay' }],
      [{ text: '    ' }, { kind: 'keyword', text: 'Given' }, { text: ' a cart' }],
      [{ text: '    ' }, { kind: 'keyword', text: '*' }, { text: ' And then' }],
    ]);
  });

  it('accepts every keyword of the English dictionary and requires the block colon', () => {
    const blocks = [
      'Feature:',
      'Business Need:',
      'Ability:',
      'Rule:',
      'Background:',
      'Scenario:',
      'Example:',
      'Scenario Outline:',
      'Scenario Template:',
      'Examples:',
      'Scenarios:',
    ];
    const steps = ['Given', 'When', 'Then', 'And', 'But', '*'];
    const source = [...blocks.map((block) => `${block} x`), ...steps.map((step) => `  ${step} x`)];
    expect(keywords(source.join('\n'))).toEqual([...blocks, ...steps]);
    expect(keywords('Feature x\nScenario Outline\nGiven\nGivens x\nThen: x\nwhen x')).toEqual([]);
  });

  it('accepts every keyword of the Spanish dictionary under a language comment', () => {
    const blocks = [
      'Característica:',
      'Necesidad del negocio:',
      'Requisito:',
      'Regla:',
      'Regla de negocio:',
      'Antecedentes:',
      'Escenario:',
      'Ejemplo:',
      'Esquema del escenario:',
      'Ejemplos:',
    ];
    const steps = ['Dado', 'Dada', 'Dados', 'Dadas', 'Cuando', 'Entonces', 'Y', 'E', 'Pero'];
    const source = [...blocks.map((block) => `${block} x`), ...steps.map((step) => `  ${step} x`)];
    expect(keywords(['# language: es', ...source].join('\n'))).toEqual([...blocks, ...steps]);
    expect(tokenizeCode('# language: es\n  Y pago e IVA Y tasas', 'feature')).toEqual([
      [{ kind: 'comment', text: '# language: es' }],
      [{ text: '  ' }, { kind: 'keyword', text: 'Y' }, { text: ' pago e IVA Y tasas' }],
    ]);
  });

  it('colors the tags that open a line and keeps later hash signs and inline tags plain', () => {
    expect(tokenizeCode('  @smoke @ui-1  # note\nGiven issue #4 for @ana @bo', 'Gherkin')).toEqual([
      [{ text: '  ' }, { kind: 'function', text: '@smoke @ui-1' }, { text: '  # note' }],
      [{ kind: 'keyword', text: 'Given' }, { text: ' issue #4 for @ana @bo' }],
    ]);
  });

  it('colors quoted text and outline placeholders inside steps', () => {
    expect(tokenizeCode('When I add <count> "large \\"red\\"" <a <b', 'gherkin')).toEqual([
      [
        { kind: 'keyword', text: 'When' },
        { text: ' I add ' },
        { kind: 'number', text: '<count>' },
        { text: ' ' },
        { kind: 'string', text: '"large \\"red\\""' },
        { text: ' <a <b' },
      ],
    ]);
  });

  it('takes a doc string as one string until its own delimiter or the end of the source', () => {
    expect(tokenizeCode('  """json\n  Given "x" ```\n  """\nThen done', 'gherkin')).toEqual([
      [{ text: '  ' }, { kind: 'string', text: '"""json' }],
      [{ kind: 'string', text: '  Given "x" ```' }],
      [{ kind: 'string', text: '  """' }],
      [{ kind: 'keyword', text: 'Then' }, { text: ' done' }],
    ]);
    expect(tokenizeCode('```\n# not a comment', 'gherkin')).toEqual([
      [{ kind: 'string', text: '```' }],
      [{ kind: 'string', text: '# not a comment' }],
    ]);
  });

  it('colors table pipes as keywords and cells as strings, keeping escaped pipes in a cell', () => {
    expect(tokenizeCode('  | a\\|b |<n>||\nGiven x | y |', 'gherkin')).toEqual([
      [
        { text: '  ' },
        { kind: 'keyword', text: '|' },
        { kind: 'string', text: ' a\\|b ' },
        { kind: 'keyword', text: '|' },
        { kind: 'string', text: '<n>' },
        { kind: 'keyword', text: '||' },
      ],
      [{ kind: 'keyword', text: 'Given' }, { text: ' x | y |' }],
    ]);
  });

  // A pattern that looked back to the line opening from every position took
  // seconds on each of these sources, so the default timeout is the guard.
  it('scans long blank runs, pipe-heavy prose, table rows and tag lines in linear time', () => {
    const blank = ' '.repeat(200_000);
    expect(tokenizeCode(`${blank}x`, 'gherkin')).toEqual([[{ text: `${blank}x` }]]);
    expect(tokenizeCode(`Given ${'a | '.repeat(50_000)}`, 'gherkin')[0]).toHaveLength(2);
    expect(tokenizeCode(`|${' x |'.repeat(50_000)}`, 'gherkin')[0]).toHaveLength(100_001);
    expect(tokenizeCode('@a '.repeat(50_000), 'gherkin')[0]).toHaveLength(2);
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
