import { characterEntities } from 'character-entities';
import { Lexer, type Tokens } from 'marked';

import { absoluteHttpOrigin, offendingScheme } from '../../utils/url-scheme';

const lexerOptions = { gfm: true };
const DEFAULT_HEADING_OFFSET = 2;
const CHARACTER_REFERENCE = /&(#(?:[0-9]{1,7}|[xX][\da-fA-F]{1,6})|[a-zA-Z][a-zA-Z\d]*);/gu;
const NOTE_MARKER = /^\[!NOTE\][\t ]*(?:\n|$)/u;

type InlineToken =
  | Tokens.Br
  | Tokens.Codespan
  | Tokens.Del
  | Tokens.Em
  | Tokens.Escape
  | Tokens.HTML
  | Tokens.Image
  | Tokens.Link
  | Tokens.Strong
  | Tokens.Tag
  | Tokens.Text;

// Marked's public Token includes a catch-all for custom extensions. The lexer
// here uses only its built-in grammar.
type BlockToken =
  | Tokens.Blockquote
  | Tokens.Code
  | Tokens.Heading
  | Tokens.Hr
  | Tokens.HTML
  | Tokens.List
  | Tokens.Paragraph
  | Tokens.Space
  | Tokens.Table
  | Tokens.Text;
export type MarkdownBlock = BlockToken | { type: 'literal'; raw: string };
export type MarkdownInline = InlineToken;

export function headingLevel(depth: number, offset: number = DEFAULT_HEADING_OFFSET): number {
  const safeOffset =
    Number.isInteger(offset) && offset >= 0 && offset <= 5 ? offset : DEFAULT_HEADING_OFFSET;
  return Math.min(6, depth + safeOffset);
}

function trailingDelimiter(source: string, tokens: BlockToken[]): number {
  const last = tokens.at(-1);
  if (!last || !['heading', 'paragraph', 'table'].includes(last.type)) return -1;
  if (last.type === 'table' && last.rows.length > 0) return -1;

  const lines = last.raw.split('\n');
  const delimiter = lines.at(-1) ?? '';
  const header = lines.at(-2) ?? '';
  return header.includes('|') && /^[\t |:-]+$/u.test(delimiter) && /[|:-]/u.test(delimiter)
    ? source.lastIndexOf('\n')
    : -1;
}

export function parseMarkdown(source: string, streaming: boolean): MarkdownBlock[] {
  const normalized = source.replace(/\r\n?/gu, '\n');
  try {
    const tokens = Lexer.lex(normalized, lexerOptions) as BlockToken[];
    // At the end of a stream a delimiter can temporarily be valid for the
    // wrong column count. Wait for its newline before changing the block.
    const pending = streaming ? trailingDelimiter(normalized, tokens) : -1;
    const blocks =
      pending < 0
        ? tokens
        : (Lexer.lex(normalized.slice(0, pending), lexerOptions) as BlockToken[]);
    return blocks.filter((block) => block.type !== 'space');
  } catch {
    // The lexer can exhaust the call stack on deeply nested input. Its
    // failure leaves the answer readable as literal text.
    return [{ type: 'literal', raw: source }];
  }
}

export function decodeMarkdownText(source: string): string {
  return source.replace(CHARACTER_REFERENCE, (reference, value: string) => {
    if (!value.startsWith('#')) {
      return Object.hasOwn(characterEntities, value)
        ? (characterEntities[value] ?? reference)
        : reference;
    }
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
      if (token.type === 'br') return ' ';
      if ('tokens' in token) return inlinePlainText(token.tokens as MarkdownInline[]);
      if (token.type === 'html') return token.raw;
      return decodeMarkdownText(token.text);
    })
    .join('');
}

export function imageAlternative(text: string): string {
  return inlinePlainText(Lexer.lexInline(text, lexerOptions) as MarkdownInline[]);
}

export function notePrefix(quote: Tokens.Blockquote): number {
  return NOTE_MARKER.exec(quote.text)?.[0].length ?? 0;
}
