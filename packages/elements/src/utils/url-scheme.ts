// Shared with the catalog at build time, without a runtime package dependency.
const SUPPORTED_SCHEMES: ReadonlySet<string> = new Set(['http', 'https']);

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
