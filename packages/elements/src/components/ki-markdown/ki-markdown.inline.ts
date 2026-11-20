export interface MarkdownReference {
  href: string;
  title?: string;
}

export type MarkdownInline =
  | { type: 'text' | 'literal' | 'codespan'; text: string }
  | { type: 'br' }
  | { type: 'strong' | 'em' | 'del'; tokens: MarkdownInline[] }
  | ({ type: 'link' | 'image'; tokens: MarkdownInline[] } & MarkdownReference);

const SPACE = /\s/u;
const PUNCTUATION = /[!-/:-@[-`{-~]|\p{P}/u;
const ESCAPE = /\\([!-/:-@[-`{-~])/gu;
const MAX_DEPTH = 16;
// Limit speculative destination and delimiter scans on unfinished input.
const LOOKAHEAD = 8192;

function referenceId(label: string): string {
  return label.trim().replace(/\s+/gu, ' ').toLowerCase();
}

function skipSpace(source: string, index: number): number {
  while (SPACE.test(source[index] ?? '')) index++;
  return index;
}

function destination(
  source: string,
  start: number,
): { end: number; reference: MarkdownReference } | null {
  const end = Math.min(source.length, start + LOOKAHEAD);
  let index = skipSpace(source, start);
  const angle = source[index] === '<';
  if (angle) index++;
  const begin = index;
  let nesting = 0;
  for (; index < end; index++) {
    const character = source[index];
    if (character === '\\' && PUNCTUATION.test(source[index + 1] ?? '')) {
      index++;
    } else if (angle) {
      if (character === '>') break;
      if (character === '<' || character === '\n') return null;
    } else {
      if (SPACE.test(character ?? '') || (character === ')' && nesting === 0)) break;
      if (character === '(') nesting++;
      if (character === ')') nesting--;
    }
  }
  if (nesting || (angle && source[index] !== '>') || (end < source.length && index >= end)) {
    return null;
  }
  const reference: MarkdownReference = { href: source.slice(begin, index).replace(ESCAPE, '$1') };
  if (angle) index++;
  const titleStart = skipSpace(source, index);
  const quote = source[titleStart];
  if (titleStart > index && (quote === '"' || quote === "'" || quote === '(')) {
    const closing = quote === '(' ? ')' : quote;
    index = titleStart + 1;
    for (; index < end; index++) {
      if (source[index] === '\\' && PUNCTUATION.test(source[index + 1] ?? '')) index++;
      else if (source[index] === closing) break;
    }
    if (index >= end) return null;
    reference.title = source.slice(titleStart + 1, index).replace(ESCAPE, '$1');
    return { end: skipSpace(source, index + 1), reference };
  }
  return { end: titleStart, reference };
}

export function parseDefinition(line: string): { id: string; reference: MarkdownReference } | null {
  const prefix = /^ {0,3}\[([^[\]\n]+)\]:[ \t]*/u.exec(line);
  if (!prefix || prefix[0].length === line.length) return null;
  const id = referenceId(prefix[1] ?? '');
  const target = destination(line, prefix[0].length);
  return id && target?.end === line.length ? { id, reference: target.reference } : null;
}

function codeEnd(source: string, start: number, mark: string): number {
  for (const run of source.slice(start, start + LOOKAHEAD).matchAll(/`+/gu)) {
    const position = start + run.index;
    if (run[0].length === mark.length && source[position + mark.length] !== '`') return position;
  }
  return -1;
}

function bracketPairs(source: string): readonly number[] {
  // Pair the whole paragraph once, even if many labels are still open.
  const openings: number[] = [];
  const pairs: number[] = [];
  const markers = /\\[\\[\]`]|`+|[[\]]/gu;
  for (let match = markers.exec(source); match; match = markers.exec(source)) {
    const marker = match[0];
    if (marker === '[') openings.push(match.index);
    else if (marker === ']') {
      const opening = openings.pop();
      if (opening !== undefined) pairs[opening] = match.index;
    } else if (marker.startsWith('`')) {
      const end = codeEnd(source, markers.lastIndex, marker);
      if (end >= 0) markers.lastIndex = end + marker.length;
    }
  }
  return pairs;
}

function linkAt(
  source: string,
  start: number,
  references: ReadonlyMap<string, MarkdownReference>,
  brackets: readonly number[],
) {
  const close = brackets[start - 1];
  if (close === undefined) return null;
  let end = close + 1;
  let reference: MarkdownReference | undefined;
  const target = source[end] === '(' ? destination(source, end + 1) : null;
  if (target && source[target.end] === ')') {
    end = target.end + 1;
    reference = target.reference;
  } else if (references.size) {
    const explicit = brackets[end];
    const label =
      (explicit === undefined ? '' : source.slice(end + 1, explicit)) || source.slice(start, close);
    if (label.length <= 999) reference = references.get(referenceId(label));
    if (explicit !== undefined) end = explicit + 1;
  }
  return reference && { end, label: source.slice(start, close), reference };
}

interface Span {
  mark: string;
  tokens: MarkdownInline[];
}

function appendText(tokens: MarkdownInline[], text: string): void {
  if (!text) return;
  const last = tokens.at(-1);
  if (last?.type === 'text') last.text += text;
  else tokens.push({ type: 'text', text });
}

function appendSpan(spans: Span[]): void {
  const span = spans.pop();
  const parent = spans.at(-1);
  if (span && parent) {
    appendText(parent.tokens, span.mark);
    parent.tokens = parent.tokens.concat(span.tokens);
  }
}

function emphasis(spans: Span[], mark: string, before: string, after: string): void {
  const marker = mark[0] ?? '';
  const leftPunctuation = PUNCTUATION.test(before);
  const rightPunctuation = PUNCTUATION.test(after);
  const leftSpace = SPACE.test(before);
  const rightSpace = SPACE.test(after);
  const intraword =
    marker === '_' && !leftSpace && !rightSpace && !leftPunctuation && !rightPunctuation;
  const opens = !rightSpace && (!rightPunctuation || leftSpace || leftPunctuation) && !intraword;
  const closes = !leftSpace && (!leftPunctuation || rightSpace || rightPunctuation) && !intraword;
  let remaining = mark;
  while (closes && remaining) {
    let index = spans.length - 1;
    let match = spans[index];
    while (
      match &&
      (!match.mark.startsWith(marker) || (marker === '~' && match.mark !== remaining))
    ) {
      match = spans[--index];
    }
    if (!match) break;
    while (spans.length > index + 1) appendSpan(spans);
    const used = Math.min(remaining.length, match.mark.length);
    const type = marker === '~' ? 'del' : used === 2 ? 'strong' : 'em';
    const tokens = used === 3 ? [{ type: 'strong' as const, tokens: match.tokens }] : match.tokens;
    const token: MarkdownInline = { type, tokens };
    remaining = remaining.slice(used);
    match.mark = match.mark.slice(used);
    if (match.mark) match.tokens = [token];
    else {
      spans.pop();
      spans.at(-1)?.tokens.push(token);
    }
  }
  if (remaining && opens && spans.length < MAX_DEPTH) spans.push({ mark: remaining, tokens: [] });
  else {
    const current = spans.at(-1);
    if (current) appendText(current.tokens, remaining);
  }
}

export function parseInline(
  source: string,
  references: ReadonlyMap<string, MarkdownReference>,
  depth = 0,
  inLink = false,
): MarkdownInline[] {
  if (depth >= MAX_DEPTH) return [{ type: 'text', text: source }];
  const root: Span = { mark: '', tokens: [] };
  const spans = [root];
  const syntax = /\\(?:[!-/:-@[-`{-~]|\n)|\n|`+|\*+|_+|~+|!?\[|</gu;
  let brackets: readonly number[] | undefined;
  let start = 0;
  for (let match = syntax.exec(source); match; match = syntax.exec(source)) {
    const mark = match[0];
    const index = match.index;
    const current = spans.at(-1) ?? root;
    const text = source.slice(start, index);
    const hardBreak = mark === '\n' && text.endsWith('  ');
    appendText(current.tokens, hardBreak ? text.trimEnd() : text);
    start = syntax.lastIndex;
    if (mark.endsWith('\n')) {
      if (mark.length > 1 || hardBreak) current.tokens.push({ type: 'br' });
      else appendText(current.tokens, mark);
    } else if (mark.startsWith('\\')) {
      current.tokens.push({ type: 'literal', text: mark.slice(1) });
    } else if (mark.startsWith('`')) {
      const end = codeEnd(source, start, mark);
      if (end < 0) appendText(current.tokens, mark);
      else {
        let text = source.slice(start, end).replaceAll('\n', ' ');
        if (text.startsWith(' ') && text.endsWith(' ') && text.trim()) text = text.slice(1, -1);
        current.tokens.push({ type: 'codespan', text });
        start = syntax.lastIndex = end + mark.length;
      }
    } else if (mark.endsWith('[')) {
      const image = mark === '![';
      const link =
        image || !inLink
          ? linkAt(source, start, references, (brackets ??= bracketPairs(source)))
          : null;
      if (!link) appendText(current.tokens, mark);
      else {
        current.tokens.push({
          ...link.reference,
          type: image ? 'image' : 'link',
          tokens: parseInline(link.label, references, depth + 1, inLink || !image),
        });
        start = syntax.lastIndex = link.end;
      }
    } else if (mark === '<') {
      const rest = source.slice(index, index + LOOKAHEAD);
      const markup =
        /^<(?:!--[\s\S]*?--|\/?[a-z][\w:-]*(?=[\s/>])(?:"[^"]*"|'[^']*'|[^<>"'])*|[!?][^<>]*)>/iu.exec(
          rest,
        );
      if (markup) {
        current.tokens.push({ type: 'literal', text: markup[0] });
        start = syntax.lastIndex = index + markup[0].length;
      } else appendText(current.tokens, mark);
    } else if (mark.length <= (mark.startsWith('~') ? 2 : 3)) {
      emphasis(spans, mark, source[index - 1] ?? ' ', source[start] ?? ' ');
    } else appendText(current.tokens, mark);
  }
  appendText((spans.at(-1) ?? root).tokens, source.slice(start));
  while (spans.length > 1) appendSpan(spans);
  return root.tokens;
}
