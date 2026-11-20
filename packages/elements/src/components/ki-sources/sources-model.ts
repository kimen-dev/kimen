import { offendingScheme } from '../../utils/url-scheme';

export interface SourceDestination {
  href: string;
  domain: string;
}

export function orderSources<T extends { id: string }>(
  sources: readonly T[],
  references: readonly string[],
): T[] {
  const pending = new Map(sources.map((source) => [source.id, source]));
  const cited: T[] = [];
  for (const id of references) {
    const source = pending.get(id);
    if (source) {
      cited.push(source);
      pending.delete(id);
    }
  }
  return [...cited, ...pending.values()];
}

export function readSourceUrl(href: string, base: string): SourceDestination | undefined {
  if (!href.trim() || offendingScheme(href)) {
    return undefined;
  }
  const url = URL.parse(href, base);
  if (url?.hostname && (url.protocol === 'https:' || url.protocol === 'http:')) {
    return { href: url.href, domain: url.hostname };
  }
  return undefined;
}

export function formatSourceLabel(
  template: string,
  values: Readonly<Record<string, string>>,
): string {
  return template.replace(/\{(\w+)\}/gu, (match, key: string) =>
    Object.hasOwn(values, key) ? (values[key] ?? match) : match,
  );
}
