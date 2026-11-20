const MAX_WINDOW = 10;

export function nonnegativeInteger(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.trunc(value)));
}

export function paginationState(
  page: number | undefined,
  pages: number | undefined,
): { page: number; pages: number } {
  const count = nonnegativeInteger(pages) ?? 0;
  return { page: Math.min(count, Math.max(1, nonnegativeInteger(page) ?? 1)), pages: count };
}

/** Skip directly to the next visible page when crossing an omitted range. */
export function pageItems(
  page: number,
  pages: number,
  siblings: number,
  boundaries: number,
): (number | 'gap')[] {
  const around = Math.min(MAX_WINDOW, nonnegativeInteger(siblings) ?? 1);
  const ends = Math.min(MAX_WINDOW, nonnegativeInteger(boundaries) ?? 1);
  const firstSibling = page - around;
  const lastSibling = page + around;
  const lastBoundary = pages - ends + 1;
  const items: (number | 'gap')[] = [];
  for (let number = 1; number <= pages; number += 1) {
    if (
      number <= ends ||
      number >= lastBoundary ||
      (number >= firstSibling && number <= lastSibling)
    ) {
      items.push(number);
      continue;
    }
    const next = number < firstSibling ? Math.min(firstSibling, lastBoundary) : lastBoundary;
    items.push(next === number + 1 ? number : 'gap');
    number = next - 1;
  }
  return items;
}

/** Validate against the document base and preserve relative references. */
export function pageHref(
  template: string | undefined,
  page: number,
  base: string,
): string | undefined {
  if (!template?.includes('{page}')) return undefined;
  const href = template.replaceAll('{page}', String(page));
  const destination = URL.parse(href, base);
  return destination &&
    /^https?:$/u.test(destination.protocol) &&
    destination.origin === URL.parse(template, base)?.origin
    ? href
    : undefined;
}
