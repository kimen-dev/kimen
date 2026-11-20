// GENERATED from packages/elements/src/utils/url-scheme.ts.
// Shared with the catalog at build time, without a runtime package dependency.
const SUPPORTED_SCHEMES: ReadonlySet<string> = new Set(['http', 'https']);

/** Renderer-owned scope for URLs inside Markdown content. */
export const MARKDOWN_ORIGINS_ATTRIBUTE = 'data-ki-markdown-origins';

/** A C0 control or space, or a DEL/C1 control: what URL parsers trim or drop. */
function isControlOrSpace(code: number): boolean {
  return code <= 0x20 || (code >= 0x7f && code <= 0x9f);
}

/**
 * The scheme of a URL value that is NOT on the allowlist, or null when the
 * value is a relative reference or an http(s) URL. Control characters and
 * white space are stripped first, so `java\tscript:` and leading-newline
 * tricks cannot smuggle a live scheme past the check.
 */
export function offendingScheme(value: string): string | null {
  let normalized = '';
  for (const character of value) {
    if (!isControlOrSpace(character.codePointAt(0) ?? 0)) {
      normalized += character;
    }
  }
  const match = /^([a-zA-Z][a-zA-Z0-9+.-]*):/u.exec(normalized);
  if (match === null) {
    return null;
  }
  const scheme = (match[1] ?? '').toLowerCase();
  return SUPPORTED_SCHEMES.has(scheme) ? null : scheme;
}

/**
 * The origin of an unambiguous absolute HTTP(S) URL, or null. An absolute
 * URL must start with http:// or https:// and cannot contain inner whitespace
 * or control characters. The browser's URL parser resolves its origin.
 */
export function absoluteHttpOrigin(value: string): string | null {
  let start = 0;
  let end = value.length;
  while (start < end && value.charCodeAt(start) <= 0x20) {
    start += 1;
  }
  while (end > start && value.charCodeAt(end - 1) <= 0x20) {
    end -= 1;
  }
  const trimmed = value.slice(start, end);
  for (const character of trimmed) {
    if (isControlOrSpace(character.codePointAt(0) ?? 0)) {
      return null;
    }
  }
  if (!/^https?:\/\//iu.test(trimmed)) {
    return null;
  }
  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}
