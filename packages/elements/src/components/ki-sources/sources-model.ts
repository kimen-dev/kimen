export function orderSources<T extends { id: string }>(
  _sources: readonly T[],
  _references: readonly string[],
): T[] {
  throw new Error(`Source ordering is pending (${String(_sources.length + _references.length)})`);
}

export function readSourceUrl(
  _href: string,
  _base: string,
): { href: string; domain: string } | undefined {
  throw new Error(`Source URL resolution is pending (${String(_href.length + _base.length)})`);
}

export function formatSourceLabel(
  _template: string,
  _values: Readonly<Record<string, string>>,
): string {
  throw new Error(
    `Source label formatting is pending (${String(_template.length + Object.keys(_values).length)})`,
  );
}
