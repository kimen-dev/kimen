type SyntaxKind = 'comment' | 'function' | 'keyword' | 'number' | 'string';
interface CodeToken {
  text: string;
  kind?: SyntaxKind;
}

interface LineRange {
  start: number;
  end: number;
}

const scriptLanguages = /^(?:jsx?|tsx?|javascript|typescript)$/u;
const scriptKeywords = new Set(
  (
    'as async await break case catch class const continue default delete do ' +
    'else enum export extends false finally for from function if import in instanceof ' +
    'interface keyof let new null of private protected public readonly return satisfies static ' +
    'super switch this throw true try type typeof undefined var void while yield'
  ).split(' '),
);

// Quoted text and block comments consume their contents once even if an editor
// or streamed reply has yet to supply the closing delimiter.
const codeToken =
  /(\/\/[^\n]*|\/\*[^]*?(?:\*\/|$))|((['"])(?:\\[^\n]|(?!\3)[^\\\n])*\3?|`(?:\\[^]|[^`\\])*`?)|(-?(?:0[xob][\da-f_]+|\d[\d_]*(?:\.[\d_]*)?|\.\d[\d_]*)(?:e[+-]?[\d_]+)?n?)|[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*/giu;
const callStart = /[^\S\n]*\(/uy;

const gherkinLanguages = /^(?:gherkin|feature)$/u;
// Gherkin's official English and Spanish keywords count only where they open a
// line, block keywords with their colon and step keywords before their space,
// so the same words stay plain inside a sentence. Comments, tags, table rows
// and doc strings also open a line. The opening is checked from a non-blank
// character only, which keeps every pattern linear in the source length.
// One kind per capture group of gherkinToken, in order:
const gherkinKinds: SyntaxKind[] = [
  'comment', // a # line, such as # language: es
  'keyword', // Feature:, Escenario:, Given, Y, *…
  'function', // the tags of a tag line, which read like decorators
  'keyword', // a table row: its pipes, while the cells between take 'string'
  'string', // a doc string, to its closing delimiter or the end of the source
  'string', // that doc string's delimiter
  'number', // an outline placeholder, which stands for an example value
  'string', // quoted step text
];
const gherkinToken =
  /(?=\S)(?<=^[^\S\n]*)(?:(#.*)|((?:Feature|Business Need|Ability|Rule|Background|Scenario(?:s| Outline| Template)?|Examples?|Característica|Necesidad del negocio|Requisito|Regla(?: de negocio)?|Antecedentes|Escenario|Esquema del escenario|Ejemplos?):|(?:Given|When|Then|And|But|Dad[oa]s?|Cuando|Entonces|Pero|[YE*])(?= ))|(@\S+(?:[^\S\n]+@\S+)*)|(\|.*)|((["`])\6\6[^]*?(?:\n[^\S\n]*\6{3}|(?![^]))))|(<[^\s<>][^<>\n]*>)|("(?:\\.|[^"\\\n])*"?)/gmu;
// Splits a table row into pipes and the cells between them, which may escape a pipe.
const tableCell = /((?:\\.|[^\\|])+)/u;

function tokenKind(
  match: RegExpExecArray,
  source: string,
  script: boolean,
): SyntaxKind | undefined {
  const [text, comment, quoted, , number] = match;
  if (comment) return script ? 'comment' : undefined;
  if (quoted) return 'string';
  if (number) return 'number';
  if (scriptKeywords.has(text)) return 'keyword';
  callStart.lastIndex = match.index + match[0].length;
  if (script && callStart.test(source)) return 'function';
}

export function tokenizeCode(source: string, language?: string): CodeToken[][] {
  const text = source.replace(/\r\n?/gu, '\n');
  const grammar = language?.trim().toLowerCase() ?? '';
  const script = scriptLanguages.test(grammar);
  const gherkin = gherkinLanguages.test(grammar);

  let line: CodeToken[] = [];
  const lines = [line];
  const append = (fragment: string, kind?: SyntaxKind) => {
    for (const [index, chunk] of fragment.split('\n').entries()) {
      if (index > 0) {
        line = [];
        lines.push(line);
      }
      if (chunk) line.push(kind ? { text: chunk, kind } : { text: chunk });
    }
  };

  let end = 0;
  if (script || gherkin || grammar === 'json') {
    for (const match of text.matchAll(gherkin ? gherkinToken : codeToken)) {
      const group = gherkin ? match.slice(1).findIndex(Boolean) : -1;
      const kind = gherkin ? gherkinKinds[group] : tokenKind(match, text, script);
      if (!kind) continue;
      append(text.slice(end, match.index));
      const pieces = group === 3 ? match[0].split(tableCell) : [match[0]];
      for (const [index, piece] of pieces.entries()) append(piece, index % 2 ? 'string' : kind);
      end = match.index + match[0].length;
    }
  }
  append(text.slice(end));
  return lines;
}

export function resolveHighlights(value: string | undefined, count: number): LineRange[] {
  if (!value) return [];
  const ranges: LineRange[] = [];
  for (const entry of value.split(',')) {
    const match = /^(\d+)(?:\s*-\s*(\d+))?$/u.exec(entry.trim());
    if (!match) continue;
    const start = Number(match[1]);
    const end = Number(match[2] ?? match[1]);
    if (start < 1 || start > count || end < start || !Number.isSafeInteger(end)) continue;
    ranges.push({ start, end: Math.min(end, count) });
  }

  ranges.sort((a, b) => a.start - b.start);
  const merged: LineRange[] = [];
  for (const range of ranges) {
    const previous = merged.at(-1);
    if (previous && range.start <= previous.end + 1) {
      previous.end = Math.max(previous.end, range.end);
    } else {
      merged.push(range);
    }
  }
  return merged;
}
