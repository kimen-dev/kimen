import { absoluteHttpOrigin, offendingScheme } from '../../utils/url-scheme';
import {
  type MarkdownInline,
  type MarkdownReference,
  parseDefinition,
  parseInline,
} from './ki-markdown.inline';

const DEFAULT_HEADING_OFFSET = 2;
const CHARACTER_REFERENCE = /&(#(?:[0-9]{1,7}|[xX][\da-fA-F]{1,6})|[a-zA-Z][a-zA-Z\d]*);/gu;
const entities: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
  copy: '©',
  AElig: 'Æ',
  Dcaron: 'Ď',
  frac34: '¾',
  colon: ':',
  Tab: '\t',
  NewLine: '\n',
};

const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/u;
const HEADING = /^ {0,3}(#{1,6})(?:[\t ]+|$)(.*)$/u;
const QUOTE = /^ {0,3}>[\t ]?/u;
const LIST = /^ {0,3}([-+*]|\d{1,9}[.)])(?:[\t ]+|$)/u;
const HTML = /^ {0,3}<(?:\/?[a-zA-Z][\w-]*(?=[\s/>])|[!?])/u;

type Alignment = 'left' | 'right' | 'center' | undefined;
interface Item {
  checked: boolean | undefined;
  tokens: MarkdownBlock[];
}

export type MarkdownBlock =
  | { type: 'paragraph'; tokens: MarkdownInline[] }
  | { type: 'heading'; depth: number; tokens: MarkdownInline[] }
  | { type: 'code'; lang: string; text: string }
  | { type: 'literal'; raw: string }
  | { type: 'blockquote' | 'note'; tokens: MarkdownBlock[] }
  | { type: 'list'; start: number | undefined; loose: boolean; items: Item[] }
  | { type: 'table'; align: Alignment[]; header: MarkdownInline[][]; rows: MarkdownInline[][][] };

export function headingLevel(depth: number, offset: number = DEFAULT_HEADING_OFFSET): number {
  const safeOffset =
    Number.isInteger(offset) && offset >= 0 && offset <= 5 ? offset : DEFAULT_HEADING_OFFSET;
  return Math.min(6, depth + safeOffset);
}

export function decodeMarkdownText(source: string): string {
  return source.replace(CHARACTER_REFERENCE, (reference, value: string) => {
    if (!value.startsWith('#'))
      return Object.hasOwn(entities, value) ? (entities[value] ?? reference) : reference;
    const hex = value[1]?.toLowerCase() === 'x';
    const code = Number.parseInt(value.slice(hex ? 2 : 1), hex ? 16 : 10);
    if (code === 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return '\uFFFD';
    return String.fromCodePoint(code);
  });
}

export function markdownDestination(
  source: string,
  base: URL | string,
  documentOrigin: string,
  allowedOrigins?: readonly string[],
): { url: string; external: boolean } | null {
  const url = decodeMarkdownText(source);
  if (offendingScheme(url) !== null) return null;
  if (allowedOrigins !== undefined) {
    const origin = absoluteHttpOrigin(url);
    if (origin === null || !allowedOrigins.includes(origin)) return null;
  }

  try {
    const resolved = new URL(url, base);
    return { url, external: resolved.origin !== documentOrigin };
  } catch {
    return null;
  }
}

export function parseOriginScope(attribute: string | null): readonly string[] | undefined {
  if (attribute === null) return undefined;
  try {
    const origins: unknown = JSON.parse(attribute);
    if (Array.isArray(origins) && origins.every((origin: unknown) => typeof origin === 'string')) {
      return origins;
    }
  } catch {
    // An unreadable scope is equivalent to an empty allowlist.
  }
  return [];
}

export function inlinePlainText(tokens: readonly MarkdownInline[]): string {
  return tokens
    .map((token) => {
      if ('tokens' in token) return inlinePlainText(token.tokens);
      if (token.type === 'br') return ' ';
      return token.type === 'text' ? decodeMarkdownText(token.text) : token.text;
    })
    .join('');
}

function tableCells(line: string): string[] {
  const cells: string[] = [];
  let start = 0;
  for (let at = 0; at < line.length; at += 1) {
    if (line[at] === '\\') {
      at += 1;
    } else if (line[at] === '|') {
      cells.push(line.slice(start, at));
      start = at + 1;
    }
  }
  cells.push(line.slice(start));
  if (line.startsWith('|')) cells.shift();
  if (start === line.length) cells.pop();
  return cells.map((cell) => cell.trim().replace(/\\\|/gu, '|'));
}

function alignment(cell: string): Alignment {
  if (cell.endsWith(':')) return cell.startsWith(':') ? 'center' : 'right';
  if (cell.startsWith(':')) return 'left';
  return undefined;
}

function indentation(line: string): number {
  return line.length - line.trimStart().length;
}

class Blocks {
  private at = 0;

  constructor(
    private readonly lines: readonly string[],
    private readonly references: Map<string, MarkdownReference>,
    private readonly streaming: boolean,
    private readonly depth: number,
  ) {}

  private line(): string {
    return this.lines[this.at] ?? '';
  }

  private inline(text: string): MarkdownInline[] {
    return parseInline(text, this.references);
  }

  private startsBlock(line: string): boolean {
    return (
      !line.trim() ||
      FENCE.test(line) ||
      HTML.test(line) ||
      HEADING.test(line) ||
      QUOTE.test(line) ||
      LIST.test(line) ||
      parseDefinition(line) !== null
    );
  }

  private collect(children: string[]): MarkdownBlock[] {
    return new Blocks(children, this.references, this.streaming, this.depth + 1).parse();
  }

  private fence(line: string, mark: string, info: string): MarkdownBlock {
    const body: string[] = [];
    const indent = indentation(line);
    while (this.at < this.lines.length) {
      const current = this.line();
      this.at += 1;
      const end = FENCE.exec(current);
      if (end?.[1]?.startsWith(mark) && !end[2]?.trim()) break;
      body.push(current.slice(Math.min(indent, indentation(current))));
    }
    return { type: 'code', lang: info.trim().split(/\s+/u, 1)[0] ?? '', text: body.join('\n') };
  }

  private literal(line: string): MarkdownBlock {
    const tag = /^\s*<(script|pre|style|textarea)(?=[\s>])/iu.exec(line)?.[1]?.toLowerCase();
    const end = /^\s*\x3c!--/u.test(line) ? '-->' : tag ? `</${tag}>` : '';
    let raw = line;
    while (
      this.at < this.lines.length &&
      (end ? !line.toLowerCase().includes(end) : this.line().trim() !== '')
    ) {
      line = this.line();
      raw += `\n${line}`;
      this.at += 1;
    }
    return { type: 'literal', raw };
  }

  private quote(first: string): MarkdownBlock {
    const body = [first.replace(QUOTE, '')];
    while (QUOTE.test(this.line())) {
      body.push(this.line().replace(QUOTE, ''));
      this.at += 1;
    }
    const note = body[0]?.trimEnd() === '[!NOTE]';
    if (note) body.shift();
    return { type: note ? 'note' : 'blockquote', tokens: this.collect(body) };
  }

  private list(first: string, initial: RegExpExecArray): MarkdownBlock {
    const marker = initial[1] ?? '';
    const style = marker.at(-1);
    const nextItem = (line: string): RegExpExecArray | null => {
      const match = LIST.exec(line);
      return match?.[1]?.at(-1) === style ? match : null;
    };
    const items: Item[] = [];
    let loose = false;
    let match: RegExpExecArray | null = initial;
    let line = first;
    while (match) {
      const indent = match[0].length;
      const text = line.slice(indent);
      const task = /^\[([ xX])\](?:[\t ]+|$)/u.exec(text);
      const body = [task ? text.slice(task[0].length) : text];
      while (this.at < this.lines.length) {
        const next = this.line();
        if (!next.trim()) {
          while (!this.line().trim() && this.at < this.lines.length) this.at += 1;
          if (indentation(this.line()) < indent) {
            loose ||= nextItem(this.line()) !== null;
            break;
          }
          loose = true;
          body.push('');
        } else if (indentation(next) >= indent) {
          body.push(next.slice(indent));
          this.at += 1;
        } else {
          break;
        }
      }
      items.push({
        checked: task ? task[1]?.toLowerCase() === 'x' : undefined,
        tokens: this.collect(body),
      });
      line = this.line();
      match = nextItem(line);
      if (match) this.at += 1;
    }
    return {
      type: 'list',
      start: marker.length > 1 ? Number.parseInt(marker, 10) : undefined,
      loose,
      items,
    };
  }

  private table(head: string[], divider: string[]): MarkdownBlock {
    this.at += 1;
    const rows: MarkdownInline[][][] = [];
    while (this.line().includes('|') && !this.startsBlock(this.line())) {
      const row = tableCells(this.line().trim());
      rows.push(head.map((_, column) => this.inline(row[column] ?? '')));
      this.at += 1;
    }
    return {
      type: 'table',
      align: divider.map(alignment),
      header: head.map((cell) => this.inline(cell)),
      rows,
    };
  }

  parse(): MarkdownBlock[] {
    if (this.depth >= 24) return [{ type: 'literal', raw: this.lines.join('\n') }];
    const blocks: MarkdownBlock[] = [];
    while (this.at < this.lines.length) {
      const line = this.line();
      this.at += 1;
      if (!line.trim()) continue;

      const fence = FENCE.exec(line);
      const heading = HEADING.exec(line);
      const marker = LIST.exec(line);
      const definition = parseDefinition(line);
      if (fence?.[1]) {
        blocks.push(this.fence(line, fence[1], fence[2] ?? ''));
      } else if (HTML.test(line)) {
        blocks.push(this.literal(line));
      } else if (definition) {
        if (!this.references.has(definition.id))
          this.references.set(definition.id, definition.reference);
      } else if (heading?.[1]) {
        const text = heading[2]?.replace(/(?:^|[\t ])#+[\t ]*$/u, '').trim() ?? '';
        blocks.push({ type: 'heading', depth: heading[1].length, tokens: this.inline(text) });
      } else if (QUOTE.test(line)) {
        blocks.push(this.quote(line));
      } else if (marker) {
        blocks.push(this.list(line, marker));
      } else {
        blocks.push(this.paragraph(line));
      }
    }
    return blocks;
  }

  private paragraph(first: string): MarkdownBlock {
    const divider = this.line().trim();
    if (first.includes('|') && divider && /^[\t |:-]+$/u.test(divider)) {
      // Confirm a table only once its delimiter line has finished arriving.
      if (this.streaming && this.at === this.lines.length - 1) {
        this.at += 1;
        return { type: 'paragraph', tokens: this.inline(first.trim()) };
      }
      const head = tableCells(first.trim());
      const columns = tableCells(divider);
      if (
        columns.length &&
        head.length === columns.length &&
        columns.every((cell) => /^:?-+:?$/u.test(cell))
      ) {
        return this.table(head, columns);
      }
    }
    if (/^ {0,3}(?:=+|-+)[\t ]*$/u.test(this.line())) {
      this.at += 1;
      return {
        type: 'heading',
        depth: divider.startsWith('=') ? 1 : 2,
        tokens: this.inline(first.trim()),
      };
    }
    const lines = [first.trimStart()];
    while (!this.startsBlock(this.line())) {
      lines.push(this.line().trimStart());
      this.at += 1;
    }
    return { type: 'paragraph', tokens: this.inline(lines.join('\n').trimEnd()) };
  }
}

export function parseMarkdown(source: string, streaming: boolean): MarkdownBlock[] {
  const lines = source.split(/\r\n?|\n/u);
  const references = new Map<string, MarkdownReference>();
  // Gather definitions before resolving forward references. The block parser
  // skips definitions enclosed by code fences or literal HTML.
  const blocks = new Blocks(lines, references, streaming, 0).parse();
  return references.size ? new Blocks(lines, references, streaming, 0).parse() : blocks;
}
